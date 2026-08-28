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
