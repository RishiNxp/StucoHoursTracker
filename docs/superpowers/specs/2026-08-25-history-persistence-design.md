# Persistence and History Design

Date: 2026-08-25  
Status: Approved architecture; awaiting written-spec review

## Goal

Make analyses durable and private. An authenticated active STUCO officer can save a completed analysis, revisit it from History, and open an immutable detail view that remains unchanged when future policy settings change.

## Scope

Included:

- D1 metadata and immutable result snapshots
- R2 private storage of source workbooks
- Active-membership authorization on every persisted read and write
- Development-only explicit demo identity for local testing
- Save-on-success analysis flow with partial-failure cleanup
- History list and analysis detail views
- Upload, analysis, save, read, and access audit events
- Migration, repository, API, and UI tests

Excluded:

- Officer invitation and deactivation UI
- Changing organization membership from the application
- Automatic email or Helper Helper mutations
- Public or anonymous access
- Recalculating historical snapshots under new rules

## Authentication and authorization

Production requests use the existing Sites/ChatGPT identity headers. A request without both user ID and email receives HTTP 401. Authentication only identifies a user; `requireActiveMember` must query the configured organization membership and require `active = true` before every analysis save, History list, detail read, upload read, or audit read.

For local development and tests only, `STUCO_DEV_AUTH=true` may supply a fixed demo identity and `STUCO_DEV_ORGANIZATION_ID=local-stuco`. The bypass is accepted only when the runtime is non-production and must be ignored when `NODE_ENV=production`. The bypass never changes production access policy and is documented as unsafe outside a local machine.

The organization ID is supplied by `STUCO_ORGANIZATION_ID` in the hosted runtime. It is never accepted from a browser form or URL. Every D1 query includes the resolved organization ID, and every R2 key begins with that organization ID.

## Data model

Keep the existing organization, membership, upload, analysis, and audit tables. Extend `analyses` with:

- `status`: `completed` or `failed`
- `summaryJson`: immutable summary counts
- `configurationJson`: immutable school-year and cap snapshot
- `resultsJson`: immutable serialized volunteers, events, warnings, and drafts

Add `uploadId` references to the analysis record for Team Report and Upcoming Opportunities, or a small `analysis_uploads` join table if the existing schema cannot represent both references without ambiguity. Add unique and lookup indexes based on actual History queries: `(organization_id, created_at)` for newest-first listing and `(organization_id, id)` for detail reads. Store all timestamps as UTC milliseconds.

`resultsJson` is the authoritative historical view. The application never re-runs the current classifier when rendering a saved analysis. Any future schema evolution must retain a version field in `configurationJson` and preserve old snapshots.

## R2 storage

Store the original workbook bytes under keys shaped as `org/<organizationId>/analyses/<analysisId>/<uploadId>.xlsx`. D1 stores filename, kind, R2 key, SHA-256, actor, and timestamp. Set private object metadata for content type and original filename. Never expose a bucket listing or raw key to the browser; any download route verifies membership and the object’s organization before streaming it.

The save sequence writes both R2 objects, then inserts the D1 metadata and completed snapshot in one D1 transaction/batch. If an R2 write fails, do not write D1. If D1 persistence fails after either R2 write, attempt to delete every object written for that analysis and return a generic save error. Cleanup failures are logged by code only, without student data.

## Repository boundary

Put all D1/R2 access behind `src/server/repository.ts` with an explicit `StorageEnvironment` containing `DB`, `UPLOADS`, and configuration. Route handlers call repository methods rather than reading bindings directly. Required methods are:

- `requireActiveMember(env, request): Promise<Actor>`
- `saveAnalysis(env, actor, input): Promise<SavedAnalysis>`
- `listAnalyses(env, actor): Promise<HistoryItem[]>`
- `getAnalysis(env, actor, analysisId): Promise<SavedAnalysis | null>`

Repository methods accept organization-scoped actor data and cannot be called with a client-provided organization ID. They return JSON-safe records and never return workbook bytes unless a separately authorized download method is added later.

## API contract

Extend `POST /api/analyses` with `save=true` as an explicit form field. The default remains unsaved analysis for compatibility. A saved request authenticates and authorizes first, performs the existing parse/classify flow, persists only after a valid result, and returns HTTP 201 `{ ok: true, analysis, saved: true }` with its ID.

Add:

- `GET /api/analyses`: active members receive HTTP 200 `{ ok: true, analyses }`, newest first.
- `GET /api/analyses/:id`: active members receive HTTP 200 `{ ok: true, analysis }`; missing or cross-organization IDs return the same HTTP 404 shape.

Unauthenticated requests return 401. Non-members and inactive members return 403. Validation errors remain 400. Unexpected persistence failures return 500 with a generic message. Error responses never include source workbook contents.

## History and detail experience

History displays saved analyses with creation date, actor display name/email, school-year label, cap, volunteer count, flagged-event count, warning count, and a link/button to detail. It has explicit loading, empty, unauthorized, and error states. It does not display rows from the current unsaved analysis as if they were saved.

The detail page renders the stored configuration, summary, warnings, event classifications, and drafts from `resultsJson`. It labels the record immutable and shows the original filenames and upload timestamps without exposing R2 keys. Copy email remains available; there is no send action.

The Overview page may show the newest saved analysis summary, but if none exists it must show the New Analysis call to action. Current unsaved results remain distinct from saved History records.

## Audit and privacy

Record actor and timestamp for attempted and successful uploads, analysis creation, analysis save, History access, detail access, and draft generation. Audit metadata contains IDs, action codes, and counts—not names, emails, workbook content, or draft bodies.

Never log student rows, emails, source bytes, R2 keys in client responses, or full SQL parameters. Scope every read and write by organization. Do not store raw passwords or introduce app-owned authentication.

## Testing and acceptance

Tests must prove:

- Missing identity, non-member, and inactive-member requests cannot read or write data.
- Local demo auth works only with the explicit non-production flag.
- Two source workbooks and one immutable result snapshot persist with organization-scoped keys.
- R2 failure prevents D1 records; D1 failure triggers object cleanup.
- History is newest-first and organization-scoped.
- Detail reads return the exact saved snapshot even after classifier/configuration changes.
- Cross-organization detail IDs return 404 without revealing existence.
- Uploads, saves, reads, and draft generation create audit events without sensitive payloads.
- Browser flows distinguish unsaved current results from saved History/detail records.

Acceptance requires a local D1/R2-backed analysis can be saved by an authorized actor, appears in History, opens in detail, and remains unchanged after a subsequent policy-cap change. Production deployment must use real Sites authentication and bindings; the development bypass must not be active.
