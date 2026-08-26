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

The site uses the Vinext starter and Cloudflare D1/R2 bindings declared in `.openai/hosting.json`. Use Node.js 22 or newer, then run the starter’s development and build commands from the project directory. The visible dashboard is available at `/`; its upload modal is the first product slice, while the normalized analysis package under `src/analysis/` is ready to wire into the upload API.

## Source documents

The approved product design is in `docs/superpowers/specs/2026-08-25-volunteer-hours-site-design.md`, and the implementation plan is in `docs/superpowers/plans/2026-08-25-volunteer-hours-site-plan.md`.
