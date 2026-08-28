### Task 5: Documentation and End-to-End Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/ADMIN_GUIDE.md`

**Interfaces:** None; completes handoff.

- [ ] **Step 1: Document definitions and roster requirement**

Add the eight metric definitions, validated/school-year filtering, 14-day anchoring, both chart series, and immutable History behavior. State that Team Metrics requires the Full Roster.

- [ ] **Step 2: Run the full verification suite**

Run: `npm.cmd test`

Run: `npx.cmd tsc --noEmit`

Run: `git diff --check`

Expected: all tests pass, Vinext production build succeeds, TypeScript reports no errors, and diff check reports no whitespace errors.

- [ ] **Step 3: Browser verification**

Start with `npm.cmd run dev`. Upload fixtures containing a zero-hour member and activity across at least three biweekly periods. Confirm:

- Team Metrics is directly below Roster Performance.
- Eight values reconcile with fixture totals.
- Both lines render and zero periods remain visible.
- Saved History shows identical values after refresh.
- Existing version 1/2 History records still open without the module.

- [ ] **Step 4: Commit**

```powershell
git add README.md docs/ADMIN_GUIDE.md
git commit -m "docs: explain team metrics"
```
