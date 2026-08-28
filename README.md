# STUCO Hours Desk

STUCO Hours Desk is a private officer dashboard for keeping volunteer opportunities fair. Officers upload a Helper Helper Team Report and Upcoming Opportunities report, review the 25-hour school-year calculation, and copy standardized drafts for optional events that should be reviewed.

## Policy

- The initial cap is 25 validated hours for the configured school year.
- Exactly 25 hours is allowed; totals above 25 are flagged.
- Events are checked chronologically.
- Opportunity names containing `MANDATORY` are retained and labeled exempt, but their hours still count.
- Version one never sends email or changes Helper Helper registrations automatically.

## Ownership and sign-in

Each officer uses their own ChatGPT sign-in. Access is controlled by the STUCO organization membership list. The site should be owned by a school/STUCO-controlled account so graduating officers can be replaced without losing history.

## Local development

Use Node.js 22.13 or newer. On Windows PowerShell, run:

```powershell
cd "C:\Users\rishi\Documents\Codex\2026-08-25\referenced-chatgpt-conversation-this-is-an"
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vinext. Choose **New analysis**, upload the Helper Helper Team Report and Upcoming Opportunities `.xlsx` exports, and optionally upload a Full Roster workbook. Confirm the inclusive school-year dates and positive hour cap, then select **Analyze reports**. Each file must be 10 MiB or smaller.

When a Full Roster is supplied, Overview includes every rostered student—even students with zero activity—and groups them as Top, Steady, or Developing performers from the actual score distribution. Ties remain together, so the groups are not forced to equal sizes. You can sort each group by combined score, validated hours, completed opportunities, or name.

## Team Metrics

Team Metrics requires a successfully uploaded **Full Roster** and appears directly below Roster Performance. It uses only Team Report activity marked `Validated` (case-insensitive) that falls within the configured inclusive school year, then matches it to roster members by email first or by an unambiguous normalized name. Ambiguous name-only activity is excluded.

The eight cards mean:

- **Total hours:** eligible matched validated hours.
- **Participation:** percentage of roster members with more than zero validated hours.
- **Average hours:** total hours divided by every roster member, including zero-hour members.
- **Median hours:** the middle roster-member total, including zeros; for an even roster, it is the mean of the two middle totals.
- **Active volunteers:** roster members with more than zero validated hours.
- **Zero-hour volunteers:** roster members with exactly zero validated hours.
- **Completed opportunities:** distinct eligible matched events, using the event name/date fallback when an event ID is missing.
- **Hours spread:** the lowest through highest roster-member totals, including zeros.

The chart is anchored at the configured school-year start and divides the year into consecutive 14-calendar-day periods, with a shortened final period when needed. It retains zero-hour periods and shows both **Period Hours** and **Cumulative Hours**. Expand **View period data** to read every period's full date range and exact values with a keyboard or touch input.

An analysis is held in the browser session unless you select **Save this analysis to History**. Saved analyses are organization-scoped and retain an immutable result snapshot plus the source workbooks in private storage. Workbook bytes are processed in memory before saving, no emails are sent automatically, and Helper Helper registrations are never changed.

Saved Team Metrics are part of that immutable snapshot: History displays the values that were calculated when the analysis was saved and does not recalculate them under later rules. Older History records that predate Team Metrics still open normally without the module.

## Officer access

Open **Officers** from the sidebar to manage access. An active officer can enter a school email and select **Create invitation**. Copy the private link from the one-time result before dismissing it: the raw link cannot be reconstructed from storage or recovered after a reload. If it is lost, use **Generate new link**; this invalidates any earlier outstanding invitation for that organization and email.

Invitation links expire exactly seven days after creation, work once, and can be accepted only while signed in with the exact invited email address (comparison is case-insensitive after trimming). Treat each link like a password: send it only to its intended recipient and never paste it into public chat, issue, or source-control history.

An officer can deactivate another active officer when at least one other active officer will remain. The server prevents deactivation of the final active officer. A deactivated officer loses access, remains visible under **Inactive officers**, and can be reactivated only by accepting a newly generated invitation for the same email. Recovery therefore requires an existing active officer; confirm an incoming officer has accepted and can open the site before deactivating an outgoing officer.

To save an analysis and use History locally, copy `.env.example` to `.env.local`, then initialize the local D1 schema and demo membership:

```powershell
Copy-Item .env.example .env.local
.\node_modules\.bin\wrangler.cmd d1 execute DB --local --file drizzle/0000_puzzling_thundra.sql --yes
.\node_modules\.bin\wrangler.cmd d1 execute DB --local --file drizzle/0001_thankful_sleepwalker.sql --yes
.\node_modules\.bin\wrangler.cmd d1 execute DB --local --file drizzle/0002_roster_performance.sql --yes
.\node_modules\.bin\wrangler.cmd d1 execute DB --local --file drizzle/0003_officer_lifecycle.sql --yes
.\node_modules\.bin\wrangler.cmd d1 execute DB --local --command "INSERT OR IGNORE INTO organizations (id,name,created_at) VALUES ('local-stuco','Local STUCO',strftime('%s','now')*1000); INSERT OR IGNORE INTO memberships (id,organization_id,user_id,email,active,created_at) VALUES ('local-demo-membership','local-stuco','local-demo','demo@stuco.local',1,strftime('%s','now')*1000);" --yes
```

This fixed demo identity is for local testing only and must never be enabled in production. Production access requires Sites/ChatGPT identity headers plus an active membership in the organization configured by `STUCO_ORGANIZATION_ID`. Set `STUCO_PUBLIC_APP_ORIGIN` to the site's canonical HTTPS origin (for example, `https://hours.example.edu`); invitation links never derive their origin from the incoming request. Local development may use an explicit loopback HTTP origin such as `http://localhost:3000`.

Run `npm.cmd test`, `npm.cmd run lint`, and `npx.cmd tsc --noEmit` before publishing changes.

## Source documents

The approved product design is in `docs/superpowers/specs/2026-08-25-volunteer-hours-site-design.md`, and the implementation plan is in `docs/superpowers/plans/2026-08-25-volunteer-hours-site-plan.md`.
