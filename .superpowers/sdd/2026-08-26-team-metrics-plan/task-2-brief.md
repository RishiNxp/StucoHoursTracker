### Task 2: Analysis Service Payload

**Files:**
- Modify: `src/analysis/service.ts`
- Modify: `app/analysis-types.ts`
- Modify: `tests/analysis/service.test.ts`
- Modify: `tests/api/analyses-route.test.ts`

**Interfaces:**
- Consumes: `buildTeamMetrics(roster.rows, history.rows, schoolYearStart, schoolYearEnd)`.
- Produces: `AnalyzeReportsResult.teamMetrics?: TeamMetricsResult` and matching `AnalysisViewModel.teamMetrics?`.

- [ ] **Step 1: Add failing service/API assertions**

Extend roster analysis tests:

```ts
expect(result.teamMetrics).toMatchObject({
  rosterSize: 2,
  activeVolunteers: 1,
  zeroHourVolunteers: 1,
});
expect(result.teamMetrics?.periods.length).toBeGreaterThan(0);
```

Also assert a request without `rosterReport` returns both `performance` and `teamMetrics` as `undefined`.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm.cmd run test:unit -- tests/analysis/service.test.ts tests/api/analyses-route.test.ts`

Expected: FAIL because `teamMetrics` is absent.

- [ ] **Step 3: Extend service and view-model types**

Import `buildTeamMetrics`, add `teamMetrics?: TeamMetricsResult`, calculate it only after validation succeeds and a roster exists, and return it beside `performance`.

- [ ] **Step 4: Run focused tests**

Run: `npm.cmd run test:unit -- tests/analysis/service.test.ts tests/api/analyses-route.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/analysis/service.ts app/analysis-types.ts tests/analysis/service.test.ts tests/api/analyses-route.test.ts
git commit -m "feat: expose team metrics in analyses"
```

