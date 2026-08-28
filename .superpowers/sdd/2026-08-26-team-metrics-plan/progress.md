# SDD ledger — plan: docs/superpowers/plans/2026-08-26-team-metrics-plan.md

Baseline: `npm.cmd test` passed (38 unit tests, build, 2 rendered tests).

Ruling: Execute in the current feature checkout because `.git` is read-only and worktree creation/commits are unavailable — risk: task diffs cannot be isolated by commits, so reviews must use exact task file scopes.

## Preflight interface scan

| Tasks | Shared file/interface | Finding |
|---|---|---|
| 1 → 2 | `TeamMetricsResult`, `buildTeamMetrics` | Clean: Task 2 consumes exact Task 1 names. |
| 2 → 3 | `AnalyzeReportsResult.teamMetrics` | Clean: Task 3 persists the optional field. |
| 2 → 4 | `AnalysisViewModel.teamMetrics` | Clean: Task 4 consumes exact view-model field. |
| 3 → 4 | `SavedAnalysis.teamMetrics` | Clean: History detail receives the same type. |
| 4 → 5 | visible metric labels/behavior | Clean: documentation follows implemented definitions. |
| 1 | tests vs implementation | Clean: all formula and boundary assertions map to specified output fields. |
| 2 | tests vs implementation | Clean: roster/no-roster behavior is explicit. |
| 3 | tests vs implementation | Clean: version 1/2/3 compatibility is explicit. |
| 4 | tests vs implementation | Clean: rendered labels and SVG behavior are explicit. |
| 5 | verification vs deliverable | Clean: documentation and browser checks cover the module. |

Task 1: fix round 1/5 (2 addressed, 0 open — true minimum for all-active roster plus regression test; commits unavailable)
Task 1: complete (working-tree task scope, review clean)
Task 2: complete (working-tree task scope, review clean)
Task 3: complete (working-tree task scope, review clean)
Task 4: resolved: the rendered test reads `TeamMetricsModule.tsx` directly, so repeated labels such as “Completed opportunities” cannot be satisfied by another component.
Task 4: complete (working-tree task scope, review clean; deferred minor resolved)
Task 5: fix round 1/5 (2 addressed, 0 load-bearing open — live UI reconciliation and durable command evidence; commits unavailable)
Task 5: Ruling: do not seed artificial v1/v2 rows solely for a visual check; the authoritative spec requires backward-compatible reads, which explicit v1/v2/v3 repository tests prove, while saved History rendering uses the decoded shared view model — risk if wrong: a legacy-only UI shape defect could remain despite repository and rendered-surface coverage.
Task 5: complete (working-tree task scope, review clean with ruled legacy visual boundary)
Final review: one fix wave completed; all five findings addressed; scoped re-review clean.
Plan complete.
Additional final-review correction (2026-08-27): name-only history activity now falls back only when the normalized name identifies exactly one roster member. A two-member duplicate-name regression failed RED with 8 double-counted hours, then passed GREEN with 0 matched hours. Focused metrics tests passed 13/13; full unit tests passed 128/128; production build, TypeScript, and 2/2 rendered checks passed. No commit created.
