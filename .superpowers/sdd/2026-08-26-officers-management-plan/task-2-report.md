# Task 2 Report: Officer Repository Lifecycle

## Status

Implemented the organization-scoped officer repository lifecycle for listing, invitation creation, invitation acceptance/reactivation, and protected deactivation. No commit was created, per the parent task instruction.

## Files

- Created `src/server/officers-repository.ts`.
- Created `tests/server/officers-repository.test.ts`.
- Created this report.
- Did not modify `src/server/types.ts`; the existing `unknown` D1 mutation result boundary is narrowed at runtime, so no shared fake interface change was necessary.

## TDD red/green evidence

1. List/create RED:
   - `npm.cmd run test:unit -- tests/server/officers-repository.test.ts`
   - Exit 1: suite could not resolve the absent `src/server/officers-repository` module.
2. List/create GREEN:
   - Same command, exit 0: 3/3 tests passed.
3. Acceptance RED:
   - Same command, exit 1: 10 new acceptance tests failed with `acceptOfficerInvitation is not a function`; the existing 3 tests remained green.
4. Acceptance GREEN:
   - Same command, exit 0: 13/13 tests passed.
5. Deactivation RED:
   - Same command, exit 1: 5 new deactivation tests failed with `deactivateOfficer is not a function`; the existing 13 tests remained green.
6. Deactivation GREEN:
   - Same command, exit 0: 18/18 tests passed.
7. Normalized legacy identity RED:
   - Same command, exit 1: 3 new tests demonstrated exact SQL email equality could duplicate a mixed-case active member, leave a mixed-case prior invitation valid, and create a second membership instead of reactivating.
8. Normalized legacy identity GREEN:
   - Same command, exit 0: 21/21 tests passed after using `lower(trim(email)) = ?` at lifecycle identity boundaries.
9. Organization-scoped reactivation refactor GREEN:
   - Same command, exit 0: 21/21 tests remained green after replacing the unscoped primary-key conflict arm with separate organization-scoped conditional update/insert statements.

## Behavior covered

- Listing maps active/inactive memberships and pending/expired invitations to API-safe ISO-string types, excludes accepted/invalidated invitations, and excludes every other organization.
- Creation normalizes email, rejects normalized active-member matches, replaces prior unexpired pending links, creates a 32-byte base64url secret, persists only its 64-character SHA-256 hash, expires at exactly seven days, returns the raw token only in the URL, and excludes token/hash material from audit metadata.
- Creation also validates the invitation URL before batching, rechecks active membership inside the batch, and directly verifies that the unpadded base64url token decodes to exactly 32 bytes.
- Acceptance covers valid, expired, accepted, invalidated, wrong-email, and wrong-organization links; sequential reuse; inactive membership reactivation; sibling-link invalidation; audit creation; legacy normalized email matching; invitation state changes between lookup and batch; and disappearance of a preselected membership before the batch.
- Deactivation covers normal and self-deactivation, lifecycle timestamps, audit data, cross-organization targets, final-active-officer rejection, and a state change that removes the other active officer immediately before the batch.
- Every failed acceptance assertion verifies no membership, invitation, or audit mutation by this operation. Failed deactivation assertions verify no target/audit mutation.

## SQL and invariant reasoning

### Organization isolation

Every read and mutation binds an organization ID. Reactivation uses `UPDATE memberships ... WHERE organization_id = ? AND id = ?`; creation and new acceptance insert the bound organization directly; sibling invitation invalidation and deactivation predicates are also organization-scoped. A cross-organization deactivation is followed only by a scoped read and is reported as not found.

### Invitation creation

The active-member read uses the actor organization and normalized stored email. The raw token and URL are constructed before any batch mutation, so an invalid `baseUrl` cannot invalidate an old link or create an invitation/audit row. One D1 batch conditionally invalidates prior unaccepted/uninvalidated/unexpired invitations, conditionally inserts the new hash-only invitation, and conditionally inserts `invitation_created` audit metadata containing only the invited email. Both the invalidation and insert recheck `NOT EXISTS` an active membership for the same normalized organization/email. The audit requires the immediately preceding insert's SQLite `changes() = 1` and the exact inserted organization/ID/hash row. The repository then requires the invitation insert's D1 `result.meta.changes` to equal one; a concurrent activation therefore produces no invalidation, invitation, or audit mutation and returns `ACTIVE_MEMBER_EXISTS`.

### Acceptance atomicity and single use

The initial lookup is by organization and SHA-256 token hash. Validity and normalized signed-in email are checked before mutation. The D1 batch then:

1. Conditionally inserts a duplicate-safe membership or reactivates the preselected organization/ID/email membership.
2. Conditionally marks the selected invitation accepted only when the membership statement's immediately preceding SQLite `changes() = 1` and the expected active organization/ID/user/email membership exists.
3. Conditionally inserts the token-free acceptance audit only when the acceptance update's immediately preceding `changes() = 1` and the expected accepted invitation and membership exist.
4. Conditionally invalidates sibling invitations only when that batch's unique acceptance-audit row exists.

The membership mutation and acceptance update both require per-statement affected-row counts of exactly one. Invitation eligibility is rechecked with the selected ID, organization, token hash, normalized email, `accepted_at IS NULL`, `invalidated_at IS NULL`, and `expires_at > at`. Because a D1 batch is one ordered atomic transaction, concurrent reuse cannot interleave: after the first batch commits, a later batch's membership eligibility predicate no-ops, which prevents acceptance, audit, and sibling invalidation. If the preselected membership disappears or changes identity before the batch, its scoped update changes zero rows and the same dependency chain leaves the invitation and audit untouched.

### Last-active protection

The audit `INSERT ... SELECT` and the membership update are in one batch and use equivalent predicates: scoped target, target currently active, and `EXISTS` another active membership in the same organization with a different ID. The update sets `active = 0`, `updated_at`, and `deactivated_at`. Its affected-row metadata is the success gate. On zero changes, a scoped read distinguishes an active final officer (`LAST_ACTIVE_OFFICER`) from missing/inactive/cross-organization targets. Audit and target state therefore commit together or not at all.

## Verification

- Focused command from the brief:
  - `npm.cmd run test:unit -- tests/server/officers-repository.test.ts tests/server/repository.test.ts`
  - Exit 0: 2 files, 33/33 tests passed after fix round 1.
- Full unit suite:
  - `npm.cmd run test:unit`
  - Exit 0: 10 files, 79/79 tests passed after fix round 1.
- TypeScript:
  - `npx.cmd tsc --noEmit`
  - Exit 0, no diagnostics.
- Whitespace:
  - `git diff --check -- src/server/officers-repository.ts tests/server/officers-repository.test.ts`
  - Exit 0.
- ESLint was attempted for the two task files but could not start because the pre-existing `node_modules/aria-query` installation contains `package.json` and `README.md` but is missing its declared `lib/index.js` entry point. This was an environment/dependency failure, not a lint diagnostic.

## Self-review

- Confirmed all four required exports have the exact requested call shapes.
- Confirmed `token_hash` appears only in internal SQL/storage rows and never in response types or audit metadata.
- Confirmed expiry uses a literal seven-day millisecond interval and boundary equality is expired.
- Confirmed normalized identity comparison is applied to input and stored lifecycle identity lookups, including legacy casing/whitespace.
- Confirmed acceptance and deactivation race simulations exercise batch-time predicates rather than only preflight checks.
- Confirmed affected-row metadata is checked through a fail-closed runtime narrowing helper without widening the shared D1 fake interface.
- Confirmed no unrelated dirty files were edited and no staging/commit was performed.

## Concerns

- ESLint remains unavailable until the incomplete `aria-query` installation is repaired.
- Cloudflare D1 `batch()` returns an ordered array of per-statement results; for actual D1 mutation results this repository reads the numeric affected-row count from each result's `meta.changes`. The shared local interface currently types the batch result as `unknown`, so the runtime helper treats a missing array/result/numeric count as zero (and therefore rejects creation, acceptance, or deactivation rather than assuming success). It also accepts a top-level numeric `changes` field for compatible test adapters, but that is not claimed as the Cloudflare D1 result shape.

## Fix round 1 evidence

Review findings were verified and fixed through a new red/green cycle:

1. RED: `npm.cmd run test:unit -- tests/server/officers-repository.test.ts`
   - Exit 1: 3 expected failures and 22 passes.
   - Invalid `baseUrl` threw only after invalidating/inserting/auditing.
   - Concurrent activation between preflight and batch still returned a usable invitation.
   - A preselected membership deleted before acceptance batch still allowed invitation acceptance and audit.
   - The direct token-size test was already green because the implementation correctly used `randomBytes(32).toString("base64url")`.
2. URL GREEN: isolated invalid-URL regression passed 1/1 after URL construction moved before the batch.
3. Creation race GREEN: normal creation, invalid URL, and activation-race tests passed 3/3 after batch-time active-member guards and insert affected-row verification.
4. Acceptance race GREEN: valid create/reactivate, disappeared membership, sibling invalidation, sequential reuse, and invitation-state race tests passed 6/6 after the membership-success dependency chain was added.
5. Officer repository GREEN: 25/25 tests passed.
6. Requested focused GREEN: officer repository plus existing repository tests passed 33/33.
7. `npx.cmd tsc --noEmit` and task-file `git diff --check` exited 0.
