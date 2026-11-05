# Daily-history catalogue lookup performance

Base `a53c56b`. Isolated code-only optimization; no browser, external requests, production data/config/schema/permission or deployment changes.

## Confirmed runtime path

`buildPlanPayload` loads up to eight weeks of completed Daily Records when an accessible outlet/product has a same-day forecast rule. Historical lines are read in scoped, exact-count pages, then each line previously scanned `context.products.find(...)`. With L history lines and P catalogue products, product matching performed O(L*P) comparisons, even when the historical unit guard subsequently rejected legacy rows. The prior `needsHistory` check also nested products.some with batches.some.

Changes are local indexes only:
- Set of same-day batch product IDs for the existing needs-history predicate.
- Map of catalogue products built once, preserving **first occurrence** semantics of Array.find; history lookup uses strict keys without string coercion. This reduces the product-matching substep to O(P+L).

No query projection, filter, page count, scope, data ordering, quantity, forecast calculation, carryover, completeness or historical-unit validation changes. Indexes live for one function invocation, never across identities. Existing event matching and other loops remain; the whole planner is not claimed to be linear or fully optimized.

## Actual-source local CPU comparison

The benchmark executes the actual historical-series source slice from the before/after module, using the real verifiedPlanningUnit helper. Synthetic 1,000-product catalogue and 1,000/20,000 history lines, one warm-up and seven paired samples; no simulated network sleeps. Transpilation/fixture construction/JSON equivalence checks excluded from timer. Node 24.21.0 local host, not hosted Node 22.

| Historical lines / unit evidence | Before median | After median |
| --- | --- | --- |
| 1,000 / unverified | 3.017ms | 0.391ms |
| 1,000 / verified | 3.643ms | 1.053ms |
| 20,000 / unverified | 62.101ms | 5.542ms |
| 20,000 / verified | 73.983ms | 16.938ms |

Output series JSON equality asserted for every sample, including empty results from unverified history. Verified fixtures exercise future-valid snapshot behavior; current catalogue units are never substituted for historical snapshots. The 20,000-line cohort is synthetic, not observed Production volume. These are CPU-slice timings, not full Daily/Planning page or DB/API latency. The separate needs-history Set optimization is covered behaviorally, not attributed a measured independent time reduction.

Evidence: `../planning-history-index-evidence-20261105/benchmark.cjs`, `benchmark.json` and immutable `data-before.ts`.

## Regression

29/29 pass across new `planning-history-index.test.js`, full `production-planning-data.test.js` and `planning-unit-minimum.test.js`. New checks cover first duplicate catalogue definition, strict numeric/string identity, unknown/mismatched units, incomplete-record provenance, event evidence, missing-record error and linear catalogue identity-access bounds (400 products/4,000 lines, no wall-time assertion). Existing full loader tests cover capped pagination, manual-only no-history reads, missing receipts, outlet/product series, carryover and current/historical unit mismatch. Focused ESLint, full TypeScript and whitespace check pass.

No live page, profiler, database CPU/RAM or actual history size measured. No direct speedup claimed for Daily list, procurement or inventory pages. Remaining production planning history/event/carryover repeated scans can be considered only with separate parity fixtures and evidence; not silently changed in this patch.

## Integration on a53c56b

Applied to exact intended base. Catalogue index deliberately retains the first duplicate ID, matching prior Array.find behavior; no String conversion added to historical product lookup. The TypeScript assertion is erased at runtime. Supported database IDs are UUID strings. Historical line traversal, complete-record checks, event matching and verifiedPlanningUnit still execute in the same order; unknown/mismatched snapshots remain excluded. Same-day ID Set changes only membership lookup, not selected product/batch scope. Authenticated client, company/kitchen/outlet predicates, exact-count paging and all write RPCs are untouched. Indexes are invocation-local; no cross-actor cache introduced.

109 integration tests pass across Planning data/actions/forecast/history/UI contracts, explicit unit protection and tenant source contracts. Tests include foreign-company prior counts, distinct kitchens, missing-record rejection, first product identity, explicit zero, unverified history/minimum/employee/carryover, unchanged existing fixture data and preserved output order. Live RLS/tenant isolation was not exercised. Log `/tmp/oms-planning-index-integrated.log`; no hosted timing claim.

Focused runtime lint and full Next build including TypeScript passed with exit 0 (`/tmp/oms-planning-index-build.log`). Existing build warnings remain. Preview Ready and authenticated after-state/performance remain unverified.
