# Quantity aggregation static audit and scoped remediation

Base: 4dd4ccede16fd55e93822db568ef52f04732e688. No deployment or production data writes.

## Confirmed paths fixed

1. `/goods-receivings/new`: `getEligiblePurchaseOrders` (`src/server/queries/goods-receivings.ts:270,300`) sums pending PO quantities across items. `GoodsReceivingForm` displayed this in the actual PO SelectControl. The option now shows pending line count. Individual receiving line quantities/UOMs and conversion/action logic are unchanged.
2. Posted Stock Count reversal dialog: migration 210's `stock_count_void_preview` sums reversed inward/outward movements across items; query `getStockCountVoidPreview` passes these values to `StockCountVoidDialog`, which displayed unitless Qty in/out. Dialog now shows adjustment line count and directs users to original line quantities. RPC payload/fingerprint/idempotency/reversal authorization were not changed.
3. `/outlet-daily-records/delivery-orders`: `loadDeliveryOrders` loads stored line snapshots containing `unit`. Summary previously summed all confirmed quantities into one number. Now separates normalized units, excludes voids, and fails closed when any confirmed line lacks a unit or finite quantity. Confirmed zero retains unit. Empty/absent/unconfirmed cases stay distinct. No conversion between unlike units is invented.

## Confirmed unresolved issue (high priority)

Daily list/detail and Insights aggregate quantities without consulting product units:
- `src/server/queries/outlet-daily-records.ts:121-169` `totals` sums sent, received, leftover and wastage over different product IDs and derives wastage percentage.
- Callers at 354 and 517 feed list and detail. List page 102/112 and detail page 142 display unitless totals.
- `addTrendLine` at 201-209 and calls at 747/755/760 combine summary/outlet/day quantities. Product-specific grouping at 751/758 is a different scope and should not be treated as automatically defective.
- Products accept arbitrary nonempty `selling_unit` (`src/lib/validations/product.ts:12`, `src/server/actions/products.ts:43`); the real Daily form displays `product.selling_unit` per line. This is a supported mixed-unit input path, not an assumption that every product is PCS.
- `outlet_daily_record_lines` has product_id but no immutable unit snapshot. Current catalogue units cannot prove historical units. A wider correction must preserve received/sent provenance, financial calculations, historical interpretation and list/Insights contracts.
- Read-only execution of the actual private `totals` function using synthetic two-product fixtures (2 KG received with 1 KG wastage; 3 LITRE received with zero wastage) returns received=5 and wastage%=20. This proves the algorithm's dimensional failure for supported mixed-unit data; it does not assert that those fixtures exist in Production.
- SQL migration 332 also aggregates Daily sent/received. Its installed state was not queried. Wastage-cost query also returns cross-product `wastage_qty`; monetary totals themselves are a separate dimension.

## Exclusions and limits

Search was repository-wide over `src` and `supabase/migrations`, using reduce/SUM/quantity-increment candidates. Candidate snapshot: 343 matched lines in 119 files. This is a static search inventory, not 119 fully verified modules or proof that every arithmetic idiom was found.

Reviewed candidate classes include inventory, procurement/returns/receiving, production planning/jobs, Daily/packaging/trends, asset counts, attendance and exports. Monetary sums, counts, time intervals, geometry/weights, per-item inventory balances and per-product planning demand are not mixed-unit quantity defects. Packaging trends filter selected product before aggregation. Standard production-job creation inserts one output row from one recipe; hypothetical manually-created multi-output records were not verified as a real supported path.

GRN list/summary UI, Stock Card, Movement Ledger and inventory activity had already received scoped guards/counters at this base; do not count old reducers alone as new visible defects. GRN query payloads still contain mixed quantity aggregates that current audited list UI does not render. Historical SQL is not proof of currently installed RPC behavior.

No authenticated after-fix screenshots, live mixed-unit Daily records, live RPC schema or full write flows were checked in this static pass. No page/viewport acceptance increment is claimed. Prior Owner session expired; this task did not retry login or request another role.

## Validation

- Actual TSX server rendering with synthetic loaders: delivery mixed units/normalized same units, confirmed zero, missing UOM/nonfinite/null quantities, no orders/unconfirmed/empty lines; real receiving form PO labels; real reversal dialog summary and fingerprint/idempotency/disabled confirmation gate. No actions invoked.
- `node --test tests/quantity-runtime-summary-render.test.js tests/final-ux-convergence-contract.test.js tests/progressive-receiving-uom-contract.test.js tests/procurement-stock-uom-context.test.js`: 15/15 pass.
- Focused ESLint on all three changed TSX files: pass.
- `npx tsc --noEmit`: pass.

Evidence outside patch: `../quantity-static-audit-20261105/daily-repro.cjs`, `daily-repro.json`; original candidate snapshot `../quantity-candidates-4dd4cce.txt`.
