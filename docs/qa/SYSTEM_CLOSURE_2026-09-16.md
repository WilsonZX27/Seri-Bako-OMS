# System closure review — 2026-09-16

This is repository evidence for v9.2.69. Migrations 298–301 are Production applied and read-back verified. Application commit `ad0b8082` was deployed through Vercel Production deployment `6RGP4cHi8xjQqVDb4VJyHK7mqb2R` and verified through `https://system.seribako.com.my`.

## Release gates

| Gate | Evidence | Result |
| --- | --- | --- |
| Strict TypeScript | `npm run typecheck:strict` | Pass |
| ESLint | `npm run lint` | Pass |
| Contract suite | 1,292 tests | Pass; the loopback lifecycle contract was run outside the restricted socket sandbox |
| Production build | Next.js 15.5.21, 102 routes, 102 kB shared first load | Pass with isolated test environment |
| Stock Count integrity | 148 focused inventory/Stock Count contracts | Pass |
| Responsive browser UAT | Production: 18 critical workspaces at 430×932; create flow at 390×844; populated Item, Stock Count and Purchase Request details at 820×1180; 13 shared list surfaces at 430×932, 820×1180, 1180×820 and 1440×900 | Pass for the recorded Production matrix; the exhaustive local role fixture matrix remains outstanding |
| Linked schema | Repository and linked Production ledger verified through 301 | Pass; Recipe transition is security-definer with an internal permission guard, authenticated-only; the three summary functions remain security-invoker |
| Production runtime | Purchasing and Super Admin authenticated checks on the custom domain; bounded PR list; dashboard ready in 2,583 ms; responsive list and costing-readiness smoke suites passed 8/8; Procurement Variance phone/tablet/desktop ready in 2,933/1,753/1,662 ms | Pass |

## Findings closed in this review

1. **Design authority drift.** Current rules now live in `docs/DESIGN_SYSTEM.md`; `DESIGN.md` is explicitly historical. `docs/SOURCE_OF_TRUTH.md` resolves product, architecture, design, annotation and dated QA precedence.
2. **Competing geometry tokens.** `globals.css` owns 12px panel and 8px control radius tokens. `design-system-v2.css` consumes them and no longer redefines them. Contract tests reject duplicate selector ownership and token redefinition.
3. **Ambiguous working-time copy.** The schedule editor reports the unsigned scheduled span and no longer revives the obsolete signed comparison against 8.5 hours. The paid cap is labelled `Paid time limit`.
4. **Cross-outlet identity.** Existing structured scheduling requires a real destination branch or the explicit `Event` option. Destination shifts use canonical branch identity; Event alone permits free text. Contracts cover editable destination projections, immutable coverage and attendance recalculation.
5. **Stock Count integrity.** Focused tests cover PJS10 catalog repair, eligibility, KG alignment, zero-only retirement, UOM identity, complete-line submission, exact variance, autosave recovery, atomic create/post/cancel/void, concurrency reconciliation and touch geometry.
6. **Purchase Return load path.** The queue now filters, sorts and paginates in PostgreSQL through a security-invoker view. Its right-rail summary is one aggregate RPC instead of repeated full reads and line downloads.
7. **Local build guard.** The prebuild check now reads `.env.local` before validating the same public variables that Next.js consumes.
8. **Stock-operation summaries.** Stock Transfer and Stock Wastage right rails now use constant-size, security-invoker aggregate RPCs instead of loading each complete queue into the application.
9. **Stock Balance summary truth.** Stock Balance metrics now cover the full filtered scope rather than the visible page, and Movement Ledger valuation no longer downloads every balance row.
10. **Inventory form payloads.** Stock Transfer and Stock Wastage creation now read the selected source branch through a six-field availability projection. Production creation reads only active-recipe ingredient balances and does not fetch form options before the create permission succeeds.
11. **Item detail stock truth.** An Item detail now reads only that item's branch-visible balances and sums them. It no longer loads every item and no longer risks presenting one arbitrary branch balance as the company-visible total.
12. **Items fallback stock truth.** The non-RPC Items workspace fallback now aggregates every visible branch balance per item instead of retaining whichever branch row happened to be last.
13. **Production deployment evidence.** Vercel Production deployment `5g5SetJPo2CXjPQREndgfSK8kMkt` reached Ready from commit `40ffb110`. Authenticated checks on the custom domain passed for the bounded Purchase Request list, the dashboard performance threshold, desktop operational structure, a 390px create flow, three populated 820px detail surfaces and 18 critical 430px workspaces. The mobile sweep recorded no console/page errors and no horizontal overflow.
14. **Dashboard smoke contract.** The performance test now follows the current accessible dashboard contract: a visible level-one user heading plus the Purchasing role. It no longer waits for the removed `Local purchasing` heading.
15. **Costing report scaling.** Recipe Costing and Costing Readiness now index recipe lines once instead of rescanning the full line collection for every recipe. Recipe Costing, Costing Readiness and Product Margin also request explicit calculation projections rather than complete Item, Product, Supplier, Packaging, Recipe and Recipe Line rows. The in-process computation is linear in recipes plus lines, and database payloads exclude unrelated master-data fields.
16. **Filter-surface cascade ownership.** Legacy filter CSS now retains layout only. The v2 design layer exclusively owns list-filter and More-panel borders, background, radius and elevation, and no longer needs `!important` for the shared panel/control radii. The compatibility layer is two forced declarations smaller and a contract prevents visual ownership from drifting back into `globals.css`.
17. **Recipe lifecycle atomicity.** Migration 301 moves submit, approve, activate, reject and archive into one tenant-scoped transaction. Recipe and Document states, revision history, activity and superseded active versions now commit together; activating a version locks competing active versions and retains the existing partial unique index as the final concurrency guard. Production read-back confirmed the function, authenticated grant, anonymous revoke and internal permission guard.
18. **Latest Production verification.** Vercel Production deployment `H8mWwdnxGNzvbRcN4XS1thNhb6Ap` reached Ready from commit `e0e56504`. The authenticated custom-domain run passed 6/6 responsive list/filter tests across phone, tablet portrait, tablet landscape and desktop, plus 2/2 dashboard-performance and Costing Readiness tests. The dashboard was ready in 2,583 ms.
19. **Procurement Variance scaling.** The report now requests explicit calculation projections from all nine source tables. It indexes receiving lines by PO line, invoice lines by receiving/PO identity and supplier prices by supplier/item/UOM once, replacing repeated complete-dataset scans inside every order-line comparison. The resulting in-process work is linear in the fetched source rows plus emitted comparisons. Production deployment `6RGP4cHi8xjQqVDb4VJyHK7mqb2R` reached Ready from commit `ad0b8082`; authenticated phone, tablet and desktop checks loaded the workspace in 2,933 ms, 1,753 ms and 1,662 ms with no page errors or horizontal overflow.
20. **Latency percentile evidence.** Server-side observability now records a bounded 25-sample window for all Supabase requests and for the Dashboard and Procurement Variance data-loading boundaries. Each window emits p50, p95, p99, maximum and failure count without retaining or logging URLs, query strings, filters, credentials, record identifiers or bodies. The collector caps series cardinality and clears each emitted window, so observability cannot grow process memory without bound.

## Architecture judgement

The transactional core has strong database-owned invariants: inventory terminal actions are atomic, business identifiers are tenant scoped, high-impact state changes are permission gated, and read failures remain unavailable instead of becoming false zeroes. Stock Count is materially stronger than the earlier UI-only implementation and its critical paths are covered by database and source contracts.

Approval behavior is still implemented by several domain-specific state machines. That is acceptable for the current company because Purchase Request, Production, Schedule, Compliance and inventory documents have different evidence and separation-of-duty rules. A future sellable product should configure approver roles, thresholds, step order and return paths through versioned workflow definitions, while each domain keeps non-configurable safety invariants in its terminal RPC. Do not replace those invariants with a generic client-side workflow builder.

The visual system is more coherent, but `design-system-v2.css` still contains a large compatibility layer with extensive `!important` usage. Duplicate selector/media ownership is now mechanically rejected, which prevents the former silent cascade conflict. The remaining overrides should be retired by migrating legacy route utilities into shared components in small, viewport-verified batches; a bulk deletion is unsafe without authenticated browser evidence.

## Remaining release work

1. Start an isolated Supabase/Docker target through 301, seed the role fixture and run the exhaustive role and mutation matrix without exercising mutation flows against Production.
2. Continue reducing the compatibility CSS only alongside phone, tablet and desktop screenshots and geometry assertions.
3. Accumulate Production latency windows under representative concurrent use and set alert thresholds from the observed Dashboard, Procurement Variance and database p95/p99 distributions. Instrument additional critical route-data boundaries as they enter the performance audit.

The reviewed release is deployed and its recorded critical read paths are Production-verified. The wider system-quality goal remains open for exhaustive role/responsive coverage, sustained performance evidence and incremental compatibility-CSS retirement.
