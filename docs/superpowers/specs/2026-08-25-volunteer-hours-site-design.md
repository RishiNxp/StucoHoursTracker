# Volunteer Hours Limit Website Design

Date: 2026-08-25
Status: Approved design; ready for implementation planning

## Goal

Create a private website for STUCO officers to identify when volunteers are receiving too many optional volunteer opportunities. Officers sign in individually, upload Helper Helper reports, review the resulting removal list, and copy standardized email drafts. The first version must never send email or alter Helper Helper registrations automatically.

## Users and permissions

- Every active officer signs in with their own ChatGPT account; the site uses platform-provided identity headers and does not store passwords.
- The site maintains an organization membership list keyed to approved officer email addresses.
- Every active officer has the same application permissions.
- Officers can invite replacement officers and deactivate departing officers.
- The system must not allow the last active officer to be deactivated.
- Invitations expire and are single-use.
- Account invitations, deactivations, uploads, analyses, and generated drafts are recorded with actor and timestamp.

## Core workflow

1. Officer signs in.
2. Officer starts a new analysis and uploads a Team Report and an Upcoming Opportunities report.
3. The site validates workbook structure and reports clear errors for missing sheets, columns, invalid dates, invalid durations, duplicates, or mismatched records.
4. Officer confirms the school-year start/end dates and the hour limit; defaults are configurable, with the initial limit set to 25 hours.
5. The analysis calculates validated school-year hours and projects upcoming registered events chronologically.
6. Results identify optional events that should be reviewed for removal and mandatory events that are exempt.
7. Officer copies a standardized, volunteer-specific email draft.
8. The site stores the source files, rules, results, drafts, and audit details in history.

## Data inputs

### Team Report

Use the Commitments sheet for event-level history: volunteer name, duration, attendance/validation status, date/time, opportunity, email, and event ID. Use only records whose attendance status is `Validated` and whose event date falls within the configured school year. Do not use the displayed aggregate volunteer total when it may include older years.

### Upcoming Opportunities report

Use the Opportunity Volunteers sheet for individual future registrations: opportunity, date/time, duration, volunteer email, signup timestamp, and team. Use the Upcoming Opportunities sheet to supplement event metadata when needed.

## Classification rules

- The initial school-year cap is 25 hours.
- A projected total exactly equal to 25 is allowed; a total greater than 25 triggers a flag.
- Sort each volunteer’s active upcoming registrations by event date/time.
- Add optional event duration to the volunteer’s validated school-year total. The first optional event that makes the projected total exceed 25 is flagged.
- Continue flagging later optional events for that volunteer, unless a future policy explicitly changes this behavior.
- An opportunity is mandatory when its name contains `MANDATORY`, case-insensitively. Mandatory opportunities are always retained and labeled `Mandatory — Exempt from removal`, but their hours still count toward projected totals.
- Cancelled or inactive registrations are excluded. Missing or ambiguous registration status produces a review warning rather than an automatic classification.
- Missing volunteer email does not block calculation but is shown as a warning and leaves the draft unavailable until corrected or manually overridden.

## Results and email drafts

The results table shows volunteer, email, validated school-year hours, event, event date/time, event duration, projected total, classification, and warnings. The standardized draft replaces volunteer name, current hours, projected hours, event name, and event date. It includes a copy button. No outbound email integration is included in version one.

## History and privacy

Uploaded reports, analyses, generated drafts, configuration values, and audit events are retained for historical review. Data is private to the STUCO organization and requires authentication. Officers authenticate with individual ChatGPT accounts; the site uses platform identity headers and an organization membership allowlist, and never stores raw passwords. The deployment must be owned by a school/STUCO-controlled account rather than a graduating student’s personal account.

## Reliability and testing

The implementation must test school-year boundary dates, the 25-hour boundary, mandatory exemptions, multiple future events, already-over-cap volunteers, duplicate registrations, missing emails, invalid durations, cancelled registrations, and malformed or incomplete workbooks. Invalid input must stop the analysis with actionable feedback. Historical analyses must remain unchanged when future rules or configuration values change.

## Handoff requirements

The site must include a concise administrator guide covering deployment ownership, inviting/deactivating officers, recovering access, selecting school-year dates, uploading the two Helper Helper reports, interpreting flags, and copying drafts. The guide must explain the `MANDATORY` naming convention and the 25-hour policy.
