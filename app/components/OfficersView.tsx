"use client";

import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OfficerInvitation, OfficerMembership, OfficersSnapshot } from "../../src/server/officer-types";

type ApiIssue = { code?: string; message?: string };
type ApiFailure = { ok?: false; issues?: ApiIssue[] };

const formatDate = (value: string | null) => value
  ? new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" })
  : "Not recorded";

const responseMessage = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => null) as ApiFailure | null;
  return body?.issues?.[0]?.message || fallback;
};

export async function requestOfficerJson<T>(fetcher: typeof fetch, url: string, init?: RequestInit): Promise<T> {
  const response = await fetcher(url, init);
  if (!response.ok) throw new Error(await responseMessage(response, "Officer access is temporarily unavailable."));
  return response.json() as Promise<T>;
}

const jsonMutation = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export async function createInvitationRequest(fetcher: typeof fetch, email: string) {
  const body = await requestOfficerJson<{ ok: true; invitation: OfficerInvitation; invitationUrl: string }>(
    fetcher,
    "/api/officers/invitations",
    jsonMutation({ email }),
  );
  return { invitation: body.invitation, invitationUrl: body.invitationUrl };
}

export async function acceptInvitationRequest(fetcher: typeof fetch, credentials: { organizationId: string; token: string }) {
  const body = await requestOfficerJson<{ ok: true; membership: OfficerMembership }>(
    fetcher,
    "/api/officers/invitations/accept",
    jsonMutation(credentials),
  );
  return body.membership;
}

export async function deactivateMembershipRequest(fetcher: typeof fetch, membershipId: string) {
  await requestOfficerJson<{ ok: true }>(
    fetcher,
    `/api/officers/${encodeURIComponent(membershipId)}/deactivate`,
    jsonMutation({}),
  );
}

export function consumeInvitationLocation(
  location: Pick<Location, "href">,
  history: Pick<History, "replaceState">,
) {
  const url = new URL(location.href);
  const invitation = {
    organizationId: url.searchParams.get("organizationId") ?? "",
    token: url.searchParams.get("token") ?? "",
  };
  history.replaceState(null, "", url.pathname || "/invite");
  return invitation;
}

export async function copyInvitationLink(
  url: string,
  clipboard: Pick<Clipboard, "writeText">,
  setError: (message: string | null) => void,
) {
  try {
    await clipboard.writeText(url);
    setError(null);
    return true;
  } catch {
    setError("Copy failed. Select the invitation link and copy it manually.");
    return false;
  }
}

export function focusInvitationForm(
  email: string,
  setEmail: (email: string) => void,
  input: Pick<HTMLInputElement, "focus"> | null,
  form: Pick<HTMLFormElement, "scrollIntoView"> | null,
) {
  setEmail(email.trim().toLowerCase());
  form?.scrollIntoView({ behavior: "smooth", block: "start" });
  input?.focus();
}

type KeyboardLike = { key: string; shiftKey: boolean; preventDefault(): void };
type FocusableLike = { focus(): void };
export function containDialogKeyboard(event: KeyboardLike, focusable: FocusableLike[], activeIndex: number, close: () => void, mutating = false) {
  if (event.key === "Escape") {
    event.preventDefault();
    if (!mutating) close();
    return;
  }
  if (event.key !== "Tab" || focusable.length === 0) return;
  if (!event.shiftKey && activeIndex === focusable.length - 1) {
    event.preventDefault();
    focusable[0].focus();
  } else if (event.shiftKey && activeIndex <= 0) {
    event.preventDefault();
    focusable[focusable.length - 1].focus();
  }
}

export function focusDialogInitially(cancel: FocusableLike | null) {
  cancel?.focus();
}

export function restoreDialogTrigger(trigger: FocusableLike | null, schedule: (callback: () => void) => void) {
  schedule(() => trigger?.focus());
}

export function OfficersView({ invitationMode = false }: { invitationMode?: boolean }) {
  const [snapshot, setSnapshot] = useState<OfficersSnapshot | null>(null);
  const [loading, setLoading] = useState(!invitationMode);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [invitationResult, setInvitationResult] = useState<{ invitation: OfficerInvitation; invitationUrl: string } | null>(null);
  const [confirming, setConfirming] = useState<OfficerMembership | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptedEmail, setAcceptedEmail] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [regenerationNotice, setRegenerationNotice] = useState<string | null>(null);
  const inviteFormRef = useRef<HTMLFormElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deactivateTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [invitationCredentials] = useState(() => invitationMode && typeof window !== "undefined"
    ? consumeInvitationLocation(window.location, window.history)
    : { organizationId: "", token: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await requestOfficerJson<{ ok: true; officers: OfficersSnapshot }>(fetch, "/api/officers", { cache: "no-store" });
      setSnapshot(body.officers);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load officer access.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!invitationMode) void load(); }, [invitationMode, load]);

  const active = useMemo(() => snapshot?.memberships.filter((member) => member.active) ?? [], [snapshot]);
  const inactive = useMemo(() => snapshot?.memberships.filter((member) => !member.active) ?? [], [snapshot]);

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    setInviting(true);
    setError(null);
    try {
      const result = await createInvitationRequest(fetch, email);
      setInvitationResult(result);
      setCopied(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create that invitation.");
    } finally {
      setInviting(false);
    }
  };

  const copyLink = async () => {
    if (!invitationResult) return;
    setCopied(await copyInvitationLink(invitationResult.invitationUrl, navigator.clipboard, setError));
  };

  const closeConfirmation = useCallback(() => {
    setConfirming(null);
    setDialogError(null);
    restoreDialogTrigger(deactivateTriggerRef.current, requestAnimationFrame);
  }, []);

  useEffect(() => {
    if (confirming) focusDialogInitially(cancelRef.current);
  }, [confirming]);

  const dialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled])") ?? []);
    containDialogKeyboard(event, nodes, nodes.indexOf(document.activeElement as HTMLElement), closeConfirmation, deactivating);
  };

  const deactivate = async () => {
    if (!confirming) return;
    setDeactivating(true);
    setDialogError(null);
    try {
      await deactivateMembershipRequest(fetch, confirming.id);
      closeConfirmation();
      await load();
    } catch (cause) {
      setDialogError(cause instanceof Error ? cause.message : "Unable to deactivate that officer.");
    } finally {
      setDeactivating(false);
    }
  };

  const accept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const membership = await acceptInvitationRequest(fetch, invitationCredentials);
      setAcceptedEmail(membership.email);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to accept this invitation.");
    } finally {
      setAccepting(false);
    }
  };

  if (invitationMode) return <div className="officers-view invitation-acceptance"><div className="page-heading"><p className="eyebrow">OFFICER INVITATION</p><h1>Accept officer access.</h1><p className="heading-note">Sign in with the exact school email address that received this private link.</p></div>{error && <div className="issue-list" role="alert">{error}</div>}{acceptedEmail ? <div className="officer-card success-card"><strong>Access activated</strong><span>{acceptedEmail} is now an active officer.</span><a className="primary-button" href="/">Open STUCO Hours Desk</a></div> : <button className="primary-button" onClick={accept} disabled={accepting}>{accepting ? "Accepting…" : "Accept invitation"}</button>}</div>;

  return <div className="officers-view"><div className="page-heading officers-heading"><div><p className="eyebrow">OFFICERS</p><h1>Officer access.</h1><p className="heading-note">Manage who can view analyses and administer this team.</p></div></div>
    {error && <div className="issue-list" role="alert">{error}</div>}
    <section className="officer-panel" ref={inviteFormRef}><div className="section-heading"><div><h2>Invite officer</h2><p>Create a private, single-use link that expires after seven days.</p></div></div>{regenerationNotice && <p className="regeneration-notice" role="status">{regenerationNotice}</p>}<form className="officer-invite-form" onSubmit={invite}><label><span>School email</span><input ref={emailInputRef} type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="officer@school.edu" /></label><button className="primary-button" disabled={inviting}>{inviting ? "Creating…" : "Create invitation"}</button></form>
      {invitationResult && <div className="invitation-result" aria-live="polite"><strong>Copy this link now</strong><p>Send this private link only to <b>{invitationResult.invitation.email}</b>. It expires {formatDate(invitationResult.invitation.expiresAt)} and cannot be recovered after you dismiss it.</p><div className="copy-link-row"><input readOnly value={invitationResult.invitationUrl} aria-label="Invitation link" /><button className="copy-button" type="button" onClick={copyLink}>{copied ? "Copied" : "Copy link"}</button></div><button className="text-button" type="button" onClick={() => setInvitationResult(null)}>Dismiss private link</button></div>}
    </section>
    {loading ? <div className="officer-panel officer-loading">Loading officer access…</div> : !snapshot ? <div className="officer-panel"><p>Officer access could not be shown.</p><button className="primary-button" onClick={load}>Retry</button></div> : <div className="officer-sections">
      <OfficerSection title="Active officers" empty="No active officers found." members={active} render={(member) => <OfficerRow key={member.id} member={member} note={`Active since ${formatDate(member.createdAt)}`} action={<button className="danger-button" disabled={active.length <= 1} title={active.length <= 1 ? "The final active officer cannot be deactivated." : undefined} onClick={(event) => { deactivateTriggerRef.current = event.currentTarget; setDialogError(null); setConfirming(member); }}>Deactivate</button>} />} />
      <OfficerSection title="Inactive officers" empty="No inactive officers." members={inactive} render={(member) => <OfficerRow key={member.id} member={member} note={`Deactivated ${formatDate(member.deactivatedAt)}`} action={<button className="secondary-button" onClick={() => { focusInvitationForm(member.email, setEmail, emailInputRef.current, inviteFormRef.current); setRegenerationNotice(`Ready to generate a replacement link for ${member.email}.`); }}>Generate new link ↑</button>} />} />
      <section className="officer-panel"><div className="section-heading"><div><h2>Pending invitations</h2><p>Stored invitations never reveal their private token.</p></div></div>{snapshot.invitations.length === 0 ? <p className="officer-empty">No pending invitations.</p> : <div className="officer-list">{snapshot.invitations.map((invitation) => <div className="officer-row" key={invitation.id}><div><strong>{invitation.email}</strong><span className={`invitation-status ${invitation.status}`}>{invitation.status}</span><small>{invitation.status === "expired" ? "Expired" : "Expires"} {formatDate(invitation.expiresAt)}</small></div><button className="secondary-button" onClick={() => { focusInvitationForm(invitation.email, setEmail, emailInputRef.current, inviteFormRef.current); setRegenerationNotice(`Ready to invalidate the old invitation and generate a new link for ${invitation.email}.`); }}>Generate new link ↑</button></div>)}</div>}</section>
    </div>}
    {confirming && <div className="modal-backdrop" onClick={() => !deactivating && closeConfirmation()}><div ref={dialogRef} className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="deactivate-title" aria-describedby="deactivate-description" onKeyDown={dialogKeyDown} onClick={(event) => event.stopPropagation()}><p className="eyebrow">CONFIRM ACCESS CHANGE</p><h2 id="deactivate-title">Deactivate {confirming.email}?</h2><p id="deactivate-description">They will lose access on their next authorized request. A new invitation can reactivate them later.</p>{dialogError && <div className="issue-list" role="alert">{dialogError}<br />Review the conflict, then retry or cancel.</div>}<div className="confirm-actions"><button ref={cancelRef} className="secondary-button" disabled={deactivating} onClick={closeConfirmation}>Cancel</button><button className="danger-button" disabled={deactivating} onClick={deactivate}>{deactivating ? "Deactivating…" : dialogError ? "Retry deactivation" : "Deactivate officer"}</button></div></div></div>}
  </div>;
}

function OfficerSection({ title, empty, members, render }: { title: string; empty: string; members: OfficerMembership[]; render: (member: OfficerMembership) => React.ReactNode }) {
  return <section className="officer-panel"><div className="section-heading"><div><h2>{title}</h2><p>{members.length} {members.length === 1 ? "membership" : "memberships"}</p></div></div>{members.length ? <div className="officer-list">{members.map(render)}</div> : <p className="officer-empty">{empty}</p>}</section>;
}

function OfficerRow({ member, note, action }: { member: OfficerMembership; note: string; action: React.ReactNode }) {
  return <div className="officer-row"><div><strong>{member.email}</strong><span>{member.userId}</span><small>{note}</small></div>{action}</div>;
}
