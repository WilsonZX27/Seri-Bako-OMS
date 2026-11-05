# Products / UOM follow-up — 2026-11-05

## Requirement and scope
Parent requested confirmation of suspected mobile navigation failure and correction of product Usage help. User decision: future carryover Usage is not entered; historical values remain read-only. No business data, payload, permissions or database change.

## Authenticated Preview evidence
Preview branch codex/followup-integration-20261104 (8f0e03b Ready from user evidence), WILSON / Super Admin Owner, Seri Bako Malaysia, 390px viewport.
- Products MC07: a single click stayed on the list; double-click opened the actual product detail (navigation completed after the immediate snapshot). Seasonal, inactive, available until 2026-10-01, PCS.
- UOM KG → G: double-click opened the actual conversion form, factor 1000, preview 1 KG = 1000 G.
- This supersedes the previous suspected navigation defect. DESIGN.md v8.30.0 explicitly requires deliberate double-tap. Shared OperationalListRow suppresses the first ordinary pointer click and permits the second within 350ms. No gesture change warranted.
- Product helper incorrectly said Usage is recorded separately from wastage. Local copy now instructs Wastage / Tomorrow and historical Usage read-only, preserving the no-fixed-expiry caveat.
- No Save, archive, send or business mutation performed. Viewport restored.

## Permissions
Existing route guards require production.view for product lists, production.create for product details/actions; UOM list uom_conversions.read and detail/update uom_conversions.update. No grants or guards changed. Other roles were not tested (user paused role acceptance).

## Validation boundaries
Local verification: 16 tests passed across product-usage-copy, product-form-payload, product-availability-label, annotation-behavior and table-anchor-contract. Focused ESLint passed. This copy-only change did not require a full build. Preview still has the old helper until a later authorized code release. No Production publication or full-system acceptance claimed.

## Preview push and intermediate-width audit
48a1005 pushed successfully to GitHub codex/followup-integration-20261104 (remote advanced from 8f0e03b). Repeated 16 tests and focused ESLint passed. No Production deployment. At final browser check the branch URL still rendered the old Usage helper; Ready/new revision is not confirmed, and the following checks cannot be attributed to 48a1005. No denied Vercel query retried.

Existing Owner session, 820x1000 and 1180x1000:
- Publika ODR a7c958aa-caef-4987-914f-293ac3760217: header/action rail readable; inspected daily quantities aligned and decimals readable, unsold reasons shown without empty comment boxes. Large blank right-hand area persists below the finite action rail; recorded usability limitation, not a new data defect. Carryover save/post not exercised.
- PO-000352 c72c1679-0eed-48c4-b5b9-a03de736ae35: summary, workflow, KG quantity/unit price and action rail readable at both widths; no visible clipping in inspected cards. No Send/Cancel/Upload invoked.
- Inventory: first read failed with reference 4067187317. One explicit Retry recovered. At both widths purchase activity codes/names and counts 8/6/6/5/4 were readable; Consumption empty and historical-unit caveat visible. Failure root cause not established; recovery is not proof the intermittent issue is fixed.
- Products/UOM deliberate double-tap remains difficult to discover: prior list screenshots showed Open labels but no visible double-tap hint. No unapproved global gesture change made.
Viewport restored; no business writes. Audit covers inspected sections, not full workflow or other roles.

## Inventory incident investigation and discoverability proposal
Observed reference 4067187317 identifies the rendered Next error, not an HTTP or SQL code. Available browser error/warn log read returned an empty list after navigation; no retained network status/body or server stack is available. Existing Vercel access refusal was not retried or bypassed. Exact live root cause remains unproven.

Code path: InventoryPage starts dashboard RPC, daily-movement RPC and permission map concurrently under inventoryReadDeadline (12 seconds). Any rejection or aggregate timeout reaches RecordDetailError; Retry performs a fresh page reload. boundedInventoryInsight retries returned transient read errors at 350/900ms (maximum three attempts); thrown errors propagate. Summary errors may enter the bounded fallback. This allows several distinct causes of the same visible error; a successful second read does not select one. The 12-second deadline does not cancel outstanding operations, which is a performance risk to investigate, not proof of this incident. No speculative changes to deadlines, retries, permissions or SQL made.

Local validation: 10 tests passed (inventory-read-deadline, inventory-read-retry-contract, inventory-dashboard-contract), including stalled reads, exact thrown errors, late rejection handling and fail-closed behavior. These prove existing local contracts only. To resolve the incident, an authorized runtime-log export matching the Preview request/digest is needed, including which of the three read stages failed, duration and sanitized SQL/HTTP error code; no credentials or response records needed.

Discoverability proposal (not implemented): one short visible hint above the compact Products/UOM list, “Double-tap a row to open”, with desktop wording “Double-click a row to open” only where appropriate. Preserve explicit controls and existing route permissions. Existing DataGridHint intentionally returns null, so changing it globally would affect unrelated pages; use a scoped opt-in or the list's existing header, after checking that suppression's original rationale. Validate 390/820/1180, keyboard focus and read-only-role visibility. No full-row single-tap change proposed.

## Scoped hint implementation
Approved follow-up implements OperationalList.showOpenHint, default false. Products enables it only for nonempty lists with production.create; UOM only with uom_conversions.update. A visible paragraph explains double-tap/double-click and keyboard Enter; aria-describedby links the list to that paragraph. Hint uses the same md/xl/2xl responsive visibility as its list, so full desktop tables do not gain mobile instructions. Existing DataGridHint stays suppressed; no gesture, row href, destination guard, payload or business-data change. UOM adds one existing permission-map read parallel with the conversion read.

Validation: 14 tests passed (actual shared-component SSR, all three breakpoint class contracts, default no-hint caller, caller permission/nonempty gates, existing pointer/keyboard regressions); focused ESLint and TypeScript passed. Responsive contracts cover compact phone/tablet and hidden full desktop behavior, not new authenticated screenshots or physical touch acceptance. New code remains local; previously live double-tap success does not prove this new hint's visual acceptance. Inventory incident remains unresolved and its deadline unchanged.

## 320x844 Owner Preview read-only audit
Same branch URL and existing authorized session; no login redirect. Exact served deployment SHA not verified (3302c52 pushed, Ready unknown).
- ODR /outlet-daily-records/a7c958aa-caef-4987-914f-293ac3760217: Publika 02/11/2026 identity wraps; sales and inspected daily-food decimal quantities readable. Carryover Qty Sent / Received / Wastage / Tomorrow four columns fit; blank Wastage red outlines distinct from zero; historical Usage 8/0 read-only visible. No Save or mutation.
- PO /purchase-orders/c72c1679-0eed-48c4-b5b9-a03de736ae35: PO-000352 summary, item card quantities KG, per-KG prices, totals and bottom Send to Supplier / Files & activity readable. Linked Documents PR card truncates identifier to PR/NOV26... at 320px: discoverability issue recorded; full PR/NOV26/007 appears in order summary. No Send/Upload/Cancel.
- /inventory: loaded successfully on this attempt without Retry. Counters and actions readable, purchase activity names wrap and 8/6/6/5/4 record counts readable; Consumption empty state visible. Chart fits its panel but SVG axis/date labels are extremely small at320px, a readability issue; exact activity table remains available. This successful read does not close the earlier intermittent loading incident.
All screenshots were inspected in the tool. Floating black browser annotation control can overlay page edges; not classified as an app defect. Viewport reset. No business state changed, no code fix or deployment in this audit.

## 320px follow-up fixes
ProcurementChain now uses one card column below390px and wraps document identifiers below640px; existing desktop truncation, two/four-column breakpoints and hrefs remain. InventoryDailyMovementChart renders phone scale range and endpoint dates in unscaled11px HTML below640px; original SVG labels remain at640px and above. Bars, domain, hit testing, keyboard/pointer handlers, totals, empty state and drill-through unchanged.

12 tests passed across narrow-procurement-inventory, procurement-chain-contract and inventory-dashboard-contract; focused ESLint and TypeScript passed. Actual changed components were SSR-rendered with synthetic PR/PO and movement fixtures plus generated repository Tailwind CSS at localhost8768. CUA screenshots inspected at320x844 and1440x1000: full PR/NOV26/007, readable phone0–152 scale and endpoint dates, original desktop labels/layout retained. Fixture stubs status badge/selection hook/formatters and omits full theme; this verifies geometry, not live interactive or full-page acceptance. Screenshot images are recorded in tool output; reproducible fixture generation: OMS_NARROW_FIXTURE=/tmp/oms-narrow-visual/index.html node --test tests/narrow-procurement-inventory.test.js. Local server stopped and viewport reset. No business writes or deployment.

## Second 320px audit and search correction
2026-11-05, existing Preview Owner session, no business writes. Stock Count list initially observed430x932 because viewport changed externally; do not classify that screenshot as320px. Override reapplied and DOM innerWidth320/innerHeight844 confirmed for subsequent detail and pages.
- /stock-counts/3f4c0875-39e0-4b23-bf72-ecaf1bdcb96b SC/NOV26/006: two KG weight-review records and inventory-unchanged warning readable; search and posted lines (10KG,0PACK,6.2KG) readable. No evidence update or void.
- /purchase-requests/b98893c1-05d6-470f-ba8d-30ec0c33f8eb PR/NOV26/007: identity, summary, three quantities and KG prices, Open PO / Files actions readable. Linked PR still truncated in live branch; b5ecaa4 serving/Ready unconfirmed, no duplicate code fix.
- /attendance/confirmations: selected horizontal tab and empty confirmation message readable; no confirmation submitted.
- /attendance/review: no outlet selected, so actual employee/punch rows not verified. Import control untouched. Search field visibly squeezed to approximately a character by labelled Filter, Search and result controls.

Confirmed layout correction in owning UnifiedListHeader.module.css: below390px search primary occupies the full first row; filter/search/count move to second row. Existing390px+geometry,44pxcontrols, form fields, queries, permissions and gestures unchanged. Five CSS/compact-control regression tests and focused lint passed. Actual new rendering still requires Preview acceptance; initial screenshots remain before evidence. No deployment performed.
