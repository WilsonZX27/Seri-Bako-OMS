# Shared procurement supplier-option request waves

Base `1632e3d`. Isolated code/read-fixture work only; no browser, provider requests, production data, database/config/schema/permissions or deployment changes.

## Actual runtime scope

`getBranchSupplierMappingsForSelect` is used by Purchase Request new/detail and Purchase Order new forms. It originally awaited five database reads serially: active branch/item mappings -> their supplier relationships -> active item defaults -> active branches -> referenced suppliers. The relationships, items and branches do not depend on each other's results.

After mappings are verified, those three reads now run in one Promise.all, then all results are validated in the original error-precedence order before supplier IDs are combined and supplier records are fetched. This changes five sequential request waves to three, while total database query count remains five when explicit relationships exist. No new SQL/RPC or projection/filter/scope changes; empty relationships still skip their query.

All master-supplier fallback logic remains intact, including same-company branch matching, exclusion of explicitly mapped branch/item pairs, active/nondeleted records, exact relationship item identity and unit conversion behavior. No cross-request cache or authorization shortcut. On a parallel read failure, other independent authorized reads may already be in flight; no partial option result is returned.

## Controlled local latency comparison

Actual before/after exported helper, identical in-memory table responses, simulated **25ms per read**. One warm-up and seven paired samples; transpilation excluded, output JSON equivalence asserted each sample. Node 24.21.0 local host, not hosted Node 22 or a measured Supabase connection.

| | Before | After |
| --- | --- | --- |
| Query count | 5 | 5 |
| Request waves | 5 | 3 |
| Median fixture elapsed | 133.21ms | 81.77ms |

Evidence: `../supplier-options-waves-evidence-20261105/benchmark.cjs`, `benchmark.json` and immutable `common-before.ts`. This proves scheduling overlap under controlled dependency latency, not actual SQL time or a guaranteed full-page improvement. At most three of this helper's reads are now concurrent; actual hosted contention/resource headroom was not measured.

## Safety checks

10/10 tests pass across new `supplier-option-read-waves.test.js`, existing shared supplier projection, direct branch mapping and procurement UOM context suites. Actual-source behavioral tests check overlap only after mapping dependency, supplier read only after prerequisites, unchanged active/deleted filters, company-matched defaults, mapped unit factors, no relationship query on empty mapping set, and failure of every dependency without partial mapping. A failed initial mapping read still causes no downstream reads. ESLint, full TypeScript and diff whitespace check pass.

No live first/repeat request pair, actual row count, CPU/RAM metrics, SQL plans, response bytes or load test captured. Existing unpaged master/mapping query completeness and result-size/URL limits are not remediated by this change. Invoice eligibility narrowing was considered but left unchanged: safe optimization there must preserve authoritative receiving-line identity and handle large ID batches/completeness, rather than dropping invoice quantities using unverified assumptions.

## Integration on 1632e3d

Applied to exact intended base. Shared helper still uses the authenticated Supabase client and existing RLS; this helper does not add a separate per-role gate. Caller/write authorization paths are unchanged. Active/deleted predicates, relationship-ID restriction, fallback same-company matching and output order are identical. No grant, service-role client, SQL or cache-lifetime change. Live installed RLS was not inspected.

18 integration tests passed across supplier projections/mappings/UOM, procurement branch scope and tenant source contracts. Added explicit event-count test: peak helper concurrency is 3, total reads 5; failed relationship/item/branch prerequisite prevents supplier detail read. Scheduling can add at most two simultaneous reads relative to this helper's previous serial behavior; callers already have independent concurrent reads, so total request concurrency is not claimed to be 3. Existing connection contention/headroom was not measured. Unlike query expansion, this introduces no new reads on a successful call, but an error may leave other already-started independent reads finishing.

Logs: `/tmp/oms-supplier-waves-integrated.log`, `/tmp/oms-supplier-waves-build.log`. Hosted timing and resource impact require later measurement; synthetic timing is not a deployment speed guarantee.

Focused runtime lint and full Next build including TypeScript passed (exit 0). Existing build warnings remain. No Preview Ready or live after verification claimed.
