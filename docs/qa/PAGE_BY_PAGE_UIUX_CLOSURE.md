# Page-by-page UI/UX closure

This ledger mirrors the Owner's Notion audit and records only evidence-backed closure. An item is not complete until its source change, responsive verification, and regression gate are recorded.

## `/outlet-daily-records/new` — 2026-08-11

Status: verified locally against the real cloud Supabase environment

- [x] Flatten Record setup and remove nested-card appearance.
- [x] Keep the shared desktop/tablet action rail sticky while the primary canvas scrolls.
- [x] Simplify the Daily Product Lines header; remove redundant help copy.
- [x] Add one shared `Qty Sent / Received / Wastage` heading row.
- [x] Use a two-column Reason / Remarks secondary row at constrained desktop/tablet widths.
- [x] Default reason to `unsold` only when positive wastage first requires a reason.
- [x] Align product rows and tabular numeric controls.
- [x] Make line remarks progressive disclosure through an accessible comment action.
- [x] Prevent desktop location context wrapping when space is available.
- [x] Remove duplicate mobile title and setup-summary context.
- [x] Recompose mobile context as Status + Date, then Location.
- [x] Consolidate the mobile workflow control.
- [x] Normalize the mobile More action and action-rail elevation.

Verification matrix:

| Viewport | Layout | Interactions | Overflow | Evidence |
| --- | --- | --- | --- | --- |
| 393×852 | Pass | Pass: workflow, default reason, progressive remarks, More sheet | Pass | `test-results/outlet-daily-393x852.png` |
| 820×1180 | Pass | Pass: workflow pipeline and sticky action rail | Pass | `test-results/outlet-daily-820x1180.png` |
| 1024×768 | Pass | Pass: sticky action rail and compact table header | Pass | `test-results/outlet-daily-1024x768.png` |
| 1440×900 | Pass | Pass: desktop rail and one-line location context | Pass | `test-results/outlet-daily-1440x900.png` |

Regression gates: `npm run build` passed (75 pages); responsive copy contract passed (2/2); cloud-backed Playwright scenario passed (1/1 across four viewports). No form was submitted and no database record was changed.

Guardrails: preserve Supabase paths, permissions, workflow states, and server actions; no page-specific `!important`; do not infer closure from build success alone.

### Annotation reconciliation — 2026-08-11

- [x] Record setup disclosure always exposes a readable title at every viewport.
- [x] Closed setup remains reopenable on phone, portrait tablet, and desktop.
- [x] Branch and date changes update the shared document header immediately.
- [x] Daily Product Lines title, remaining count, and search share one tablet row.
- [x] Wastage reason and the progressive remark action share a 40px baseline and height.
- [x] Mobile More uses centered text/icon spacing and a 12px action stack.
- [x] Tablet/desktop console sections use the shared 12px sibling gap.
- [x] Dev preview uses `.next-dev-3015`, isolated from production builds.

Measured evidence: 430px has no horizontal overflow; 820px title/search centers both resolve to 504.5px; right-rail section gap is 12px; reason and remark controls are both 40px high at the same Y coordinate; Branch change reflected in the header before submit. Screenshots: `test-results/outlet-daily-430-top.png`, `test-results/outlet-daily-430-closure.png`, and `test-results/outlet-daily-820-closure.png`.
# Dashboard — role-aware closure (v8.36.1)

- All roles use one identity hierarchy: small `WELCOME`, large user name, then role and scope metadata. Role-specific titles such as `Outlet Today` and `Owner Workdesk` are not rendered.
- Outlet Staff does not receive inventory/finance Operational Pulse content or its links. Its workspace is limited to today's assigned outlet record and three permitted actions.
- Outlet actions are rendered once in the main workspace; the duplicate desktop right rail is removed for this role.
- Regression contract: `tests/e2e/dashboard-role-awareness-7-23-2.spec.js` checks role-title removal, Outlet Staff command-card absence, three allowed actions, responsive overflow, and permission redirects.
# Shared desktop list toolbar — alignment contract (v8.36.2)

- Search remains the only flexible-width field. Date, Select, Status and More Filters controls use one 8rem width contract.
- Filters remain left-origin aligned. Record count and Search/Reset are grouped and anchored to the right with a flexible gutter.
- Ownership: `UnifiedListHeader` provides the semantic action group; `design-system-v2.css` owns its responsive geometry. Pages must not recreate this alignment locally.
