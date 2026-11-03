# Three minimal follow-ups — local integration

Requested 2026-11-03: integrate BAKIARAJ invited matching, ODR Rate clipping, and unnumbered transfer display. Base is deployed e755f0f2e3e6a5ca27bea84326f2e12787ef8a45; isolated branch codex/three-followups-local-20261103. All three source patches apply without conflicts. No SQL, permission grants, source business data, role activation or backfill changes.

- Matching changes only eligible staff status active to active/invited, retaining deleted filter, attendance.map gate and RLS. This does not map BAKIARAJ or recalculate existing results.
- Rate chart changes only horizontal table-cell padding12px to8px. Selected dates/calculation/phone markup unchanged. Integrated component SHA2569ac022c9a038f39f2d7f323a35483f42c4d02d2c52fe6dea385d7e29f23be7a7 exactly matches author rendering. Author1280px local screenshot actually reviewed: Rate visible; table275px equals scroller275px. Reused component evidence, not a new full combined browser acceptance.
- Transfer display prefers persisted business number, then readable legacy reference; missing/UUID reference becomes Unnumbered. UUID routes preserved. No AST/AT choice, gate activation, counter allocation or historical backfill.

Combined targeted20tests passed: invited inclusion and denied zero-read, transfer actual list/detail render and UUID route preservation, period/metric contracts and production PDF nonregression. Typecheck, changed-source ESLint and git diff --check passed. Build result recorded in handoff after completion. Synthetic query/component tests are not real-role acceptance.

Deployment steps: approve exact final commit for existing annotations21 Preview branch, verify branch remains expected ancestor before fast-forward; no SQL installation needed. Await Ready and check actual Owner matching selector, Insights1280 Rate column and transfer list/detail labels; existing Purchasing/Chef/Outlet role sessions remain needed for their real boundaries. No Production promotion authorized. BAKIARAJ historical repair remains separately scoped to People and is not closed by this candidate.

Build completed successfully (exit0) using localhost-only placeholder build environment, no production credentials. Existing Supabase Edge-runtime dependency warnings remain in /tmp/oms-three-followups-build.log. No full test suite rerun. No deployment or business action executed.
