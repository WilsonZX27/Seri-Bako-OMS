# OMS feature closure — 2026-10-04

## Current release and database

Production **v9.2.76** is deployed at https://system.seribako.com.my. Final deployment `8u2otQahGNK3w3XXh7hdbat2mLtx` completed and was aliased to that domain. Authenticated Owner acceptance verified the displayed release. Production migration 323 and forward-only migration 324 applied successfully; repository and linked database are reviewed through **324**. No local Supabase stack was started.

Migration 324 fixes SQL record/table-alias ambiguity discovered during live draft recalculation. The final live recalculation returned “Plan updated / Saved successfully”. It preserves manual overrides with reasons and tray counts; isolated regression also verifies obsolete allocations are removed.

## Implemented and accepted surfaces

Daily Records owns the operational list, separate Insights and Delivery Orders tabs. The duplicate DO sidebar entry is removed and the old DO list route redirects. Daily input remains separate from analytics. Planning shares workspace tabs, selectors, tables, right console and ModalShell; settings and events have separate views. Packaging uses one security-invoker report RPC and structural loading states. Actual dispatch remains distinct from approval; automatic Qty Sent does not copy into Received.

Owner-authenticated checks covered Daily Records list, an existing record form, outlet/product/trend/completion Insights, DO list, Planning draft, Settings, Events and Packaging. Seven main surfaces were captured at **390, 820, 1180 and 1440px**; all measured document widths stayed within the viewport. Required data tables retain bounded horizontal scrolling. Screenshots and width measurements are in `/tmp/seri-oms-acceptance/`; these contain operational information and are not committed. Modal Escape dismissal restores focus to the triggering product button. Shared product evidence controls have a 44px minimum target. Existing shared-component regression contracts passed; this is not an exhaustive WCAG certification or a complete live test of every role.

A legitimate, unpublished **2026-10-05 ALMA kitchen draft** was generated and recalculated. Its unknown product yields, minimums and demand basis remain explicit review checks. No fictitious approval, dispatch, DO, Qty Sent or inventory postings were created. Existing outlet Received, Wastage and POS fields were inspected without saving changes.

## Database and code evidence

Strict TypeScript and lint passed. Production build compilation, type/lint checks and static generation passed. Full regression suite: **1,356 / 1,356 passed** (`/tmp/seri-tests-976-db324.log`). Isolated PGlite production workflow: **52 checks passed**, covering default manual forecast basis, independent receipts, incremental DOs, replay, rollback, permissions, posted-record correction and recalculation preserving overrides. Packaging fixture covers >1,000 rows, recorded zero, missing receipt, historical closing balances, draft exclusion and company/branch/anonymous visibility. These fixtures are isolated and do not create Production orders.

Actual DO React rendering and current CSS were tested with a 60-line isolated fixture: three A4-layout pages of 20 lines, repeated document metadata and signatures, each approximately 940px high inside the printable page allowance. Received, Disposal and Remarks remain blank. Print CSS resets responsive shell geometry and transport containers stay separate from production batches. This verifies simulated A4 layout, not a physical printer or native PDF driver. Live DO dispatch/printing is not claimed because no fictitious deliveries were permitted.

Packaging reload was observed at approximately 4.2 seconds including browser navigation and readiness checks; this is a wall-clock observation, not a controlled cold-start benchmark. Filtering changes the already loaded report. Forecast historical reads are scoped to the kitchen’s supplied outlets and paginate beyond 1,000 rows.

## Remaining activation dependencies

Manager must confirm per-product tray yields and same-day/manual demand basis, per-outlet/product minimums, supply routes and notification recipients. Unknown and multi-day products stay manual; no historical high allocation is silently adopted as a minimum. Draft saving currently requires quantities for all allocations; approval additionally validates configuration and allocation balance.

Production `RESEND_API_KEY` is absent. Email delivery cannot be accepted until the provider and recipients are configured. The UI distinguishes unavailable sending, queued notifications and successful delivery. Automatic drafts remain disabled until business configuration is reviewed. Hobby daily scheduling runs within its provider window after 20:00 Malaysia time; exact-minute configurable scheduling requires a compatible scheduler.

The application and migration fixes are deployed and authenticated surface checks passed. Full operational activation remains dependent on these business/email settings and a real, reviewed pilot delivery; it is not represented as complete by an empty queue or fabricated orders.
