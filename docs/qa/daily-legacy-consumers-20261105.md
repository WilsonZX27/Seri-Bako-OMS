# Daily legacy quantity consumer inventory — 2026-11-05

Runtime audited: 9e31e2f, pushed original Preview branch. Ready/served SHA not verified. No Production or database changes. Repository references checked with rg over src, including function imports and direct Daily line reads. This is a source call-site inventory, not live usage telemetry or proof that dynamic/external consumers do not exist.

| Source / consumer | Current exposure | Safe next treatment |
| --- | --- | --- |
| getOutletDailyRecords -> Daily list | Protected desktop/mobile row displays and completed-day sidebar | Retain pending/status/coverage separately from unit basis; migrate numeric transport only with versioned readers |
| getOutletDailyRecord -> detail | Combined summary protected; original line entry and sales preserved | Historical per-line unit label also needs provenance; do not infer old unit from product catalogue |
| getOutletDailyDemandTrend -> Insights | Protected metrics, charts, rankings and comparison | Keep completion and costed RM report independent; future summaries per verified unit with labelled population |
| dashboard.ts:388,516 -> wastageTrend | UNPROTECTED mapping of legacy daily rate | Return null/unavailable when quantity_totals_available is false; retain coverage and other dashboard data, never return [] as a fake no-activity state |
| reports/demand-trends/page.tsx | UNPROTECTED metric strip, charts, outlet/product rankings and detail tables | Gate numeric block on basis; keep date filters/coverage; do not rank unlike product quantities even after per-product units become known |
| getProductionDemandVariance -> production/variance | UNPROTECTED per-product/outlet totals and derived over/under-supply signals | Add per-group verified historical unit basis; unavailable groups must be review_manual, not balanced/0%; keep coverage and raw history |
| getProductionPlanning / buildProductionPlanning | Legacy suggested_qty calculations; no external runtime import of getProductionPlanning found | Deprecate dormant adapter or make unavailable groups return suggested_qty=null/manual; preserve type compatibility during migration |
| getOperationsControlCenterSummary | Internal composition of old list/trend/planning/variance; no external runtime caller found | Mark quantity-derived panels unavailable; retain status counts; do not assume unused forever |
| api/export/outlet-daily-records | Direct line export, NOT cross-product total; attaches current selling_unit to historical quantity, uses latest recipe cost snapshot | Preserve numeric cells; add historical_unit_state and separate current_catalog_unit. Avoid a silently relabelled selling_unit column. Review cost-basis semantics independently; no monetary rewrite |
| api/export/outlet-daily-form-template -> PDF/CSV | Historical identity/category from historical lines with current product fields; form template rather than filled quantity aggregate | Label current catalogue unit as such; separate historical unit unavailable. Preserve sales/date/layout |
| server/production-planning/data.ts generation | Direct per-product/outlet history series; not a cross-product sum, but historical unit stability unproved | Require per-series unit evidence before automatic forecast; explicit manual review rather than converting old quantities. Preserve saved plan/order and audit versions |
| server/actions/production-planning.ts history / estimatePlanningMinimums | Direct per-product history and lower-quartile estimates; message assumes pieces | Show raw history without historic-unit claim; withhold auto-minimum when basis unknown; replace hardcoded piece assumption only with proven unit |
| getOutletDailyHistoricalContext -> list/Insights/OutstandingDailyRecords | SQL get_outlet_daily_completed_summary quantity fields (list display now guarded); counts/gaps used elsewhere | Versioned SQL may add availability/per-unit groups; retain count/status semantics and old columns during rollout. No SQL installation authorised here |
| getOutletDailyCompletionMatrix | Counts/status only | No quantity-unit guard needed; do not suppress useful completion data |

## Rollout design

1. Immediate follow-up: apply the same read-only availability guard to Dashboard, Demand Trends and Variance; add tests that unknown means unavailable/manual, never zero/balanced. This needs code only, no grant or business write.
2. Define a versioned quantity contract: verified snapshot unit, population, interval/branch filters, provenance state, and per-unit quantities. Ratios require identical numerator/denominator population and unit; period comparisons require the same unit. No quantity-based ranking across different units.
3. New writes may capture immutable units only after separately reviewed schema/save-chain change. Historical values remain unchanged; backfill only from independently verifiable evidence, never current selling_unit. Keep unsupported rows explicit.
4. Migrate exports and forecast consumers with explicit unavailable states, maintaining existing CSV columns through a documented transition. New advice must not mutate already saved plans.
5. Separately inspect deployed RPC definitions, ACL/RLS and callers before preparing any SQL. Preserve legacy signatures for old clients; test new/old readers with missing snapshot columns. Install only after approval and compatible Preview readiness.

## Remaining risks

9e31e2f protects the named Daily pages only. It is NOT whole-system remediation. Dashboard/report/variance leakage and historical unit attribution remain open. Planning is per product but unit changes over time still need evidence. Recipe/financial cost correctness is outside this quantity guard and must not be inferred from it.
