# Seri Bako OMS Metric Dictionary

**Current application:** `v8.36.80`
**Repository migration ceiling:** `149`
**Last reviewed:** 2026-08-15

This is the authority for user-visible KPI and chart meaning. It documents presentation contracts; database migrations, RLS, and server queries remain the calculation and permission authority. A render timestamp is never a data-freshness timestamp.

## Shared rules

- Currency is MYR under the current schema unless the report explicitly states otherwise.
- Zero means the authoritative query returned a valid zero. Query failure must render unavailable, never zero.
- Missing, incomplete, unavailable, and not applicable remain distinct states.
- Charts keep a numeric table/list alternative and use direct labels where practical.
- Exact chart data uses a complete phone list and a wide table where columns fit; a disclosure must not require phone-width horizontal table navigation.
- Interactive chart and ranking rows keep at least a 44px touch target below wide desktop; exact inspection cannot depend on precision tapping.
- Chart preview actions and compact signal selectors follow the same target rule; semantic danger and warning colors identify documented states rather than creating new severity meaning.
- A chart filter/drill-through must use the same documented dimensions as its detail authority.
- Request-time reads show the state returned by the source query. Do not claim last-synced or real-time freshness without a source-owned timestamp.

## Dashboard attention summary

| Field | Contract |
|---|---|
| Decision | How many currently actionable exceptions require attention? |
| Formula | Pending approvals + low-stock items + stock counts due + draft/submitted wastage + overdue payables for roles allowed to see payables. Receiving is context, not part of this total. |
| Grain | Current permitted workspace and role scope. |
| Source | `getDashboardSummary`; bounded Dashboard snapshot/read models plus an exact RLS-scoped pending-action count and payables attention queries. Only the five oldest pending-action records are retained for the visible work list; that display bound never limits the total. |
| Permission | Role/permission composition already enforced by each source. Finance exposure is Owner/Finance only. |
| Freshness | Request-time result; no source-owned refresh timestamp is currently exposed. |
| Unavailable | If any contributing source is unavailable, total is `null` and UI shows Partial data plus missing sources. |
| Drill-through | Low Stock, Stock Counts, Wastage, pending action, or AP Aging routes. |

## Dashboard role signal comparison

| Field | Contract |
|---|---|
| Decision | Within this role's permitted scope, which current work or exception category is most concentrated? |
| Formula | Role-specific counts already returned by the bounded Dashboard snapshot and AP attention summary. Finance compares invoice counts by due-date state; Purchasing compares sourcing, receiving-follow-up, and production-exception counts; Kitchen compares receiving, production, shortage, and low-stock counts. Owner and Manager use the authoritative Operational Pulse instead of a duplicate comparison. |
| Grain | Current permitted workspace and role scope; one bar per documented category. |
| Exclusions | No currency, raw quantity, percentage, forecast, or length of a truncated recent-record collection is used as bar magnitude. Outlet Staff receives no comparison chart. |
| Source | Existing `getDashboardSummary` fields only; no additional Dashboard query or raw-ledger scan. |
| Freshness | Request-time snapshot. No source-owned refresh timestamp is currently exposed. |
| Unavailable | A failed contributing source renders its category Unavailable and zero bar length; it is not reported as zero. |
| Interaction | Hover, keyboard focus, and touch select the same exact count and definition. The preview's Open action drills to the corresponding authority route. |

## Outlet Daily wastage trend

| Field | Contract |
|---|---|
| Decision | Is recorded wastage changing across recent completed outlet days? |
| Formula | Sum of `wastage_qty`; preview also shows received quantity and wastage rate according to the Outlet Daily report formula. |
| Grain | Date within the selected/implemented 30-day period. |
| Source | Completed/reviewed Outlet Daily Records and lines through the bounded Outlet Daily query. |
| Permission | Existing Outlet Daily record view scope. |
| Freshness | Request-time; record dates are displayed for every point. |
| Incomplete | Non-completed records are excluded from reliable totals and coverage messaging remains visible. |
| Accessible alternative | Screen-reader data table/list containing every plotted point. |

## Outlet Daily completion matrix

| Field | Contract |
|---|---|
| Decision | Which visible outlet-days are missing, in progress, completed, reviewed, or void over the last seven calendar dates? |
| Formula | One expected cell per active, permitted outlet × calendar date. Evening Completed and Reviewed count as complete; Draft and Morning Recorded count as in progress; no record is Missing; Void remains separate. |
| Grain | Outlet × calendar date for exactly seven dates through the Asia/Kuala_Lumpur request date. |
| Source | Bounded `outlet_daily_records` header query only; no product-line read and no inferred deadline. |
| Permission | Existing `outlet_daily_record.view`, Outlet Daily RLS, and permitted outlet options. |
| Freshness | Request-time record status. Dates and selected outlet are shown in the preview. |
| Zero/unavailable | A missing record is Missing, never zero or complete. Query failure must remain unavailable through the page error boundary. |
| Interaction/accessibility | Direct status letters plus legend, semantic table, hover/touch/focus preview, and direct link for existing records. Lateness is not claimed. |

## Demand Trend Lite

| Metric | Formula and population | Filters | Drill-through/detail |
|---|---|---|---|
| Estimated movement | Received − leftover − wastage, using completed/reviewed Outlet Daily product lines only. It is not POS sales. | Period, outlet, product, reliable status. | Daily detail and existing product/outlet tables. |
| Wastage | Sum of recorded wastage quantity for the same reliable population. | Same as above. | Top Wastage full detail. |
| Wastage % | Report query's wastage ratio; never inferred from incomplete rows in the UI. | Same as above. | Preview and detail table. |
| Coverage | Completed outlet-days ÷ expected outlet-days; incomplete and missing counts remain explicit. | Period/outlet/status. | Coverage console and warning state. |

Daily trend uses request-time report data. The line preview exposes date, movement, received, leftover, wastage, rate, and sample warning. Ranked charts show the first six visually while the complete top-ten detail remains available.

## Inventory daily movement activity

| Field | Contract |
|---|---|
| Decision | Are posted inbound and outbound inventory activities changing by day? |
| Formula | Sum of `movement_count` for `inventory_daily_summary` rows with positive `quantity_in` or positive `quantity_out`. This counts posted ledger entries; quantities are not summed across unlike item UOMs. |
| Grain | Calendar date × direction across branches visible through inventory RLS. Zero-activity dates remain present. |
| Period | Last 7 calendar dates, last 30 calendar dates, or current month through the Asia/Kuala_Lumpur report date. |
| Source | `get_inventory_daily_movement_summary`; maximum 31 rows from `inventory_daily_summary`, never the raw ledger. |
| Permission | Authenticated execution plus the summary table's existing inventory/stock-balance/low-stock RLS and branch scope. |
| Freshness | Request-time read of trigger-maintained posted movement summary. The displayed date is the data grain, not a browser refresh timestamp. |
| Zero/unavailable | A valid quiet date is zero. RPC/read failure shows unavailable and keeps Stock Balance and Movement Ledger reachable. |
| Interaction/accessibility | Direct direction labels, hover/touch/arrow-key preview, equivalent same-date ledger links, and an expandable complete numeric table. |

## Stock Count variance insight

| Field | Contract |
|---|---|
| Decision | On which days, items, and branches do posted physical counts repeatedly exceed their own saved tolerance? |
| Population | Posted, non-deleted Stock Counts in the last 30 Asia/Kuala_Lumpur calendar dates; only lines where `abs(variance_percent) > stock_counts.tolerance_percent`. |
| Grain | Daily trend: calendar date. Rankings: item or branch. Ranking value is the count of above-tolerance line occurrences. |
| Direction | Negative `variance_qty` is shortage; positive is overage. Zero cannot be above tolerance. |
| Unit safety | Quantities are never summed across items or UOMs. Item preview shows only the latest signed variance quantity with its source UOM, signed percentage, and source count. |
| Source | `get_stock_count_variance_insight`; security-invoker, maximum 30 daily + 8 item + 8 branch rows. |
| Permission | Existing Stock Count RLS and branch scope; optional branch filter is validated before RPC execution. |
| Freshness | Request-time view of immutable posted counts through the current Kuala Lumpur report date. |
| Zero/unavailable | Thirty valid quiet dates show zero. RPC/read failure shows Unavailable and never fabricates a zero insight. |
| Interaction/accessibility | Compact Daily Trend / Repeat Items / Branches tabs; hover/touch/keyboard previews; direct ranking drill-through; expandable complete daily table with equivalent posted-count date filters. |

## AP Aging distribution

| Field | Contract |
|---|---|
| Decision | In which aging bucket is open payable exposure concentrated? |
| Formula | Positive outstanding = invoice total − recorded payments, never below zero. Bucket boundaries are Not Due, Due Today, 1–30, 31–60, 61–90, 90+, and Missing Due Date. |
| Grain | Aging bucket as of `report_date` in the report/company timezone fallback. |
| Source | `get_ap_aging_report` via `getApAgingReport`. |
| Permission | `supplier_invoice.view`, company scoped by the database function. |
| Freshness | Explicit `report_date`; this is an as-of report, not a browser clock. |
| Zero/unavailable | Valid empty bucket shows RM0 and zero invoices. Query failure uses the route error boundary. |
| Interaction/drill-through | Hover, touch, click, and keyboard focus select the same preview without navigation. Its explicit Open action preserves current filters, replaces bucket, resets page, and opens the same invoice detail authority. |

## Cash Flow payable pressure

| Field | Contract |
|---|---|
| Decision | When will known open supplier payable pressure land? |
| Population | Approved Open and Partially Paid invoices with positive outstanding balance; Draft, Void, and Paid are excluded. |
| Windows | Overdue; Due Today; 1–7 days excluding today; 8–14 days; 15+ days through selected period end; Missing Due Date outside the forecast period. Windows are mutually exclusive in the chart. |
| Periods | 7 days, 14 days, 30 days, or current month. Non-applicable later windows are omitted. |
| Source | Complete AP Aging authority through `getCashFlowForecast`; no bank balance or cash-in data. |
| Permission | Same AP Aging/Supplier Invoice view boundary. |
| Freshness | Explicit `report_date` and `period_end`. |
| Interaction/drill-through | Due-window selection previews exact MYR and invoice count without navigation. Its explicit Open action applies the equivalent AP Aging overdue, bucket, or due-date range filter. |

## Procurement Variance

| Field | Contract |
|---|---|
| Decision | Which linked PO→GRN→Invoice lines need price, quantity, missing-document, or manual review? |
| Formula | Existing linked document lines only. Price warning: absolute difference over RM0.01 or 2%. Any quantity difference is a warning where no tolerance exists. |
| Grain | One linked PO/GRN comparison line, with at most one unambiguous invoice line. |
| Source | `buildProcurementVariance` / `getProcurementVariance`. Unlinked records are never guessed. |
| Permission | `reports.view`. |
| Freshness | Request-time read of current permitted source records. |
| Missing/unavailable | Missing GRN/invoice are explicit statuses; unavailable supplier reference stays unavailable. Route query failure shows unavailable. |
| Detail | Desktop technical table; phone three-stage PO/GRN/Invoice comparison with document, quantity, and price labels. |
| Visual summaries | Status distribution counts the current filtered lines by existing comparison status. Largest price variances ranks up to six linked rows by absolute RM difference while retaining the signed RM amount and percentage. |
| Interaction/accessibility | Direct labels remain visible. Hover, touch, and keyboard focus expose source item, supplier, PO, quantity path, percentage, and caution. The existing filtered table/list is the complete data alternative. |

## Costing Readiness concentration

| Field | Contract |
|---|---|
| Decision | Which master-data module concentrates the gaps blocking trustworthy recipe or product costing? |
| Population | Existing read-only Costing Readiness issues from active Items, Supplier items, Recipes/lines, and Products. |
| Grain | Module. Value is issue count; critical, warning, and information counts remain separate preview details. |
| Filters | Module comparison follows the selected severity but ignores the selected module so every module remains comparable. Global readiness and total severity counts remain unfiltered. |
| Source | `buildCostingReadiness` / `getCostingReadiness`; no additional database reads and no writes. |
| Permission | Existing `recipes.view` Costing Readiness boundary. |
| Freshness | Request-time master and recipe data; no historical trend or financial exposure is claimed. |
| Zero/unavailable | Zero issues renders zero filled bar width. Query failure remains an unavailable report, never an empty/ready state. |
| Interaction/drill-through | Hover, touch, click, and focus select the same preview without navigation. Open preserves severity and applies the module to the existing accessible issue table/list. |

## Product Margin

| Field | Contract |
|---|---|
| Decision | Which products have a reviewable estimated gross margin, and which data gap blocks it? |
| Formula | Selling price − estimated product cost. Margin % is margin ÷ selling price. Only High-confidence recipe costs qualify; missing cost is never zero. |
| Grain | Active product and its active recipe/packaging price relationship. |
| Source | `getProductMargin` / `buildProductMargin`. |
| Permission | Existing protected Product Margin report boundary. |
| Freshness | Request-time master/recipe data; no historical margin trend is claimed. |
| Missing/unavailable | Missing price, recipe, or trustworthy cost is explicit; margin remains unavailable. |
| Drill-through | Product pricing or Recipe Costing according to the blocking status. |

## Adding a metric

Before shipping a new KPI or chart, add its decision, formula, grain, population, filters, permission, source, freshness, zero/unavailable/incomplete behavior, accessible alternative, and drill-through here. Forecasts, targets, supplier scores, days-of-stock, and margin trends require an approved data definition before implementation.
