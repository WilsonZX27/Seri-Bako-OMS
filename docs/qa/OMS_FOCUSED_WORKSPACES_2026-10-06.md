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

Migration335 replaces only approval workflow and release notification functions with their currently applied331/319 definitions minus email prerequisite and email enqueue. Existing ACL, owner and security-definer properties are guarded. Historical queued messages, approved quantities and documents are retained.325 remains unapplied.335 has been applied in a narrow advisory-locked transaction and independent readback is pending.

## Verification

Strict TypeScript and lint passed. Full regression:1,416 passed. PGlite integration:105 checks passed, including approval with no email recipients, no queued release emails, preserved function ACL/owner/security-definer and independent franchise dispatch. Browser verification and final publication evidence pending.
