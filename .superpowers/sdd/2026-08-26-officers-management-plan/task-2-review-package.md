# Officers Task 2 review package

Current full task files as no-index diffs; commits unavailable.

warning: in the working copy of 'src/server/officers-repository.ts', LF will be replaced by CRLF the next time Git touches it
diff --git a/src/server/officers-repository.ts b/src/server/officers-repository.ts
new file mode 100644
index 0000000..233d6aa
--- /dev/null
+++ b/src/server/officers-repository.ts
@@ -0,0 +1,289 @@
+import { createHash, randomBytes, randomUUID } from "node:crypto";
+import type { Actor, OfficerInvitation, OfficerMembership, OfficersSnapshot, StorageEnvironment } from "./types";
+import { OfficerConflictError } from "./types";
+
+const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
+
+type MembershipRow = {
+  id: string;
+  user_id: string;
+  email: string;
+  active: number;
+  created_at: number;
+  updated_at: number | null;
+  deactivated_at: number | null;
+};
+
+type InvitationRow = {
+  id: string;
+  email: string;
+  expires_at: number;
+  created_at: number;
+  created_by: string | null;
+};
+
+type InvitationAcceptanceRow = InvitationRow & {
+  token_hash: string;
+  accepted_at: number | null;
+  invalidated_at: number | null;
+};
+
+type ExistingMembershipRow = {
+  id: string;
+  created_at: number;
+};
+
+type MembershipStateRow = {
+  id: string;
+  active: number;
+};
+
+const normalizeEmail = (email: string) => email.trim().toLowerCase();
+const iso = (timestamp: number) => new Date(timestamp).toISOString();
+const optionalIso = (timestamp: number | null) => timestamp === null ? null : iso(timestamp);
+const changes = (result: unknown) => {
+  if (!result || typeof result !== "object") return 0;
+  const metadata = "meta" in result && result.meta && typeof result.meta === "object" ? result.meta : undefined;
+  if (metadata && "changes" in metadata && typeof metadata.changes === "number") return metadata.changes;
+  return "changes" in result && typeof result.changes === "number" ? result.changes : 0;
+};
+
+const mapMembership = (row: MembershipRow): OfficerMembership => ({
+  id: row.id,
+  email: row.email,
+  userId: row.user_id,
+  active: row.active === 1,
+  createdAt: iso(row.created_at),
+  updatedAt: optionalIso(row.updated_at),
+  deactivatedAt: optionalIso(row.deactivated_at),
+});
+
+const mapInvitation = (row: InvitationRow, at: Date): OfficerInvitation => ({
+  id: row.id,
+  email: row.email,
+  status: row.expires_at <= at.getTime() ? "expired" : "pending",
+  expiresAt: iso(row.expires_at),
+  createdAt: iso(row.created_at),
+  createdBy: row.created_by,
+});
+
+export async function listOfficers(env: StorageEnvironment, actor: Actor, at = new Date()): Promise<OfficersSnapshot> {
+  const [memberships, invitations] = await Promise.all([
+    env.DB.prepare(
+      "SELECT id, user_id, email, active, created_at, updated_at, deactivated_at FROM memberships WHERE organization_id = ? ORDER BY active DESC, email ASC",
+    ).bind(actor.organizationId).all<MembershipRow>(),
+    env.DB.prepare(
+      "SELECT id, email, expires_at, created_at, created_by FROM invitations WHERE organization_id = ? AND accepted_at IS NULL AND invalidated_at IS NULL ORDER BY created_at DESC",
+    ).bind(actor.organizationId).all<InvitationRow>(),
+  ]);
+
+  return {
+    memberships: memberships.results.map(mapMembership),
+    invitations: invitations.results.map((row) => mapInvitation(row, at)),
+  };
+}
+
+export async function createOfficerInvitation(
+  env: StorageEnvironment,
+  actor: Actor,
+  email: string,
+  baseUrl: string,
+  at = new Date(),
+): Promise<{ invitation: OfficerInvitation; invitationUrl: string }> {
+  const normalizedEmail = normalizeEmail(email);
+  const activeMembership = await env.DB.prepare(
+    "SELECT id FROM memberships WHERE organization_id = ? AND lower(trim(email)) = ? AND active = 1 LIMIT 1",
+  ).bind(actor.organizationId, normalizedEmail).first<{ id: string }>();
+  if (activeMembership) {
+    throw new OfficerConflictError("ACTIVE_MEMBER_EXISTS", "That email already belongs to an active officer.");
+  }
+
+  const createdAt = at.getTime();
+  const expiresAt = createdAt + INVITATION_LIFETIME_MS;
+  const id = randomUUID();
+  const rawToken = randomBytes(32).toString("base64url");
+  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
+  const invitation: OfficerInvitation = {
+    id,
+    email: normalizedEmail,
+    status: "pending",
+    expiresAt: iso(expiresAt),
+    createdAt: iso(createdAt),
+    createdBy: actor.userId,
+  };
+
+  await env.DB.batch([
+    env.DB.prepare(
+      "UPDATE invitations SET invalidated_at = ? WHERE organization_id = ? AND lower(trim(email)) = ? AND accepted_at IS NULL AND invalidated_at IS NULL AND expires_at > ?",
+    ).bind(createdAt, actor.organizationId, normalizedEmail, createdAt),
+    env.DB.prepare(
+      "INSERT INTO invitations (id, organization_id, email, token_hash, expires_at, accepted_at, created_at, created_by, invalidated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL)",
+    ).bind(id, actor.organizationId, normalizedEmail, tokenHash, expiresAt, createdAt, actor.userId),
+    env.DB.prepare(
+      "INSERT INTO audit_events (id, organization_id, actor_user_id, action, entity_id, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
+    ).bind(randomUUID(), actor.organizationId, actor.userId, "invitation_created", id, JSON.stringify({ email: normalizedEmail }), createdAt),
+  ]);
+
+  const invitationUrl = new URL("/invite", baseUrl);
+  invitationUrl.searchParams.set("token", rawToken);
+  return { invitation, invitationUrl: invitationUrl.toString() };
+}
+
+export async function acceptOfficerInvitation(
+  env: StorageEnvironment,
+  actorIdentity: Omit<Actor, "organizationId">,
+  organizationId: string,
+  rawToken: string,
+  at = new Date(),
+): Promise<OfficerMembership> {
+  const acceptedAt = at.getTime();
+  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
+  const invitation = await env.DB.prepare(
+    "SELECT id, email, token_hash, expires_at, accepted_at, created_at, created_by, invalidated_at FROM invitations WHERE organization_id = ? AND token_hash = ? LIMIT 1",
+  ).bind(organizationId, tokenHash).first<InvitationAcceptanceRow>();
+
+  if (!invitation || invitation.accepted_at !== null || invitation.invalidated_at !== null || invitation.expires_at <= acceptedAt) {
+    throw new OfficerConflictError("INVITATION_INVALID", "This invitation is invalid, expired, or has already been used.");
+  }
+
+  const normalizedIdentityEmail = normalizeEmail(actorIdentity.email);
+  const normalizedInvitationEmail = normalizeEmail(invitation.email);
+  if (normalizedIdentityEmail !== normalizedInvitationEmail) {
+    throw new OfficerConflictError("INVITATION_EMAIL_MISMATCH", "Sign in with the email address that was invited.");
+  }
+
+  const existingMembership = await env.DB.prepare(
+    "SELECT id, created_at FROM memberships WHERE organization_id = ? AND lower(trim(email)) = ? ORDER BY active DESC, created_at ASC LIMIT 1",
+  ).bind(organizationId, normalizedInvitationEmail).first<ExistingMembershipRow>();
+  const membershipId = existingMembership?.id ?? randomUUID();
+  const membershipCreatedAt = existingMembership?.created_at ?? acceptedAt;
+  const eligibility = "id = ? AND organization_id = ? AND token_hash = ? AND lower(trim(email)) = ? AND accepted_at IS NULL AND invalidated_at IS NULL AND expires_at > ?";
+  const auditMetadata = JSON.stringify({ email: normalizedInvitationEmail, membershipId });
+  const membershipMutation = existingMembership
+    ? env.DB.prepare(
+      `UPDATE memberships SET user_id = ?, email = ?, active = 1, updated_at = ?, deactivated_at = NULL
+       WHERE organization_id = ? AND id = ?
+       AND EXISTS (SELECT 1 FROM invitations WHERE ${eligibility})`,
+    ).bind(
+      actorIdentity.userId,
+      normalizedInvitationEmail,
+      acceptedAt,
+      organizationId,
+      membershipId,
+      invitation.id,
+      organizationId,
+      tokenHash,
+      normalizedInvitationEmail,
+      acceptedAt,
+    )
+    : env.DB.prepare(
+      `INSERT INTO memberships (id, organization_id, user_id, email, active, created_at, updated_at, deactivated_at)
+       SELECT ?, ?, ?, ?, 1, ?, ?, NULL FROM invitations WHERE ${eligibility}`,
+    ).bind(
+      membershipId,
+      organizationId,
+      actorIdentity.userId,
+      normalizedInvitationEmail,
+      membershipCreatedAt,
+      acceptedAt,
+      invitation.id,
+      organizationId,
+      tokenHash,
+      normalizedInvitationEmail,
+      acceptedAt,
+    );
+
+  const results = await env.DB.batch([
+    membershipMutation,
+    env.DB.prepare(
+      `UPDATE invitations SET invalidated_at = ?
+       WHERE organization_id = ? AND lower(trim(email)) = ? AND id <> ? AND accepted_at IS NULL AND invalidated_at IS NULL
+       AND EXISTS (SELECT 1 FROM invitations AS current_invitation WHERE current_invitation.${eligibility})`,
+    ).bind(
+      acceptedAt,
+      organizationId,
+      normalizedInvitationEmail,
+      invitation.id,
+      invitation.id,
+      organizationId,
+      tokenHash,
+      normalizedInvitationEmail,
+      acceptedAt,
+    ),
+    env.DB.prepare(
+      `INSERT INTO audit_events (id, organization_id, actor_user_id, action, entity_id, metadata_json, created_at)
+       SELECT ?, ?, ?, ?, ?, ?, ? FROM invitations WHERE ${eligibility}`,
+    ).bind(
+      randomUUID(),
+      organizationId,
+      actorIdentity.userId,
+      "invitation_accepted",
+      invitation.id,
+      auditMetadata,
+      acceptedAt,
+      invitation.id,
+      organizationId,
+      tokenHash,
+      normalizedInvitationEmail,
+      acceptedAt,
+    ),
+    env.DB.prepare(
+      `UPDATE invitations SET accepted_at = ? WHERE ${eligibility}`,
+    ).bind(acceptedAt, invitation.id, organizationId, tokenHash, normalizedInvitationEmail, acceptedAt),
+  ]);
+
+  const acceptanceResult = Array.isArray(results) ? results[3] : undefined;
+  if (changes(acceptanceResult) !== 1) {
+    throw new OfficerConflictError("INVITATION_INVALID", "This invitation is invalid, expired, or has already been used.");
+  }
+
+  return {
+    id: membershipId,
+    email: normalizedInvitationEmail,
+    userId: actorIdentity.userId,
+    active: true,
+    createdAt: iso(membershipCreatedAt),
+    updatedAt: iso(acceptedAt),
+    deactivatedAt: null,
+  };
+}
+
+export async function deactivateOfficer(
+  env: StorageEnvironment,
+  actor: Actor,
+  membershipId: string,
+  at = new Date(),
+): Promise<void> {
+  const deactivatedAt = at.getTime();
+  const results = await env.DB.batch([
+    env.DB.prepare(
+      `INSERT INTO audit_events (id, organization_id, actor_user_id, action, entity_id, metadata_json, created_at)
+       SELECT ?, target.organization_id, ?, ?, target.id, json_object('email', target.email), ?
+       FROM memberships AS target
+       WHERE target.organization_id = ? AND target.id = ? AND target.active = 1
+       AND EXISTS (
+         SELECT 1 FROM memberships AS other
+         WHERE other.organization_id = ? AND other.active = 1 AND other.id <> ?
+       )`,
+    ).bind(randomUUID(), actor.userId, "officer_deactivated", deactivatedAt, actor.organizationId, membershipId, actor.organizationId, membershipId),
+    env.DB.prepare(
+      `UPDATE memberships SET active = 0, updated_at = ?, deactivated_at = ?
+       WHERE organization_id = ? AND id = ? AND active = 1
+       AND EXISTS (
+         SELECT 1 FROM memberships AS other
+         WHERE other.organization_id = ? AND other.active = 1 AND other.id <> ?
+       )`,
+    ).bind(deactivatedAt, deactivatedAt, actor.organizationId, membershipId, actor.organizationId, membershipId),
+  ]);
+
+  const updateResult = Array.isArray(results) ? results[1] : undefined;
+  if (changes(updateResult) === 1) return;
+
+  const target = await env.DB.prepare(
+    "SELECT id, active FROM memberships WHERE organization_id = ? AND id = ? LIMIT 1",
+  ).bind(actor.organizationId, membershipId).first<MembershipStateRow>();
+  if (target?.active === 1) {
+    throw new OfficerConflictError("LAST_ACTIVE_OFFICER", "An organization must retain at least one active officer.");
+  }
+  throw new Error("Officer membership was not found or is inactive.");
+}

warning: in the working copy of 'tests/server/officers-repository.test.ts', LF will be replaced by CRLF the next time Git touches it
diff --git a/tests/server/officers-repository.test.ts b/tests/server/officers-repository.test.ts
new file mode 100644
index 0000000..755e106
--- /dev/null
+++ b/tests/server/officers-repository.test.ts
@@ -0,0 +1,710 @@
+import { createHash } from "node:crypto";
+import { describe, expect, it } from "vitest";
+import {
+  acceptOfficerInvitation,
+  createOfficerInvitation,
+  deactivateOfficer,
+  listOfficers,
+} from "../../src/server/officers-repository";
+import type { Actor, D1Database, D1PreparedStatement, R2Bucket, StorageEnvironment } from "../../src/server/types";
+
+type MembershipRow = {
+  id: string;
+  organization_id: string;
+  user_id: string;
+  email: string;
+  active: number;
+  created_at: number;
+  updated_at: number | null;
+  deactivated_at: number | null;
+};
+
+type InvitationRow = {
+  id: string;
+  organization_id: string;
+  email: string;
+  token_hash: string;
+  expires_at: number;
+  accepted_at: number | null;
+  created_at: number;
+  created_by: string | null;
+  invalidated_at: number | null;
+};
+
+type AuditRow = {
+  id: string;
+  organization_id: string;
+  actor_user_id: string;
+  action: string;
+  entity_id: string | null;
+  metadata_json: string;
+  created_at: number;
+};
+
+type MutationResult = { success: true; meta: { changes: number } };
+
+const normalizedSql = (sql: string) => sql.replace(/\s+/g, " ").trim();
+
+class FakePreparedStatement implements D1PreparedStatement {
+  values: unknown[] = [];
+
+  constructor(readonly database: FakeD1Database, readonly sql: string) {}
+
+  bind(...values: unknown[]) {
+    this.values = values;
+    return this;
+  }
+
+  async first<T>() {
+    return this.database.first(this.sql, this.values) as T | null;
+  }
+
+  async all<T>() {
+    return { results: this.database.all(this.sql, this.values) as T[] };
+  }
+
+  async run() {
+    return this.database.mutate(this.sql, this.values);
+  }
+}
+
+class FakeD1Database implements D1Database {
+  readonly statements: FakePreparedStatement[] = [];
+  memberships: MembershipRow[];
+  invitations: InvitationRow[];
+  auditEvents: AuditRow[];
+  beforeBatch: (() => void) | undefined;
+
+  constructor(rows: { memberships?: MembershipRow[]; invitations?: InvitationRow[]; auditEvents?: AuditRow[] } = {}) {
+    this.memberships = structuredClone(rows.memberships ?? []);
+    this.invitations = structuredClone(rows.invitations ?? []);
+    this.auditEvents = structuredClone(rows.auditEvents ?? []);
+  }
+
+  prepare(sql: string) {
+    const statement = new FakePreparedStatement(this, sql);
+    this.statements.push(statement);
+    return statement;
+  }
+
+  async batch(statements: D1PreparedStatement[]) {
+    const beforeBatch = this.beforeBatch;
+    this.beforeBatch = undefined;
+    beforeBatch?.();
+    const snapshot = structuredClone({
+      memberships: this.memberships,
+      invitations: this.invitations,
+      auditEvents: this.auditEvents,
+    });
+    try {
+      return (statements as FakePreparedStatement[]).map((statement) => this.mutate(statement.sql, statement.values));
+    } catch (error) {
+      this.memberships = snapshot.memberships;
+      this.invitations = snapshot.invitations;
+      this.auditEvents = snapshot.auditEvents;
+      throw error;
+    }
+  }
+
+  all(sql: string, values: unknown[]) {
+    const query = normalizedSql(sql);
+    if (query.includes("FROM memberships")) {
+      const organizationId = String(values[0]);
+      return this.memberships
+        .filter((row) => row.organization_id === organizationId)
+        .sort((left, right) => right.active - left.active || left.email.localeCompare(right.email));
+    }
+    if (query.includes("FROM invitations")) {
+      const organizationId = String(values[0]);
+      return this.invitations
+        .filter((row) => row.organization_id === organizationId && row.accepted_at === null && row.invalidated_at === null)
+        .sort((left, right) => right.created_at - left.created_at);
+    }
+    throw new Error(`Unsupported all query: ${query}`);
+  }
+
+  first(sql: string, values: unknown[]) {
+    const query = normalizedSql(sql);
+    const hasEmailPredicate = query.includes("email = ?") || query.includes("lower(trim(email)) = ?");
+    if (query.includes("FROM invitations") && query.includes("token_hash = ?")) {
+      const [organizationId, tokenHash] = values.map(String);
+      return this.invitations.find((row) => row.organization_id === organizationId && row.token_hash === tokenHash) ?? null;
+    }
+    if (query.includes("FROM memberships") && hasEmailPredicate && query.includes("active = 1")) {
+      const [organizationId, email] = values.map(String);
+      return this.memberships.find((row) => row.organization_id === organizationId && this.emailMatches(query, row.email, email) && row.active === 1) ?? null;
+    }
+    if (query.includes("FROM memberships") && hasEmailPredicate) {
+      const [organizationId, email] = values.map(String);
+      return this.memberships.find((row) => row.organization_id === organizationId && this.emailMatches(query, row.email, email)) ?? null;
+    }
+    if (query.includes("FROM memberships") && query.includes("id = ?")) {
+      const [organizationId, id] = values.map(String);
+      return this.memberships.find((row) => row.organization_id === organizationId && row.id === id) ?? null;
+    }
+    throw new Error(`Unsupported first query: ${query}`);
+  }
+
+  private emailMatches(query: string, storedEmail: string, boundEmail: string) {
+    return query.includes("lower(trim(email)) = ?") ? storedEmail.trim().toLowerCase() === boundEmail : storedEmail === boundEmail;
+  }
+
+  private eligibleInvitation(id: string, organizationId: string, tokenHash: string, email: string, at: number) {
+    return this.invitations.find((row) =>
+      row.id === id
+      && row.organization_id === organizationId
+      && row.token_hash === tokenHash
+      && row.email === email
+      && row.accepted_at === null
+      && row.invalidated_at === null
+      && row.expires_at > at,
+    );
+  }
+
+  private deactivationEligible(organizationId: string, id: string, otherOrganizationId: string, excludedId: string) {
+    const target = this.memberships.find((row) => row.organization_id === organizationId && row.id === id && row.active === 1);
+    const anotherActive = this.memberships.some((row) => row.organization_id === otherOrganizationId && row.id !== excludedId && row.active === 1);
+    return target && anotherActive ? target : null;
+  }
+
+  mutate(sql: string, values: unknown[]): MutationResult {
+    const query = normalizedSql(sql);
+    if (query.startsWith("UPDATE memberships SET user_id = ?")) {
+      const [userId, email, updatedAt, organizationId, id, invitationId, invitationOrganizationId, tokenHash, invitationEmail, validAt] = values as [string, string, number, string, string, string, string, string, string, number];
+      if (!this.eligibleInvitation(invitationId, invitationOrganizationId, tokenHash, invitationEmail, validAt)) {
+        return { success: true, meta: { changes: 0 } };
+      }
+      const existing = this.memberships.find((row) => row.organization_id === organizationId && row.id === id);
+      if (!existing) return { success: true, meta: { changes: 0 } };
+      existing.user_id = userId;
+      existing.email = email;
+      existing.active = 1;
+      existing.updated_at = updatedAt;
+      existing.deactivated_at = null;
+      return { success: true, meta: { changes: 1 } };
+    }
+    if (query.startsWith("INSERT INTO memberships") && query.includes("FROM invitations")) {
+      const [id, organizationId, userId, email, createdAt, updatedAt, invitationId, invitationOrganizationId, tokenHash, invitationEmail, validAt] = values as [string, string, string, string, number, number, string, string, string, string, number];
+      if (!this.eligibleInvitation(invitationId, invitationOrganizationId, tokenHash, invitationEmail, validAt)) {
+        return { success: true, meta: { changes: 0 } };
+      }
+      if (this.memberships.some((row) => row.id === id)) throw new Error("UNIQUE constraint failed: memberships.id");
+      this.memberships.push({
+        id,
+        organization_id: organizationId,
+        user_id: userId,
+        email,
+        active: 1,
+        created_at: createdAt,
+        updated_at: updatedAt,
+        deactivated_at: null,
+      });
+      return { success: true, meta: { changes: 1 } };
+    }
+    if (query.startsWith("UPDATE invitations SET accepted_at = ?")) {
+      const [acceptedAt, id, organizationId, tokenHash, email, validAt] = values as [number, string, string, string, string, number];
+      const eligible = this.eligibleInvitation(id, organizationId, tokenHash, email, validAt);
+      if (!eligible) return { success: true, meta: { changes: 0 } };
+      eligible.accepted_at = acceptedAt;
+      return { success: true, meta: { changes: 1 } };
+    }
+    if (query.startsWith("UPDATE invitations SET invalidated_at = ?") && query.includes("id <> ?")) {
+      const [invalidatedAt, organizationId, email, excludedId, currentId, currentOrganizationId, tokenHash, currentEmail, validAt] = values as [number, string, string, string, string, string, string, string, number];
+      if (!this.eligibleInvitation(currentId, currentOrganizationId, tokenHash, currentEmail, validAt)) {
+        return { success: true, meta: { changes: 0 } };
+      }
+      let changes = 0;
+      for (const row of this.invitations) {
+        if (row.organization_id === organizationId && row.email === email && row.id !== excludedId && row.accepted_at === null && row.invalidated_at === null) {
+          row.invalidated_at = invalidatedAt;
+          changes += 1;
+        }
+      }
+      return { success: true, meta: { changes } };
+    }
+    if (query.startsWith("UPDATE invitations SET invalidated_at = ?")) {
+      const [invalidatedAt, organizationId, email, unexpiredAt] = values as [number, string, string, number];
+      let changes = 0;
+      for (const row of this.invitations) {
+        if (row.organization_id === organizationId && this.emailMatches(query, row.email, email) && row.accepted_at === null && row.invalidated_at === null && row.expires_at > unexpiredAt) {
+          row.invalidated_at = invalidatedAt;
+          changes += 1;
+        }
+      }
+      return { success: true, meta: { changes } };
+    }
+    if (query.startsWith("INSERT INTO invitations")) {
+      const [id, organizationId, email, tokenHash, expiresAt, createdAt, createdBy] = values as [string, string, string, string, number, number, string];
+      this.invitations.push({
+        id,
+        organization_id: organizationId,
+        email,
+        token_hash: tokenHash,
+        expires_at: expiresAt,
+        accepted_at: null,
+        created_at: createdAt,
+        created_by: createdBy,
+        invalidated_at: null,
+      });
+      return { success: true, meta: { changes: 1 } };
+    }
+    if (query.startsWith("UPDATE memberships SET active = 0")) {
+      const [updatedAt, deactivatedAt, organizationId, id, otherOrganizationId, excludedId] = values as [number, number, string, string, string, string];
+      const target = this.deactivationEligible(organizationId, id, otherOrganizationId, excludedId);
+      if (!target) return { success: true, meta: { changes: 0 } };
+      target.active = 0;
+      target.updated_at = updatedAt;
+      target.deactivated_at = deactivatedAt;
+      return { success: true, meta: { changes: 1 } };
+    }
+    if (query.startsWith("INSERT INTO audit_events")) {
+      if (query.includes("FROM memberships")) {
+        const [id, actorUserId, action, createdAt, organizationId, entityId, otherOrganizationId, excludedId] = values as [string, string, string, number, string, string, string, string];
+        const target = this.deactivationEligible(organizationId, entityId, otherOrganizationId, excludedId);
+        if (!target) return { success: true, meta: { changes: 0 } };
+        this.auditEvents.push({
+          id,
+          organization_id: organizationId,
+          actor_user_id: actorUserId,
+          action,
+          entity_id: entityId,
+          metadata_json: JSON.stringify({ email: target.email }),
+          created_at: createdAt,
+        });
+        return { success: true, meta: { changes: 1 } };
+      }
+      const [id, organizationId, actorUserId, action, entityId, metadataJson, createdAt] = values as [string, string, string, string, string | null, string, number];
+      if (query.includes("FROM invitations")) {
+        const [invitationId, invitationOrganizationId, tokenHash, invitationEmail, validAt] = values.slice(7) as [string, string, string, string, number];
+        if (!this.eligibleInvitation(invitationId, invitationOrganizationId, tokenHash, invitationEmail, validAt)) {
+          return { success: true, meta: { changes: 0 } };
+        }
+      }
+      this.auditEvents.push({
+        id,
+        organization_id: organizationId,
+        actor_user_id: actorUserId,
+        action,
+        entity_id: entityId,
+        metadata_json: metadataJson,
+        created_at: createdAt,
+      });
+      return { success: true, meta: { changes: 1 } };
+    }
+    throw new Error(`Unsupported mutation: ${query}`);
+  }
+}
+
+class FakeUploads implements R2Bucket {
+  async put() {}
+  async delete() {}
+}
+
+const actor: Actor = {
+  userId: "actor-user",
+  email: "actor@stuco.example",
+  displayName: "Alex Officer",
+  organizationId: "org-a",
+};
+
+const environment = (database: FakeD1Database): StorageEnvironment => ({ DB: database, UPLOADS: new FakeUploads() });
+
+const membership = (overrides: Partial<MembershipRow> = {}): MembershipRow => ({
+  id: "membership-a",
+  organization_id: "org-a",
+  user_id: "user-a",
+  email: "active@stuco.example",
+  active: 1,
+  created_at: Date.parse("2026-08-01T00:00:00.000Z"),
+  updated_at: null,
+  deactivated_at: null,
+  ...overrides,
+});
+
+const invitation = (overrides: Partial<InvitationRow> = {}): InvitationRow => ({
+  id: "invitation-a",
+  organization_id: "org-a",
+  email: "invitee@stuco.example",
+  token_hash: createHash("sha256").update("raw-token").digest("hex"),
+  expires_at: Date.parse("2026-08-30T00:00:00.000Z"),
+  accepted_at: null,
+  created_at: Date.parse("2026-08-20T00:00:00.000Z"),
+  created_by: "actor-user",
+  invalidated_at: null,
+  ...overrides,
+});
+
+const acceptingActor = {
+  userId: "accepted-user",
+  email: "invitee@stuco.example",
+  displayName: "Invited Officer",
+};
+
+const rawInvitationToken = "fixed-raw-invitation-token";
+const rawInvitationTokenHash = createHash("sha256").update(rawInvitationToken).digest("hex");
+
+describe("officer repository lifecycle", () => {
+  it("lists only the actor organization and maps lifecycle dates and invitation status", async () => {
+    const at = new Date("2026-08-26T12:00:00.000Z");
+    const database = new FakeD1Database({
+      memberships: [
+        membership(),
+        membership({ id: "membership-inactive", user_id: "user-inactive", email: "inactive@stuco.example", active: 0, updated_at: Date.parse("2026-08-21T00:00:00.000Z"), deactivated_at: Date.parse("2026-08-21T00:00:00.000Z") }),
+        membership({ id: "membership-other", organization_id: "org-b", email: "other@stuco.example" }),
+      ],
+      invitations: [
+        invitation(),
+        invitation({ id: "invitation-expired", email: "expired@stuco.example", expires_at: Date.parse("2026-08-26T12:00:00.000Z"), created_at: Date.parse("2026-08-19T00:00:00.000Z") }),
+        invitation({ id: "invitation-accepted", accepted_at: Date.parse("2026-08-22T00:00:00.000Z") }),
+        invitation({ id: "invitation-invalidated", invalidated_at: Date.parse("2026-08-22T00:00:00.000Z") }),
+        invitation({ id: "invitation-other", organization_id: "org-b", email: "other@stuco.example" }),
+      ],
+    });
+
+    const result = await listOfficers(environment(database), actor, at);
+
+    expect(result).toEqual({
+      memberships: [
+        {
+          id: "membership-a",
+          email: "active@stuco.example",
+          userId: "user-a",
+          active: true,
+          createdAt: "2026-08-01T00:00:00.000Z",
+          updatedAt: null,
+          deactivatedAt: null,
+        },
+        {
+          id: "membership-inactive",
+          email: "inactive@stuco.example",
+          userId: "user-inactive",
+          active: false,
+          createdAt: "2026-08-01T00:00:00.000Z",
+          updatedAt: "2026-08-21T00:00:00.000Z",
+          deactivatedAt: "2026-08-21T00:00:00.000Z",
+        },
+      ],
+      invitations: [
+        {
+          id: "invitation-a",
+          email: "invitee@stuco.example",
+          status: "pending",
+          expiresAt: "2026-08-30T00:00:00.000Z",
+          createdAt: "2026-08-20T00:00:00.000Z",
+          createdBy: "actor-user",
+        },
+        {
+          id: "invitation-expired",
+          email: "expired@stuco.example",
+          status: "expired",
+          expiresAt: "2026-08-26T12:00:00.000Z",
+          createdAt: "2026-08-19T00:00:00.000Z",
+          createdBy: "actor-user",
+        },
+      ],
+    });
+  });
+
+  it("creates a normalized seven-day invitation while replacing prior pending links without exposing the stored hash", async () => {
+    const at = new Date("2026-08-26T12:00:00.000Z");
+    const prior = invitation({ id: "prior", email: "new@stuco.example", expires_at: Date.parse("2026-08-28T00:00:00.000Z") });
+    const database = new FakeD1Database({ invitations: [prior] });
+
+    const result = await createOfficerInvitation(environment(database), actor, "  NEW@STUCO.EXAMPLE  ", "https://stuco.example", at);
+
+    const inserted = database.invitations.find((row) => row.id === result.invitation.id);
+    const rawToken = new URL(result.invitationUrl).searchParams.get("token");
+    expect(result.invitationUrl).toMatch(/^https:\/\/stuco\.example\/invite\?token=/);
+    expect(inserted?.token_hash).toMatch(/^[a-f0-9]{64}$/);
+    expect(result.invitationUrl).not.toContain(inserted?.token_hash ?? "missing-hash");
+    expect(inserted && inserted.expires_at - inserted.created_at).toBe(7 * 24 * 60 * 60 * 1000);
+    expect(rawToken).not.toBeNull();
+    expect(inserted?.token_hash).toBe(createHash("sha256").update(rawToken ?? "").digest("hex"));
+    expect(inserted?.email).toBe("new@stuco.example");
+    expect(database.invitations.find((row) => row.id === "prior")?.invalidated_at).toBe(at.getTime());
+    expect(result.invitation).toEqual({
+      id: inserted?.id,
+      email: "new@stuco.example",
+      status: "pending",
+      expiresAt: "2026-09-02T12:00:00.000Z",
+      createdAt: "2026-08-26T12:00:00.000Z",
+      createdBy: "actor-user",
+    });
+    expect(database.auditEvents).toHaveLength(1);
+    expect(database.auditEvents[0]).toMatchObject({ organization_id: "org-a", actor_user_id: "actor-user", action: "invitation_created", entity_id: inserted?.id });
+    expect(JSON.parse(database.auditEvents[0].metadata_json)).toEqual({ email: "new@stuco.example" });
+    expect(database.auditEvents[0].metadata_json).not.toContain(rawToken ?? "raw-token-missing");
+    expect(database.auditEvents[0].metadata_json).not.toContain(inserted?.token_hash ?? "hash-missing");
+  });
+
+  it("rejects inviting an active member without invalidating invitations or writing audit", async () => {
+    const pending = invitation({ email: "active@stuco.example" });
+    const database = new FakeD1Database({ memberships: [membership()], invitations: [pending] });
+
+    await expect(createOfficerInvitation(environment(database), actor, "ACTIVE@STUCO.EXAMPLE", "https://stuco.example", new Date("2026-08-26T12:00:00.000Z")))
+      .rejects.toMatchObject({ code: "ACTIVE_MEMBER_EXISTS" });
+
+    expect(database.invitations).toEqual([pending]);
+    expect(database.auditEvents).toEqual([]);
+  });
+
+  it("rejects a normalized email that matches a legacy active membership with mixed casing", async () => {
+    const database = new FakeD1Database({ memberships: [membership({ email: "  Active@Stuco.Example " })] });
+
+    await expect(createOfficerInvitation(environment(database), actor, "active@stuco.example", "https://stuco.example", new Date("2026-08-26T12:00:00.000Z")))
+      .rejects.toMatchObject({ code: "ACTIVE_MEMBER_EXISTS" });
+
+    expect(database.invitations).toEqual([]);
+    expect(database.auditEvents).toEqual([]);
+  });
+
+  it("invalidates a legacy mixed-case pending invitation when creating its normalized replacement", async () => {
+    const at = new Date("2026-08-26T12:00:00.000Z");
+    const database = new FakeD1Database({ invitations: [invitation({ id: "legacy", email: " Invitee@Stuco.Example " })] });
+
+    await createOfficerInvitation(environment(database), actor, "invitee@stuco.example", "https://stuco.example", at);
+
+    expect(database.invitations.find((row) => row.id === "legacy")?.invalidated_at).toBe(at.getTime());
+  });
+
+  it("accepts a valid invitation by creating a membership and a token-free audit event", async () => {
+    const at = new Date("2026-08-26T12:00:00.000Z");
+    const database = new FakeD1Database({ invitations: [invitation({ token_hash: rawInvitationTokenHash })] });
+
+    const result = await acceptOfficerInvitation(environment(database), acceptingActor, "org-a", rawInvitationToken, at);
+
+    expect(result).toEqual({
+      id: expect.any(String),
+      email: "invitee@stuco.example",
+      userId: "accepted-user",
+      active: true,
+      createdAt: "2026-08-26T12:00:00.000Z",
+      updatedAt: "2026-08-26T12:00:00.000Z",
+      deactivatedAt: null,
+    });
+    expect(database.memberships).toHaveLength(1);
+    expect(database.memberships[0]).toMatchObject({ id: result.id, organization_id: "org-a", user_id: "accepted-user", email: "invitee@stuco.example", active: 1 });
+    expect(database.invitations[0].accepted_at).toBe(at.getTime());
+    expect(database.auditEvents).toHaveLength(1);
+    expect(database.auditEvents[0]).toMatchObject({ organization_id: "org-a", actor_user_id: "accepted-user", action: "invitation_accepted", entity_id: "invitation-a" });
+    expect(JSON.parse(database.auditEvents[0].metadata_json)).toEqual({ email: "invitee@stuco.example", membershipId: result.id });
+    expect(database.auditEvents[0].metadata_json).not.toContain(rawInvitationToken);
+    expect(database.auditEvents[0].metadata_json).not.toContain(rawInvitationTokenHash);
+  });
+
+  it("reactivates the matching inactive membership and preserves its identity and creation date", async () => {
+    const at = new Date("2026-08-26T12:00:00.000Z");
+    const existing = membership({
+      id: "inactive-membership",
+      user_id: "former-user",
+      email: "invitee@stuco.example",
+      active: 0,
+      created_at: Date.parse("2025-09-01T00:00:00.000Z"),
+      updated_at: Date.parse("2026-06-01T00:00:00.000Z"),
+      deactivated_at: Date.parse("2026-06-01T00:00:00.000Z"),
+    });
+    const database = new FakeD1Database({ memberships: [existing], invitations: [invitation({ token_hash: rawInvitationTokenHash })] });
+
+    const result = await acceptOfficerInvitation(environment(database), { ...acceptingActor, email: "  INVITEE@STUCO.EXAMPLE " }, "org-a", rawInvitationToken, at);
+
+    expect(result).toEqual({
+      id: "inactive-membership",
+      email: "invitee@stuco.example",
+      userId: "accepted-user",
+      active: true,
+      createdAt: "2025-09-01T00:00:00.000Z",
+      updatedAt: "2026-08-26T12:00:00.000Z",
+      deactivatedAt: null,
+    });
+    expect(database.memberships).toHaveLength(1);
+    expect(database.memberships[0]).toMatchObject({ id: "inactive-membership", user_id: "accepted-user", active: 1, deactivated_at: null, updated_at: at.getTime() });
+  });
+
+  it("reactivates a legacy inactive membership whose stored email normalizes to the invitation email", async () => {
+    const existing = membership({ id: "legacy-inactive", email: " Invitee@Stuco.Example ", active: 0 });
+    const database = new FakeD1Database({ memberships: [existing], invitations: [invitation({ token_hash: rawInvitationTokenHash })] });
+
+    const result = await acceptOfficerInvitation(environment(database), acceptingActor, "org-a", rawInvitationToken, new Date("2026-08-26T12:00:00.000Z"));
+
+    expect(result.id).toBe("legacy-inactive");
+    expect(database.memberships).toHaveLength(1);
+    expect(database.memberships[0]).toMatchObject({ id: "legacy-inactive", email: "invitee@stuco.example", active: 1 });
+  });
+
+  it("invalidates other outstanding links for the accepted organization and email only", async () => {
+    const at = new Date("2026-08-26T12:00:00.000Z");
+    const database = new FakeD1Database({
+      invitations: [
+        invitation({ token_hash: rawInvitationTokenHash }),
+        invitation({ id: "sibling", token_hash: createHash("sha256").update("sibling").digest("hex") }),
+        invitation({ id: "other-email", email: "different@stuco.example", token_hash: createHash("sha256").update("different").digest("hex") }),
+        invitation({ id: "other-org", organization_id: "org-b", token_hash: createHash("sha256").update("other-org").digest("hex") }),
+      ],
+    });
+
+    await acceptOfficerInvitation(environment(database), acceptingActor, "org-a", rawInvitationToken, at);
+
+    expect(database.invitations.find((row) => row.id === "sibling")?.invalidated_at).toBe(at.getTime());
+    expect(database.invitations.find((row) => row.id === "other-email")?.invalidated_at).toBeNull();
+    expect(database.invitations.find((row) => row.id === "other-org")?.invalidated_at).toBeNull();
+  });
+
+  it("makes an accepted token single-use without a second membership or audit mutation", async () => {
+    const at = new Date("2026-08-26T12:00:00.000Z");
+    const database = new FakeD1Database({ invitations: [invitation({ token_hash: rawInvitationTokenHash })] });
+    await acceptOfficerInvitation(environment(database), acceptingActor, "org-a", rawInvitationToken, at);
+    const stateAfterFirstAcceptance = structuredClone({ memberships: database.memberships, auditEvents: database.auditEvents, invitations: database.invitations });
+
+    await expect(acceptOfficerInvitation(environment(database), acceptingActor, "org-a", rawInvitationToken, at))
+      .rejects.toMatchObject({ code: "INVITATION_INVALID" });
+
+    expect({ memberships: database.memberships, auditEvents: database.auditEvents, invitations: database.invitations }).toEqual(stateAfterFirstAcceptance);
+  });
+
+  it.each([
+    {
+      name: "expired",
+      invitationChanges: { expires_at: Date.parse("2026-08-26T12:00:00.000Z") },
+      organizationId: "org-a",
+      identity: acceptingActor,
+      code: "INVITATION_INVALID",
+    },
+    {
+      name: "already accepted",
+      invitationChanges: { accepted_at: Date.parse("2026-08-25T00:00:00.000Z") },
+      organizationId: "org-a",
+      identity: acceptingActor,
+      code: "INVITATION_INVALID",
+    },
+    {
+      name: "invalidated",
+      invitationChanges: { invalidated_at: Date.parse("2026-08-25T00:00:00.000Z") },
+      organizationId: "org-a",
+      identity: acceptingActor,
+      code: "INVITATION_INVALID",
+    },
+    {
+      name: "wrong organization",
+      invitationChanges: {},
+      organizationId: "org-b",
+      identity: acceptingActor,
+      code: "INVITATION_INVALID",
+    },
+    {
+      name: "wrong signed-in email",
+      invitationChanges: {},
+      organizationId: "org-a",
+      identity: { ...acceptingActor, email: "someone-else@stuco.example" },
+      code: "INVITATION_EMAIL_MISMATCH",
+    },
+  ])("rejects a $name invitation without membership, invitation, or audit mutation", async ({ invitationChanges, organizationId, identity, code }) => {
+    const database = new FakeD1Database({ invitations: [invitation({ token_hash: rawInvitationTokenHash, ...invitationChanges })] });
+    const initialState = structuredClone({ memberships: database.memberships, invitations: database.invitations, auditEvents: database.auditEvents });
+
+    await expect(acceptOfficerInvitation(environment(database), identity, organizationId, rawInvitationToken, new Date("2026-08-26T12:00:00.000Z")))
+      .rejects.toMatchObject({ code });
+
+    expect({ memberships: database.memberships, invitations: database.invitations, auditEvents: database.auditEvents }).toEqual(initialState);
+  });
+
+  it("fails closed when invitation eligibility changes after lookup but before the atomic batch", async () => {
+    const at = new Date("2026-08-26T12:00:00.000Z");
+    const database = new FakeD1Database({ invitations: [invitation({ token_hash: rawInvitationTokenHash })] });
+    database.beforeBatch = () => {
+      database.invitations[0].accepted_at = at.getTime() - 1;
+    };
+
+    await expect(acceptOfficerInvitation(environment(database), acceptingActor, "org-a", rawInvitationToken, at))
+      .rejects.toMatchObject({ code: "INVITATION_INVALID" });
+
+    expect(database.memberships).toEqual([]);
+    expect(database.auditEvents).toEqual([]);
+    expect(database.invitations[0].accepted_at).toBe(at.getTime() - 1);
+  });
+
+  it("deactivates an officer with lifecycle timestamps and an organization-scoped audit event", async () => {
+    const at = new Date("2026-08-26T12:00:00.000Z");
+    const database = new FakeD1Database({
+      memberships: [
+        membership(),
+        membership({ id: "membership-b", user_id: "user-b", email: "second@stuco.example" }),
+      ],
+    });
+
+    await deactivateOfficer(environment(database), actor, "membership-a", at);
+
+    expect(database.memberships.find((row) => row.id === "membership-a")).toMatchObject({ active: 0, updated_at: at.getTime(), deactivated_at: at.getTime() });
+    expect(database.memberships.find((row) => row.id === "membership-b")?.active).toBe(1);
+    expect(database.auditEvents).toHaveLength(1);
+    expect(database.auditEvents[0]).toMatchObject({
+      organization_id: "org-a",
+      actor_user_id: "actor-user",
+      action: "officer_deactivated",
+      entity_id: "membership-a",
+      created_at: at.getTime(),
+    });
+    expect(JSON.parse(database.auditEvents[0].metadata_json)).toEqual({ email: "active@stuco.example" });
+  });
+
+  it("allows self-deactivation when another active officer remains", async () => {
+    const at = new Date("2026-08-26T12:00:00.000Z");
+    const database = new FakeD1Database({
+      memberships: [
+        membership({ id: "self", user_id: actor.userId, email: actor.email }),
+        membership({ id: "remaining", user_id: "remaining-user", email: "remaining@stuco.example" }),
+      ],
+    });
+
+    await deactivateOfficer(environment(database), actor, "self", at);
+
+    expect(database.memberships.find((row) => row.id === "self")?.active).toBe(0);
+    expect(database.memberships.find((row) => row.id === "remaining")?.active).toBe(1);
+    expect(database.auditEvents).toHaveLength(1);
+  });
+
+  it("rejects deactivating the last active officer without membership or audit mutation", async () => {
+    const database = new FakeD1Database({ memberships: [membership()] });
+    const initialMemberships = structuredClone(database.memberships);
+
+    await expect(deactivateOfficer(environment(database), actor, "membership-a", new Date("2026-08-26T12:00:00.000Z")))
+      .rejects.toMatchObject({ code: "LAST_ACTIVE_OFFICER" });
+
+    expect(database.memberships).toEqual(initialMemberships);
+    expect(database.auditEvents).toEqual([]);
+  });
+
+  it("rejects a cross-organization target without reading or mutating that membership", async () => {
+    const database = new FakeD1Database({
+      memberships: [
+        membership({ id: "org-a-one" }),
+        membership({ id: "org-a-two", email: "second@stuco.example" }),
+        membership({ id: "foreign-target", organization_id: "org-b", email: "foreign@stuco.example" }),
+      ],
+    });
+    const initialMemberships = structuredClone(database.memberships);
+
+    await expect(deactivateOfficer(environment(database), actor, "foreign-target", new Date("2026-08-26T12:00:00.000Z")))
+      .rejects.toThrow("not found");
+
+    expect(database.memberships).toEqual(initialMemberships);
+    expect(database.auditEvents).toEqual([]);
+  });
+
+  it("rechecks another active officer inside the conditional batch and fails closed if none remains", async () => {
+    const database = new FakeD1Database({
+      memberships: [
+        membership(),
+        membership({ id: "concurrent-officer", email: "concurrent@stuco.example" }),
+      ],
+    });
+    database.beforeBatch = () => {
+      database.memberships.find((row) => row.id === "concurrent-officer")!.active = 0;
+    };
+
+    await expect(deactivateOfficer(environment(database), actor, "membership-a", new Date("2026-08-26T12:00:00.000Z")))
+      .rejects.toMatchObject({ code: "LAST_ACTIVE_OFFICER" });
+
+    expect(database.memberships.find((row) => row.id === "membership-a")?.active).toBe(1);
+    expect(database.auditEvents).toEqual([]);
+  });
+});


