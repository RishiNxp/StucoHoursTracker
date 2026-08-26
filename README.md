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

Open the local URL printed by Vinext. Choose **New analysis**, upload the Helper Helper Team Report and Upcoming Opportunities `.xlsx` exports, confirm the inclusive school-year dates and positive hour cap, and select **Analyze reports**. Each file must be 10 MiB or smaller.

The current analysis is held only in the browser session. Refreshing or navigating away may discard it; History and officer management are not yet persisted. Workbook bytes are processed in memory, no emails are sent automatically, and Helper Helper registrations are never changed.

Run `npm.cmd test`, `npm.cmd run lint`, and `npx.cmd tsc --noEmit` before publishing changes.

## Source documents

The approved product design is in `docs/superpowers/specs/2026-08-25-volunteer-hours-site-design.md`, and the implementation plan is in `docs/superpowers/plans/2026-08-25-volunteer-hours-site-plan.md`.
