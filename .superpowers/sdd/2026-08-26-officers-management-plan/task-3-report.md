# Task 3 Report: Officers API Routes

## Status

Implemented the four Officers API routes and their route-level test suite. The routes keep management operations behind active organization membership while invitation acceptance authenticates only the platform identity and passes the invitation's explicit organization ID to the repository. No commit was created, and unrelated dirty files were not modified.

## Files

- Created `app/api/officers/route.ts`.
- Created `app/api/officers/invitations/route.ts`.
- Created `app/api/officers/invitations/accept/route.ts`.
- Created `app/api/officers/[membershipId]/deactivate/route.ts`.
- Created `tests/api/officers-route.test.ts`.
- Created this report.

## TDD red/green evidence

1. RED:
   - `npm.cmd run test:unit -- tests/api/officers-route.test.ts`
   - Exit 1: Vitest could not resolve the absent `app/api/officers/route` module. No tests collected because the requested route modules did not exist.
2. First GREEN attempt and harness diagnosis:
   - After the minimal route implementation, the same command exited 1 during collection because `app/chatgpt-auth.ts` statically imports `next/navigation`, which is not installed in the Vitest runtime.
   - The existing `tests/api/analyses-route.test.ts` pattern mocks both `next/headers` and `next/navigation`; adding the missing `next/navigation` test mock resolved only the harness dependency.
3. Route GREEN:
   - `npm.cmd run test:unit -- tests/api/officers-route.test.ts`
   - Exit 0: 1 file, 20/20 tests passed.
4. Requested API/repository GREEN:
   - `npm.cmd run test:unit -- tests/api/officers-route.test.ts tests/server/officers-repository.test.ts`
   - Exit 0: 2 files, 45/45 tests passed.

## Routes and test coverage

### `GET /api/officers`

- Requires a signed-in active member through `requireActiveMember`.
- Uses the actor returned by authorization, so repository listing is scoped to that actor's organization.
- Returns `{ ok: true, officers }` on success.
- Tests cover a scoped active-member snapshot, inactive/nonmember rejection, and a generic 500 response that does not leak storage details.

### `POST /api/officers/invitations`

- Requires `application/json`, a JSON object, and a trimmed email no longer than 254 characters matching `^[^\s@]+@[^\s@]+\.[^\s@]+$`.
- Requires an active organization member before calling the repository.
- Uses `new URL(request.url).origin` as the base for the one-time invitation URL.
- Returns status 201 with `{ ok: true, invitation, invitationUrl }`.
- Tests cover content type, malformed JSON, malformed/overlong email, normalization, seven-day expiry, active-member authorization, success, and `ACTIVE_MEMBER_EXISTS` as 409.

### `POST /api/officers/invitations/accept`

- Requires `application/json`, a bounded organization ID, and a bounded base64url-shaped token.
- Authenticates the ChatGPT/platform identity directly, including the existing local-development identity behavior.
- Does not call `requireActiveMember`, does not read a membership in the route, and does not use the environment's configured organization to choose the invitation organization.
- Passes the validated request `organizationId` explicitly to `acceptOfficerInvitation`.
- Tests make any authorization membership query throw, configure a different environment organization, and still prove successful acceptance for the request organization and signed-in identity.
- Tests also cover unauthenticated identity, malformed JSON, missing token, email mismatch as 403 without exposing the invited address, and invalid/expired/reused invitation behavior as 409.

### `POST /api/officers/:membershipId/deactivate`

- Requires `application/json`, a bounded URL-safe membership ID, and an active organization member.
- Calls the repository with the authenticated actor, preserving organization scope.
- Tests cover successful deactivation, inactive/nonmember rejection, organization/target binding, `LAST_ACTIVE_OFFICER` as 409, and inactive/missing/cross-organization targets as 404.

## Error and security analysis

- Input failures use status 400 with structured `{ ok: false, issues: [...] }` responses.
- Authentication and active-membership failures preserve the existing `AuthorizationError` boundary as 401 or 403.
- `INVITATION_EMAIL_MISMATCH` maps to 403 with an actionable message that does not reveal the stored invitation email.
- `ACTIVE_MEMBER_EXISTS`, `INVITATION_INVALID`, and `LAST_ACTIVE_OFFICER` map to 409.
- The repository's scoped missing/inactive deactivation result maps to 404.
- Unexpected errors map to route-specific generic 500 issues. Raw exception and storage messages are not returned or logged.
- Management list/create/deactivate operations derive organization scope only from the authenticated active actor. Acceptance is the intentional exception: it uses a signed-in platform identity plus the explicit invitation organization, allowing a first-time or inactive officer to accept.
- JSON-only mutation requests reduce accidental alternate-form submissions. Email, token, organization ID, and membership ID bounds prevent unbounded values from reaching hashing or storage operations.
- The routes never inspect, return, or log stored token hashes. The creation route returns only the repository's one-time raw invitation URL.

## Verification

- Full unit suite:
  - `npm.cmd run test:unit`
  - Exit 0: 11 files, 99/99 tests passed.
- TypeScript:
  - `npx.cmd tsc --noEmit`
  - Exit 0 with no diagnostics.
- Task-file whitespace:
  - A PowerShell trailing-whitespace/final-newline check over all five new route/test files exited 0 (`TASK_WHITESPACE_OK=5 files`).
  - `git diff --check -- app/api/officers tests/api/officers-route.test.ts` also exited 0, but these files are untracked, so the explicit file-content check is the meaningful evidence.
- ESLint:
  - `npx.cmd eslint app/api/officers tests/api/officers-route.test.ts` could not start because the pre-existing `node_modules/aria-query` package is missing its declared `lib/index.js`. No task-file lint diagnostics were produced.

## Self-review and concerns

- Mutation review confirms tests would fail for removing active-member checks from any management route, adding a membership check to acceptance, passing the configured organization instead of the invitation organization, dropping organization binding, changing conflict status mappings, leaking unknown errors, or omitting validation branches covered by the suite.
- The repository currently signals a missing/inactive deactivation target with an untyped exact `Error` message. The route safely recognizes only that exact message for 404 and maps every other untyped error to 500, but a future repository wording change should be replaced with a typed not-found domain error.
- Invitation creation derives the application origin from `request.url`, matching the current repository interface and test environment. If deployment does not guarantee a trusted canonical request origin, a configured public application origin would be safer.
- Targeted lint remains blocked by the incomplete pre-existing `aria-query` installation.
- External reviewer dispatch was not performed because the task explicitly prohibited spawning subagents; the implementation received a local diff/security self-review instead.

## Fix round 1: invitation context/origin and typed errors

### Findings addressed

1. **Invitation organization context:** `createOfficerInvitation` now includes the normalized, bounded actor organization as the `organizationId` query parameter alongside the one-time token. The generated link therefore contains both inputs required by the acceptance endpoint.
2. **Trusted public origin:** invitation creation no longer reads `request.url` or the incoming Host to construct a link. `StorageEnvironment` now exposes `STUCO_PUBLIC_APP_ORIGIN`, and the route fails closed unless it is a pathless, credential-free HTTPS origin. Explicit non-production loopback HTTP origins are allowed for local development only. The authenticated actor organization is also checked against the same 128-character URL-safe shape accepted by the acceptance route before repository mutation.
3. **Typed not-found boundary:** `OfficerConflictError` now includes `OFFICER_NOT_FOUND`. The repository throws that code for missing, inactive, and cross-organization deactivation targets, and the route maps the typed code to 404 without comparing error text.
4. **Authorization and validation coverage:** direct unauthenticated 401 tests now cover list, invitation creation, and deactivation. Acceptance tests directly cover organization-ID and token upper bounds plus invalid-character patterns.

### TDD evidence

1. RED:
   - `npm.cmd run test:unit -- tests/api/officers-route.test.ts tests/server/officers-repository.test.ts`
   - Exit 1: 10 expected failures and 48 passes.
   - Failures proved the link omitted `organizationId`, used the attacker-controlled request origin, accepted missing/path-bearing/credential-bearing/insecure production origin configuration, generated a link for an organization ID acceptance would reject, accepted an invalid organization-ID pattern, and emitted untyped missing/inactive officer errors.
   - The three new direct management 401 cases were green characterization tests for pre-existing correct behavior.
2. GREEN:
   - Same focused command exited 0: 2 files, 58/58 tests passed.
3. Full regression:
   - `npm.cmd run test:unit`
   - Exit 0: 11 files, 112/112 tests passed.
4. TypeScript:
   - `npx.cmd tsc --noEmit`
   - Exit 0 with no diagnostics.

### Configuration and security analysis

- `STUCO_PUBLIC_APP_ORIGIN` follows the app's existing `STUCO_*` environment naming convention and is documented in `README.md` as a required canonical production HTTPS origin.
- A configured URL is accepted only when it is an origin: no username, password, non-root path, query, or fragment. Arbitrary production HTTP origins are rejected. This makes the configured value the allow-list and prevents request/Host spoofing from changing manual invitation links.
- Origin and organization configuration are validated before the repository call, so invalid configuration cannot invalidate an existing invitation, insert a new invitation, or write an audit event.
- `organizationId` remains URL-encoded through `URLSearchParams` and is restricted to 1–128 ASCII letters, digits, underscores, or hyphens at both generation and acceptance boundaries.
- Tokens remain restricted to 16–512 base64url characters at acceptance; repository-generated tokens remain exactly 43 unpadded base64url characters from 32 random bytes.
- The local `.env.example` is ignored by this checkout's current Git rules. The final configuration correction below adds the non-secret development origin there, while the tracked README contains the deployable production contract.

### Remaining concerns

- Targeted ESLint was not retried in this fix round because the pre-existing `node_modules/aria-query` package remains incomplete; the prior report records the exact startup failure.
- `OfficerConflictError` now carries both conflict and not-found domain codes. This is intentionally minimal for the existing error boundary; a future broader cleanup could rename it to a neutral `OfficerDomainError` without changing API behavior.

## Final configuration correction

- Added `STUCO_PUBLIC_APP_ORIGIN=http://localhost:3000` to `.env.example` so copying the documented local configuration supplies an origin accepted by the route's explicit non-production loopback exception.
- An existing `.env.local` was present without this setting. Exactly the missing non-secret setting line was appended; every existing line was preserved and its contents were not printed.
- Added a route regression test that reads only `STUCO_PUBLIC_APP_ORIGIN` from `.env.example`, injects it into a development test environment, submits invitation creation through an attacker-controlled request origin, and asserts the successful invitation URL uses `http://localhost:3000`.

### TDD and verification evidence

1. RED:
   - `npm.cmd run test:unit -- tests/api/officers-route.test.ts`
   - Exit 1: the copied-example invitation test returned 500 instead of 201 because `.env.example` lacked `STUCO_PUBLIC_APP_ORIGIN`; the existing 32 route tests passed.
2. GREEN and focused regression:
   - `npm.cmd run test:unit -- tests/api/officers-route.test.ts tests/server/officers-repository.test.ts`
   - Exit 0: 2 files, 59/59 tests passed.
3. TypeScript:
   - `npx.cmd tsc --noEmit`
   - Exit 0 with no diagnostics.
4. Configuration preservation check:
   - Exact-setting checks found one matching public-origin line in `.env.example` and one in `.env.local`.
   - `.env.local` increased from four lines to five, confirming the bounded append without replacing its prior content.
