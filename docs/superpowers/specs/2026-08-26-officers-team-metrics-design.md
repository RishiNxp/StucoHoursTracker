# Officers and Team Metrics Design

Date: 2026-08-26
Status: Approved design; awaiting written-spec review

## Goal

Complete the Officers destination with secure membership administration and add a Team Metrics module immediately below Roster Performance. Team Metrics must summarize one authoritative school-year analysis and visualize both biweekly activity and cumulative hours. Officer administration must use manual, secure invitation links and must never leave the organization without an active officer.

## Scope

This milestone includes:

- Eight team summary metrics derived from the uploaded Full Roster and Team Report.
- A responsive graph with hours completed per 14-day period and cumulative hours.
- Team Metrics on the current Overview and immutable saved History detail.
- Active/inactive officer and pending-invitation listings.
- Creation and copying of secure, single-use, seven-day invitation links.
- Invitation acceptance by a signed-in user whose normalized email matches the invitation.
- Membership reactivation and deactivation.
- Audit events for invitation creation, acceptance, and deactivation.

This milestone does not send invitation emails, introduce officer roles, automatically contact volunteers, or aggregate across multiple saved analyses.

## Architecture

The existing normalized Team Report remains the only source of historical activity. A pure analysis function computes Team Metrics from normalized roster rows, normalized validated history rows, and the configured school-year boundaries. Its output joins `performance` in the analysis response and in a new version 3 immutable snapshot.

Officer management is an organization-scoped server subsystem built on the existing D1 `memberships`, `invitations`, and `audit_events` tables. API routes call repository functions; repository functions enforce authorization and database invariants. The browser never receives stored token hashes or direct storage credentials.

## Team Metrics inputs and eligibility

Team Metrics exists only when a Full Roster is supplied successfully. This keeps roster-size, participation, zero-hour, average, median, and spread calculations well-defined. The module renders immediately below Roster Performance.

Only Team Report rows with attendance equal to `Validated`, case-insensitively, and event dates inside the inclusive configured school year contribute. Roster identity matching follows Roster Performance: normalized email first, then an unambiguous normalized name fallback. Ambiguous name-only activity is not combined.

## Summary metric definitions

- `totalHours`: sum of eligible validated hours matched to roster members, rounded to hundredths.
- `participationRate`: percentage of roster members with `validatedHours > 0`, rounded to hundredths.
- `averageHours`: `totalHours / rosterSize`, including zero-hour members, rounded to hundredths.
- `medianHours`: median of every roster member's validated-hour total, including zeros, rounded to hundredths. An even-sized roster uses the mean of the two center values.
- `activeVolunteers`: count of roster members with `validatedHours > 0`.
- `zeroHourVolunteers`: count of roster members with `validatedHours === 0`.
- `completedOpportunities`: number of distinct completed opportunity IDs across matched eligible activity. When an ID is missing, the existing normalized event-name/date fallback identity is used.
- `minimumHours` and `maximumHours`: lowest and highest roster-member validated-hour totals, including zeros, displayed together as Hours Spread.

The result also includes `rosterSize`. An empty roster remains a validation failure and never produces metrics.

## Biweekly time series

The first period begins at the configured school-year start at 00:00:00 UTC. Consecutive periods are 14 calendar days. Each period is start-inclusive and end-exclusive, except the final period ends at the configured inclusive school-year end. The final period may be shorter than 14 days.

Every period from school-year start through school-year end is returned, including periods with zero hours. Each point contains:

- Period start date.
- Inclusive display end date.
- Hours completed during the period, rounded to hundredths.
- Cumulative hours through the period, rounded to hundredths.

Only activity matched to a roster member contributes, keeping the chart consistent with the summary cards and Roster Performance.

## Analysis payload and History compatibility

The analysis result gains an optional `teamMetrics` object next to `performance`. It is absent when no Full Roster is uploaded.

New saved analyses store:

```json
{
  "snapshotVersion": 3,
  "volunteers": [],
  "performance": {},
  "teamMetrics": {}
}
```

The repository continues to read:

- Version 1 legacy `results_json` values containing only a volunteers array.
- Version 2 objects containing volunteers and optional performance.
- Version 3 objects containing volunteers, performance, and Team Metrics.

History detail never recomputes saved metrics under newer rules.

## Team Metrics interface

`TeamMetricsModule` is reusable on Overview and Analysis Detail. It renders after `PerformanceModule` and includes:

- Eight compact summary cards in the approved combined participation/equity layout.
- A two-series responsive SVG line graph.
- Period Hours and Cumulative Hours legend labels.
- Accessible chart title and textual summary.
- Tooltips or direct point labels that expose exact dates and hours.
- Responsive stacking without horizontal page overflow.

The eight displayed cards are Total Hours, Participation, Average Hours, Median Hours, Active Volunteers, Zero-Hour Volunteers, Completed Opportunities, and Hours Spread.

## Officer permissions

Every active organization member has the same officer-management permissions. There are no roles in this milestone. Every Officers API request requires the same signed-in, active organization membership used by History.

The Officers page lists:

- Active memberships.
- Inactive memberships.
- Unaccepted invitations, with pending or expired status.

No organization can read or mutate another organization's records.

## Invitation creation

An active officer supplies an email address. The server normalizes and validates it, rejects an already-active member, generates a cryptographically random token, and stores only a SHA-256 token hash. The invitation expires exactly seven days after creation and is single-use.

The raw invitation token is returned once as an application URL and is not stored. The Officers page presents a Copy Link action. Creating a replacement invitation for the same email invalidates or supersedes earlier unaccepted invitations so only the newest unexpired link can be accepted.

The audit event records the actor, organization, normalized invited email, invitation ID, and timestamp, but never the raw token.

## Invitation acceptance

The acceptance route requires platform authentication. It hashes the supplied token and retrieves an unaccepted, unexpired invitation in the configured organization. The signed-in user's normalized email must exactly equal the normalized invitation email.

On success, one atomic database operation:

- Creates a membership or reactivates the matching inactive membership.
- Updates the membership's platform user ID and normalized email.
- Marks the invitation accepted.
- Invalidates other outstanding invitations for that email.
- Writes an `invitation_accepted` audit event.

Expired, reused, invalid, or email-mismatched links return actionable errors without revealing whether unrelated accounts or organizations exist.

## Officer deactivation

An active officer may deactivate any active membership, including their own, only when another active membership remains. The repository/database operation—not just the interface—checks the active-member count and conditionally applies the update. A failed last-officer attempt leaves all memberships unchanged.

Successful deactivation records the actor, target membership ID, target email, organization, and timestamp in the audit log. The deactivated user loses access on their next authorized request. They can later be reactivated through a new invitation.

## API surface

The server exposes these organization-scoped endpoints:

- `GET /api/officers`: list memberships and invitations.
- `POST /api/officers/invitations`: create an invitation and return its one-time copyable URL.
- `POST /api/officers/invitations/accept`: accept a token as the signed-in matching user.
- `POST /api/officers/:membershipId/deactivate`: deactivate a membership with last-officer protection.

All mutations validate content type and inputs, return structured issues, and write audit events only when the state change succeeds.

## Officers interface

`OfficersView` replaces the placeholder and follows the approved mockup. It shows membership identity, email, state, relevant dates, and permitted actions. An Invite Officer dialog accepts one email and shows the returned link with a Copy Link control. Pending invitations also expose Copy Link only during the creation response; stored invitation rows cannot reconstruct raw tokens, so subsequent list views offer Generate New Link instead.

The page shows loading, empty, success, and actionable error states. The deactivate control requires confirmation and is disabled or rejected when it would target the final active officer.

## Database changes

The current schema already includes core membership, invitation, and audit tables. The migration adds nullable `created_by` and `invalidated_at` fields to invitations and nullable `updated_at` and `deactivated_at` fields to memberships. New invitations always populate `created_by`; null is retained only for any legacy invitation rows. It also adds organization/email indexes for invitations and memberships plus an organization/active index for last-officer checks. The implementation plan must inspect generated SQL and preserve existing local data.

Token hashes remain unique enough through cryptographic randomness and are never returned by list endpoints. Organization/email and organization/user indexes should support scoped lookups.

## Error handling

- Invalid analysis input continues to block the complete analysis, including metrics.
- A successfully parsed roster with ambiguous history matches retains its warnings; ambiguous rows do not inflate metrics.
- Officer APIs distinguish authentication failure, authorization failure, invalid input, and safe conflict conditions.
- Invitation errors do not leak cross-organization membership information.
- Failed D1 mutations do not emit success audit records.
- The interface preserves entered email values after recoverable invitation errors.

## Testing

Pure Team Metrics tests cover school-year filtering, 14-day boundaries, the shortened final period, zero-filled periods, cumulative totals, rounding, zero-hour members, even/odd medians, distinct opportunity fallback IDs, ambiguous name matching, and empty-roster validation upstream.

Service, API, and persistence tests cover optional metrics, version 1/2/3 snapshot compatibility, immutable History display, and roster-backed metric consistency.

Officer repository and API tests cover active authorization, organization isolation, input validation, token hashing, seven-day expiry, single use, email matching, link replacement, reactivation, audit events, failed-mutation atomicity, and last-active-officer protection.

Rendered interface tests cover the eight labels, both chart series, responsive chart semantics, officer lists, invitation creation/link copying, confirmation, and error states. Final verification runs the full unit suite, Vinext production build, TypeScript checks, whitespace checks, and browser interaction for Overview, History detail, invitation creation, and protected deactivation.

## Documentation and handoff

The README and administrator guide will explain Team Metrics definitions, why a Full Roster is required, biweekly period behavior, invitation-link handling, seven-day expiration, email matching, officer deactivation, and recovery through an existing active officer. The guide will repeat that invitation links are secrets and must be sent only to the intended school email address.
