# Team Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add roster-backed team summary metrics and biweekly/cumulative hours visualization to current and saved analyses.

**Architecture:** A pure `buildTeamMetrics` function consumes normalized roster/history data and school-year bounds. The analysis service returns the result, History stores it in a version 3 immutable snapshot, and one reusable client component renders metrics on Overview and History detail.

**Tech Stack:** TypeScript, React 19, Vinext/Vite, Vitest, SheetJS, Cloudflare D1/R2, SVG.

**Spec:** `docs/superpowers/specs/2026-08-26-officers-team-metrics-design.md`

## Global Constraints

- Team Metrics exists only when a valid Full Roster is supplied.
- Use only roster-matched `Validated` activity inside the inclusive configured school year.
- Biweekly periods start at school-year start, cover 14 calendar days, include zero periods, and allow a shortened final period.
- Store exact metrics in snapshot version 3; never recompute saved History.
- Continue reading version 1 arrays and version 2 objects.
- Display hours with at most two decimal places.
- Do not add a charting dependency; render a responsive accessible SVG.

---

### Task 1: Pure Team Metrics Calculation

**Files:**
- Create: `src/analysis/team-metrics.ts`
- Modify: `src/analysis/types.ts`
- Create: `tests/analysis/team-metrics.test.ts`

**Interfaces:**
- Consumes: `RosterStudent[]`, `HistoryRow[]`, `Date schoolYearStart`, `Date schoolYearEnd`.
- Produces: `buildTeamMetrics(roster, history, start, end): TeamMetricsResult`.
- Produces types:

```ts
export type TeamMetricPeriod = {
  startDate: string;
  endDate: string;
  periodHours: number;
  cumulativeHours: number;
};
export type TeamMetricsResult = {
  rosterSize: number;
  totalHours: number;
  participationRate: number;
  averageHours: number;
  medianHours: number;
  activeVolunteers: number;
  zeroHourVolunteers: number;
  completedOpportunities: number;
  minimumHours: number;
  maximumHours: number;
  periods: TeamMetricPeriod[];
};
```

- [ ] **Step 1: Write failing calculation tests**

Create fixtures with roster members A/B/C and validated history on the start date, day 13, day 14, and school-year end. Assert:

```ts
expect(result).toMatchObject({
  rosterSize: 3,
  totalHours: 12,
  participationRate: 66.67,
  averageHours: 4,
  medianHours: 4,
  activeVolunteers: 2,
  zeroHourVolunteers: 1,
  completedOpportunities: 3,
  minimumHours: 0,
  maximumHours: 8,
});
expect(result.periods[0].periodHours).toBe(6);
expect(result.periods[1].periodHours).toBe(2);
expect(result.periods.at(-1)?.cumulativeHours).toBe(12);
```

Add separate tests for even median, zero-filled gaps, shortened final period, invalid/out-of-year rows, duplicate opportunity IDs, missing-ID fallback, ambiguous name-only matching, and email-first matching.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm.cmd run test:unit -- tests/analysis/team-metrics.test.ts`

Expected: FAIL because `team-metrics.ts` and exported types do not exist.

- [ ] **Step 3: Implement matching and aggregation**

Reuse the identity behavior from `buildPerformanceResult`: filter eligible history, index by normalized email/name, refuse ambiguous name-only matches, and calculate per-student rows. Extract shared matching helpers only if doing so leaves `performance.ts` and `team-metrics.ts` simpler and existing tests green.

Use these helpers in `team-metrics.ts`:

```ts
const roundHundredths = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const opportunityKey = (row: HistoryRow) =>
  row.eventId ?? `${row.eventName.trim().toLowerCase()}|${row.eventDate.toISOString()}`;
```

Generate periods with a cursor advanced by 14 UTC calendar days. Use an exclusive end equal to `min(start + 14 days, schoolYearEnd + 1 millisecond)` and serialize display dates as `YYYY-MM-DD`.

- [ ] **Step 4: Run focused and analysis tests**

Run: `npm.cmd run test:unit -- tests/analysis/team-metrics.test.ts tests/analysis/performance.test.ts`

Expected: PASS with no changed performance grouping.

- [ ] **Step 5: Commit**

```powershell
git add src/analysis/team-metrics.ts src/analysis/types.ts tests/analysis/team-metrics.test.ts
git commit -m "feat: calculate roster team metrics"
```

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

### Task 4: Team Metrics Interface

**Files:**
- Create: `app/components/TeamMetricsModule.tsx`
- Modify: `app/components/AnalysisDashboard.tsx`
- Modify: `app/components/AnalysisDetailView.tsx`
- Modify: `app/analysis.css`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `{ teamMetrics: TeamMetricsResult }`.
- Produces: reusable summary-card and accessible SVG rendering.

- [ ] **Step 1: Add failing rendered-surface assertions**

Read `TeamMetricsModule.tsx` and assert all approved labels plus both series exist:

```js
assert.match(surface, /Team metrics/);
assert.match(surface, /Total hours/);
assert.match(surface, /Participation/);
assert.match(surface, /Average hours/);
assert.match(surface, /Median hours/);
assert.match(surface, /Active volunteers/);
assert.match(surface, /Zero-hour volunteers/);
assert.match(surface, /Completed opportunities/);
assert.match(surface, /Hours spread/);
assert.match(surface, /Period Hours/);
assert.match(surface, /Cumulative Hours/);
```

- [ ] **Step 2: Run rendered test to verify RED**

Run: `node --test tests/rendered-html.test.mjs`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement `TeamMetricsModule`**

Render eight cards and a dependency-free responsive SVG. Derive x coordinates from point index and y coordinates from the maximum across both series. Handle all-zero data with a nonzero y-domain of 1. Include `<title>`, `<desc>`, visible axis labels, legend text, and native `<title>` point tooltips. Use `Intl.NumberFormat` with `maximumFractionDigits: 2`.

- [ ] **Step 4: Mount and style the component**

Render after `PerformanceModule` in Overview and History detail:

```tsx
{analysis.performance && <PerformanceModule performance={analysis.performance} />}
{analysis.teamMetrics && <TeamMetricsModule teamMetrics={analysis.teamMetrics} />}
```

Match the approved cream/nav/coral/teal visual language. At 720px, use two metric columns and reduce x-axis labels rather than introducing horizontal page scrolling.

- [ ] **Step 5: Run UI and type checks**

Run: `node --test tests/rendered-html.test.mjs`

Run: `npx.cmd tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add app/components/TeamMetricsModule.tsx app/components/AnalysisDashboard.tsx app/components/AnalysisDetailView.tsx app/analysis.css tests/rendered-html.test.mjs
git commit -m "feat: show team metrics and hours trends"
```

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
