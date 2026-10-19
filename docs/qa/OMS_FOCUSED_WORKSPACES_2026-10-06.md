# Focused operational workspaces — 6 October 2026

## Execution and acceptance plan

1. Production evidence: retain the correct Sponge Cake title. Show one outlet, three saved context values, one selectable trend and one date's detail. Expand raw records or setup guidance only on demand. No forecast, quantity or eligibility changes.
2. Planning checks: lead with unique affected-product counts by task, keep precise validation in closed bounded detail groups. Swap Events and Settings. Retire kitchen email across setup, rail, approval prerequisite and scheduler while retaining in-app kitchen notification.
3. Packaging: lead with selected-product recorded balance and period usage; default graph to closing balance with a Usage switch. Preserve dates and per-outlet provenance. Latest balances can have different dates and are not invented live stock.
4. Compliance: one sidebar destination and Register/Calendar tabs in one authorized workspace. Preserve month/branch in legacy calendar redirects, due/expired detail and phone urgency.
5. Verify semantic source values, full regressions, isolated workflow authorization, hosted build and real desktop/tablet/phone interactions. Inspect screenshots; correct actual defects before acceptance.

Reference: IBM Carbon data visualization overview https://www.carbondesignsystem.com/building-blocks/data-visualization/overview; its accuracy/accessibility guidance supports overview plus drill-through. Existing OMS line chart, native selectors, workspace tabs and design tokens remain the component owners. No third-party chart package added.

## Data and interaction decisions

Missing evidence dates use null points in a full56-day calendar; charts never bridge unknown days or invent zeros. Explicit numeric zero is preserved. Saved suggestion/minimum/mode are separate from current completed history. Viewing and changing charts are read-only. Wastage uses the existing danger token; received and balance use the existing primary token. Arrow keys, pointer and touch use the shared chart contract. No unconfirmed demand is labeled sales.

Production evidence uses the existing max-w-5xl modal; narrow screens stack selector and measure controls. The chart is208px on phone and240px from the existing sm breakpoint. Expanded tables cap at288px; plan-check details cap at256px, so44 products do not extend the entire right rail. Packaging retains the established lg split and tablet rail; its compact chart is256px. Compliance reuses shared tabs and calendar, with phone due/expired detail preserved. Temporary browser viewport overrides must be reset after QA.

Migration335 replaces only approval workflow and release notification functions with their currently applied331/319 definitions minus email prerequisite and email enqueue. Existing ACL, owner and security-definer properties are guarded. Historical queued messages, approved quantities and documents are retained.325 remains unapplied.335 has been applied in a narrow advisory-locked transaction and independent readback confirms335/336 applied,325 excluded and the packaging read function remains SECURITY INVOKER.

## Initial verification

Strict TypeScript and lint passed. Full regression:1,416 passed. PGlite integration:105 checks passed, including approval with no email recipients, no queued release emails, preserved function ACL/owner/security-definer and independent franchise dispatch. Browser verification and final publication evidence pending.


## Browser-driven refinement

Desktop and phone evidence graph inspected on the authenticated custom domain. Full56-day calendar preserves missing-date gaps; End-key selection on06/10 reports no completed record instead of substituting30/09. Switching to Queensbay/Received shows its actual16-piece receipts and latest01/10 record. Correct Sponge Cake spelling is retained. Actual phone viewport394px/root394px/dialog361.95px; selector, measures, graph, selected date and collapsed guidance fit the viewport. Settings tabs are Plan/Events/Settings and no kitchen email field exists.

Packaging QA found changing daily outlet cohorts could falsely imply stock movement.336 adds one indexed pre-period completed record per authorized outlet to the existing invoker RPC. The balance series now carries each known closing observation forward, never forecasts movement, and leaves incomplete cohorts blank. Each selected day exposes underlying record dates. Usage remains the recorded per-day total. Isolated tests verify opening10+20, later8+16, ignored draft999, zero/missing balance distinctions and preserved ACL/owner/invoker;109 database checks passed. Full regression now1,421 passed; strict TypeScript/lint passed.335 and336 applied;325 remains excluded. v9.2.93 hosted build completed and custom-domain alias succeeded. Final authenticated acceptance of the cohort correction remains pending after browser sign-in expired.

## Final candidate v9.2.94

Commit35e80322 aligns Calendar with current required-document records from Register, excludes superseded evidence from urgency, removes repeated portfolio totals, and stabilises correction focus across unsaved edits. Strict TypeScript and lint pass; all1,421 regression tests pass. The109 isolated database checks from v9.2.93 remain valid; no SQL changed in94. Independent linked readback confirms335/336 present,325 absent, opening provenance present, and the packaging function remains invoker.

Production deployment EePBuJPaYq5WcTzyVPHEPPjBxBbF completed its hosted production build at https://seri-bako-oms-official-9bp2v3deg-seribako.vercel.app and is aliased to https://system.seribako.com.my. Browser sign-in expired before final Packaging/Calendar acceptance; this is explicitly pending, not an accepted final screenshot. Earlier evidence and product-focus screenshots verify the unchanged components. No hosted QA quantities or approval records were written.

Final publication: v9.2.94, deployment EePBuJPaYq5WcTzyVPHEPPjBxBbF, application commit35e80322. Browser viewport override reset. Agent QA tab preserved at login for authenticated acceptance; original user tab unchanged. Final Packaging cohort and current-record Calendar screenshots remain pending sign-in; no claim of those final interactions passing is made.

## Authenticated acceptance — 7 October 2026

Pending v9.2.94 UI checks now pass on the authenticated production workspace. No application changes or new deployment were required.

Packaging: latest selected balance2,283PCS across10 outlets and seven-day usage431PCS. Today carries last confirmed balance with0 updates and displays original per-outlet dates. Usage today is no completed record. Daily5+9+11+406 matches431. Seven/30-day loading, single-outlet filtering, explicit zero, and mobile More actions source-date details verified.

Compliance: Register59 missing/4 due across12 sites agrees with four current Calendar reminders; no superseded duplicates or repeated Portfolio card. Date selection opens its relevant event. Legacy Calendar links preserve month and branch, with scoped reminders.

Production: Find product works; search remains stable across quantity edits. Save enables while incomplete Preview remains blocked. Unsaved changes dialog appears on leaving; Discard restores original blank quantity and disabled Save. Plan/Events/Settings and email retirement verified. Evidence has53 completed selected-outlet records; selecting missing06/10 does not substitute05/10. No catalog names modified.

Actual390/820/1180px viewport widths match root scrollWidth. Desktop calendar and390px evidence dialog inspected. Browser captured error log empty. Viewport override reset.109 isolated PostgreSQL workflow checks rerun successfully for save/submit/approval/kitchen visibility/dispatch and independent franchise orders. No hosted operational writes; UI test edits discarded.

UI acceptance passes. Operational readiness remains open: inspected ALMA draft has44 products requiring configuration and quantities, and submission is correctly blocked. Real release is not claimed.

Screenshots: /tmp/oms-994-packaging-accepted.png; /tmp/oms-994-compliance-accepted.png; /tmp/oms-994-evidence-accepted-phone.png. This UI acceptance supersedes prior pending sign-in notes. Report retained locally; external push of detailed acceptance was rejected by automatic approval review.

## 8 October v9.2.95 acceptance continuation

Production alias reports v9.2.95. Real daily record, loaded Planning Settings (44 products), loaded Plan and loaded Insights (10 outlet rows) have no root horizontal overflow at 390, 430, 820, 1143 and 1440 widths. Daily quantity inputs measure 48px on phones, 44px at 820 and 36px on desktop. Sold out controls are absent. Settings navigation shows the unsaved dialog; the temporary edit was discarded, never saved. Plan gives one Next step to confirmed yields/minimums. Packaging retains the prior count, and expanded Queensbay details show 03/10/2026, five days old, with the recorded zero preserved. Keyboard expansion succeeds; pointer expansion needs further checking before closing acceptance. Initial shell-only width checks were excluded where data had not loaded.

Full local application build and strict TypeScript pass. Regression run: 1,421 passed, one documentation authority assertion failed after adding migration337; the documentation was corrected and that three-test file passes. Local asset rehearsal and calendar/permission checks pass. Real concurrent transactions, final delta import, attachment reconciliation and cutover remain outstanding.

## Date range selector — 8 October local acceptance

Actual reusable component tested in a synthetic, no-business-data local form. 390/430/820/1143/1440 root overflow is zero; 390/430 show one month, larger widths show two. Native pointer interaction verifies Last 7 Days, Cancel retaining the original selection, reversed endpoint selection producing 2–5 September, Apply updating the trigger and View emitting both ISO dates in the GET URL. Screenshots: /tmp/oms-date-range-desktop.png and /tmp/oms-date-range-phone.png. All 1,430 regression tests pass; strict TypeScript, lint and production build pass using the local test environment. No authenticated production query or release is claimed.
