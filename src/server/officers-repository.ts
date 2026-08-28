import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Actor, OfficerInvitation, OfficerMembership, OfficersSnapshot, StorageEnvironment } from "./types";
import { OfficerConflictError } from "./types";

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

type MembershipRow = {
  id: string;
  user_id: string;
  email: string;
  active: number;
  created_at: number;
  updated_at: number | null;
  deactivated_at: number | null;
};

type InvitationRow = {
  id: string;
  email: string;
  expires_at: number;
  created_at: number;
  created_by: string | null;
};

type InvitationAcceptanceRow = InvitationRow & {
  token_hash: string;
  accepted_at: number | null;
  invalidated_at: number | null;
};

type ExistingMembershipRow = {
  id: string;
  created_at: number;
};

type MembershipStateRow = {
  id: string;
  active: number;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const iso = (timestamp: number) => new Date(timestamp).toISOString();
const optionalIso = (timestamp: number | null) => timestamp === null ? null : iso(timestamp);
const changes = (result: unknown) => {
  if (!result || typeof result !== "object") return 0;
  const metadata = "meta" in result && result.meta && typeof result.meta === "object" ? result.meta : undefined;
  if (metadata && "changes" in metadata && typeof metadata.changes === "number") return metadata.changes;
  return "changes" in result && typeof result.changes === "number" ? result.changes : 0;
};

const mapMembership = (row: MembershipRow): OfficerMembership => ({
  id: row.id,
  email: row.email,
  userId: row.user_id,
  active: row.active === 1,
  createdAt: iso(row.created_at),
  updatedAt: optionalIso(row.updated_at),
  deactivatedAt: optionalIso(row.deactivated_at),
});

const mapInvitation = (row: InvitationRow, at: Date): OfficerInvitation => ({
  id: row.id,
  email: row.email,
  status: row.expires_at <= at.getTime() ? "expired" : "pending",
  expiresAt: iso(row.expires_at),
  createdAt: iso(row.created_at),
  createdBy: row.created_by,
});

export async function listOfficers(env: StorageEnvironment, actor: Actor, at = new Date()): Promise<OfficersSnapshot> {
  const [memberships, invitations] = await Promise.all([
    env.DB.prepare(
      "SELECT id, user_id, email, active, created_at, updated_at, deactivated_at FROM memberships WHERE organization_id = ? ORDER BY active DESC, email ASC",
    ).bind(actor.organizationId).all<MembershipRow>(),
    env.DB.prepare(
      "SELECT id, email, expires_at, created_at, created_by FROM invitations WHERE organization_id = ? AND accepted_at IS NULL AND invalidated_at IS NULL ORDER BY created_at DESC",
    ).bind(actor.organizationId).all<InvitationRow>(),
  ]);

  return {
    memberships: memberships.results.map(mapMembership),
    invitations: invitations.results.map((row) => mapInvitation(row, at)),
  };
}

export async function createOfficerInvitation(
  env: StorageEnvironment,
  actor: Actor,
  email: string,
  baseUrl: string,
  at = new Date(),
): Promise<{ invitation: OfficerInvitation; invitationUrl: string }> {
  const normalizedEmail = normalizeEmail(email);
  const activeMembership = await env.DB.prepare(
    "SELECT id FROM memberships WHERE organization_id = ? AND lower(trim(email)) = ? AND active = 1 LIMIT 1",
  ).bind(actor.organizationId, normalizedEmail).first<{ id: string }>();
  if (activeMembership) {
    throw new OfficerConflictError("ACTIVE_MEMBER_EXISTS", "That email already belongs to an active officer.");
  }

  const createdAt = at.getTime();
  const expiresAt = createdAt + INVITATION_LIFETIME_MS;
  const id = randomUUID();
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const invitationUrl = new URL("/invite", baseUrl);
  invitationUrl.searchParams.set("token", rawToken);
  invitationUrl.searchParams.set("organizationId", actor.organizationId);
  const invitation: OfficerInvitation = {
    id,
    email: normalizedEmail,
    status: "pending",
    expiresAt: iso(expiresAt),
    createdAt: iso(createdAt),
    createdBy: actor.userId,
  };
  const noActiveMembership = "NOT EXISTS (SELECT 1 FROM memberships WHERE organization_id = ? AND lower(trim(email)) = ? AND active = 1)";

  const results = await env.DB.batch([
    env.DB.prepare(
      `UPDATE invitations SET invalidated_at = ?
       WHERE organization_id = ? AND lower(trim(email)) = ? AND accepted_at IS NULL AND invalidated_at IS NULL AND expires_at > ?
       AND ${noActiveMembership}`,
    ).bind(createdAt, actor.organizationId, normalizedEmail, createdAt, actor.organizationId, normalizedEmail),
    env.DB.prepare(
      `INSERT INTO invitations (id, organization_id, email, token_hash, expires_at, accepted_at, created_at, created_by, invalidated_at)
       SELECT ?, ?, ?, ?, ?, NULL, ?, ?, NULL WHERE ${noActiveMembership}`,
    ).bind(id, actor.organizationId, normalizedEmail, tokenHash, expiresAt, createdAt, actor.userId, actor.organizationId, normalizedEmail),
    env.DB.prepare(
      `INSERT INTO audit_events (id, organization_id, actor_user_id, action, entity_id, metadata_json, created_at)
       SELECT ?, ?, ?, ?, ?, ?, ?
       WHERE changes() = 1 AND EXISTS (
         SELECT 1 FROM invitations WHERE id = ? AND organization_id = ? AND token_hash = ? AND accepted_at IS NULL AND invalidated_at IS NULL
       )`,
    ).bind(randomUUID(), actor.organizationId, actor.userId, "invitation_created", id, JSON.stringify({ email: normalizedEmail }), createdAt, id, actor.organizationId, tokenHash),
  ]);
  const insertResult = Array.isArray(results) ? results[1] : undefined;
  if (changes(insertResult) !== 1) {
    throw new OfficerConflictError("ACTIVE_MEMBER_EXISTS", "That email already belongs to an active officer.");
  }

  return { invitation, invitationUrl: invitationUrl.toString() };
}

export async function acceptOfficerInvitation(
  env: StorageEnvironment,
  actorIdentity: Omit<Actor, "organizationId">,
  organizationId: string,
  rawToken: string,
  at = new Date(),
): Promise<OfficerMembership> {
  const acceptedAt = at.getTime();
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const invitation = await env.DB.prepare(
    "SELECT id, email, token_hash, expires_at, accepted_at, created_at, created_by, invalidated_at FROM invitations WHERE organization_id = ? AND token_hash = ? LIMIT 1",
  ).bind(organizationId, tokenHash).first<InvitationAcceptanceRow>();

  if (!invitation || invitation.accepted_at !== null || invitation.invalidated_at !== null || invitation.expires_at <= acceptedAt) {
    throw new OfficerConflictError("INVITATION_INVALID", "This invitation is invalid, expired, or has already been used.");
  }

  const normalizedIdentityEmail = normalizeEmail(actorIdentity.email);
  const normalizedInvitationEmail = normalizeEmail(invitation.email);
  if (normalizedIdentityEmail !== normalizedInvitationEmail) {
    throw new OfficerConflictError("INVITATION_EMAIL_MISMATCH", "Sign in with the email address that was invited.");
  }

  const existingMembership = await env.DB.prepare(
    "SELECT id, created_at FROM memberships WHERE organization_id = ? AND lower(trim(email)) = ? ORDER BY active DESC, created_at ASC LIMIT 1",
  ).bind(organizationId, normalizedInvitationEmail).first<ExistingMembershipRow>();
  const membershipId = existingMembership?.id ?? randomUUID();
  const membershipCreatedAt = existingMembership?.created_at ?? acceptedAt;
  const eligibility = "id = ? AND organization_id = ? AND token_hash = ? AND lower(trim(email)) = ? AND accepted_at IS NULL AND invalidated_at IS NULL AND expires_at > ?";
  const membershipReady = "EXISTS (SELECT 1 FROM memberships AS accepted_membership WHERE accepted_membership.id = ? AND accepted_membership.organization_id = ? AND accepted_membership.user_id = ? AND lower(trim(accepted_membership.email)) = ? AND accepted_membership.active = 1)";
  const auditMetadata = JSON.stringify({ email: normalizedInvitationEmail, membershipId });
  const auditId = randomUUID();
  const membershipMutation = existingMembership
    ? env.DB.prepare(
      `UPDATE memberships SET user_id = ?, email = ?, active = 1, updated_at = ?, deactivated_at = NULL
       WHERE organization_id = ? AND id = ? AND lower(trim(email)) = ?
       AND EXISTS (SELECT 1 FROM invitations WHERE ${eligibility})`,
    ).bind(
      actorIdentity.userId,
      normalizedInvitationEmail,
      acceptedAt,
      organizationId,
      membershipId,
      normalizedInvitationEmail,
      invitation.id,
      organizationId,
      tokenHash,
      normalizedInvitationEmail,
      acceptedAt,
    )
    : env.DB.prepare(
      `INSERT INTO memberships (id, organization_id, user_id, email, active, created_at, updated_at, deactivated_at)
       SELECT ?, ?, ?, ?, 1, ?, ?, NULL FROM invitations WHERE ${eligibility}
       AND NOT EXISTS (SELECT 1 FROM memberships WHERE organization_id = ? AND lower(trim(email)) = ?)`,
    ).bind(
      membershipId,
      organizationId,
      actorIdentity.userId,
      normalizedInvitationEmail,
      membershipCreatedAt,
      acceptedAt,
      invitation.id,
      organizationId,
      tokenHash,
      normalizedInvitationEmail,
      acceptedAt,
      organizationId,
      normalizedInvitationEmail,
    );

  const results = await env.DB.batch([
    membershipMutation,
    env.DB.prepare(
      `UPDATE invitations SET accepted_at = ?
       WHERE ${eligibility} AND changes() = 1 AND ${membershipReady}`,
    ).bind(
      acceptedAt,
      invitation.id,
      organizationId,
      tokenHash,
      normalizedInvitationEmail,
      acceptedAt,
      membershipId,
      organizationId,
      actorIdentity.userId,
      normalizedInvitationEmail,
    ),
    env.DB.prepare(
      `INSERT INTO audit_events (id, organization_id, actor_user_id, action, entity_id, metadata_json, created_at)
       SELECT ?, ?, ?, ?, ?, ?, ? FROM invitations
       WHERE id = ? AND organization_id = ? AND token_hash = ? AND lower(trim(email)) = ? AND accepted_at = ?
       AND changes() = 1 AND ${membershipReady}`,
    ).bind(
      auditId,
      organizationId,
      actorIdentity.userId,
      "invitation_accepted",
      invitation.id,
      auditMetadata,
      acceptedAt,
      invitation.id,
      organizationId,
      tokenHash,
      normalizedInvitationEmail,
      acceptedAt,
      membershipId,
      organizationId,
      actorIdentity.userId,
      normalizedInvitationEmail,
    ),
    env.DB.prepare(
      `UPDATE invitations SET invalidated_at = ?
       WHERE organization_id = ? AND lower(trim(email)) = ? AND id <> ? AND accepted_at IS NULL AND invalidated_at IS NULL
       AND EXISTS (
         SELECT 1 FROM audit_events WHERE id = ? AND organization_id = ? AND action = 'invitation_accepted' AND entity_id = ?
       )`,
    ).bind(acceptedAt, organizationId, normalizedInvitationEmail, invitation.id, auditId, organizationId, invitation.id),
  ]);

  const membershipResult = Array.isArray(results) ? results[0] : undefined;
  const acceptanceResult = Array.isArray(results) ? results[1] : undefined;
  if (changes(membershipResult) !== 1 || changes(acceptanceResult) !== 1) {
    throw new OfficerConflictError("INVITATION_INVALID", "This invitation is invalid, expired, or has already been used.");
  }

  return {
    id: membershipId,
    email: normalizedInvitationEmail,
    userId: actorIdentity.userId,
    active: true,
    createdAt: iso(membershipCreatedAt),
    updatedAt: iso(acceptedAt),
    deactivatedAt: null,
  };
}

export async function deactivateOfficer(
  env: StorageEnvironment,
  actor: Actor,
  membershipId: string,
  at = new Date(),
): Promise<void> {
  const deactivatedAt = at.getTime();
  const results = await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO audit_events (id, organization_id, actor_user_id, action, entity_id, metadata_json, created_at)
       SELECT ?, target.organization_id, ?, ?, target.id, json_object('email', target.email), ?
       FROM memberships AS target
       WHERE target.organization_id = ? AND target.id = ? AND target.active = 1
       AND EXISTS (
         SELECT 1 FROM memberships AS other
         WHERE other.organization_id = ? AND other.active = 1 AND other.id <> ?
       )`,
    ).bind(randomUUID(), actor.userId, "officer_deactivated", deactivatedAt, actor.organizationId, membershipId, actor.organizationId, membershipId),
    env.DB.prepare(
      `UPDATE memberships SET active = 0, updated_at = ?, deactivated_at = ?
       WHERE organization_id = ? AND id = ? AND active = 1
       AND EXISTS (
         SELECT 1 FROM memberships AS other
         WHERE other.organization_id = ? AND other.active = 1 AND other.id <> ?
       )`,
    ).bind(deactivatedAt, deactivatedAt, actor.organizationId, membershipId, actor.organizationId, membershipId),
  ]);

  const updateResult = Array.isArray(results) ? results[1] : undefined;
  if (changes(updateResult) === 1) return;

  const target = await env.DB.prepare(
    "SELECT id, active FROM memberships WHERE organization_id = ? AND id = ? LIMIT 1",
  ).bind(actor.organizationId, membershipId).first<MembershipStateRow>();
  if (target?.active === 1) {
    throw new OfficerConflictError("LAST_ACTIVE_OFFICER", "An organization must retain at least one active officer.");
  }
  throw new OfficerConflictError("OFFICER_NOT_FOUND", "Officer membership was not found or is inactive.");
}
