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

