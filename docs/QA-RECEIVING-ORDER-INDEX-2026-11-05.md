# Receiving PO candidate indexing

Base `3df4493`. Local isolated CPU optimization; no browser, external requests, production data/config/schema/permissions or deployment changes.

## Confirmed hot path and change

`/goods-receivings/new` calls `getEligiblePurchaseOrders` before rendering the PO selector. Its real (non-mock) path loads eligible orders and their scoped lines/suppliers, then previously filtered the whole line array once for every order: O(orders × lines).

Build one request-local Map of lines by purchase_order_id, then look up each order's lines. Grouping is O(lines + orders), with existing pending-line filters/reductions still processing each relevant line in its original order. Empty orders stay in output with zero pending lines; missing supplier stays null; orphan lines do not leak into another order. Duplicate parent IDs retain the same shared line group as the previous equality filter.

No network query, projection, status/deleted filter, scoped ID list, error validation, output order or pending quantity arithmetic changes. Existing legacy pending_qty transport field remains unchanged; UI already uses pending line counts. This patch adds no cross-user cache and does not weaken receiving action checks.

## Actual-source comparison

Before/after full exported query functions run against identical in-memory read results; no simulated network latency. One warm-up then seven paired CPU samples, excluding TS transpilation/data construction/output comparison. Node 24.21.0 host (not hosted Node 22). Output JSON equality asserted for every sample.

| Synthetic candidate cohort | Before median | After median |
| --- | --- | --- |
| 100 orders / 2,000 lines | 1.419ms | 0.225ms |
| 1,000 orders / 20,000 lines | 117.405ms | 1.768ms |

Evidence: `../receiving-order-index-evidence-20261105/benchmark.cjs`, `benchmark.json`, immutable `query-before.ts`.

## Validation and limits

14/14 tests pass: new `receiving-order-index.test.js`, existing receiving read-bounds, progressive receiving UOM and GRN unit-display guard suites. New tests exercise actual query output/filter scopes, partial/complete/cancelled pending math, unknown suppliers, no lines, unmatched parent IDs, empty read no-follow-up behavior, related-source failure, and linear parent-ID access bounds at 200 orders/4,000 lines (no timing threshold). Focused ESLint, full TypeScript and diff whitespace check pass.

Stress cohort is synthetic, not measured Production size. No hosted latency, SQL execution, transport row cap or browser render timing measured. Existing eligible-order/line reads do not use explicit complete-page traversal; effective backend result limits/completeness were not inspected, so this patch does not claim to resolve potential large-result transport truncation. No new query or database load added. Other pages and the mock-only hydration path are outside this patch.

## Integration on 3df4493

Applied to exact intended base. Grouping preserves source line order and strict UUID parent identity. Pending predicate and arithmetic are unchanged: ordered minus received minus cancelled, include only positive remainder. Existing legacy pending_qty field is retained; this does not certify sums of different units. UI pending-line display remains protected. Authenticated Supabase client, eligible statuses, deleted filter and child/supplier IDs remain identical. Tenant isolation continues to rely on existing RLS; no grants/actions/SQL changed, and live policies were not exercised.

26 tests pass across the index, receiving bounds/UOM/quantity-display, branch-scope and tenant source contracts. Extra fixture confirms duplicate parents, fractional remaining quantities, zero and frozen-input nonmutation. Source errors still propagate and empty eligible parents skip downstream reads. Log `/tmp/oms-receiving-index-integrated.log`. Existing potential large-read completeness gap remains open; no pagination or row-limit semantics changed by this CPU optimization.

Focused runtime lint and full Next build including TypeScript passed with exit 0 (`/tmp/oms-receiving-index-build.log`). Existing build warnings remain. Preview Ready and hosted performance are not verified.
