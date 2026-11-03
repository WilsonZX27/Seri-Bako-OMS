# ODR / Insights actual Preview follow-up — 2026-11-03

Base edfec5441ce56c1557e1b14cd21095c012d25702, current approved annotations21 Preview alias. Existing legitimate WILSON Super Admin/Owner session, Seri Bako Malaysia. No account switching, token copying, real edits/saves, SQL, push or deployment. Main integration tree read-only; local fix in `/tmp/oms-odr-livefix-20261103`.

## Confirmed live

- Insights October4–November2 displays30 daily rows, first/last dates correct. DOM table sums51004 received and26700.43 wastage, exactly matching KPI totals.52.3% matches both chart and KPI. Previous range September4–October3 is shown with50311 received/25697.13 wastage. Coverage current256/330 and prior296/330. Partial coverage is disclosed. This is actual Owner page evidence, complementing the prior synthetic query-contract regression.
- Settings product management and sales-channel management links work. Sales page loads15 existing keys with label inputs, enabled checkboxes and within-section move controls. Legacy credit_card disabled. Save visible to Owner but was not invoked. No arbitrary new-channel add flow exists; required financial mapping remains unresolved.
- Known TRX November2 ODR f9e2151c-b3da-4ea5-a57e-29ebf5f25a2f loads SC01 sent4/received4/wastage3. MC07 not visible. No mutation or draft submission.

## Newly reproduced visual defect and local fix

At actual1280×720, Trend daily-data scroller is275px wide but table is284.46875px; Rate extends9.46875px beyond the visible right edge. Actual screenshot inspected: `/tmp/oms-odr-live-20261103/insights.png`.

Only chart-table horizontal padding changes from12px to8px, matching headings and body cells. No shared/global CSS, query, arithmetic, precision, permission or date changes. Thirty actual visible rows were read into a local fixture (no credentials/services), rendered with the real component and app shell. At the same1280 width table and scroller both275px, right edges943px; Rate and all values visible. Screenshot `/tmp/oms-odr-live-20261103/local-1280.png` inspected. Fixture and captured business quantities are excluded from patch.

Targeted selected-period/render/availability tests7/7 pass; targeted ESLint and diff whitespace check pass. Local Next compiles this component. No new full build or full suite; no claim of deployed fix. The change is table-only; phone list markup is untouched. This follow-up captured1280 only; earlier390/820/1440 evidence remains historical, not a rerun of this delta.

## Remaining

- Patch must be integrated and checked on Preview before closing Rate clipping.
- Manager/Finance/Outlet role comparisons remain pending: only Owner session used. Do not equate visible Owner controls with save/permission validation for other roles.
- Add-new monetary bucket semantics remain pending (new bucket versus alias/split, totals and historical mapping). Existing15 settings availability verified, real save intentionally untested.
- Period-end wastage cost is explicitly Unavailable because no active recipe-cost snapshot; do not manufacture a cost or treat unavailable as zero.
- No real-data mutation paths tested under this read-only authorization. No tool denial or uncertain mutation outcome occurred.

Evidence directory `/tmp/oms-odr-live-20261103`: insights.txt/png, chart-rows.json, daily.txt, settings.txt, sales-settings.txt, local-width.json, local-1280.png, tests.log, lint.log. Screenshots and quantities remain local and are not included in git patch.
