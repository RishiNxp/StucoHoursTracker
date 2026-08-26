# New Analysis Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the static New Analysis modal into a working, non-persistent Helper Helper workbook analysis flow.

**Architecture:** A multipart App Router endpoint validates form input, parses `.xlsx` bytes through a small adapter, calls a pure orchestration service around the existing normalization/classification modules, and serializes results for the client. The dashboard submits the form and replaces demonstration data with the returned unsaved analysis; no workbook bytes or results are persisted.

**Tech Stack:** TypeScript, React 19, Vinext App Router, Vite/Vitest, SheetJS `xlsx`, Node test fixtures

**Spec:** `docs/superpowers/specs/2026-08-25-new-analysis-workflow-design.md`

## Global Constraints

- Accept exactly two `.xlsx` files, each no larger than 10 MiB.
- Process workbook bytes in memory and do not log or persist student data.
- Exactly the configured cap is allowed; only projected totals greater than the cap flag optional events.
- `MANDATORY` matching is case-insensitive, exempt events still add hours, and no email or registration action is automatic.
- Dates cross the HTTP boundary as ISO 8601 strings.
- Existing unrelated `package-lock.json` changes must be inspected and preserved.

---

### Task 1: Test harness and analysis regressions

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tests/analysis/classify.test.ts`
- Create: `tests/analysis/drafts.test.ts`
- Modify: `src/analysis/types.ts`
- Modify: `src/analysis/normalize.ts`
- Modify: `src/analysis/classify.ts`
- Modify: `src/analysis/drafts.ts`

**Interfaces:**
- Produces: `buildVolunteerDraft(input: DraftInput): Draft`, where `DraftInput` includes `schoolYearLabel` and `capHours`.
- Produces: normalized upcoming rows whose missing-email `volunteerKey` is unique per source row and whose ambiguous status is represented as a warning.
- Consumes: existing `ClassificationInput`, `HistoryRow`, and `UpcomingRow` types.

- [ ] **Step 1: Install the test and workbook dependencies**

Run: `npm.cmd install xlsx@0.18.5 && npm.cmd install --save-dev vitest@3.2.4`

Update scripts so `npm test` runs `vitest run`, the production build, and `tests/rendered-html.test.mjs`; add `test:unit` as `vitest run`.

- [ ] **Step 2: Write failing classification regression tests**

Create tests using real `classifyVolunteerHours` inputs for: exactly-cap versus over-cap, chronological events, mandatory events affecting later projections, inactive exclusions, ambiguous-status warnings, and two missing-email rows from one event remaining separate volunteers.

Representative assertion:

```ts
expect(result.volunteers.map((volunteer) => volunteer.volunteerKey)).toEqual([
  "missing-email:Opportunity Volunteers:2",
  "missing-email:Opportunity Volunteers:3",
]);
```

- [ ] **Step 3: Run the tests and verify RED**

Run: `npm.cmd run test:unit -- tests/analysis/classify.test.ts`

Expected: failures show missing-email rows currently collapse onto an event-name key and ambiguous statuses lack warnings.

- [ ] **Step 4: Implement the minimal normalization/classification changes**

Add source-row identity to normalized upcoming rows, create row-scoped missing-email keys, carry quality warnings to classified events/volunteers, and deduplicate identical warning text. Preserve existing rule behavior.

- [ ] **Step 5: Write and verify a failing configurable-draft test**

Assert that a 30-hour cap and `2027–2028` label appear in the subject/body inputs and that neither fixed `25-hour` nor `2026–2027` text remains.

Run: `npm.cmd run test:unit -- tests/analysis/drafts.test.ts`

Expected: FAIL because draft copy is currently hard-coded.

- [ ] **Step 6: Implement configurable draft copy and verify GREEN**

Run: `npm.cmd run test:unit -- tests/analysis/classify.test.ts tests/analysis/drafts.test.ts`

Expected: all analysis and draft tests pass.

### Task 2: Workbook parser and analysis service

**Files:**
- Create: `src/analysis/workbook.ts`
- Create: `src/analysis/service.ts`
- Modify: `src/analysis/index.ts`
- Create: `tests/analysis/workbook.test.ts`
- Create: `tests/analysis/service.test.ts`

**Interfaces:**
- Produces: `parseWorkbook(bytes: ArrayBuffer): WorkbookLike`.
- Produces: `analyzeReports(input: AnalyzeReportsInput): AnalyzeReportsResult`.
- `AnalyzeReportsInput`: `{ teamReport: ArrayBuffer; upcomingReport: ArrayBuffer; schoolYearStart: string; schoolYearEnd: string; capHours: number }`.
- `AnalyzeReportsResult`: JSON-safe `{ configuration; summary; volunteers; issues }` with ISO event dates and optional drafts.

- [ ] **Step 1: Write workbook parser tests with generated in-memory `.xlsx` files**

Use `xlsx.utils.book_new`, `json_to_sheet`, and `book_append_sheet` to build real workbooks. Assert exact sheet/header/row conversion and malformed-byte rejection.

- [ ] **Step 2: Run parser tests and verify RED**

Run: `npm.cmd run test:unit -- tests/analysis/workbook.test.ts`

Expected: FAIL because `parseWorkbook` does not exist.

- [ ] **Step 3: Implement the minimal workbook adapter**

Read with `XLSX.read(bytes, { type: "array", cellDates: false })`, convert each sheet with `sheet_to_json(sheet, { header: 1, raw: true, defval: null })`, and map the first row to object keys without writing files.

- [ ] **Step 4: Write service tests**

Cover valid reports, missing sheets/columns, invalid dates/durations blocking results, duplicate upcoming registrations, missing-email draft suppression, ambiguous-status warnings, and configuration-driven drafts.

- [ ] **Step 5: Run service tests and verify RED**

Run: `npm.cmd run test:unit -- tests/analysis/service.test.ts`

Expected: FAIL because `analyzeReports` does not exist.

- [ ] **Step 6: Implement orchestration and verify GREEN**

Parse, normalize, detect duplicate registrations by volunteer/event/date, stop on fatal issues, classify, generate eligible drafts, and serialize dates.

Run: `npm.cmd run test:unit -- tests/analysis/workbook.test.ts tests/analysis/service.test.ts`

Expected: all parser and service tests pass.

### Task 3: Multipart API endpoint

**Files:**
- Create: `app/api/analyses/route.ts`
- Create: `tests/api/analyses-route.test.ts`

**Interfaces:**
- Consumes: `analyzeReports(input: AnalyzeReportsInput): AnalyzeReportsResult`.
- Produces: `POST(request: Request): Promise<Response>`.
- Success: HTTP 200 `{ ok: true, analysis }`.
- Request/validation error: HTTP 400 `{ ok: false, issues }`.
- Unexpected error: HTTP 500 `{ ok: false, issues: [{ code: "ANALYSIS_FAILED", message: "We could not analyze those reports. Please try again." }] }`.

- [ ] **Step 1: Write failing route tests**

Construct real `FormData`/`File` requests for missing files, wrong extension, oversized files, invalid dates, invalid cap, valid files, service validation issues, and malformed workbook bytes.

- [ ] **Step 2: Run route tests and verify RED**

Run: `npm.cmd run test:unit -- tests/api/analyses-route.test.ts`

Expected: FAIL because the route is absent.

- [ ] **Step 3: Implement request validation and response mapping**

Validate all scalar fields before reading workbook bytes, enforce `.xlsx` and 10 MiB per file, call the service, and return stable JSON shapes without logging request content.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd run test:unit -- tests/api/analyses-route.test.ts`

Expected: all route tests pass.

### Task 4: Functional New Analysis client

**Files:**
- Create: `app/analysis-types.ts`
- Create: `app/components/AnalysisUploadModal.tsx`
- Create: `app/components/AnalysisDashboard.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- `AnalysisUploadModal` props: `{ open: boolean; onClose(): void; onSuccess(result: AnalysisViewModel): void }`.
- `AnalysisDashboard` props: `{ analysis: AnalysisViewModel | null; onNewAnalysis(): void }`.
- Consumes the route's `{ ok, analysis | issues }` response without recalculating classifications.

- [ ] **Step 1: Extend the rendered-surface test and verify RED**

Assert source contains school-year start/end controls, cap control, processing feedback, validation feedback, `Current unsaved analysis`, and no `Send email` action. Assert the old static sample identities are absent from `app/page.tsx`.

Run: `node --test tests/rendered-html.test.mjs`

Expected: FAIL because configuration and functional result states are absent.

- [ ] **Step 2: Extract the upload modal and implement controlled fields**

Use two `.xlsx` file inputs, date inputs, and a positive numeric cap defaulting to 25. Disable submission until valid, keep values on errors, use an `aria-live` status region, and submit `FormData` to `/api/analyses`.

- [ ] **Step 3: Replace static data with the analysis dashboard**

Flatten returned volunteer events into table rows, derive summary cards from response data, show warnings and an empty state, support status filtering, copy only returned drafts, and label results unsaved. Remove sync/history claims from the active screen.

- [ ] **Step 4: Add responsive/error-state styling**

Add styles for configuration fields, disabled/loading buttons, issue lists, warning badges, empty results, and current-analysis labeling while retaining the established visual design.

- [ ] **Step 5: Verify GREEN**

Run: `node --test tests/rendered-html.test.mjs && npm.cmd run test:unit`

Expected: surface and unit tests pass.

### Task 5: Documentation and full verification

**Files:**
- Modify: `README.md`
- Modify: `docs/ADMIN_GUIDE.md`

**Interfaces:**
- Documents the exact local commands and states that results are session-only.

- [ ] **Step 1: Update operator documentation**

Document Node `>=22.13`, `npm.cmd install`, `npm.cmd run dev`, the printed local URL, required Helper Helper sheets, 10 MiB `.xlsx` limits, configurable dates/cap, validation recovery, unsaved results, and Copy email behavior.

- [ ] **Step 2: Run focused and full verification**

Run:

```powershell
npm.cmd run test:unit
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd test
```

Expected: every command exits 0 with zero test failures and zero lint/type errors.

- [ ] **Step 3: Run a local HTTP smoke test**

Start `npm.cmd run dev`, wait for the server's ready output, request `/`, confirm HTTP 200, request `/api/analyses` with an invalid multipart payload and confirm HTTP 400, then stop the server.

- [ ] **Step 4: Review the final diff**

Run: `git diff --check` and `git status --short`. Confirm only scoped source, tests, documentation, dependencies, design, and plan files changed; preserve unrelated user changes.

- [ ] **Step 5: Commit when Git metadata is writable**

Run:

```powershell
git add package.json package-lock.json src app tests README.md docs/ADMIN_GUIDE.md docs/superpowers/specs/2026-08-25-new-analysis-workflow-design.md docs/superpowers/plans/2026-08-25-new-analysis-workflow-plan.md
git commit -m "feat: implement new analysis workflow"
```

If `.git` remains read-only, report that limitation and leave the verified working tree for the user to commit.
