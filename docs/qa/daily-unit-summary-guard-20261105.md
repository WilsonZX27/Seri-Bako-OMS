# Daily quantity basis guard — 2026-11-05

Requirement: prevent unlike quantities/rates in Daily list, detail and Insights; no production SQL or historical edits. Base 80071c9.

## Implementation

- New dailyQuantityBasis accepts only immutable line quantity_unit_snapshot with explicit quantity_unit_verified and food_daily/food_carryover population. Empty, missing, mixed units and beverage/packaging populations fail closed. Current product unit is never a historical fallback.
- Existing schema has no snapshots: actual records therefore return quantity_totals_available=false. Optional properties are a reader contract only, not a claim of installed columns or trusted data. A future verified snapshot reader/migration requires separate review.
- List desktop/mobile and shared value displays show Unavailable; completed-day quantity summary also unavailable because its old RPC has no verified unit basis. Record counts and pending/completion workflow remain unchanged.
- Detail replaces only combined summary quantities/rate with an explanation. Original line entry, historical Usage, sales, save permissions and void reason remain.
- Insights suppresses unsafe totals, rates, rankings and charts. Completion matrix, coverage, filters and costed RM amount remain. Comparisons additionally require matching verified units in both periods.

## Compatibility and limits

Existing numeric query/RPC properties remain for compatibility; this is display containment, not a declaration that legacy reducers or their other consumers are mathematically repaired. Planning, exports, dashboard consumers and installed SQL require a follow-up contract migration/audit. No historical backfill from current catalogue is safe. No zero replaces unknown. No Production change or permission expansion.

For ordinary food records too, summaries now become unavailable until a reliable historical unit source exists. This intentional loss of unsupported summary display is the material product impact. Line values remain available. A future per-unit report must carry unit labels and compare only the same scoped population; the present change does not deliver that future report.

## Verification

16 targeted tests pass: missing/current-only/unverified/empty snapshots; normalized same-unit, mixed-unit and mixed-population guards; real Insights page orchestration/render with verified and unverified fixtures; month and previous-period query ranges; existing seasonal/zero/whitespace provenance behavior. Source checks cover list/detail hiding and retained sales/completion. No authenticated updated Preview visual acceptance.

Full Next production build and TypeScript pass. Focused runtime lint and whitespace check pass. Existing fonteditor dynamic dependency and production-sheet unused-index warnings remain. No live database queries, writes, SQL installation or Production deployment.
