# Persistence and History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist authorized STUCO analyses in private R2/D1 storage and expose immutable History and detail views.

**Architecture:** Server routes resolve the current actor from Sites identity headers (or an explicit local-only demo flag), require active membership, and delegate all D1/R2 access to a repository. A saved analysis stores source workbook objects in R2 and a versioned JSON snapshot plus summary metadata in D1; History and detail render that snapshot without recalculating it.

**Tech Stack:** TypeScript, React 19, Vinext App Router, Cloudflare D1, Cloudflare R2, Drizzle schema/migrations, Vitest

**Spec:** `docs/superpowers/specs/2026-08-25-history-persistence-design.md`

## Global Constraints

- Never accept organization IDs from client input; scope every query and R2 key to server-resolved organization membership.
- Production requires both Sites identity headers and an active membership; `STUCO_DEV_AUTH=true` is local-only and ignored in production.
- Store workbook bytes only in R2 and immutable JSON result/configuration snapshots in D1; never recompute historical detail pages.
- A failed R2 or D1 operation must not leave a misleading completed analysis; attempt cleanup of any partially written R2 objects.
- Do not send email or modify Helper Helper registrations.

---

### Task 1: Schema and repository contracts

**Files:**
- Modify: `db/schema.ts`
- Create: `src/server/types.ts`
- Create: `src/server/repository.ts`
- Create: `tests/server/repository.test.ts`
- Create: `tests/server/auth.test.ts`

**Interfaces:**
- `Actor`: `{ userId: string; email: string; displayName: string; organizationId: string }`.
- `StorageEnvironment`: `{ DB: D1Database; UPLOADS: R2Bucket; ORGANIZATION_ID?: string; NODE_ENV?: string; STUCO_DEV_AUTH?: string; STUCO_DEV_ORGANIZATION_ID?: string }`.
- `requireActiveMember(env: StorageEnvironment, request: Request): Promise<Actor>`.
- `saveAnalysis(env: StorageEnvironment, actor: Actor, input: SaveAnalysisInput): Promise<SavedAnalysis>`.
- `listAnalyses(env: StorageEnvironment, actor: Actor): Promise<HistoryItem[]>`.
- `getAnalysis(env: StorageEnvironment, actor: Actor, analysisId: string): Promise<SavedAnalysis | null>`.

- [ ] **Step 1: Extend the schema with immutable snapshots and indexes**

Add `status`, `summaryJson`, `configurationJson`, and `resultsJson` to `analyses`; add `teamUploadId` and `upcomingUploadId` references or the documented join table; add organization/date and organization/id indexes. Keep timestamps in UTC milliseconds.

- [ ] **Step 2: Generate and inspect the migration**

Run: `npm.cmd run db:generate`

Inspect the new SQL under `drizzle/` and ensure it contains only the schema additions and intended indexes.

- [ ] **Step 3: Write failing authorization tests**

Use a fake D1 with prepared-statement results to prove missing headers return `401`, inactive/missing membership returns `403`, local demo auth succeeds only when `STUCO_DEV_AUTH=true` and `NODE_ENV !== "production"`, and the organization ID comes from environment configuration.

- [ ] **Step 4: Implement actor resolution and membership checks**

Use `getChatGPTUser()` for production headers, reject absent identity, query `memberships` by resolved organization and user ID, and return typed authorization errors. Never trust an organization from form/query input.

- [ ] **Step 5: Write failing repository tests**

Test organization-scoped History queries, exact snapshot serialization/deserialization, R2 keys shaped as `org/<org>/analyses/<analysis>/<upload>.xlsx`, SHA-256 metadata, audit records without student data, and cleanup on D1 failure.

- [ ] **Step 6: Implement the repository and verify GREEN**

Use one prepared statement per SQL statement and D1 `batch()` for related inserts. Write R2 objects before D1 records, delete written objects when D1 fails, and scope all reads by actor organization.

Run: `npm.cmd run test:unit -- tests/server/auth.test.ts tests/server/repository.test.ts`

Expected: all repository and authorization tests pass.

### Task 2: Persisted analysis API

**Files:**
- Modify: `app/api/analyses/route.ts`
- Create: `app/api/analyses/[id]/route.ts`
- Create: `tests/api/persisted-analyses-route.test.ts`

**Interfaces:**
- Saved `POST /api/analyses`: HTTP 201 `{ ok: true; saved: true; analysis: SavedAnalysis }`.
- `GET /api/analyses`: HTTP 200 `{ ok: true; analyses: HistoryItem[] }`.
- `GET /api/analyses/:id`: HTTP 200 `{ ok: true; analysis: SavedAnalysis }`; unknown/cross-org IDs return HTTP 404.
- Unauthorized: HTTP 401/403 with `{ ok: false; issues }`.

- [ ] **Step 1: Write failing API tests**

Cover `save=true`, unauthorized save, valid save, invalid workbook save, R2/D1 failure response, History list, detail read, cross-organization 404, and default `save` omission preserving the existing unsaved 200 behavior.

- [ ] **Step 2: Implement save authorization and persistence orchestration**

Resolve Cloudflare bindings from the request runtime, require membership before reading files, call `analyzeReports`, and call `saveAnalysis` only when validation succeeds. Keep the existing unsaved response path unchanged.

- [ ] **Step 3: Implement History and detail route handlers**

Require active membership, parse the route ID without exposing R2 keys, return immutable JSON snapshots, and map typed repository errors to stable status codes.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd run test:unit -- tests/api/persisted-analyses-route.test.ts`

Expected: all persisted API tests pass.

### Task 3: History and detail UI

**Files:**
- Create: `app/components/HistoryView.tsx`
- Create: `app/components/AnalysisDetailView.tsx`
- Modify: `app/page.tsx`
- Modify: `app/components/AnalysisDashboard.tsx`
- Modify: `app/components/AnalysisUploadModal.tsx`
- Modify: `app/analysis-types.ts`
- Modify: `app/analysis.css`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- `HistoryView` consumes `GET /api/analyses` and emits `onSelect(id: string)`.
- `AnalysisDetailView` consumes `GET /api/analyses/:id` and renders the saved `SavedAnalysis` snapshot.
- Upload modal adds a `Save to History` choice; saving is explicit and disabled until analysis succeeds.

- [ ] **Step 1: Extend rendered tests and verify RED**

Assert History and detail copy, immutable labeling, saved/unsaved distinction, loading/error/empty states, and no send-email action. Expected failure: components and copy are absent.

- [ ] **Step 2: Implement History fetch and states**

Fetch on History selection, show loading/empty/error/unauthorized states, format dates and summary counts, and provide detail buttons.

- [ ] **Step 3: Implement immutable detail rendering**

Render stored configuration, summary, warnings, event classifications, filenames, and copyable drafts. Never call the classifier from the detail component.

- [ ] **Step 4: Add explicit save choice to New Analysis**

Keep the default analysis session-only; add a checkbox or clearly labeled control for saving. Show success as saved with an ID and refresh History after a successful save.

- [ ] **Step 5: Verify GREEN**

Run: `node --test tests/rendered-html.test.mjs && npm.cmd run test:unit`

Expected: all UI and API tests pass.

### Task 4: Documentation, local runtime, and final verification

**Files:**
- Modify: `README.md`
- Modify: `docs/ADMIN_GUIDE.md`
- Modify: `.env.example` (create if absent)

**Interfaces:**
- Documents `STUCO_ORGANIZATION_ID`, local D1/R2 bindings, `STUCO_DEV_AUTH`, and production Sites access requirements.

- [ ] **Step 1: Document setup and safety**

Explain local D1/R2 setup, the development-only demo identity, production identity/membership requirements, immutable History, R2 privacy, and failure recovery. Explicitly warn never to enable demo auth in production.

- [ ] **Step 2: Run all verification**

Run:

```powershell
npm.cmd run test:unit
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd test
```

Expected: all commands exit 0. If lint still fails because the pre-existing `aria-query` install is incomplete, report that external environment blocker separately from source verification.

- [ ] **Step 3: Run local persistence smoke test**

Start the existing dev server with demo auth and local D1/R2 bindings, submit a valid save request, fetch History, fetch its detail, and confirm the response includes the same immutable snapshot. Stop the server after verification.

- [ ] **Step 4: Review diff and deployment readiness**

Run `git diff --check` and `git status --short`. Confirm no student data appears in logs, responses omit R2 keys, and `.openai/hosting.json` retains `DB` and `UPLOADS`.

- [ ] **Step 5: Commit/publish when Git metadata is writable**

Stage the scoped source, migration, tests, docs, and dependency changes; commit with `feat: persist analyses and add history`; push the configured branch. If `.git` remains read-only, leave the verified tree and provide the exact manual commands.
