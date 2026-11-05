# Daily and inventory allocation hot paths

Base 620caf9. Read-only source analysis; no browser use, hosted timing, configuration, data, SQL or permission changes.

## Verified changes

- Daily `hydrateRows` already groups lines per record. It still constructed the identical catalogue map within every record's totals call. Hoist that map once within this request. For R records and P products, map insertion work changes from R*P to P. Record-specific date, lines, operational IDs, historic/seasonal rules and totals remain unchanged. No shared/cross-user cache.
- Stock Card fallback grouped L lines of one transaction by spreading the growing array each iteration. This copied L*(L-1)/2 references (499,500 for the 1,000-line fixture). Append into the locally owned group array instead. Source rows/arrays are not mutated; grouping remains linear and sort/running-balance/display filters stay unchanged. The bounded primary RPC, fallback limits and errors are untouched.

## Other paths examined

Daily list and inventory hub entry reads already overlap. Hydration products depend on loaded line product IDs, and activity staff depend on log actor IDs; retain those dependencies. Stock Card fallback transactions and opening-summary reads could overlap, but doing so would issue an extra opening query even if the transaction read fails/overflows. No database concurrency increase made without hosted load evidence. No React rendering change was justified: these concrete defects are in server-side allocation work. This is not a comprehensive client profiler audit.

## Verification and limits

15 tests pass: actual Daily hydration shares map identity and retains zero/nonzero quantities, record dates and input data; actual Stock Card fallback executes 1,000 lines with stable order and exact opening/running balance; existing bounded-RPC, fail-closed and historical-seasonal tests pass. Log `/tmp/oms-daily-inventory-perf.log`. Tenant scope/RLS and queries are unchanged, not independently penetration-tested. No speedup percentage, production latency or user acceptance claim. No deployment in this pass.

Full TypeScript and focused runtime lint passed. CommonJS test lint passed with no-require-imports disabled for the fixture command. No full Next build repeated for these two local allocation edits.
