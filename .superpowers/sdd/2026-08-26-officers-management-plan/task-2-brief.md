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

