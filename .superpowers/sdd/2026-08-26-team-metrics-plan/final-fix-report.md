# Team Metrics final fix report

Date: 2026-08-26

## Outcome

All five final-review findings were addressed in one scoped fix wave:

1. Team totals, per-student totals, and cumulative totals now remain unrounded internally. Hundredths rounding occurs only when populating exposed `TeamMetricsResult` values, so the summary `totalHours` and the chart's final `cumulativeHours` reconcile for fractional data across students and periods.
2. Essential Team Metrics card labels, card notes, section/chart notes, chart tick labels, axis labels/line, and period-table text now meet WCAG contrast thresholds against their rendered backgrounds. Small essential labels were also increased from 9px to 10–11px.
3. Every period's full date range, Period Hours, and Cumulative Hours is available in a native keyboard/touch-expandable `<details>` table. SVG point `<title>` values remain supplementary rather than the only exact-value mechanism.
4. The approved `Period Hours` and `Cumulative Hours` labels are aligned across the component, rendered/component tests, README, administrator guide, implementation plan, task brief, and current task report.
5. The Task 4 deferred-minor ledger entry now records that the isolated `TeamMetricsModule.tsx` rendered assertions resolved the composite-surface concern.

## Files changed in this fix wave

- `src/analysis/team-metrics.ts`
  - Keeps student, total, period, and cumulative values exact during aggregation; sorts matched activity chronologically so summary and final cumulative use the same row order; rounds only result fields.
- `tests/analysis/team-metrics.test.ts`
  - Adds cross-student and cross-period fractional regressions that reconcile summary and chart totals.
- `app/components/TeamMetricsModule.tsx`
  - Uses approved series terminology and adds a native expandable period-data table with full UTC date ranges and both values for every period.
- `tests/components/team-metrics.test.ts`
  - Server-renders the real component and verifies table semantics/content for every supplied period.
- `tests/rendered-html.test.mjs`
  - Requires `Period Hours` and `Cumulative Hours` on the Team Metrics component surface.
- `app/analysis.css`
  - Raises Team Metrics text/axis contrast and sizes; styles the 44px native summary target and contained responsive period table.
- `README.md`
  - Uses approved series names and documents keyboard/touch access to period data.
- `docs/ADMIN_GUIDE.md`
  - Uses approved series names and documents keyboard/touch access to period data.
- `docs/superpowers/plans/2026-08-26-team-metrics-plan.md`
  - Aligns the rendered assertion example with approved terminology.
- `.superpowers/sdd/2026-08-26-team-metrics-plan/task-4-brief.md`
  - Aligns the task assertion example with approved terminology.
- `.superpowers/sdd/2026-08-26-team-metrics-plan/task-5-report.md`
  - Aligns current verification prose with approved terminology.
- `.superpowers/sdd/2026-08-26-team-metrics-plan/progress.md`
  - Marks the Task 4 deferred minor resolved.
- `.superpowers/sdd/2026-08-26-team-metrics-plan/final-fix-report.md`
  - Records this fix wave and its evidence.

Pre-existing unrelated dirty changes were preserved. No commit was created because `.git` is read-only and the task explicitly forbids commits.

## TDD red evidence

### Fractional aggregation and terminology

Command:

```powershell
npm.cmd run test:unit -- tests/analysis/team-metrics.test.ts tests/components/team-metrics.test.tsx; node --test tests/rendered-html.test.mjs
```

Observed before production changes:

- Team Metrics calculation: 2 of 12 tests failed for the expected intermediate-rounding defects.
  - Cross-student total: expected `2.01`, received `2.02`.
  - Cross-period cumulative total: expected `2.01`, received `2.02`.
- Rendered test: failed because `Period Hours` was absent and the component still rendered the legacy series label.
- The `.tsx` component test was not collected because `vitest.config.ts` includes `tests/**/*.test.ts`; the test was moved to `.test.ts` and changed to `createElement` before production changes.

### Accessible period data

Command:

```powershell
npm.cmd run test:unit -- tests/components/team-metrics.test.ts
```

Observed before component changes: 1 of 1 test failed for the expected reason—rendered markup did not contain `<details>` or a period-data table.

## Green and final verification evidence

| Command | Exit | Output summary |
| --- | ---: | --- |
| `npm.cmd run test:unit -- tests/analysis/team-metrics.test.ts tests/components/team-metrics.test.ts; node --test tests/rendered-html.test.mjs` | 0 | Focused: 2 files / 13 tests passed. Rendered: 2 tests passed, 0 failed. |
| WCAG contrast calculation for the actual Team Metrics foreground/background pairs | 0 | Team labels/chart text 6.27:1; subtitle on cream 5.84:1; table headings 6.10:1; legend 5.00:1; table values 6.40:1; coral series 3.02:1; teal series 4.08:1. Text pairs meet 4.5:1; non-text chart series meet 3:1. The first one-off invocation had a PowerShell/template-literal quoting syntax error; the corrected concatenation-based invocation produced these passing ratios. |
| `npm.cmd test` | 0 | 9 Vitest files / 54 tests passed; Vinext production build completed; 2 rendered tests passed. |
| `npx.cmd tsc --noEmit` | 0 | No TypeScript diagnostics. |
| `git diff --check` | 0 | No whitespace errors; output contains only existing LF-to-CRLF conversion warnings for dirty worktree files. |

## Self-review against final findings

- **Rounding:** No call to `roundHundredths` feeds another calculation. `hoursByStudent`, `exactTotalHours`, `exactPeriodHours`, and cumulative state remain raw. The two hand-derived `1.005` regressions fail under either student-first or period-first intermediate rounding and now pass.
- **Summary/chart reconciliation:** Matched rows are ordered once by event timestamp. Summary total and cumulative series consume that same ordered row set, and focused/full tests assert the final cumulative value equals `totalHours`.
- **Contrast:** All essential Team Metrics normal text is at least 5.00:1 on its actual background; the common updated `#52636a` foreground ranges from 5.84:1 to 6.27:1. Chart series also clear the 3:1 non-text threshold.
- **Keyboard/touch access:** Native `<summary>` is keyboard- and touch-operable with a 44px minimum target. The revealed semantic table has scoped column headings and includes all periods, full date ranges, Period Hours, and Cumulative Hours. Horizontal overflow is contained within the table wrapper on narrow screens.
- **Terminology:** Product UI, active tests, README, administrator guide, implementation plan, task brief, and current report use `Period Hours`. Archived `*-review-package.md` and `final-review-package.md` files intentionally retain their captured pre-fix diffs and wording as review evidence; they are not current product documentation.
- **Ledger:** The old `Task 4: minor (deferred)` line was replaced with the concrete resolution and the completion line now states `review clean; deferred minor resolved`.
- **Scope:** No unrelated dirty file was reverted or reformatted, and no dependency or persistence shape changed.

## Concerns

No open implementation concern. The review-package markdown files remain immutable historical snapshots of the pre-fix diff, so searches that intentionally include archived review packages will still find the old series wording inside quoted source snapshots.

## Additional final-review correction — 2026-08-27

Name-only history fallback now requires the normalized student name to identify exactly one roster member. Email matching remains first priority, and the existing report-side ambiguity guard remains in place. This prevents one email-less activity row from being assigned to multiple roster members who share a normalized name while preserving unique-name fallback.

TDD evidence:

- RED: the new duplicate-roster-name regression expected zero matched activity but received 8 total hours, 2 active volunteers, and 1 completed opportunity because the same 4-hour row was assigned twice.
- GREEN: `npm.cmd run test:unit -- tests/analysis/team-metrics.test.ts` passed 13/13 tests after the minimal roster-name uniqueness guard.

Final verification evidence:

| Command | Exit | Output summary |
| --- | ---: | --- |
| `npm.cmd test` | 0 | 13 Vitest files / 128 tests passed; Vinext production build completed; 2 rendered checks passed. |
| `npx.cmd tsc --noEmit` | 0 | No TypeScript diagnostics. |
| `npm.cmd run build` | 0 | All five Vinext build stages completed. |
| `node --test tests/rendered-html.test.mjs` | 0 | 2 tests passed, 0 failed. |

No unrelated files were edited and no commit was created.
