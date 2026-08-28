# STUCO Hours Desk — officer handoff

## What the site does

Upload the latest Helper Helper Team Report and Upcoming Opportunities report. The site calculates validated hours for the selected school year, applies the 25-hour cap, and identifies optional events to review. It generates a copyable draft for each flagged volunteer; it does not send messages or change Helper Helper registrations.

## Officer accounts

Each officer signs in with their own ChatGPT account. Active officers can invite replacements and deactivate departing officers. The site always requires at least one active officer. Keep the deployment owned by a school/STUCO-controlled account so the next year’s officers can take over.

### Invite or reactivate an officer

1. Open **Officers** from the sidebar.
2. Enter the recipient's school email under **Invite officer**, then select **Create invitation**.
3. Copy the private link immediately and send it only to that recipient. The site shows the raw link once; it cannot reconstruct it after dismissal or reload.
4. Ask the recipient to open the link, sign in with the exact invited email, and select **Accept invitation**. Email comparison ignores capitalization and surrounding spaces, but otherwise must match.
5. Confirm the recipient appears under **Active officers** and can open the site before changing anyone else's access.

Each invitation is single-use and expires exactly seven days after creation. If a link expires or is lost, select **Generate new link** beside the pending or inactive account. Creating a replacement invalidates earlier outstanding links for the same organization and email. A new invitation also reactivates a previously deactivated membership after successful acceptance.

Invitation links are credentials. Do not place them in public messages, screenshots, support tickets, logs, or source control. Only the intended school email should receive the link.

### Deactivate an officer

Select **Deactivate** beside the active officer, verify the email in the confirmation, and confirm the change. The account moves to **Inactive officers** and loses access on its next authorized request. The server refuses to deactivate the last active officer, even if two administrators act at the same time. Recovery always requires an existing active officer to generate a new invitation, so never remove the final outgoing officer until a replacement has accepted and verified access.

## Analysis checklist

1. Export the Team Report from Helper Helper.
2. Export Upcoming Opportunities with individual volunteer registrations.
3. Start a new analysis and upload both files. Optionally upload the Full Roster to include students with no recorded activity.
4. Confirm school-year dates and the 25-hour limit.
5. Review warnings before acting on any flag.
6. Copy the draft for each optional event marked `Review / remove`.

Both files must be `.xlsx` workbooks no larger than 10 MiB. The Team Report must contain `Commitments`; the upcoming export must contain `Opportunity Volunteers`. If the site reports a missing sheet, column, date, duration, duplicate, or malformed workbook, correct or re-export the source report and submit both files again.

With a Full Roster uploaded, the Overview shows Top, Steady, and Developing performers based on an equal-weight score from validated hours and distinct completed opportunities. Groups follow the actual score distribution and preserve ties; they are not equal-headcount buckets. If everyone has zero activity, everyone is Developing. If everyone has the same nonzero activity, everyone is Steady. Use the sort control to order students by combined score, hours, opportunities, or name.

## Team Metrics

Team Metrics is available only when the Full Roster upload succeeds. It is shown directly below Roster Performance and includes every rostered student, including zero-hour students. It counts only Team Report rows marked `Validated` (case-insensitive) with an event date inside the inclusive school year. The system matches by normalized email first, then by normalized name only when that name identifies one person; ambiguous name-only activity is excluded.

The eight values are: **Total hours** (eligible matched validated hours); **Participation** (the percent of roster members with more than zero hours); **Average hours** (total divided by all roster members, including zero-hour members); **Median hours** (the middle total including zeros, or the mean of the two middle totals for an even roster); **Active volunteers** (more than zero hours); **Zero-hour volunteers** (exactly zero hours); **Completed opportunities** (distinct eligible matched events, with event name/date used when an ID is missing); and **Hours spread** (lowest to highest roster-member totals, including zeros).

The chart begins at the configured school-year start and uses consecutive 14-calendar-day periods, with a shorter final period if necessary. Every period remains visible, including zero-hour periods. The coral series is **Period Hours** and the teal series is **Cumulative Hours**. Expand **View period data** to read every period's full date range and exact values with a keyboard or touch input.

If you do not choose to save, a successful result is labeled **Current unsaved analysis** and can be lost on refresh. Copy any needed drafts before leaving the page. Missing volunteer email addresses remain visible as warnings and prevent draft creation for those registrations.

When local D1/R2 bindings are available, select **Save this analysis to History** before analyzing. For a fresh local checkout, follow the D1 initialization commands in the project README first. Saved records contain the original workbooks in private R2 storage and an immutable result snapshot in D1. Team Metrics in History shows that saved snapshot exactly; it is never recalculated under newer rules. Version 1 and 2 History records still open without Team Metrics. Production requests require Sites/ChatGPT identity and active organization membership; never enable the `STUCO_DEV_AUTH` demo bypass outside local development.

Opportunity names containing `MANDATORY` are retained automatically and labeled `Mandatory · exempt`. Their hours still count toward the projection. A total of exactly 25 hours is allowed; only a total above 25 triggers review.

## Handoff

Before graduating, invite the incoming officers, confirm each person can sign in, and leave at least one incoming officer active. Do not deactivate the final outgoing account until the replacement has accepted their invitation.
