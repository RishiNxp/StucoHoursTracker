# Task 2 Report: Analysis Service Payload

## Status

Implemented the Team Metrics payload exposure for successful roster analyses. No commit was created because the shared workspace's `.git` directory is read-only.

## Files changed

- `src/analysis/service.ts`
  - Imports `buildTeamMetrics` and `TeamMetricsResult`.
  - Adds `teamMetrics?: TeamMetricsResult` to `AnalyzeReportsResult`.
  - Computes metrics only after report validation has succeeded and only when a roster is supplied.
  - Returns the result beside `performance`.
- `app/analysis-types.ts`
  - Adds `teamMetrics?: TeamMetricsResult` to `AnalysisViewModel`.
- `tests/analysis/service.test.ts`
  - Verifies roster metrics values and generated periods.
  - Verifies both roster-only fields are undefined without a roster.
- `tests/api/analyses-route.test.ts`
  - Verifies the API returns metrics for a valid roster.
  - Verifies both roster-only fields are undefined without a roster.

## TDD evidence

### RED

Command:

```powershell
npm.cmd run test:unit -- tests/analysis/service.test.ts tests/api/analyses-route.test.ts
```

Result: failed as expected with 2 failures. The service and API assertions both received `undefined` for `teamMetrics`, while the remaining 11 tests passed.

### GREEN

After the minimal service and view-model changes, reran:

```powershell
npm.cmd run test:unit -- tests/analysis/service.test.ts tests/api/analyses-route.test.ts
```

Result: 2 test files passed; 13 tests passed; 0 failures.

## Verification

```powershell
npm.cmd run build
```

Result: exit 0; Vinext completed all five build stages. It reported its pre-existing dynamic API-route classification notice, not a build error.

```powershell
git diff --check
```

Result: exit 0. Git emitted only CRLF conversion warnings for existing dirty-worktree files.

## Self-review

- `teamMetrics` uses the required `buildTeamMetrics(roster.rows, history.rows, schoolYearStart, schoolYearEnd)` call.
- The call occurs after the service returns for validation issues, so invalid analyses do not calculate metrics.
- Omitting `rosterReport` leaves both `performance` and `teamMetrics` absent.
- Assertions use hand-checked roster outcomes (2 roster entries, 1 active, 1 zero-hour) and real service/API execution.

## Concerns

- This task intentionally exposes metrics in the immediate analysis response only. Existing saved-analysis snapshot serialization does not yet include `teamMetrics`; persist/read support should be addressed by its designated follow-on task if historical display is required.
- The workspace already contained unrelated changes, including Task 1 additions. They were preserved.
