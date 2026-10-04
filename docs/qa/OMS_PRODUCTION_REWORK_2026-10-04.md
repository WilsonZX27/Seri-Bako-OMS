# OMS production rework — 2026-10-04

Status: **active; previous feature acceptance is superseded by this wider review.**

The user's rejection covers production database advisors, actual query latency and the operational clarity of the new workspaces. A green regression suite or successful deployment cannot close these requirements.

## Baseline evidence

User screenshots show 177 security warnings, eight security information findings and 528 slow queries in a 24-hour overview. A fresh linked-production Advisor export on 2026-10-04 contains **542 findings: 204 WARN, 338 INFO, zero ERROR**, including performance findings absent from those screenshots:

| Finding | Count | Required disposition |
| --- | ---: | --- |
| Anonymous-executable SECURITY DEFINER functions | 15 | Inspect exact signatures and legitimate callers; remove anonymous execution from operational functions, preserve authorized authenticated calls and service jobs. Test role access. |
| Authenticated-executable SECURITY DEFINER functions | 157 | Review actual permission/company/branch guards; legitimate guarded RPCs need evidence, not blanket revocation. |
| Mutable function search path | 2 | Inspect natural_sort_key and set_updated_at bodies; set a compatible fixed path and verify behavior. |
| RLS initialization per row | 10 | Inspect policy expressions and EXPLAIN; hoist stable auth identity lookups where equivalent. Verify company/branch isolation. |
| Multiple permissive policies | 19 | Compare combined semantics before consolidating; do not narrow or widen operational access accidentally. |
| Unindexed foreign keys | 285 | Map to real joins, deletes and table size; add measured necessary indexes and document cold-table deferrals. |
| Unused indexes | 45 | Inspect constraints, statistics age and workload before removal; do not delete uniqueness or rarely needed indexes blindly. |
| RLS enabled without a policy | 8 | Confirm internal tables have no client grants; retain deny-by-default or an explicit equivalent denial, never add permissive policies merely to clear Info. |
| Leaked-password protection | 1 | Inspect auth configuration and provider availability; report any plan/configuration dependency. |

The highest cumulative query-time entries currently returned by the CLI are Supabase catalog/Studio introspection, including extension enumeration (53.8% of reported execution time) and function catalog reads (14.9%). These are not proof that OMS business queries are fast. Collect a separate business-query baseline, mean/max/calls/rows and representative plans; do not reset statistics to create a clean-looking report. Current exports stay in /tmp and are not committed because SQL may contain operational information.

## Execution and closure gates

1. **Database access and advisors.** Inspect live definitions/grants/policies. Implement forward-only, reviewed migrations. Run isolated anonymous/authenticated/manager/outlet/company tests, apply authorized production changes, refresh both advisors and record finding-level before/after. Account for every warning/info category with a verified fix or explicit justified dependency.
2. **Real performance.** Map top business queries to routes and measure representative cold/repeat/filter interactions. Inspect plans and actual row counts; fix missing composite indexes, repeated permissions reads, per-row stable lookups, N+1 and all-history loads based on evidence. Record comparable before/after results; first inspect with EXPLAIN, then use bounded read-only ANALYZE where safe. Database and route evidence are separate.
3. **Operational flow and copy.** Audit Planning, Settings, Events, DO, Daily Records, Insights and Packaging against existing OMS owners. Remove repeated disclaimers, implementation jargon and redundant status prose. Keep instructions at the field/action that requires them; suggestion math and technical provenance belong in optional evidence. Show the next necessary action and the precise blocking fields. Preserve independent Received/Wastage, actual dispatch and controlled corrections.
4. **Shared interaction and layout.** Reuse WorkspaceGrid, WorkspaceTabs, FilterBar, Table, SelectControl, ModalShell and status/loading primitives. Review keyboard/focus, error location, touch targets, motion preferences and overflow at 390/820/1180/1440. Verify representative existing consumers whenever a shared primitive changes. No independent feature-specific visual system.
5. **Ship and prove.** Required type/lint/build and meaningful business/security regressions; no local Supabase stack. Deploy under existing authorization, verify production database/application compatibility, authenticated pages and actual operational paths without fictitious approvals, deliveries or inventory. Update DESIGN, design-system, PRODUCT, ARCHITECTURE, schema and this ledger with verified versions and unresolved dependencies.

## Acceptance matrix

| Requirement | Current evidence | Closure state |
| --- | --- | --- |
| Advisor warnings and information individually accounted for | Fresh full export and grouped counts | In progress |
| Business slow queries measured and optimized | Aggregate outliers captured; business-only baseline being collected | In progress |
| Concise, familiar operational UI | Repeated prose and technical jargon identified in Planning and Insights source | In progress |
| Reusable components and consistent design | Existing owner inventory available; rendered re-audit required | In progress |
| Responsive/a11y/motion checks after changes | Prior-release checks cannot prove the new changes | Pending |
| Live deployment and end-to-end evidence | Prior v9.2.76 is deployed; this rework is not yet released | Pending |
| Documentation matches actual release and dependencies | This plan records the wider unclosed scope | In progress |

Do not mark this rework complete while any required gate lacks direct evidence. Unknown business quantities, email credentials and scheduler limitations remain explicit dependencies and must not be replaced by fabricated configuration.

## Verified progress

- Business query `get_outlet_packaging_report` averages 3,774ms across six observed calls (maximum 4,145ms). An authenticated Owner READ ONLY EXPLAIN ANALYZE reproduced **3,416ms** execution, 1,545 line-level record authorization subplans and 1,778 record/product index probes. This is a measured RLS repetition bottleneck; adding arbitrary indexes will not alone resolve it. The baseline plan is `/tmp/seri-packaging-explain-before.json`.
- Migration 325 is prepared. A rollback-only transaction against actual production function definitions checked all 15 function signatures, removal of anonymous execution, preservation of authenticated and service access, and seven natural-sort cases. It passed and rolled back. Persistent application was rejected by automatic approval review because specific function/role changes needed explicit approval. Approval is pending; production permissions and ledger are unchanged.
- Repeated Planning rail disclaimers and technical version text were reduced; evidence retains the forecast inputs. Planning header and empty-state copy now focus on the operational task. Insights coverage/error copy was shortened. These source changes are not yet deployed or rendered-accepted. Strict TypeScript passed.

- Packaging’s correlated line policy has a set-membership candidate. The isolated SQL fixture verifies identical visible line IDs and identical report JSON for >1,000 rows, retained missing/zero/old-balance/draft behavior, an unrecognized identity seeing no lines, and anonymous denial. Source: tests/fixtures/packaging/line-policy-candidate.sql. This candidate is NOT a production migration. An attempted production rollback performance check was rejected by automatic approval review pending explicit authorization of the temporary RLS change. No production policy was changed and no improvement is claimed yet.
- Strict TypeScript and all **1,356 regression tests** passed after the initial copy edits and reviewed/applied-version documentation distinction. The Packaging isolated fixture also passed. The full user objective remains active; no release or completion claim has been made for this rework.

## v9.2.77 application rework evidence

- Planning hydrates only the current tab and selected plan version. Settings and Events skip plan, DO and outbox reads. Forecast history retains exact pagination and bounds concurrent chunks to four. Regression tests verify the query scope and stale-version fallback.
- Product rules and scheduled events compose the shared Table, OperationalList/Row, SelectControl and Input owners. ResponsiveFormFields disables the hidden representation so duplicate required inputs cannot intercept native validation. Product search preserves controlled edits and Enter does not submit settings. Bulk minimum Enter applies the value locally, with negative/nonfinite values rejected.
- Strict TypeScript, lint and all **1,359 regression tests** passed after the final bulk-input change. Evidence: `/tmp/seri-977-final-{types,lint,tests}.log`. No local Supabase stack was started.
- An inert browser fixture at 390px verified edited tray yield survives filtering, search Enter leaves the save count unchanged, and settings submit a real zero minimum and empty recipient list. All backend actions are disabled/stubbed; these are UI checks, not production business writes.
- Attempted viewport overrides did not change the fixture's measured 390px viewport. Files labeled with other widths are not valid acceptance evidence; tablet/desktop acceptance is still pending.
- A fresh production Planning tab redirected to login even after the user reported login. Session restoration was requested; no credentials were read.
- Hosted production build started as deployment `HDzwJWpTrajQF5ErPL2p1vP57ciE`; completion and alias verification remain separate gates until recorded below. Local build lacked public environment variables. Automatic review rejected downloading all production environment values; hosted build uses existing platform configuration without copying credentials locally.
- Persistent migration 325 and the rollback-only live RLS experiment remain unapproved after automatic review rejection. Neither was executed. No measured production packaging speed improvement is claimed.

Remaining operational defects to resolve include partial draft save for manual quantities, event quantity error location, full four-width authenticated acceptance and complete Advisor-category disposition. Email provider and unconfirmed business configuration remain dependencies. This release candidate does not close the wider goal.
