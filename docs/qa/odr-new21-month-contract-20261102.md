# New21 #12 effective month range — final contract check

2026-11-02. Independent ODR tree/base57fb6834 plus frozen94fe571a ODR UI patch. No production code changes. Original annotation URL: `history_start=2026-10-04&history_date=2026-11-02&period=7&compare=previous&branch=all&report=trend`.

## Finding

`period=7` is a legacy/default preset, **not an independent seven-day filter in Insights**. DateRangePicker commits hidden `history_start`/`history_date` while keeping hidden `period=7`; the visible trigger shows the two committed dates. `insightRange(period,end,customStart)` gives explicit start precedence. Existing browser evidence in `/tmp/oms-odr21-delivery/interaction.log` verified cancel retains dates and Last30Days commits October4–November2. No need to alter shared date semantics.

- Page derives effective range from explicit bounds and sends exactly those bounds to current query; prior query receives adjacent equal-length September4–October3.
- Actual `getOutletDailyDemandTrend` issues `.gte(record_date,start).lte(record_date,end)`, then loads lines by the returned IDs. Its initial fallback `trendDateRange(7,end)` does not become the SQL lower bound: explicit start replaces it before query execution.
- Actual aggregator uses those fetched records/lines for summary, coverage, product/outlet rows and daily points. The chart receives `trend.daily`; the metrics receive the same trend object and previous-query result. Chart rate and both daily list/table iterate the same points. Header says recorded-day count, not period length; sparse months may legitimately have fewer recorded days.
- Report tabs preserve both explicit dates. Visible date picker uses those same effective bounds.
- Distinct right-console content is explicitly named **Period end wastage value** and calls cost summary for the end date only. Outstanding daily records is an independent historical backlog. Neither is the current/prior period volume/rate summary; neither was silently relabeled to claim a month total.

## Precise executable regression

`tests/odr-month-effective-range.test.js` executes actual page orchestration plus AST-extracted actual query functions, actual paginated-reader and aggregator; the Supabase transport, options and permission boundary are synthetic. It is not a live database/RLS test and makes no real business reads/writes.

62 synthetic dated records include day-before and day-after sentinels. Page URL uses period7 and explicit30-day dates. Assertions verify:

1. Actual query calls and captured transport bounds are October4–November2 and September4–October3.
2. Each lines query receives exactly30 record IDs; sentinels excluded.
3. Current totals3000 received/600 wastage; prior1500/150. A seven-day truncation would fail.
4. Current/prior expected coverage30; chart contains30 dates including first/last, is the exact same daily array used by summary source, and displays20% weighted rate.
5. Visible metric comparison is previous1500 and+10 percentage points; chart/table date links include both endpoints; report tabs and picker retain effective bounds.

New regression plus existing selected-period tests:6/6 pass, `/tmp/oms-odr21-delivery/month-contract.log`. Earlier21-test UI result and browser interaction logs remain valid. No new production implementation delta, SQL, global date changes, amount rules, role changes, push or deploy. Authenticated real-data Preview remains outside this synthetic contract result.
