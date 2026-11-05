# Packaging large-report CPU review

Base `0358560`, isolated source work only. No browser, network/DB load, production writes, permissions, configuration, schema or deployment changes.

## Confirmed runtime cost

`/outlet-packaging` calls `getOutletPackagingReport(days)`. The server validated all period rows, then ran `rows.filter(... rows.findIndex(...))`, rescanning the full array for each ID. The client `OutletPackagingReport` calls `packagingTrendPoints` inside useMemo after report/outlet/product/period/measure changes; that function repeated the same quadratic deduplication before selecting a product or outlet.

Product cards are already paginated at 10 products in `src/components/outlet-packaging-report.tsx:28`, but that does not bound the whole-period row array processed for trends. Report's existing 7/30-day RPC and independent store balance reuse remain unchanged. Removing rows through new server pagination could change historical balances/cohort completeness and was not attempted.

## Surgical change

- Server: collect first occurrences during the existing Map-based validation loop, eliminating the second quadratic pass. Identical duplicates collapse; conflicting source IDs and duplicate completed cohorts still throw. Falsy/missing IDs stay in original order as before, and no source arrays/records are mutated.
- Trend: use a local Set for first-occurrence filtering. Unknown usage/closing stays a gap; zero remains zero; date/outlet/product scope and opening/latest balance logic stay unchanged. No client state or cache lifetime changes.

Both deduplication paths become O(n) by row count for normal bounded-size records; Set requires O(n) additional ID storage on the trend path. This does not claim the database RPC or complete browser render is now O(n), or that huge rows have fixed serialization cost.

## Measured actual-source comparison

No simulated network sleeps. Actual before/after TS modules transpiled before timing, one warm-up then seven paired CPU samples per case; Node 24.21.0 on current host, not hosted Node 22 or an actual phone. Synthetic records: 10 outlets, up to 100 products, up to 10 days; complete output JSON equality asserted for every sample.

| Function / rows | Baseline median | Modified median |
| --- | --- | --- |
| Server report / 1,000 | 2.962 ms | 0.247 ms |
| Trend / 1,000 | 2.781 ms | 0.144 ms |
| Server report / 10,000 | 283.355 ms | 2.404 ms |
| Trend / 10,000 | 282.866 ms | 0.749 ms |

Raw samples, benchmark script and immutable before modules: `../packaging-scan-evidence-20261105/`. The 10,000-row cohort is a stress fixture, not an observed Production dataset. Do not add these function times together as an end-to-end page latency or promise an equivalent user speedup.

## Regression and remaining scope

19/19 pass across new `packaging-linear-dedup.test.js`, report source integrity, fixed-cohort trend, chart gaps and period-loading suites. New tests assert first-source object identity/order, idless rows, frozen input nonmutation, null/zero preservation and linear ID-access bounds on 2,000 rows (not flaky wall-time thresholds). Existing tests retain conflicting-ID/cohort rejection, unknown gaps, zero balances, period isolation, pagination and stale loading behavior. ESLint on both changed files, full TypeScript and diff whitespace check pass.

Other source samples: PR/PO page joins are server-paginated at 12 parents; Stock Counts default page is 12 and `page=all` is a distinct explicit path. These still contain repeated child-array scans, but have smaller bounded parent populations and were not altered in this patch. This was a targeted review, not an exhaustive source or rendering audit. No current hosted page timing, actual dataset size, memory peak, React profiler or full browser acceptance was measured. Authentication/tenant/RLS boundary and freshness contracts remain intact.

## Integration verification on 0358560

Applied cleanly to the intended target. First occurrence remains the original object, falsy IDs remain in input order, and source rows are not mutated. Server conflict/cohort checks still run for every identified row before a report is returned. RPC name, period/date arguments, authenticated client and request-only React cache are unchanged. Source migration 336 retains current-company predicates; no SQL/RLS or Manager warehouse permissions changed. This source review is not a live tenant-isolation test.

25 tests passed across report integrity, deduplication, periods, chart gaps, balance trend, settings pagination and tenant source contracts. Runtime lint passed. Logs: `/tmp/oms-packaging-integrated.log`, `/tmp/oms-packaging-integrated-build.log`. Prior author CPU benchmark remains a synthetic local comparison; no hosted speedup measured in this integration.

Full Next build, including TypeScript, completed with exit 0. Existing fonteditor/production-sheet warnings remain. Vercel Ready and authenticated after measurements are not confirmed.
