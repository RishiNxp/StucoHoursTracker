### Task 3: Version 3 Immutable Persistence

**Files:**
- Modify: `src/server/types.ts`
- Modify: `src/server/repository.ts`
- Modify: `tests/server/repository.test.ts`

**Interfaces:**
- Consumes: `AnalyzeReportsResult.teamMetrics`.
- Produces: `SavedAnalysis.teamMetrics?`.
- Stores: `{ snapshotVersion: 3, volunteers, performance, teamMetrics }`.

- [ ] **Step 1: Write failing repository tests**

Add `teamMetrics` to the analysis fixture. Assert a saved snapshot parses to:

```ts
expect(JSON.parse(String(insert.values[8]))).toMatchObject({
  snapshotVersion: 3,
  performance: analysis.performance,
  teamMetrics: analysis.teamMetrics,
});
```

Add explicit version 2 fixture coverage:

```ts
results_json: JSON.stringify({
  snapshotVersion: 2,
  volunteers: analysis.volunteers,
  performance: analysis.performance,
})
```

Assert `teamMetrics` is undefined for version 1 and 2, and preserved for version 3.

- [ ] **Step 2: Run repository tests to verify RED**

Run: `npm.cmd run test:unit -- tests/server/repository.test.ts`

Expected: FAIL because snapshots still use version 2 and `SavedAnalysis` lacks metrics.

- [ ] **Step 3: Implement version 3 encoding/decoding**

Change the write payload to version 3. Decode arrays as version 1 and objects by optional property presence. Return `teamMetrics: snapshot.teamMetrics` without calling analysis functions.

- [ ] **Step 4: Run repository and API tests**

Run: `npm.cmd run test:unit -- tests/server/repository.test.ts tests/api/analyses-route.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/server/types.ts src/server/repository.ts tests/server/repository.test.ts
git commit -m "feat: persist versioned team metrics"
```

