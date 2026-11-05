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
