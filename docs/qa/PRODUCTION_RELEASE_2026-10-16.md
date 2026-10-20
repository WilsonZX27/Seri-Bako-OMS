# Production release, 16 October 2026

Application: v9.2.106, system.seribako.com.my. Runtime code commit daf5f8e668a0024f0a697dc06cbd519a45c6bcd5 was Ready and assigned to the production domain before this release reconciliation. This follow-up records production activation; it does not introduce another runtime change.

- Applied migration 357 after the asset PGlite lifecycle suite (including ten synthetic non-operating-location transfers) and a guarded production rollback rehearsal. The new Owner-only registration RPC retains the existing tenant/location scope; it creates no business destination automatically.
- Reconciled missing history entries 339–344 after all 15 effective function bodies matched the repository's latest applicable versions exactly. Current report/forecast constraints, the unpaid-leave wrapper, raw-column denial and the updated provenance policies were verified. Older DDL was not replayed and newer 346/356 behavior was preserved.
- A complete repository/history comparison found migration 325 still pending. Applied its existing RPC anonymous-access hardening after a guarded rollback rehearsal, preserving all 15 authenticated/service execute privileges and validating the two pg_catalog search paths.
- Migrations 358–360 were already applied and were retained. The final check compares every repository migration against production history.
- All 1,637 repository tests and the asset database lifecycle suite passed. No runtime code changed after the previously passing optimized build, TypeScript and ESLint checks.
- No assets, holdings, transfers, roster days, attendance results or permanent branch memberships were modified by migration357/history reconciliation. Migration325 contains permission/search-path settings only.

The original older checkout remains an historical workspace; its older modified copies are not a newer release candidate. The integrated checkout has no unpublished tracked implementation changes. Private QA extracts, local build output, runtime links and uploaded schedules are not committed to Git.

Business corrections previously requested by the Owner remain separate: 246 assignments saved to nine drafts; the two 12 October employee days are now 07:00–15:30 with crosses_midnight=false, and their prior night revisions are retained. OT conditions were not filled or published by the agent.
