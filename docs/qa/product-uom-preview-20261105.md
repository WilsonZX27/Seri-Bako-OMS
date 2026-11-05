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
