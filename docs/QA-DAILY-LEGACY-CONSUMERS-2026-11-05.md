# Daily legacy consumer protection

Base: `1e3d2a81a046b34581cfe51342cb113e00659cb8` (current Preview branch source at start). This is isolated source work; no deployment, schema changes, production data changes or role/permission changes.

## Actual runtime paths and changes

- `getDashboardSummary` calls `getOutletDailyDemandTrend`, previously mapped legacy daily rates unconditionally. It now emits `wastageTrend: null` without verified quantity basis/unit. `DashboardWorkspace` distinguishes null/unavailable from a verified empty series, avoiding a false no-record claim.
- `/reports/demand-trends` previously rendered the old numeric summary, line chart, rankings, outlet/day comparisons in both desktop/mobile tables. These are now available only with verified historical basis and one selected product. Filters, completion counts, confidence and coverage remain visible. Available quantities name the proven unit. All-product quantity rankings are withheld even if aggregate units appear homogeneous.
- `buildDemandTrend` now computes basis independently for each product/outlet's actual contributing lines, using existing `dailyQuantityBasis` and grouped line arrays (no per-row rescan of the entire history). No fallback to `product.selling_unit` is used.
- `buildProductionDemandVariance` sends unverified groups or zero received denominator to `review_manual`; derived signal-count summaries are null if any contributing group lacks valid basis. The legacy `low_confidence` transport field now counts manual-review rows (page label: Manual review).
- `/production/variance` shows per-group quantities with verified units and rates only with a valid received denominator; otherwise Unavailable in desktop/mobile. Unknown groups cannot render Balanced. Distribution chart and three quantity-derived headline counts are withheld without whole-report verified basis; filters, product/outlet identity and coverage stay available.

## Validation

24/24 tests pass: new `daily-legacy-consumers-availability.test.js` (8 actual source/render tests), existing daily-quantity basis, demand trend, production variance, and daily record-count suites. Fixtures cover missing historical snapshots despite current KG/LITRE catalogue units; verified per-group units under a mixed report; zero denominator; desktop/mobile unknown-state suppression; selected-product display; Dashboard null projection and unavailable copy. These tests never invoke actions or write data.

Focused ESLint (all 5 edited TS/TSX files) and full `npx tsc --noEmit`: pass. React best-practices review: no new client state/effects, network calls or request waterfalls; existing auth/error handling stays intact.

## Limits / remaining scope

No authenticated Preview screenshots or version-matched live after verification. Existing DB rows have no verified immutable unit snapshots, so unavailable/manual states are expected; this patch does not assert that a current catalogue unit applies historically. Per-group future fixtures demonstrate the contract, not a deployed schema capability. Current query numeric transport remains for compatibility; consumers outside these three paths (dormant planning adapter, exports, forecasting and future schema/save-chain work) still require the inventory in `docs/qa/daily-legacy-consumers-20261105.md`. No page/viewport acceptance increment claimed.

## Integration verification

Integrated after `8e211c0`, retaining CSV provenance and Planning historical-unit notices. Combined query, consumer-render, export and Planning suites: 53/53 passed (`/tmp/oms-integrated-unit-tests.log`). Build log reached the complete route summary, including TypeScript validation (`/tmp/oms-integrated-unit-build.log`); the execution transport disconnected before its exit status could be collected. No Preview push, Production deployment, database install or business-data mutation was performed in this integration pass.
