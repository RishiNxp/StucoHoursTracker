# Task 3 Report: Version 3 Immutable Persistence

## Files changed

- `src/server/types.ts`
  - Adds optional `SavedAnalysis.teamMetrics`, typed from `AnalyzeReportsResult`.
- `src/server/repository.ts`
  - Persists immutable version 3 snapshots with `teamMetrics`.
  - Returns metrics after saving and restores the optional persisted property on reads.
  - Retains legacy array (version 1) and version 2 object compatibility without recomputing analysis.
- `tests/server/repository.test.ts`
  - Covers v3 writes and v1/v2/v3 read compatibility.

## RED

Command:

```powershell
npm.cmd run test:unit -- tests/server/repository.test.ts
```

Result: failed as expected with 2 failures out of 8 tests. The saved payload was `{ snapshotVersion: 2, volunteers, performance }` rather than version 3 with metrics, and reading a v3 fixture returned `undefined` for `teamMetrics`.

## GREEN

Command:

```powershell
npm.cmd run test:unit -- tests/server/repository.test.ts tests/api/analyses-route.test.ts
```

Result: passed — 2 test files and 16 tests; zero failures.

## Self-review

- Writer payload is exactly version 3 and includes `volunteers`, `performance`, and `teamMetrics`.
- `SavedAnalysis.teamMetrics` remains optional for historical snapshots.
- Array snapshots continue to decode as version 1, while object snapshots use optional-property presence, allowing version 2 data to omit metrics and version 3 data to preserve them.
- The reader restores stored data only; it does not call analysis functions or recalculate metrics.
- Tests exercise real repository save/read behavior with hand-specified fixtures. They catch omitted metrics, an incorrect write version, and accidental exposure of metrics in v1/v2 data.
- Scoped whitespace check completed with no errors.

## Concerns

- The workspace contained substantial unrelated dirty/untracked work before this task; it was preserved.
- No commit was created, per task instruction.
