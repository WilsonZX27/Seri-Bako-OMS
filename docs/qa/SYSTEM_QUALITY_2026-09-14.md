# System quality verification — 2026-09-14

## Scope and release state

Repository: WilsonZX27/Seri-Bako-OMS. Integration baseline checked against origin/main at `65fc93f69f7d0207b72e18b1d727a8e6060c0a6d`. Windows unpushed or ignored files cannot be compared remotely. Local `env.test.local` and `gitignore.txt` remain ignored and untracked.

Application fixes are on `codex/system-quality-verification`, v9.2.69. Preview commit `2949162521b9b5f14c11da53cc2b8dc3a657ec00` built successfully; subsequent topbar count optimization requires a new Preview build. Production application observed at v9.2.68. No v9.2.69 promotion or full authenticated Preview acceptance is claimed.

## Reported defects

| Issue | Repair and evidence |
|---|---|
| ALMA/PJS10 have no schedule staff | Canonical eligibility omitted Kitchen. Migration 287 adds Kitchen to the same tenant/branch/date-scoped paths. Live current-week rosters now show ALMA 8 and PJS10 12. |
| Repetitive schedule errors | Missing dates grouped by staff ID with expandable dates. Distinct similar names remain distinct; staff codes shown. Incomplete drafts may be saved, but actual shift/OFF/leave assignments remain required before submission. |
| PR submitter text | Removed redundant Submitted by from list rows. |
| Mobile action wrapping | Shared action bar explicitly allocates three columns and a 44px ellipsis control; Files & activity stays on one line. |
| GRN summary and links | Summary and purchase chain use two phone columns. |
| Pending after receiving | Stored pending quantity is the pre-receipt snapshot. Posted receipt UI subtracts this receipt and labels the result Remaining. Draft/cancelled and rejected quantities retain their correct semantics; no stored stock quantities changed. |

## Browser coverage

33 Production routes rendered with the existing Owner session. Checked heading/main content and document width versus viewport; none showed whole-page horizontal overflow in the observed viewport. This is read-only smoke coverage, not all roles, all widths or mutation acceptance.

430px: `/dashboard`, `/production/jobs`, `/outlet-calendar`, `/procurement`, `/goods-receivings`, `/suppliers`, `/uom-conversions`, `/stock-balance`, `/stock-transfers`, `/low-stock`, `/company`, `/document-sequences`.

1280px: `/outlet-daily-records`, `/outlet-compliance`, `/people`, `/attendance`, `/purchase-requests`, `/purchase-orders`, `/purchase-returns`, `/supplier-invoices`, `/inventory`, `/items`, `/products`, `/recipes`, `/stock-transactions`, `/stock-card`, `/stock-counts`, `/stock-wastage`, `/reports`, `/activity`, `/branches`, `/roles`, `/imports`.

Actual shared components and stylesheet were also rendered in a temporary local fixture with synthetic data. At 390px and 430px, all three document actions share one top coordinate, each has 44px height, and More has 44px width. Document scroll width equals viewport width. Purchase chain visibly has two columns. More opens/closes its dialog; missing-day disclosure expands into one employee with seven dates. No browser error logs were observed in that fixture. It was removed after verification and is not deployed.

## Database verification

Before applying migration 287, the four existing function body hashes matched their repository baselines and ledger 287 was absent. Applied transactionally, preserving function security configuration and ACLs. Ledger and final body hashes were verified:

| Function | Body MD5 |
|---|---|
| get_schedule_staff | 6391d58787eea852e9c8cd5e518dd02c |
| get_schedule_staff_candidates | 227b05af8a8722ca68e443481b7698dd |
| is_staff_schedule_eligible | 112c438b2ae8b11f4cbf4f28b08db18e |
| validate_schedule_week | 60fa28e31f5d929847d405bc95e488f9 |

An isolated PGlite/PostgreSQL fixture executed the actual migration and checked active/invited Kitchen inclusion, Finance exclusion, tenant/branch boundaries, permission denial, seven unresolved days and completeness after seven explicit OFF assignments. Those OFF assignments existed only in the disposable fixture. No live staff assignments or stock transactions were generated.

## Performance evidence and open acceptance

Production Vercel logs still show repeated `outlet_daily_records` reads on unrelated routes: 2481ms on Activity, 3271ms on Reports, 3364ms on Low Stock, and up to 4661ms on Stock Transfers in this sample. Some navigation traffic includes prefetch; these are database-request durations, not browser page-load benchmarks.

Topbar pending action queries requested exact totals although their caller consumes only up to five items. The new repair omits those counts and unused detail hydration; Dashboard exact totals remain intact. Tests assert both modes, scoping and failure handling. No cross-user persistent cache was added.

One earlier Production log at 19:01 MYT reports `page.outletDailyRecords.source` / `canceling statement due to statement timeout`, despite HTTP 200 fallback rendering. Thus successful page rendering alone does not prove performance acceptance. After authenticating the updated Preview, compare repeated cold/warm workflow loads and the slow-request logs; investigate the ODR list query/plan if the timeout persists. No measured speedup or all-system performance guarantee is claimed yet.

## Automated gates

Latest application source: 1256 tests passed, 0 failed; ESLint, TypeScript and Next.js production build passed. Build used a temporary same-source directory because the macOS Documents checkout previously stalled during bundling. Local-only environment files were not added to Git or uploaded as artifacts. Vercel performs its own Git build with configured environment values.

Remaining gate: authenticated v9.2.69 Preview real-record verification and before/after latency measurement, then integration/release/promotion. Preview currently presents its login screen; the Production session does not authenticate that separate domain.
