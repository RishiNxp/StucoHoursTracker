# New Analysis Workflow Design

Date: 2026-08-25  
Status: Approved architecture; awaiting written-spec review

## Goal

Deliver one complete, usable New Analysis workflow. An officer uploads the two Helper Helper `.xlsx` exports, chooses the school-year dates and hour cap, receives actionable validation feedback, and sees real classified results with copyable email drafts. This milestone does not save uploads or analyses after the response and does not implement History or Officers.

## Scope

Included:

- Team Report and Upcoming Opportunities `.xlsx` uploads
- Configurable inclusive school-year start and end dates
- A positive hour cap that defaults to 25
- Server-side workbook parsing and validation
- Chronological volunteer-hour classification using the existing analysis package
- Results, warnings, summary counts, and deterministic copyable drafts
- Loading, success, validation-error, and unexpected-error interface states
- Automated unit, request-handler, and rendered-surface tests

Excluded:

- D1 and R2 persistence
- Analysis history and detail pages
- Officer membership management
- Automatic email sending
- Automatic Helper Helper registration changes
- `.xls`, `.csv`, or manually mapped spreadsheet formats

## Architecture

The existing client dashboard submits a multipart request to `POST /api/analyses`. The request contains `teamReport`, `upcomingReport`, `schoolYearStart`, `schoolYearEnd`, and `capHours`. The route validates the request, parses both workbooks in memory, converts the required worksheets to the repository's `WorkbookLike` representation, invokes the pure normalization and classification modules, and generates drafts only for flagged events that have a usable volunteer name and email.

The server returns a JSON-safe result. Dates are ISO 8601 strings at the API boundary and are converted to display dates by the client. Workbook bytes, normalized rows, and results are discarded after the response. No source file contents are logged.

Workbook parsing belongs in a small adapter independent of React and the route. The route orchestrates request validation and response serialization; it does not duplicate analysis rules. The client owns file selection, submission state, and rendering, but never implements a second copy of the classification algorithm.

## Request contract

`POST /api/analyses` accepts `multipart/form-data` with:

- `teamReport`: required `.xlsx` file, maximum 10 MiB
- `upcomingReport`: required `.xlsx` file, maximum 10 MiB
- `schoolYearStart`: required calendar date in `YYYY-MM-DD`
- `schoolYearEnd`: required calendar date in `YYYY-MM-DD`, not earlier than the start
- `capHours`: required finite number greater than zero; the interface defaults it to `25`

File extension and workbook structure are both validated. A renamed non-workbook file must fail parsing with an actionable error. Requests with missing fields, invalid dates, invalid date order, invalid caps, unsupported file types, or oversized files return HTTP 400. Unexpected server failures return HTTP 500 with a generic message and no student data.

## Workbook parsing and validation

The parser reads workbook bytes in memory and produces sheet rows keyed by the exact Helper Helper headers expected by the normalization layer. It must preserve Excel date serials and fractional-day duration values so the existing normalization functions can interpret them consistently.

The Team Report requires the `Commitments` sheet and its documented columns. The Upcoming Opportunities report requires `Opportunity Volunteers` and its documented columns. Missing sheets and missing required columns are fatal validation errors. Invalid dates, invalid durations, duplicate registrations, and rows that cannot be associated with an individual volunteer are reported with sheet, row, and column context.

Fatal structural errors or invalid calculation fields prevent a result from being presented as trustworthy. Non-fatal quality issues may accompany a result. Missing or ambiguous registration status is non-fatal: the event remains in the projection, receives a visible warning, and is not silently treated as certain. Clearly cancelled, inactive, removed, or declined registrations are excluded.

Volunteer identity uses normalized email when present. A missing-email upcoming row receives a unique row-scoped key and a warning; it must never be merged with other volunteers merely because they share an event name. A missing email prevents draft generation for that event.

## Classification and drafts

The route reuses the pure analysis package and enforces these rules:

- Count only `Validated` commitments whose event dates fall inclusively inside the chosen school year.
- Evaluate active upcoming registrations chronologically for each volunteer.
- Exactly the configured cap is allowed; a projected value greater than the cap flags an optional event.
- Once an optional event is flagged, later optional events for that volunteer remain flagged.
- An event whose name contains `MANDATORY`, case-insensitively, is marked mandatory-exempt and is never recommended for removal.
- Mandatory hours still increase the projection and may cause a later optional event to be flagged.

Draft text uses the selected school-year context and configured cap rather than hard-coded `2026–2027` or `25` values. Drafts are returned only for flagged optional events with adequate volunteer identity data. The application exposes Copy email but no Send email action.

## Client experience

Selecting New analysis opens the existing modal, expanded to include school-year start, school-year end, and cap controls. The Analyze reports action stays disabled until both files and valid configuration values are present.

During submission, the form is disabled and announces that the reports are being analyzed. Validation errors remain in the modal, identify the affected report/sheet/row when available, and preserve the selected configuration so the officer can correct the input. An unexpected failure shows a retryable generic message.

On success, the modal closes and the dashboard replaces all hard-coded sample metrics and rows with the returned analysis. The page clearly labels the result as the current unsaved analysis. Summary cards, the registration table, warnings, status filter, and Copy email actions operate on returned data. Empty valid results show an explicit no-registrations state rather than the sample table.

The interface must not claim that data was synced, saved, or retained. Navigating away or refreshing may discard the current result in this milestone.

## Error handling and privacy

Validation errors use stable machine-readable codes plus officer-facing messages. The client renders messages rather than internal stack traces. Server logs may record an error code and request timing but must not include names, emails, workbook contents, or generated drafts.

The parser applies the 10 MiB-per-file limit before workbook parsing. The workflow performs no outbound network request, sends no email, changes no registrations, and writes no student information to D1, R2, or local disk.

## Testing

Tests must prove:

- Real in-memory `.xlsx` fixtures parse into the expected sheet rows.
- Missing sheets, missing columns, malformed bytes, unsupported extensions, and oversized files are rejected.
- School-year boundary dates are inclusive.
- Exactly 25 hours is allowed while more than 25 is flagged.
- Multiple upcoming events are processed chronologically.
- Mandatory matching is case-insensitive, remains exempt, and still affects later projections.
- Clearly inactive registrations are excluded and ambiguous statuses produce warnings.
- Missing-email rows remain distinct and cannot generate drafts.
- Drafts reflect the selected cap and school year rather than fixed copy.
- The request handler returns stable 400, 200, and 500 response shapes.
- The rendered page exposes configuration controls, submission feedback, validation feedback, real-result states, and no automatic send action.

Before completion, run the focused tests, full test suite, TypeScript checking, lint, production build, and a local HTTP smoke test of the development or production server.

## Acceptance criteria

An officer can start the local website, open New analysis, select two valid Helper Helper `.xlsx` exports, choose the school-year dates and cap, and receive real classified results derived from those files. Invalid reports produce actionable feedback and no misleading result. Flagged optional events with complete identity information have copyable drafts. The workflow does not persist files or results and performs no automatic external action.
