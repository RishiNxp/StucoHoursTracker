# Task 1 Report: Pure Team Metrics Calculation

## Files changed

- Created `src/analysis/team-metrics.ts` with `buildTeamMetrics`, roster identity matching, validated/in-year filtering, aggregate metrics, opportunity deduplication, and UTC fourteen-day period generation.
- Modified `src/analysis/types.ts` to add `TeamMetricPeriod` and `TeamMetricsResult`.
- Created `tests/analysis/team-metrics.test.ts` covering aggregate values, period boundaries, even median, zero-filled gaps, shortened final periods, invalid/out-of-year activity, duplicate IDs, missing-ID fallback, ambiguous name-only matching, and email-first matching.

## Tests run

1. RED: `npm.cmd run test:unit -- tests/analysis/team-metrics.test.ts`
   - Failed as expected before implementation: `Cannot find module '../../src/analysis/team-metrics'`.
2. GREEN and regression: `npm.cmd run test:unit -- tests/analysis/team-metrics.test.ts tests/analysis/performance.test.ts`
   - Passed: 2 files, 21 tests.
3. Whitespace check: `git diff --check -- src/analysis/team-metrics.ts src/analysis/types.ts tests/analysis/team-metrics.test.ts`
   - Passed with no whitespace errors. Git emitted only an existing line-ending conversion warning for `src/analysis/types.ts`.

## Self-review

- Matching follows `buildPerformanceResult`: validated, inclusive school-year rows are indexed by normalized email and name; email wins; name fallback rejects multiple identities.
- Summary values are based only on rows matched to the roster; percentage, average, median, and period totals are rounded to hundredths.
- Completed opportunities use the specified event-ID-or-normalized-name-and-timestamp key.
- Time series covers every period, including zero activity; each interval is start-inclusive/end-exclusive and displays an inclusive date end.

## Concerns

- No concerns with the requested implementation or focused tests.
- The worktree already contained unrelated edits, including pre-existing changes in `src/analysis/types.ts`; they were preserved. No commit was attempted because `.git` is read-only.

## Round 1 Fix

- Added an all-active roster regression test with per-student totals of 2 and 5. It asserts `minimumHours` is 2.
- The new test failed before the fix with `expected 0 to be 2`.
- Changed `minimumHours` to use `Math.min(...hoursByStudent)` when the roster has members, retaining a zero fallback only for an empty roster.
- Re-ran `npm.cmd run test:unit -- tests/analysis/team-metrics.test.ts tests/analysis/performance.test.ts`: passed, 2 files and 22 tests.
