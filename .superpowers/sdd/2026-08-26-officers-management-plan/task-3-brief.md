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

