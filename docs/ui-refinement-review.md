# Preview refinement review — 2026-10-21

## Functional preservation (separate from visual changes)

Source: `origin/codex/system-quality-verification` at `a6896b0a`; base: production `bfe3afbb`.

| Area | Preserved change | Location |
| --- | --- | --- |
| Attendance | Request attendance.read before choosing own-schedule fallback; keep full owner workspace; own published schedule route | attendance pages, attendance query, published-schedule-list |
| Roles | Kitchen/Chef boundaries, permission aliases and navigation scope | permissions, route-permissions, information-architecture, dashboard, asset pages/queries |
| Stock counts | Serialize draft/manual saves, retain input on failure, recover line identifiers, reuse created draft | stock-count actions, form, new page |
| Products | Normalize supply-period dates and filter availability | product actions/query and database types |
| Employees | Fix nested table header; retain last-sign-in information | people page, staff-security-panel |
| Notifications | Kitchen scope guard and existing attention-route derivation | topbar query |

Migration 368 is retained as existing branch history/source, not a newly designed schema change. This task does not execute database migrations or reassign staff. Its deployed status must be checked before treating Kitchen database isolation as verified.

Old branch visual-only changes to low-stock, production planning, packaging, insights, stock-count list ordering and broad CSS are deferred to later page review. Existing production actions remain available.

## UI annotations / verification

User-supplied screenshots are the before evidence (latest comments 1–7). PR before screenshot also saved under `outputs/ui-refinement-2026-10-21/pr-before-1180.png`.

| Annotation | Owner / change | Verification |
| --- | --- | --- |
| 1 navigation dots | shared activity promise → visible permission-filtered nav items → group summary | Contract checks: deduplication, empty queues, visible-item aggregation; authenticated refresh pending |
| 2 notification icons | activity menu maps maintenance, PR, PO, invoices, compliance, production and inventory; 16px shrink-0 icons | Source/type checks; authenticated popover inspection pending |
| 3 activity entry | existing /activity navigation with outlined button presentation | Source contract; authenticated click pending |
| 4 daily metadata | page-specific three-column label/value groups; full-width detail region | Actual row-component synthetic browser stress check |
| 5 daily query row | opt-in persistent date + branch; named Filter disclosure; result count right-aligned | SSR check: each field submitted once; synthetic browser sizing; live filtering pending |
| 6 summary numbers | Records value now same 12px size as peer totals | Source check; authenticated screenshot pending |
| 7 PR metadata | auto-sized count/amount columns; wrapping supplier; grouped byline and full dates | Actual source row extracted into synthetic browser fixture, long names and RM 1,234,567.89 |
| earlier FAB | phone FAB owned by console; create actions remain permission guarded in rail | 58 shared-shell/list contracts pass; authenticated single-FAB count pending |
| earlier assets | preserve 12px checklist copy, existing H1 and cards; scoped grid protection | source checks; authenticated asset review pending |

### Automated results

- ESLint and source-only TypeScript check pass. Source-only configuration excludes ignored historical output snapshots; the remote Vercel build supplies the complete release build check.
- 96 stock-count / attendance / procurement / topbar regression checks pass.
- 23 focused refinement / query rendering / attendance permission / asset / product / PR order checks pass.
- 58 mobile shell / FAB / daily list / PR list checks pass.
- Existing role-sensitive contract tests restored alongside the old branch’s Kitchen/Chef changes; assertions retain their original role boundaries rather than treating the old Kitchen entitlement as current.

### Browser fixture results and limits

Evidence: `outputs/ui-refinement-2026-10-21/stress-results.json` and `stress-{width}.png`.
Widths: 360, 393, 767, 768, 1180, 1279, 1280, 1440. No document horizontal overflow; all tested amounts and dates fit. 360/393 metadata is 11px, tablet metadata is 12px. Daily date and branch controls remain usable at each compact breakpoint.

These are **synthetic layout checks**, using the actual row/header source and production styles, with a reserved right rail. Desktop fixture deliberately keeps the compact row visible to stress it; it does not replace verification of the actual desktop table. No authenticated workflow, database mutation, touch-device emulation or real stock-count save is claimed from this fixture.

### Authenticated Preview checks

After the user logged in, the stable host was verified as Owner at an actual 820px viewport:
- PR search for PR/OCT26/030 returned exactly one record; detail opened with two lines and RM 290.00.
- Daily branch filter changed 687 records to 73 for Gurney Plaza; adding Posted preserved the branch and returned 67 records.
- Notification icons measured 16×16px; the outlined activity entry opened Activity Log.
- Attendance shows Overview, Schedule, Attendance, Confirmation, Payslips and Settings, plus schedule/review/import actions.
- Requests pending dot is present. No live completion action was performed to clear a queue.
- One visible New PR entry was measured at 820px; phone FAB remains covered by source contracts, not authenticated phone verification.
- Real screenshots: attendance-after-820.png, daily-after-820.png, notifications-after-820.png under the evidence directory.

The browser viewport override did not change this authenticated tab: innerWidth stayed 820 despite requested sizes. The eight pr-after-{requested-width}.png captures were therefore removed; they must not be presented as evidence for those dimensions. The separate synthetic stress checks remain valid. Full live six-width acceptance, desktop sorting, phone FAB interaction, asset page review and stock-count save against disposable data remain unverified. No business records were created or modified. Migration 368 was not executed.

A live visual check found the labelled Filter control still inherited a 44px fixed width, squeezing its icon. A scoped width/min-width and nonshrinking 16px icon fix was added for the two reviewed list toolbars; focused eight tests pass. Final live deployment check remains required.
