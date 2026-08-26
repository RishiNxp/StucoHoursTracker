# Volunteer Hours Limit Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private, multi-user STUCO website that imports two Helper Helper workbooks, applies the configurable 25-hour school-year rule with mandatory-event exemptions, and produces reviewable removal recommendations and copyable email drafts.

**Architecture:** A Sites/Vinext application will provide authenticated officer pages and server-side analysis endpoints. Sites platform identity headers will identify each ChatGPT user; D1 will store organization memberships, history, snapshots, drafts, and audit events, while R2 will store private workbook bytes. A pure TypeScript analysis package will parse normalized workbook rows and return deterministic results that can be tested without the browser or database.

**Tech Stack:** Vinext/React, TypeScript, Cloudflare D1, Cloudflare R2, Sites platform authentication, SheetJS (`xlsx`) for workbook parsing, Vitest for unit tests, Playwright for end-to-end tests, and the deployment platform configured by the Sites workflow.

**Spec:** `docs/superpowers/specs/2026-08-25-volunteer-hours-site-design.md`

## Global Constraints

- Every active officer uses an individual ChatGPT sign-in and has equal application permissions.
- Officers can invite replacement officers and deactivate departing officers; the last active officer cannot be deactivated.
- The initial hour cap is 25; exactly 25 is allowed and totals greater than 25 trigger optional-event flags.
- Only `Validated` commitments inside the configured school-year dates count as completed hours.
- Mandatory opportunities are identified by `MANDATORY` in the opportunity name, case-insensitively; mandatory events are retained but count toward totals.
- Cancelled/inactive registrations are excluded; ambiguous statuses produce warnings instead of automatic classification.
- Version one generates copyable email drafts only and never sends email or changes Helper Helper registrations.
- Uploaded files, rules, results, drafts, and audit events are retained in private organization history.
- Invalid workbook structure or data stops analysis with actionable errors; historical analyses are immutable.
- Deployment ownership and recovery documentation must use a school/STUCO-controlled account.
- Authorization uses Sites platform identity headers and an organization membership allowlist; raw passwords are never stored.
- D1 stores structured history and membership data; R2 stores private uploaded workbook bytes.

## Planned file structure

- `app/(auth)/login/page.tsx`: sign-in page.
- `app/(auth)/invite/[token]/page.tsx`: invitation acceptance page.
- `app/(dashboard)/layout.tsx`: authenticated shell and navigation.
- `app/(dashboard)/page.tsx`: dashboard summary and recent analyses.
- `app/(dashboard)/analyses/new/page.tsx`: report upload and rule/date confirmation form.
- `app/(dashboard)/analyses/[id]/page.tsx`: analysis results and draft-copy controls.
- `app/(dashboard)/history/page.tsx`: immutable prior-analysis list and detail links.
- `app/(dashboard)/officers/page.tsx`: invite/deactivate officers and audit account actions.
- `app/api/analyses/route.ts`: authenticated upload, validation, analysis creation, and persistence.
- `app/api/analyses/[id]/route.ts`: authenticated analysis detail endpoint.
- `app/api/officers/invitations/route.ts`: invite endpoint.
- `app/api/officers/[id]/route.ts`: deactivate endpoint.
- `src/analysis/types.ts`: normalized data types and result contracts.
- `src/analysis/normalize.ts`: workbook-to-normalized-row conversion and structural validation.
- `src/analysis/classify.ts`: pure 25-hour mandatory-exemption calculation.
- `src/analysis/drafts.ts`: standardized draft generation.
- `src/analysis/index.ts`: public analysis package entry point.
- `db/schema.ts`: D1 tables, indexes, constraints, and migration definitions.
- `src/db/server.ts`: D1/R2 bindings and authenticated actor helpers from Sites headers.
- `src/db/repositories.ts`: D1/R2 persistence operations with typed inputs/outputs.
- `src/auth/permissions.ts`: membership and last-active-officer guards.
- `src/lib/workbooks.ts`: upload limits, file hashing, and workbook parsing adapter.
- `tests/analysis/normalize.test.ts`: workbook shape and data validation tests.
- `tests/analysis/classify.test.ts`: cap, ordering, mandatory, and warning tests.
- `tests/analysis/drafts.test.ts`: template substitution tests.
- `tests/api/analyses.test.ts`: authenticated API and persistence tests.
- `tests/e2e/officer-flow.spec.ts`: sign-in, upload, results, copy, history, and officer-management flow.
- `docs/ADMIN_GUIDE.md`: deployment ownership, account handoff, upload procedure, and policy rules.
- `.env.example`: required Supabase and deployment configuration names without secrets.

### Task 1: Scaffold the application and test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`.
- Create: `app/layout.tsx`, `app/page.tsx`, `src/lib/env.ts`.
- Test: `tests/smoke/app.test.ts`.

**Interfaces:**
- Produces a runnable Next.js app, `npm run test`, `npm run test:e2e`, and typed environment access through `getServerEnv()`.

- [ ] **Step 1: Write the failing smoke test**

```ts
import { describe, expect, it } from "vitest";
import { appConfig } from "@/src/lib/env";

describe("application scaffold", () => {
  it("exposes a named application", () => {
    expect(appConfig.name).toBe("STUCO Volunteer Hours");
  });
});
```

- [ ] **Step 2: Run the smoke test to verify it fails**

Run: `npm test -- tests/smoke/app.test.ts`
Expected: FAIL because `appConfig` does not exist.

- [ ] **Step 3: Add the minimal scaffold**

Implement `src/lib/env.ts` with `appConfig = { name: "STUCO Volunteer Hours" }`, configure the scripts and aliases, and render the app name from `app/page.tsx`.

- [ ] **Step 4: Run the smoke test to verify it passes**

Run: `npm test -- tests/smoke/app.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json next.config.ts vitest.config.ts playwright.config.ts .env.example app src/lib/env.ts tests/smoke/app.test.ts
git commit -m "chore: scaffold volunteer hours web app"
```

### Task 2: Define the normalized analysis model and workbook validation

**Files:**
- Create: `src/analysis/types.ts`, `src/analysis/normalize.ts`.
- Test: `tests/analysis/normalize.test.ts`.

**Interfaces:**
- `WorkbookLike = { sheets: Record<string, Array<Record<string, unknown>>> }` is the parser adapter input used by tests and `src/lib/workbooks.ts`.
- `normalizeTeamReport(input: WorkbookLike): NormalizedHistory`.
- `normalizeUpcomingReport(input: WorkbookLike): NormalizedUpcoming`.
- `ValidationIssue = { code: string; message: string; sheet?: string; row?: number; column?: string }`.
- Normalized history rows contain `{ volunteerKey, name, email, hours, attendance, eventName, eventId, eventDate }`.
- Normalized upcoming rows contain `{ volunteerKey, name, email, eventName, eventDate, durationHours, status, team }`.

- [ ] **Step 1: Write failing normalization tests**

```ts
it("accepts the Helper Helper sheet names and required columns", () => {
  const result = normalizeTeamReport(fixtureTeamReport());
  expect(result.issues).toEqual([]);
  expect(result.rows[0]).toMatchObject({
    name: "Bikilie, Alexia",
    email: "abikilie401@rsdmo.org",
    hours: 1,
    attendance: "Validated",
  });
});

it("reports missing required columns instead of guessing", () => {
  const result = normalizeUpcomingReport(fixtureWithoutVolunteerEmail());
  expect(result.issues.map((issue) => issue.code)).toContain("MISSING_COLUMN");
});

it("converts Excel date serials and time-fraction durations", () => {
  const result = normalizeUpcomingReport(fixtureUpcomingReport());
  expect(result.rows[0].eventDate.toISOString()).toBe("2026-09-09T20:30:00.000Z");
  expect(result.rows[0].durationHours).toBe(1);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/analysis/normalize.test.ts`
Expected: FAIL because the normalizers and normalized types do not exist.

- [ ] **Step 3: Implement strict normalizers**

Map `Commitments` and `Opportunity Volunteers` headers exactly, trim text, normalize email casing, convert Excel serial dates using the 1899-12-30 epoch, convert numeric durations less than 24 from Excel day fractions by multiplying by 24, and return issues for absent sheets/columns, invalid dates, invalid durations, or duplicate registration keys.

- [ ] **Step 4: Run tests and verify success**

Run: `npm test -- tests/analysis/normalize.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/analysis/types.ts src/analysis/normalize.ts tests/analysis/normalize.test.ts
git commit -m "feat: normalize Helper Helper workbooks"
```

### Task 3: Implement the 25-hour classification engine

**Files:**
- Create: `src/analysis/classify.ts`, `src/analysis/index.ts`.
- Test: `tests/analysis/classify.test.ts`.

**Interfaces:**
- `HistoryRow = { volunteerKey: string; name: string; email: string | null; hours: number; attendance: string; eventName: string; eventId: string | null; eventDate: Date }`.
- `UpcomingRow = { volunteerKey: string; name: string; email: string | null; eventName: string; eventDate: Date; durationHours: number; status: string | null; team: string | null }`.
- `classifyVolunteerHours(input: ClassificationInput): ClassificationResult`.
- `ClassificationInput = { schoolYearStart: Date; schoolYearEnd: Date; capHours: number; history: HistoryRow[]; upcoming: UpcomingRow[] }`.
- `ClassificationResult` includes one immutable volunteer result per volunteer, ordered flags, warnings, and summary counts.

- [ ] **Step 1: Write failing classification tests**

```ts
it("flags the first optional event that crosses 25 hours and later optional events", () => {
  const result = classifyVolunteerHours(input({ current: 23, upcoming: [2, 1, 3] }));
  expect(result.volunteers[0].events.map((event) => event.classification)).toEqual([
    "allowed", "flagged", "flagged",
  ]);
});

it("allows exactly 25 hours", () => {
  const result = classifyVolunteerHours(input({ current: 23, upcoming: [2] }));
  expect(result.volunteers[0].events[0].classification).toBe("allowed");
});

it("retains mandatory events while counting their hours", () => {
  const result = classifyVolunteerHours(input({ current: 24, upcoming: [
    { name: "MANDATORY STUCO Meeting", hours: 1 },
    { name: "Optional event", hours: 1 },
  ] }));
  expect(result.volunteers[0].events[0].classification).toBe("mandatory_exempt");
  expect(result.volunteers[0].events[1].classification).toBe("flagged");
});

it("counts only validated history inside the configured school year", () => {
  const result = classifyVolunteerHours(input({ history: [
    historyRow({ date: "2026-07-31", hours: 20, attendance: "Validated" }),
    historyRow({ date: "2026-08-01", hours: 10, attendance: "Validated" }),
    historyRow({ date: "2026-08-02", hours: 10, attendance: "Pending" }),
  ] }));
  expect(result.volunteers[0].currentValidatedHours).toBe(10);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/analysis/classify.test.ts`
Expected: FAIL because `classifyVolunteerHours` does not exist.

- [ ] **Step 3: Implement the pure classifier**

Group by normalized volunteer key, sum only validated in-range history, sort upcoming active registrations by date/time, identify mandatory names with `/mandatory/i`, add every event’s hours to the projection, flag the first optional crossing and every later optional event, and attach data-quality warnings without throwing for missing emails.

- [ ] **Step 4: Run tests and verify success**

Run: `npm test -- tests/analysis/classify.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/analysis/classify.ts src/analysis/index.ts tests/analysis/classify.test.ts
git commit -m "feat: classify volunteer hour limits"
```

### Task 4: Generate standardized copyable drafts

**Files:**
- Create: `src/analysis/drafts.ts`.
- Test: `tests/analysis/drafts.test.ts`.

**Interfaces:**
- `buildVolunteerDraft(input: DraftInput): Draft`.
- `DraftInput = { name: string; currentHours: number; projectedHours: number; eventName: string; eventDate: Date }`.
- `Draft = { subject: string; body: string; copyText: string }`.

- [ ] **Step 1: Write the failing draft test**

```ts
it("replaces volunteer and event fields in the standard draft", () => {
  const draft = buildVolunteerDraft({
    name: "Maya Patel",
    currentHours: 24,
    projectedHours: 27,
    eventName: "Food Bank",
    eventDate: new Date("2026-09-12T15:00:00Z"),
  });
  expect(draft.body).toContain("Maya Patel");
  expect(draft.body).toContain("Food Bank");
  expect(draft.body).toContain("24");
  expect(draft.body).toContain("27");
  expect(draft.copyText).toBe(`${draft.subject}\n\n${draft.body}`);
});
```

- [ ] **Step 2: Run test and verify failure**

Run: `npm test -- tests/analysis/drafts.test.ts`
Expected: FAIL because `buildVolunteerDraft` does not exist.

- [ ] **Step 3: Implement the fixed template**

Use one reviewed template with volunteer name, current hours, projected hours, event name, and formatted event date substituted. Keep the copy text deterministic and do not add send/email-provider code.

- [ ] **Step 4: Run test and verify success**

Run: `npm test -- tests/analysis/drafts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/analysis/drafts.ts tests/analysis/drafts.test.ts
git commit -m "feat: generate volunteer email drafts"
```

### Task 5: Add D1/R2 persistence, platform authentication, and officer membership rules

**Files:**
- Create: `db/schema.ts`, `src/db/server.ts`, `src/db/repositories.ts`, `src/auth/permissions.ts`.
- Modify: `.env.example`.
- Test: `tests/auth/permissions.test.ts`, `tests/db/repositories.test.ts`.

**Interfaces:**
- D1 tables: `organizations`, `memberships`, `invitations`, `uploads`, `analyses`, `analysis_volunteers`, `analysis_events`, `drafts`, `audit_events`; R2 stores private workbook bytes.
- `canDeactivateMember(input: { activeMemberCount: number; targetIsActive: boolean }): boolean`.
- `createInvitation(actorId, email): Promise<Invitation>`.
- `deactivateMember(actorId, memberId): Promise<void>`.
- `saveAnalysis(input: PersistedAnalysis): Promise<{ id: string }>`.

- [ ] **Step 1: Write failing permission and schema tests**

```ts
it("prevents deactivating the last active officer", () => {
  expect(canDeactivateMember({ activeMemberCount: 1, targetIsActive: true })).toBe(false);
  expect(canDeactivateMember({ activeMemberCount: 2, targetIsActive: true })).toBe(true);
});

it("does not allow a second use of an invitation", async () => {
  const invitation = await acceptInvitationOnce(testToken);
  await expect(acceptInvitationOnce(testToken)).rejects.toThrow("INVITATION_USED");
  expect(invitation.status).toBe("accepted");
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/auth/permissions.test.ts tests/db/repositories.test.ts`
Expected: FAIL because schema, repository, and permission functions do not exist.

- [ ] **Step 3: Implement schema and server-side guards**

Create organization-scoped D1 tables with UUID keys, immutable analysis snapshots, private R2 storage paths, invitation expiry/use columns, and audit rows. Read `oai-authenticated-user-id` and `oai-authenticated-user-email` on every protected request, then require a matching active membership before reading or writing organization data. Enforce last-active-officer protection in a transaction. Keep all storage bindings server-only.

- [ ] **Step 4: Run tests and verify success**

Run: `npm test -- tests/auth/permissions.test.ts tests/db/repositories.test.ts`
Expected: PASS against the local test database or repository mocks.

- [ ] **Step 5: Commit**

```bash
git add db src/db src/auth/permissions.ts tests/auth tests/db .env.example
git commit -m "feat: add organization auth and history storage"
```

### Task 6: Build the authenticated analysis API

**Files:**
- Create: `app/api/analyses/route.ts`, `app/api/analyses/[id]/route.ts`, `src/lib/workbooks.ts`.
- Test: `tests/api/analyses.test.ts`.

**Interfaces:**
- `POST /api/analyses` accepts multipart fields `teamReport`, `upcomingReport`, `schoolYearStart`, `schoolYearEnd`, and `capHours`; returns `{ analysisId, validationIssues, summary }`.
- `GET /api/analyses/:id` returns the immutable result and generated drafts for an active member.

- [ ] **Step 1: Write failing API tests**

```ts
it("rejects an unauthenticated analysis request", async () => {
  const response = await postAnalysis({ auth: null, files: validFiles() });
  expect(response.status).toBe(401);
});

it("persists a valid analysis and returns flags", async () => {
  const response = await postAnalysis({ auth: activeOfficer(), files: validFiles(), capHours: 25 });
  expect(response.status).toBe(201);
  expect(response.body.analysisId).toMatch(/[0-9a-f-]{36}/);
  expect(response.body.summary).toMatchObject({ flaggedOptionalEvents: expect.any(Number) });
});

it("returns validation issues without saving an invalid workbook", async () => {
  const response = await postAnalysis({ auth: activeOfficer(), files: malformedFiles() });
  expect(response.status).toBe(422);
  expect(response.body.validationIssues.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/api/analyses.test.ts`
Expected: FAIL because the routes and workbook adapter do not exist.

- [ ] **Step 3: Implement authenticated upload and persistence flow**

Enforce workbook type/size limits, hash and store both files under the organization path, parse and validate both reports, call the pure classifier and draft generator, persist the rule snapshot and result rows only after validation succeeds, and append an audit event. Return 422 for issues and never partially save a failed analysis.

- [ ] **Step 4: Run tests and verify success**

Run: `npm test -- tests/api/analyses.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/analyses src/lib/workbooks.ts tests/api/analyses.test.ts
git commit -m "feat: add authenticated workbook analysis API"
```

### Task 7: Build officer-facing pages and copyable drafts

**Files:**
- Create: `app/(auth)/login/page.tsx`, `app/(auth)/invite/[token]/page.tsx`, `app/(dashboard)/layout.tsx`, `app/(dashboard)/page.tsx`, `app/(dashboard)/analyses/new/page.tsx`, `app/(dashboard)/analyses/[id]/page.tsx`, `app/(dashboard)/history/page.tsx`.
- Modify: `app/layout.tsx`.
- Test: `tests/e2e/officer-flow.spec.ts`.

**Interfaces:**
- Pages consume the analysis APIs and render the exact result fields: volunteer, email, current validated hours, event, date/time, duration, projected total, classification, and warnings.
- Each flagged volunteer has a Copy button that writes the generated `copyText` to the clipboard and shows a confirmation.

- [ ] **Step 1: Write the failing end-to-end flow**

```ts
test("officer uploads reports, reviews flags, copies a draft, and reopens history", async ({ page }) => {
  await signInAsTestOfficer(page);
  await page.goto("/analyses/new");
  await page.setInputFiles("input[name=teamReport]", "tests/fixtures/team-report.xlsx");
  await page.setInputFiles("input[name=upcomingReport]", "tests/fixtures/upcoming-opportunities.xlsx");
  await page.getByLabel("Hour limit").fill("25");
  await page.getByRole("button", { name: "Analyze reports" }).click();
  await expect(page.getByText("Review / remove")).toBeVisible();
  await page.getByRole("button", { name: "Copy email" }).first().click();
  await expect(page.getByText("Copied")).toBeVisible();
  await page.goto("/history");
  await expect(page.getByText("2026–2027")).toBeVisible();
});
```

- [ ] **Step 2: Run the end-to-end test and verify failure**

Run: `npm run test:e2e -- tests/e2e/officer-flow.spec.ts`
Expected: FAIL because the pages and controls do not exist.

- [ ] **Step 3: Implement the pages**

Create accessible forms with clear validation errors, school-year date and cap controls, results badges for `allowed`, `flagged`, and `mandatory_exempt`, warning panels, copy-to-clipboard controls, loading states, and history links. Never render a send-email control.

- [ ] **Step 4: Run the end-to-end test and verify success**

Run: `npm run test:e2e -- tests/e2e/officer-flow.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app app/layout.tsx tests/e2e/officer-flow.spec.ts
git commit -m "feat: add officer analysis and history screens"
```

### Task 8: Add officer invitations, deactivation, and audit UI

**Files:**
- Create: `app/api/officers/invitations/route.ts`, `app/api/officers/[id]/route.ts`, `app/(dashboard)/officers/page.tsx`.
- Modify: `app/(dashboard)/layout.tsx`.
- Test: `tests/e2e/officer-management.spec.ts`.

**Interfaces:**
- `POST /api/officers/invitations` accepts `{ email }` and returns an invitation status.
- `POST /api/officers/:id/deactivate` deactivates a member unless they are the last active officer.

- [ ] **Step 1: Write the failing management flow**

```ts
test("officer can invite a replacement and cannot remove the last active officer", async ({ page }) => {
  await signInAsTestOfficer(page);
  await page.goto("/officers");
  await page.getByLabel("Replacement email").fill("new.officer@example.org");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText("Invitation created")).toBeVisible();
  await page.getByRole("button", { name: "Deactivate" }).last().click();
  await expect(page.getByText("At least one active officer is required")).toBeVisible();
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm run test:e2e -- tests/e2e/officer-management.spec.ts`
Expected: FAIL because the management routes and screen do not exist.

- [ ] **Step 3: Implement invitation and deactivation UI**

Show active officers, pending invitations, expiry, and audit timestamps. Require confirmation for deactivation, handle expired/used invitations, and show the last-active-officer error without changing state.

- [ ] **Step 4: Run the test and verify success**

Run: `npm run test:e2e -- tests/e2e/officer-management.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/officers 'app/(dashboard)/officers' 'app/(dashboard)/layout.tsx' tests/e2e/officer-management.spec.ts
git commit -m "feat: add officer invitations and account handoff"
```

### Task 9: Write handoff documentation and complete verification

**Files:**
- Create: `docs/ADMIN_GUIDE.md`.
- Modify: `.env.example`, `README.md`.
- Test: full unit and end-to-end suites.

**Interfaces:**
- Documentation provides deployment ownership, environment setup, account recovery, report upload steps, policy configuration, `MANDATORY` convention, history interpretation, and troubleshooting.

- [ ] **Step 1: Add the administrator guide**

Document the school/STUCO-controlled deployment account, inviting/deactivating officers, selecting school-year dates, uploading both Helper Helper exports, reviewing warnings, copying drafts, and recovering access when officers graduate.

- [ ] **Step 2: Run all tests**

Run: `npm test && npm run test:e2e`
Expected: all unit and browser tests PASS.

- [ ] **Step 3: Run production validation**

Run: `npm run build`
Expected: production build completes with no TypeScript or route errors.

- [ ] **Step 4: Perform manual acceptance checks**

Verify with the provided reports that the September 9, 2026 one-hour meeting and its two registrants are imported, that no one is flagged from a zero school-year total, that `MANDATORY` is marked exempt, that draft text contains the correct names, and that no send-email control appears.

- [ ] **Step 5: Commit**

```bash
git add docs/ADMIN_GUIDE.md README.md .env.example
git commit -m "docs: add deployment and officer handoff guide"
```
