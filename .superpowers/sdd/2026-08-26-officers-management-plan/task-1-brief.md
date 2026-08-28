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

