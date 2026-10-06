# Production Planning closure — 2026-10-05

Active user-requested goal: improve the complete planning flow, source-backed calculations and external franchise demand. Application release candidate v9.2.89; authenticated visual acceptance pending a restored browser session. No formal QA orders, approvals, dispatches or stock postings.

## Root cause and readiness

ALMA has no batch rules, both kitchens have no confirmed outlet minimums, and configured KL products use manual demand. Manual-only generation intentionally skips historical reads; the previous modal presented its empty forecast evidence as an empty table. Current history now loads read-only on opening the product modal. This does not regenerate or change a saved plan. Completed record lines use actual receipt/provided and wastage/provided flags; missing values remain unknown, distinct from explicit zero. Current rows may be excluded from forecasting and are labelled accordingly. Same-day forecast snapshot remains the source used for the saved suggestion; live history is reference only.

Independent linked read `/tmp/oms-planning-final-read.json`: Queensbay and Gurney each have48 reviewed record-days in the eight-week window; October2–5 Queensbay and October1–4 Gurney remain drafts. History has not disappeared. Per-product eligible inputs still require completeness checking; reviewed counts alone do not prove eligible demand.

Automatic tray quantity can be calculated immediately after per-kitchen yield and all approved destination quantities are entered. Automatic outlet demand requires confirmed same-day consumption, explicit minimum (zero permitted), and at least3 same weekdays in56 days, or5 comparable weekday/weekend days within14 days. Existing history may already qualify after correct configuration; no arbitrary eight-week waiting period. Multi-day products require opening/closing usable stock and actual movement/sales to infer demand; receipt-minus-leftover-minus-waste is not a defensible sales estimate without that provenance. Do not change same-day mode merely to unblock a number. Template orders are not minimum quantities.

## Franchise path

Migration334 applied, independent read verifies334 present,325 absent and zero invalid destination kinds. Franchise orders are branchless external demand, with customer/order reference, kitchen, delivery date and confirmed product quantities. They are summed per product with own-outlet approved allocations before rounding whole trays. Existing external delivery-order path has no own-outlet daily-record creation. Confirmed contractual quantities are never reduced by the retail forecast. Excel weekday/weekend templates are references, not actual dated confirmed orders. No BINTANG/B.jalil/Maluri retail branches were created.

Complete event rows are now selected for new snapshots; this also resolves an existing mismatch between the partial client event projection and SQL's full-row event comparison. Existing snapshots remain untouched; an affected draft must be recalculated before review. Released versions are preserved.

## Wastage policy proposed for owner acceptance

The current quantity-based retail metric is actual recorded wastage divided by received quantity over the same complete period and own-outlet cohort. Franchise confirmed production orders are separate; a dispatch is not proof of external customer's sell-through or wastage. Leftovers and rounding surplus are not automatically waste. Cross-day old-stock waste needs opening stock/cohort attribution before this received-denominator proxy is interpreted as a physical loss rate.

20% can be an initial operating threshold selected by the owner; it is not represented as an industry universal or a committed automatic cut. Compare the same outlets/products/day types and show completion coverage. Partial-coverage periods cannot establish progress solely from total quantities. Track wastage pieces/rate, recorded stockouts and sales or eligible same-day movement together. Keep the existing default10% maximum decrease and demand buffer; observed sell-outs protect reductions. Protect events and franchise quantities. Review comparable complete periods before subsequent reductions, and increase where demand and stockouts warrant it. This is a proposal; no automatic ordering or changed minimums were enabled.

## Validation

Strict TypeScript and lint pass. Full regression suite1415 passed (local-server teardown test required sandbox escalation). Isolated PostgreSQL planning suite104 checks passed, including external kind constraints; no hosted operational test posting. Additional history regression proves parent-company, allocation-outlet and product scoping, zero-vs-unknown preservation, and no write/invalidation.

Evidence paths: `/tmp/oms-planning-tests-final.log`, `/tmp/oms-planning-db.log`, `/tmp/oms-334-applied.json`, `/tmp/oms-planning-final-read.json`. Browser previously expired to idle-timeout; no claim of authenticated responsive acceptance for this release.

## Publishing blocker and build limitation (2026-10-06)

Source commit cec0be51 is local. Git push to the existing remote github.com/WilsonZX27/Seri-Bako-OMS was rejected by automatic approval review because destination ownership/privacy and specific payload authorization were not verified. One read-only verification attempt found GitHub CLI unavailable. No indirect push or deployment was attempted as a workaround. Explicit destination/payload publishing authorization requested once. Local build stops at the existing environment guard because NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are absent; no credentials guessed or security protections bypassed. Hosted build remains required after publication authorization. Formal frontend remains v9.2.88; database migration334 is applied and read back. Browser tab18 remains at idle-timeout, so authenticated QA remains outstanding.

## Additional closure evidence (2026-10-06)

`/tmp/oms-989-franchise-db.log`:104 isolated PostgreSQL checks pass. Explicit franchise test combines16 own-outlet pieces with32 confirmed external pieces into3 trays, submits and releases the plan, then confirms a32-piece branchless delivery order. The DO has event_id but no branch_id or daily_record_id, and own-outlet record count is unchanged. Test transaction rolls back; no hosted execution writes. The fixture snapshots use database JSON to preserve PostgreSQL date/microsecond formats rather than lossy JavaScript Date serialization.

Calculation audit verifies KL yields against original T-column formulas, including SC02's already-normalized N/R trays. Empty Nutmeg inputs now remain unfilled rather than claiming a confirmed zero. Individual BINTANG/B.jalil/Maluri totals are added. Penang special3107-0208 page is320 pieces /20 trays for its left steamed-cake section, separate from ordinary templates; year/date is unconfirmed. Source sheet/ranges are recorded in the report.

The preceding goal turn made concrete progress (implementation, migration334 and verified calculations); this continuation adds workflow verification and source-specific calculation evidence. Publication and authenticated visual acceptance remain genuinely incomplete until authorization/login changes. The existing explicit publication question is still pending; do not repeat or reinterpret silence as approval.
