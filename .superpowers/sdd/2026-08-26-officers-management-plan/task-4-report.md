# Task 4 report — Officers Interface

## Result

Implemented the Officers destination and invitation acceptance page against the Task 3 API contract.

## Changed files

- `app/components/OfficersView.tsx` — loading/retry states; active, inactive, and pending lists; invitation creation and one-time copy surface; replacement-link affordance; deactivation confirmation and client-side last-officer guard; invitation acceptance state.
- `app/invite/page.tsx` — public invitation destination that mounts acceptance mode.
- `app/page.tsx` — replaces the Officers placeholder with direct `<OfficersView />` navigation.
- `app/analysis.css` — responsive Officers, invitation, and confirmation styles.
- `tests/rendered-html.test.mjs` — Officers and invite destination surface assertions.

## TDD evidence

- RED: `node --test tests/rendered-html.test.mjs` failed with `ENOENT` for missing `app/components/OfficersView.tsx`.
- GREEN: the same command passed 2/2 after implementation.

## Verification

- `node --test tests/rendered-html.test.mjs` — PASS (2/2).
- `npx.cmd tsc --noEmit` — PASS.
- `npm.cmd run test:unit -- tests/api/officers-route.test.ts tests/server/officers-repository.test.ts` — PASS (59/59).
- `npm.cmd run build` — PASS; `/invite` and all Officers API routes present in route output.
- `git diff --check -- app/components/OfficersView.tsx app/invite/page.tsx app/page.tsx app/analysis.css tests/rendered-html.test.mjs` — PASS; Git emitted only existing LF-to-CRLF working-copy notices.

## Review notes / concerns

- The task plan's file list omitted a route for the generated `/invite` URL. Added `app/invite/page.tsx`; without it, repository-generated invitation links would have no usable website destination.
- Client-side final-officer disabling is advisory. Server-side `LAST_ACTIVE_OFFICER` errors remain surfaced verbatim, preserving the repository as the authority.
- Browser interaction with migrated local D1 remains part of Task 5 final verification.

## Review fix round 1

Addressed every review finding:

- Invitation credentials are captured once on initial `/invite` render, then `history.replaceState` immediately removes the token and organization ID before any acceptance request or navigation.
- Deactivation conflicts stay inside the open confirmation dialog, retain the target identity, and expose a clear `Retry deactivation` action.
- Generate New Link now normalizes and fills the email, scrolls to and focuses the invitation form, adds an upward direction cue, and announces what replacement action is ready.
- The confirmation dialog now receives initial focus, closes with Escape, wraps forward/reverse Tab focus, and restores focus to the invoking Deactivate control.
- Successful clipboard writes clear stale copy errors; failures retain manual-copy guidance.
- Added `tests/components/officers-view.test.ts` with real helper/request boundary behavior for invitation creation, acceptance credentials, query scrubbing, authoritative deactivation conflicts, copy success/failure, regeneration focus, and modal keyboard/focus behavior.

TDD evidence:

- RED 1: all seven initial behavior tests failed because the behavior exports did not exist.
- GREEN 1: 7/7 passed after the first implementation.
- RED 2: three concrete invitation/acceptance/deactivation request-contract tests failed because request functions did not exist.
- GREEN 2: focused suite passed after using those functions in the component.
- RED 3: initial/restored modal focus test failed because focus helpers did not exist.
- GREEN 3: final behavior suite passed 11/11.

Final verification after fixes:

- `npm.cmd test` — PASS: 124/124 unit tests, production build, rendered checks 2/2.
- `npx.cmd tsc --noEmit` — PASS.
- `git diff --check` — PASS; only LF-to-CRLF working-copy notices.

## Final Task 4 correction

- Escape now remains contained and is ignored while deactivation is in flight, matching the disabled dialog controls and non-dismissible backdrop. The dialog stays mounted so focus and any eventual server error remain visible and coherent.
- Added a deterministic mounted React interaction suite at `tests/components/officers-view-mounted.test.tsx`. The repository had no jsdom, happy-dom, Testing Library, or react-test-renderer dependency, so `tests/support/mini-dom.ts` supplies only the DOM/event surface needed by the installed real `react-dom/client`; no network or production architecture change was required.
- The mounted suite renders the real `OfficersView` and dispatches delegated browser-style events. It verifies:
  - `/invite` token/organization capture and history scrubbing before clicking Accept, plus the exact captured acceptance request and activated result;
  - Generate New Link scroll/focus/value/status wiring;
  - invitation submission, clipboard failure feedback, successful retry, stale-error clearing, and Copied state;
  - confirmation initial focus, authoritative server conflict visibility, retry wiring, Escape ignored during the pending retry, dialog closure on success, and focus restoration to the actual trigger.
- These assertions depend on actual rendered nodes and event handlers: removing the corresponding JSX handler, state render, ref, or request wiring causes the mounted test to fail (rather than merely changing source text).
- Expanded Vitest discovery from `.test.ts` to `.test.{ts,tsx}` for the mounted JSX test.

TDD evidence:

- RED: the new busy-Escape test failed because Escape still invoked the close callback while `mutating = true`.
- GREEN: `containDialogKeyboard` now consumes but does not close on busy Escape and the component passes `deactivating`.
- Mounted-harness bring-up failures were resolved within test-only infrastructure; the final real-component scenarios pass 2/2.

Final verification:

- `npm.cmd test` — PASS: 127/127 unit tests across 13 files, production build, rendered checks 2/2.
- `npx.cmd tsc --noEmit` — PASS.
- `git diff --check` — PASS; only LF-to-CRLF working-copy notices.
