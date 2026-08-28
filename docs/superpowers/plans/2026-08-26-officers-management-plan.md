# Officers Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Officers placeholder with secure organization-scoped invitation and membership management.

**Architecture:** D1-backed repository functions own invitation lifecycle and last-officer invariants. Thin API routes validate requests and map typed domain errors to structured responses; a client `OfficersView` lists access state, generates copyable manual links, and confirms deactivation.

**Tech Stack:** TypeScript, React 19, Vinext/Vite, Vitest, Cloudflare D1, Drizzle ORM, Web Crypto/Node crypto.

**Spec:** `docs/superpowers/specs/2026-08-26-officers-team-metrics-design.md`

## Global Constraints

- Every active officer has equal permissions.
- Invitation links are manual, single-use, valid for exactly seven days, and bound to the invited normalized email.
- Store only SHA-256 token hashes; never store/log/list raw tokens.
- Creating a replacement link invalidates earlier outstanding invitations for the same organization/email.
- Never allow an organization to have zero active officers.
- Every query and mutation is organization-scoped.
- Audit only successful invitation creation, acceptance, and deactivation.
- Preserve existing local D1 data through migrations.

---

### Task 1: Officer Schema and Domain Types

**Files:**
- Modify: `db/schema.ts`
- Modify: `src/server/types.ts`
- Create: `src/server/officer-types.ts`
- Generate: `drizzle/0003_*.sql`
- Generate: `drizzle/meta/0003_snapshot.json`
- Modify: `drizzle/meta/_journal.json`

**Interfaces:**
- Produces:

```ts
export type OfficerMembership = {
  id: string; email: string; userId: string; active: boolean;
  createdAt: string; updatedAt: string | null; deactivatedAt: string | null;
};
export type OfficerInvitation = {
  id: string; email: string; status: "pending" | "expired";
  expiresAt: string; createdAt: string; createdBy: string | null;
};
export type OfficersSnapshot = {
  memberships: OfficerMembership[];
  invitations: OfficerInvitation[];
};
export class OfficerConflictError extends Error {
  constructor(public readonly code: "ACTIVE_MEMBER_EXISTS" | "LAST_ACTIVE_OFFICER" | "INVITATION_INVALID" | "INVITATION_EMAIL_MISMATCH", message: string);
}
```

- [ ] **Step 1: Add schema fields and indexes**

Add `updatedAt` and `deactivatedAt` to memberships. Add `createdBy` and `invalidatedAt` to invitations. Add organization/email indexes to both tables and an organization/active membership index.

- [ ] **Step 2: Define domain response/error types**

Keep storage rows internal. API-facing types use ISO strings and never include `tokenHash`.

- [ ] **Step 3: Generate and inspect migration**

Run: `npm.cmd run db:generate -- --name officer_lifecycle`

Inspect the generated SQL. Expected: additive `ALTER TABLE`/index statements only; no table recreation that drops membership or invitation data.

- [ ] **Step 4: Apply local migration**

Run: `.\node_modules\.bin\wrangler.cmd d1 execute DB --local --file drizzle/0003_<generated-name>.sql --yes`

Expected: command reports success. Wrangler log-directory warnings are acceptable only if the SQL execution result is successful.

- [ ] **Step 5: Run schema/type checks**

Run: `npx.cmd tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add db/schema.ts src/server/types.ts src/server/officer-types.ts drizzle
git commit -m "feat: add officer lifecycle schema"
```

### Task 2: Officer Repository Lifecycle

**Files:**
- Create: `src/server/officers-repository.ts`
- Create: `tests/server/officers-repository.test.ts`
- Modify: `src/server/types.ts` only if the fake D1 interface needs `changes` metadata.

**Interfaces:**
- Consumes: `StorageEnvironment`, `Actor`.
- Produces:

```ts
export function listOfficers(env: StorageEnvironment, actor: Actor, at?: Date): Promise<OfficersSnapshot>;
export function createOfficerInvitation(env: StorageEnvironment, actor: Actor, email: string, baseUrl: string, at?: Date): Promise<{ invitation: OfficerInvitation; invitationUrl: string }>;
export function acceptOfficerInvitation(env: StorageEnvironment, actorIdentity: Omit<Actor, "organizationId">, organizationId: string, rawToken: string, at?: Date): Promise<OfficerMembership>;
export function deactivateOfficer(env: StorageEnvironment, actor: Actor, membershipId: string, at?: Date): Promise<void>;
```

- [ ] **Step 1: Write failing list/create tests**

Use deterministic fake D1 rows and inject `at`. Assert organization-scoped listing maps active/inactive and pending/expired states. For creation, assert:

```ts
expect(result.invitationUrl).toMatch(/^https:\/\/stuco\.example\/invite\?token=/);
expect(insertedTokenHash).toMatch(/^[a-f0-9]{64}$/);
expect(result.invitationUrl).not.toContain(insertedTokenHash);
expect(expiresAt - createdAt).toBe(7 * 24 * 60 * 60 * 1000);
```

Assert active-member rejection and invalidation of prior pending invitations.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm.cmd run test:unit -- tests/server/officers-repository.test.ts`

Expected: FAIL because repository functions do not exist.

- [ ] **Step 3: Implement listing and invitation creation**

Normalize email with `trim().toLowerCase()`. Generate 32 random bytes with `randomBytes(32).toString("base64url")`, hash with SHA-256, and URL-encode the raw token. Batch invalidation, insert, and audit statements. Never include token/hash in audit metadata.

- [ ] **Step 4: Write failing acceptance tests**

Cover valid token, expired token, accepted token, invalidated token, wrong email, wrong organization, inactive membership reactivation, and outstanding-link invalidation. Assert failed cases produce no membership/audit mutation.

- [ ] **Step 5: Implement acceptance**

Hash the provided token, query invitation by organization/hash, compare normalized signed-in email, and batch membership upsert/reactivation, invitation acceptance, sibling invalidation, and audit insert. Re-check unaccepted/unexpired state in conditional update predicates so concurrent reuse cannot succeed.

- [ ] **Step 6: Write failing deactivation tests**

Assert normal deactivation writes `active = 0`, timestamps, and audit. Assert last-active-officer and cross-organization targets throw without mutation. Include self-deactivation with another active officer.

- [ ] **Step 7: Implement conditional deactivation**

Use a conditional update whose predicate includes the organization, target active state, and an `EXISTS` subquery for another active membership. Check affected-row metadata; zero changes maps to either not found or `LAST_ACTIVE_OFFICER` after a scoped read.

- [ ] **Step 8: Run focused tests**

Run: `npm.cmd run test:unit -- tests/server/officers-repository.test.ts tests/server/repository.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add src/server/officers-repository.ts src/server/types.ts tests/server/officers-repository.test.ts
git commit -m "feat: enforce officer invitation lifecycle"
```

### Task 3: Officers API Routes

**Files:**
- Create: `app/api/officers/route.ts`
- Create: `app/api/officers/invitations/route.ts`
- Create: `app/api/officers/invitations/accept/route.ts`
- Create: `app/api/officers/[membershipId]/deactivate/route.ts`
- Create: `tests/api/officers-route.test.ts`

**Interfaces:**
- `GET /api/officers` → `{ ok: true, officers: OfficersSnapshot }`.
- `POST /api/officers/invitations` JSON `{ email }` → status 201 with `{ ok: true, invitation, invitationUrl }`.
- `POST /api/officers/invitations/accept` JSON `{ organizationId, token }` → `{ ok: true, membership }`.
- `POST /api/officers/:membershipId/deactivate` → `{ ok: true }`.

- [ ] **Step 1: Write failing route tests**

Mock storage/auth using `globalThis.__STUCO_ENV__`. Cover malformed JSON, invalid email, missing token, authentication failure, active-member conflict, successful invitation/list/accept/deactivate, and `LAST_ACTIVE_OFFICER` mapped to status 409.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm.cmd run test:unit -- tests/api/officers-route.test.ts`

Expected: FAIL because route modules do not exist.

- [ ] **Step 3: Implement shared response validation locally in each thin route**

Use `Response.json`. Require `application/json` for mutations, bound email/token string lengths, validate email with a conservative `^[^\s@]+@[^\s@]+\.[^\s@]+$`, and map:

- 400: invalid input/token shape.
- 401: unauthenticated.
- 403: inactive/nonmember or email mismatch.
- 404: scoped membership not found.
- 409: active member exists, expired/reused invitation, last active officer.
- 500: safe generic failure.

Acceptance uses platform identity without requiring an existing membership, then calls the repository with the explicit invitation organization ID.

- [ ] **Step 4: Run API and repository tests**

Run: `npm.cmd run test:unit -- tests/api/officers-route.test.ts tests/server/officers-repository.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/api/officers tests/api/officers-route.test.ts
git commit -m "feat: expose officer management APIs"
```

### Task 4: Officers Interface

**Files:**
- Create: `app/components/OfficersView.tsx`
- Modify: `app/page.tsx`
- Modify: `app/analysis.css`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes Officers API routes from Task 3.
- Produces the complete Officers destination and manual invitation/deactivation interactions.

- [ ] **Step 1: Add failing rendered-surface assertions**

Read `OfficersView.tsx` and assert:

```js
assert.match(surface, /Officer access/);
assert.match(surface, /Invite officer/);
assert.match(surface, /Copy link/);
assert.match(surface, /Generate new link/);
assert.match(surface, /Deactivate/);
assert.match(surface, /Active officers/);
assert.match(surface, /Inactive officers/);
assert.match(surface, /Pending invitations/);
```

Assert `page.tsx` renders `<OfficersView />` and no longer contains `COMING NEXT`.

- [ ] **Step 2: Run rendered test to verify RED**

Run: `node --test tests/rendered-html.test.mjs`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement listing states**

Fetch `GET /api/officers` on mount. Render loading, failure with Retry, and separate active/inactive/pending sections. Show normalized email and relevant creation/expiry/deactivation dates. Never render token hashes.

- [ ] **Step 4: Implement invitation dialog**

Use a controlled email input. On success show the one-time `invitationUrl`, a Copy Link button using `navigator.clipboard.writeText`, expiration date, and a warning to send it only to the intended school email. After dismissing the result, list rows can only Generate New Link.

- [ ] **Step 5: Implement deactivation confirmation**

Require a confirmation state naming the target email. Disable the action when the client snapshot shows only one active officer, but still display server conflict errors because the repository is authoritative. Refresh the list after success.

- [ ] **Step 6: Mount and style**

Replace the Officers placeholder branch in `page.tsx` with `<OfficersView />`. Match the approved mockup and existing responsive visual system.

- [ ] **Step 7: Run UI and type checks**

Run: `node --test tests/rendered-html.test.mjs`

Run: `npx.cmd tsc --noEmit`

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add app/components/OfficersView.tsx app/page.tsx app/analysis.css tests/rendered-html.test.mjs
git commit -m "feat: build officer access management"
```

### Task 5: Documentation and Full Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/ADMIN_GUIDE.md`

**Interfaces:** None; completes secure handoff.

- [ ] **Step 1: Update administrator documentation**

Document manual link creation, seven-day expiry, single use, exact email matching, Generate New Link behavior, deactivation, last-active-officer protection, reactivation, and invitation-link secrecy. Explain that an existing active officer is required for recovery.

- [ ] **Step 2: Run full verification**

Run: `npm.cmd test`

Run: `npx.cmd tsc --noEmit`

Run: `git diff --check`

Expected: all tests pass, Vinext production build succeeds, TypeScript reports no errors, and diff check reports no whitespace errors.

- [ ] **Step 3: Browser verification**

With local dev auth and migrated D1:

- Open Officers directly from Overview and History detail.
- Create an invitation and copy the raw link once.
- Reload and confirm the raw link cannot be reconstructed; Generate New Link is offered.
- Exercise acceptance with the matching dev identity fixture.
- Deactivate an officer while another remains.
- Attempt final-officer deactivation and confirm a clear conflict with unchanged access.
- Confirm active/inactive/pending states survive refresh.

- [ ] **Step 4: Commit**

```powershell
git add README.md docs/ADMIN_GUIDE.md
git commit -m "docs: explain officer administration"
```
