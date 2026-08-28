# Roster Performance and Direct Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add direct sidebar navigation plus optional roster-driven performer analytics that remain available in saved History snapshots.

**Architecture:** Keep workbook normalization and scoring in pure TypeScript modules, extend the existing analysis payload with optional performance data, and reuse one performance component in current and saved analysis views. D1 stores a versioned JSON snapshot and an optional roster upload reference; R2 stores the roster workbook only when Save to History is selected.

**Tech Stack:** TypeScript, React 19, Vinext/Vite, Vitest, SheetJS, Drizzle ORM, Cloudflare D1/R2.

**Spec:** `docs/superpowers/specs/2026-08-26-roster-performance-navigation-design.md`

## Global Constraints

- The Team Report and Upcoming Opportunities report remain required; the roster workbook is optional.
- Every workbook must be `.xlsx` and no larger than 10 MiB.
- Hours and completed opportunities have equal weight in the 0–100 combined score.
- Group membership is determined by score distribution and preserved ties; display sorting never changes membership.
- Existing saved rows whose `results_json` contains only a volunteers array must remain readable.
- No workflow sends email or changes Helper Helper registrations.
- Local demo authentication must remain disabled in production.
- Git metadata is read-only in the current Codex workspace; commit steps must be completed by the user if that restriction remains.

---

### Task 1: Direct Sidebar Navigation

**Files:**
- Modify: `app/page.tsx`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Produces: `type AppTab = "Overview" | "New analysis" | "History" | "Officers"`.
- Produces: `navigate(tab: AppTab): void`, which clears `detailId`, activates the tab, and opens the modal only for New analysis.

- [ ] **Step 1: Add a failing rendered-surface assertion**

Add assertions that require a shared navigation function and detail clearing:

```js
assert.match(page, /const navigate = \(tab/);
assert.match(page, /setDetailId\(null\)/);
assert.match(page, /onClick=\{\(\) => navigate\("Overview"\)\}/);
assert.match(page, /onClick=\{\(\) => navigate\("History"\)\}/);
assert.match(page, /onClick=\{\(\) => navigate\("Officers"\)\}/);
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `node --test tests/rendered-html.test.mjs`

Expected: FAIL because `app/page.tsx` does not yet contain the shared navigation action.

- [ ] **Step 3: Implement the shared navigation action**

Replace the separate sidebar handlers with:

```tsx
type AppTab = "Overview" | "New analysis" | "History" | "Officers";

const navigate = (tab: AppTab) => {
  setDetailId(null);
  setActiveTab(tab);
  setShowUpload(tab === "New analysis");
};
```

Use `navigate("Overview")`, `navigate("New analysis")`, `navigate("History")`, and `navigate("Officers")` for the four sidebar buttons. When closing the upload modal without a completed analysis, return to Overview if New analysis is still the active tab.

- [ ] **Step 4: Run the focused test**

Run: `node --test tests/rendered-html.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/page.tsx tests/rendered-html.test.mjs
git commit -m "fix: make sidebar navigation leave analysis details"
```

---

### Task 2: Roster Normalization and Performance Scoring

**Files:**
- Modify: `src/analysis/types.ts`
- Modify: `src/analysis/normalize.ts`
- Create: `src/analysis/performance.ts`
- Create: `tests/analysis/performance.test.ts`
- Modify: `tests/analysis/workbook.test.ts`

**Interfaces:**
- Produces: `RosterStudent`, `NormalizedRoster`, `PerformanceGroup`, `PerformanceStudent`, and `PerformanceResult` types.
- Produces: `normalizeRosterReport(book: WorkbookLike): NormalizedRoster`.
- Produces: `buildPerformanceResult(roster: RosterStudent[], history: HistoryRow[], start: Date, end: Date): PerformanceResult`.
- Produces: `sortPerformanceStudents(students, key): PerformanceStudent[]` for deterministic UI sorting.

- [ ] **Step 1: Write failing roster and scoring tests**

Cover the approved edge cases with concrete fixtures:

```ts
it("keeps a half-zero roster together in developing", () => {
  const result = buildPerformanceResult(
    roster("A", "B", "C", "D"),
    [validated("C", 5, "opp-1"), validated("D", 10, "opp-2")],
    start,
    end,
  );
  expect(result.students.filter((student) => student.group === "developing").map((student) => student.name)).toEqual(["A", "B"]);
});

it("puts an all-zero roster in developing", () => {
  expect(buildPerformanceResult(roster("A", "B"), [], start, end).summary).toEqual({ developing: 2, steady: 0, top: 0 });
});

it("puts an equal non-zero roster in steady", () => {
  const history = [validated("A", 5, "a"), validated("B", 5, "b")];
  expect(buildPerformanceResult(roster("A", "B"), history, start, end).summary).toEqual({ developing: 0, steady: 2, top: 0 });
});

it("counts duplicate opportunity IDs once", () => {
  const history = [validated("A", 2, "same"), validated("A", 2, "same")];
  expect(buildPerformanceResult(roster("A"), history, start, end).students[0].completedOpportunities).toBe(1);
});
```

Also test name/email header aliases, duplicate roster merging, email-first matching, ambiguous name-only warnings, two distinct scores, ties across percentile boundaries, school-year filtering, and name/hours/opportunity/score sorting.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm.cmd run test:unit -- tests/analysis/performance.test.ts tests/analysis/workbook.test.ts`

Expected: FAIL because roster normalization and performance exports do not exist.

- [ ] **Step 3: Add the domain types**

Add:

```ts
export type RosterStudent = { volunteerKey: string; name: string; email: string | null; warnings: string[] };
export type NormalizedRoster = { rows: RosterStudent[]; issues: ValidationIssue[] };
export type PerformanceGroup = "developing" | "steady" | "top";
export type PerformanceStudent = RosterStudent & {
  validatedHours: number;
  completedOpportunities: number;
  combinedScore: number;
  group: PerformanceGroup;
};
export type PerformanceResult = {
  students: PerformanceStudent[];
  summary: Record<PerformanceGroup, number>;
  boundaries: { lower: number; upper: number } | null;
};
```

- [ ] **Step 4: Implement roster normalization**

Add a header-alias search across all sheets. Normalize email to lowercase, normalize name with trimmed lowercase whitespace, merge duplicate identities, and emit `MISSING_ROSTER_NAME_COLUMN`, `EMPTY_ROSTER`, and `AMBIGUOUS_ROSTER_IDENTITY` issues where required.

The exported function must have this signature:

```ts
export function normalizeRosterReport(book: WorkbookLike): NormalizedRoster;
```

- [ ] **Step 5: Implement scoring and grouping**

Use these helpers in `performance.ts`:

```ts
const roundHundredths = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const nearestRank = (sorted: number[], percentile: number) =>
  sorted[Math.max(0, Math.ceil(percentile * sorted.length) - 1)];

const combinedScore = (hours: number, opportunities: number, maxHours: number, maxOpportunities: number) =>
  roundHundredths(100 * (((maxHours ? hours / maxHours : 0) + (maxOpportunities ? opportunities / maxOpportunities : 0)) / 2));
```

Apply special cases before percentile classification: all-zero scores become Developing; one equal non-zero score becomes Steady; two distinct scores become Developing and Top. For larger distributions, classify `score <= lower` as Developing, then `score >= upper` as Top, otherwise Steady so ties shared by both boundaries remain together in Developing.

- [ ] **Step 6: Run the focused tests**

Run: `npm.cmd run test:unit -- tests/analysis/performance.test.ts tests/analysis/workbook.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/analysis/types.ts src/analysis/normalize.ts src/analysis/performance.ts tests/analysis/performance.test.ts tests/analysis/workbook.test.ts
git commit -m "feat: calculate roster performance groups"
```

---

### Task 3: Extend Analysis Service and API

**Files:**
- Modify: `src/analysis/service.ts`
- Modify: `app/api/analyses/route.ts`
- Modify: `app/analysis-types.ts`
- Modify: `tests/analysis/service.test.ts`
- Modify: `tests/api/analyses-route.test.ts`

**Interfaces:**
- Extends: `AnalyzeReportsInput` with `rosterReport?: ArrayBuffer`.
- Extends: `AnalyzeReportsResult` and `AnalysisViewModel` with `performance?: PerformanceResult`.
- Extends: multipart POST with optional `rosterReport: File`.

- [ ] **Step 1: Add failing service and API tests**

Add tests proving:

```ts
expect(analyzeReports({ ...baseInput, rosterReport }).performance?.students).toHaveLength(4);
expect(analyzeReports(baseInput).performance).toBeUndefined();
```

For the route, submit a valid optional roster and assert HTTP 200 includes performance. Submit `roster.csv` and an invalid roster workbook and assert HTTP 400 with a roster-specific issue. Retain the existing no-roster HTTP 200 test.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npm.cmd run test:unit -- tests/analysis/service.test.ts tests/api/analyses-route.test.ts`

Expected: FAIL because the service and route ignore `rosterReport`.

- [ ] **Step 3: Extend the analysis service**

Parse and normalize the roster only when `input.rosterReport` is present. Append roster validation issues to the existing issue list, and after successful classification calculate:

```ts
const performance = roster
  ? buildPerformanceResult(roster.rows, history.rows, schoolYearStart, schoolYearEnd)
  : undefined;
```

Return `performance` alongside configuration, summary, volunteers, and issues.

- [ ] **Step 4: Extend multipart validation**

In `POST /api/analyses`, validate the roster only when `form.get("rosterReport")` is a `File` with a non-empty filename. Apply the same `.xlsx` and 10 MiB rules with messages that name the Full Roster. Pass its bytes into `analyzeReports`.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd run test:unit -- tests/analysis/service.test.ts tests/api/analyses-route.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/analysis/service.ts app/api/analyses/route.ts app/analysis-types.ts tests/analysis/service.test.ts tests/api/analyses-route.test.ts
git commit -m "feat: accept optional roster analyses"
```

---

### Task 4: Persist Versioned Performance Snapshots and Roster Uploads

**Files:**
- Modify: `db/schema.ts`
- Generate: `drizzle/0002_roster_performance.sql`
- Generate: `drizzle/meta/0002_snapshot.json`
- Modify: `src/server/types.ts`
- Modify: `src/server/repository.ts`
- Modify: `tests/server/repository.test.ts`
- Modify: `tests/api/analyses-route.test.ts`

**Interfaces:**
- Extends: `SaveAnalysisInput` with optional `rosterReport?: ArrayBuffer` and `rosterFilename?: string`.
- Extends: `SavedAnalysis` with `performance?: AnalyzeReportsResult["performance"]`.
- Persists: `{ snapshotVersion: 2, volunteers, performance }` in `results_json`.
- Adds: nullable `analyses.roster_upload_id`.

- [ ] **Step 1: Add failing persistence tests**

Assert that a roster-inclusive save writes three R2 objects, adds a `roster_report` upload statement, and stores `snapshotVersion: 2`. Add a legacy read test where `results_json` is a volunteers array and `performance` is absent. Add a failure test that makes D1 batch reject and asserts all three uploaded R2 keys are deleted.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npm.cmd run test:unit -- tests/server/repository.test.ts tests/api/analyses-route.test.ts`

Expected: FAIL because persistence supports only two uploads and an unversioned volunteers array.

- [ ] **Step 3: Add the schema column and generate migration**

Add:

```ts
rosterUploadId: text("roster_upload_id"),
```

Run: `npm.cmd run db:generate -- --name roster_performance`

Expected: a migration that adds nullable `roster_upload_id` without dropping existing analysis data.

- [ ] **Step 4: Update save logic**

Build an upload list containing team and upcoming reports plus roster only when both optional roster values are present. Save the versioned snapshot:

```ts
const results = JSON.stringify({
  snapshotVersion: 2,
  volunteers: analysis.volunteers,
  performance: analysis.performance,
});
```

Bind the optional roster upload ID in the analysis insert and retain cleanup for every successful R2 put if any later operation fails.

- [ ] **Step 5: Add backward-compatible reads**

Decode results through a focused helper:

```ts
function decodeResults(value: string) {
  const parsed = JSON.parse(value);
  return Array.isArray(parsed)
    ? { volunteers: parsed, performance: undefined }
    : { volunteers: parsed.volunteers ?? [], performance: parsed.performance };
}
```

Select `roster_upload_id`, include it in the organization-scoped upload query when present, and return optional performance from `getAnalysis`.

- [ ] **Step 6: Pass roster bytes through the API save path**

When `save === "true"`, include `rosterReport` and `rosterFilename` only when the optional file was supplied and validated.

- [ ] **Step 7: Run focused tests**

Run: `npm.cmd run test:unit -- tests/server/repository.test.ts tests/api/analyses-route.test.ts`

Expected: PASS.

- [ ] **Step 8: Apply the new local migration**

Run the exact generated migration file:

```powershell
.\node_modules\.bin\wrangler.cmd d1 execute DB --local --file drizzle/0002_roster_performance.sql --yes
```

Expected: successful D1 execution and the existing History rows remain readable.

- [ ] **Step 9: Commit**

```powershell
git add db/schema.ts drizzle src/server/types.ts src/server/repository.ts tests/server/repository.test.ts tests/api/analyses-route.test.ts
git commit -m "feat: persist roster performance snapshots"
```

---

### Task 5: Roster Upload and Reusable Performance UI

**Files:**
- Modify: `app/components/AnalysisUploadModal.tsx`
- Create: `app/components/PerformanceModule.tsx`
- Modify: `app/components/AnalysisDashboard.tsx`
- Modify: `app/components/AnalysisDetailView.tsx`
- Modify: `app/analysis.css`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Produces: `PerformanceModule({ performance }: { performance: PerformanceResult }): JSX.Element`.
- Consumes: optional `analysis.performance` in current and saved analysis views.

- [ ] **Step 1: Add failing rendered-surface assertions**

Require the roster control, all group labels, and sorting choices:

```js
assert.match(surface, /Full Roster/);
assert.match(surface, /Top performers/);
assert.match(surface, /Steady performers/);
assert.match(surface, /Developing performers/);
assert.match(surface, /Validated hours/);
assert.match(surface, /Completed opportunities/);
assert.match(surface, /Combined score/);
```

- [ ] **Step 2: Run the rendered test and confirm failure**

Run: `node --test tests/rendered-html.test.mjs`

Expected: FAIL because roster upload and performance UI are absent.

- [ ] **Step 3: Add the optional roster upload field**

Add `rosterReport` state and a third upload field labeled `03 Full Roster`. Keep form validity dependent only on the two required reports. When present, append the file with:

```ts
form.set("rosterReport", rosterReport);
```

- [ ] **Step 4: Implement the reusable performance module**

Use a single sort state:

```ts
type SortKey = "combinedScore" | "validatedHours" | "completedOpportunities" | "name";
const [sortKey, setSortKey] = useState<SortKey>("combinedScore");
```

Render summary cards and three sections in the order Top, Steady, Developing. Sort a copy of each group using the selected key. Render an explicit empty message for groups with no students.

- [ ] **Step 5: Render performance in current and saved views**

In `AnalysisDashboard`, render `<PerformanceModule performance={analysis.performance} />` beneath the existing opportunity table when performance exists. In `AnalysisDetailView`, render the same module from the immutable saved snapshot.

- [ ] **Step 6: Add responsive styling**

Add styles for the performer summary, sort control, section headers, score bars, rows, and mobile stacking. Reuse the existing color system: coral for Developing, gold/neutral for Steady, and teal for Top.

- [ ] **Step 7: Run UI and type checks**

Run:

```powershell
node --test tests/rendered-html.test.mjs
npx tsc --noEmit
```

Expected: both commands PASS.

- [ ] **Step 8: Commit**

```powershell
git add app/components/AnalysisUploadModal.tsx app/components/PerformanceModule.tsx app/components/AnalysisDashboard.tsx app/components/AnalysisDetailView.tsx app/analysis.css tests/rendered-html.test.mjs
git commit -m "feat: show roster performance on overview"
```

---

### Task 6: Documentation and End-to-End Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/ADMIN_GUIDE.md`

**Interfaces:**
- Documents the roster workbook columns, score calculation, group behavior, local migration command, saved snapshot behavior, and sidebar navigation.

- [ ] **Step 1: Update user documentation**

Document that Full Roster is optional, requires a name column, prefers email, includes zero-activity students, and computes equal-weight hours/opportunity scores. Explain that groups reflect distribution and preserve ties rather than forcing equal headcounts.

- [ ] **Step 2: Run the complete automated verification**

Run:

```powershell
npm.cmd test
npx tsc --noEmit
git diff --check
```

Expected: 0 failures, a successful Vinext production build, and no whitespace errors. If lint is attempted and still cannot load `aria-query/lib/index.js`, report that existing dependency-installation defect separately rather than representing lint as passing.

- [ ] **Step 3: Run a local HTTP smoke test**

With `npm.cmd run dev` running, submit one two-report analysis without a roster and expect HTTP 200 without performance. Submit a roster-inclusive saved analysis and expect HTTP 201, then fetch `/api/analyses` and `/api/analyses/:id` and confirm the immutable response includes the same performance scores and groups.

- [ ] **Step 4: Verify browser interactions**

Open the current local URL, enter a History detail, and click Overview, New analysis, History, and Officers in turn. Confirm each destination opens directly. Upload a roster fixture containing zero-activity students and confirm group membership remains unchanged while switching every sort option.

- [ ] **Step 5: Commit**

```powershell
git add README.md docs/ADMIN_GUIDE.md
git commit -m "docs: explain roster performance workflow"
```
