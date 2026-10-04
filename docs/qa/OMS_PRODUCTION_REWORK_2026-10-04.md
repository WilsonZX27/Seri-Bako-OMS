## 2026-10-04 current verified release — v9.2.79 / database 324 + 326 (325 pending)

Deployment `6DUNX69vZnWaH7RBRZAuisokn4WX` succeeded and the formal alias is https://system.seribako.com.my. Commit `0103a2f9` passed strict TypeScript, lint, hosted build and 1,381 regressions. Owner-authenticated checks verified the corrected Plan phone drawer, product-order guidance and focus restoration, and Packaging at 390/820/1180/1440px without root overflow. The phone inline filter card is 130px high with no empty primary row. Earlier release evidence below is historical; the larger QA goal remains open, including database performance/permissions, provenance and complete workflow/a11y acceptance.

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

### Verified v9.2.77 deployment

Deployment `HDzwJWpTrajQF5ErPL2p1vP57ciE` completed its hosted production build and aliased to https://system.seribako.com.my. Fresh login-page reload independently displayed v9.2.77. Application commit `835fc3e8` and baseline commit `9ee40b6d` are pushed to `origin/codex/system-quality-verification`. Authenticated acceptance is still blocked by the browser session redirect; this is deployment evidence only. Database 325 was not applied. Broader rework remains active.

## Validation and database disposition follow-up

- Six server-action tests execute actual validation and error formatting with inert RPC/email clients: zero minima and empty recipient config persist as entered, invalid email/event quantity and outlet role stop before RPC, approval with unavailable mail reports queued, and schema-cache table details do not leak to operator feedback. These test application boundaries, not database role isolation. Full regression count is **1,365 passed**, with strict TypeScript and lint passing; logs `/tmp/seri-978-{types,lint,tests}.log`.
- Actual rendered event-form check at 1280px: zero entered products opened the collapsed product details, showed the shared alert, focused the first quantity, and left fixture save count at zero.
- Browser viewport calibration required making the temporary fixture tab active. Follow-up measurements verified all requested widths exactly: 390/820/1180/1440, for Plan, Settings and Events (12 checks). No whole-page overflow; one active responsive fieldset (`compact` below 1280, `desktop` at 1440). These are inert fixture screenshots, not logged-in production acceptance: `/tmp/seri-oms-rework-977/verified-{plan,settings,events}-{width}.png` and `responsive-evidence.json`. Earlier incorrectly labeled viewport files are superseded.
- Read-only production catalog verified all eight no-policy Info tables have RLS enabled, no policies and postgres ownership. Service role has SELECT on all eight. Client grants are absent for management_email_dispatches and purchase_request_stock_holds; authenticated SELECT alone remains on production_delivery_sequences and production_planning_requests. Four legacy supplier audit tables still have anon/authenticated SELECT plus authenticated INSERT grants, denied by zero-policy RLS. Tighten obsolete grants only after caller review and authorization; do not add permissive policies to silence Info. Evidence `/tmp/seri-internal-table-access.json`; no grants/policies changed.
- The 285 unindexed FK findings map to live catalog estimates: 141 on zero-estimate tables, 75 on 1–99 rows, 46 on 100–999 rows, 23 on at least 1,000 rows. These estimates are prioritization evidence, not proof of zero rows or dispensable indexes. Highest-priority joins include outlet_daily_record_lines, attendance exceptions/results, stock transactions/lines and activity logs. Index implementation still requires exact column/parent-workload and plan evidence. No blind mass-index creation or unused-index deletion was performed.

The wider goal remains active. Persistent permission changes and the live RLS experiment remain unexecuted; authenticated business acceptance, partial manual-draft save and complete Advisor guard/index reviews remain open.

- Additional 390px shared-console checks verified invalid event closes the drawer and focuses its first quantity (no submit), valid event submits exactly once, bulk minimum Enter changes all three minimums without submitting, and settings save submits once. Esc restores the More actions trigger; body overflow is restored. Evidence screenshot `event-error-390.png`. The external submitter must be used before drawer unmount; the verified implementation uses requestSubmit with the actual button, preventing the browser's duplicate default action.
- Actual readonly role queries on all granted internal tables returned zero visible rows: four anon audit reads and six authenticated audit/operational reads. Evidence `/tmp/seri-internal-{anon,authenticated}.json`. This proves the SELECT denial for those current zero-policy/RLS states; it does not claim all SECURITY DEFINER callers have been reviewed.

- Shared review checks replace the generic rail count with exact product/outlet corrections and reuse the same checks for disabling review. Nine domain tests cover zero/missing, manual reasons, confirmed event floor, minimum/reduction overrides, surplus/shortfall, corporate separation/retention, yield/whole trays, invalid quantities and distinct outlet identity. Database route/configuration snapshots and authorization remain authoritative. Repeated default forecast/schedule prose was removed from the routine rail.

## v9.2.78 final application checks

Strict TypeScript, lint and **1,377 regressions** passed after all shared-console and review-check changes. Three actual React/Radix Slot render tests preserve secondary single-child links when mobile primary extraction clones content; nested secondary links and multiple actions survive. Browser acceptance caught the former phone Plan drawer crash (Slot received an array rather than its required single child); source now preserves that shape. Recheck at 390px opened the real Plan More drawer with Delivery orders plus exact SC02/outlet quantity and tray guidance, without an empty page. Screenshot `plan-checks-390.png`; desktop guidance `plan-checks-1440.png`. This remains isolated rendered evidence, not logged-in production acceptance.

React best-practices review was applied to the changed TSX owners: event-driven validation, existing transitions, typed event handling, stable provider state, native requestSubmit semantics, no new fetches/dependencies/motion system, and no duplicated business state. Required fixture writes remain inert. Production database/migration and permission blockers are unchanged. Hosted v9.2.78 build/deployment was started; success will be recorded independently.

## Verified v9.2.78 deployment and authenticated surface checks

Deployment D2xa7BFBHrLG57s2d9n8SHNypRhB completed, alias system.seribako.com.my confirmed; footer independently shows v9.2.78. Owner session recovered. Fresh native-tab screenshots and measured DOM widths cover Plan/Settings/Events, Records, Insights, DO list and Packaging at 390/820/1180/1440px, with no root overflow. Files: /tmp/seri-oms-rework-977/live-{plan,settings,events,records,insights,do-list,packaging}-{width}.png. Width JSON: live-responsive-evidence.json and live-packaging-evidence.json. Earlier production-planning-* captures from stale DOM bindings showed Events instead of Plan and are excluded. Phone live-plan-mobile-actions.png confirms the real drawer opens with secondary actions; native Escape closes it and focus returns to Open more actions.

These checks preserve the existing unpublished ALMA plan and create no approvals, dispatches, DOs or inventory. The empty DO list is accepted as an empty list, not proof of print/detail workflows. ALMA yields and outlet minima remain unconfirmed; review correctly disabled. Mail service remains unconfigured. Comprehensive keyboard, contrast, reduced-motion, printed DO and end-to-end acceptance remain open.

Packaging loading exceeded the initial short wait and completed within the subsequent 15.2-second observation window, which includes automation overhead and is not a precise backend benchmark. Existing database baseline remains ~3.4 seconds. Product filtering updated the loaded report without an operational write. No speed improvement is claimed. A read-only 30-day catalog/data count found 1,545 completed packaging lines with wastage_provided=true and zero usage; none had false confirmation. This proves stored flags only: migration 319 historically backfilled flags by completion status, so it does not independently prove physical entry. Current report omits the usage provenance bit and no dedicated closing-confirmation bit exists; reporting provenance remains an open data gate. Do not fabricate historical confirmations or convert valid stored zeros to missing without evidence.

## v9.2.79 candidate follow-up

Fixed shared inline filters reserving an empty phone row (visible top gap on Packaging), packaging form bypassing usage confirmation flags, and review checks appearing in UUID order instead of visible product/outlet order. Removed the obsolete packaging-specific empty-row selector. Four actual React render regressions cover absent/explicit zero usage, prior-stock usage above today's receipt, absent blank header rows and genuine zero result counts. TypeScript and lint passed; 1,381 tests passed (loopback lifecycle test run with approved sandbox escalation). No local Supabase started. A suspected state-header bug was disproved: the legacy outlet sort key maps to status on the server; the proposed change was withdrawn, existing sorting remains intact.

## Verified v9.2.79 release follow-up

Deployment 6DUNX69vZnWaH7RBRZAuisokn4WX completed and aliased successfully. Formal authenticated footer reports v9.2.79. Phone Plan drawer opens; checks start SC01 in displayed product order; native Escape closes it and restores Open more actions focus. Screenshot: /tmp/seri-oms-rework-977/live-979-plan-actions-390.png. Packaging phone empty row is absent, filter card measured 130px, and all four actual viewport widths show no root overflow. Screenshots live-979-packaging-{width}.png, JSON live-979-packaging-widths.json in the same directory. Viewport override reset; temporary Events tab closed; user planning tab preserved and formal packaging tab retained for inspection. No approvals, dispatches or inventory created. The packaging form provenance regression is verified with inert actual-component rendering, not a production write. All wider open gates and approval dependencies remain unchanged.

## Database eligibility follow-up — migration 326 prepared, not applied

A disposable PostgreSQL fixture reproduced expired-but-active staff reading and configuring Planning through the legacy helpers. Migration 326 aligns planning_manager, planning_branch_access and planning_require_manager with the existing current_staff_id eligibility gate; Malaysia employment end dates remain inclusive. It changes no ACL, policy declaration or operational quantity. The fixture verifies ended/inactive/anonymous denial, eligible current-day/open-ended staff, and unchanged ACLs, SECURITY DEFINER flags and ownership. The production-planning integration suite passes 52 checks with 326. Production remains application v9.2.79 / database 324; 325 remains unapproved and this candidate is not yet applied.

Actual caller review (read-only live definitions): planning_require_manager, planning_validate_route and planning_validate_kitchen are postgres/service-only and entered through authenticated transactional RPCs. GRN/return cancellation and production-job transitions retain actor, company, branch, permission and draft/status guards in their private legacy implementations. Staff status/access wrappers delegate to private company-scoped functions with last-Owner protection. The schedule decision chain still needs its next private wrapper checked; opening-stock item/company enforcement still needs the movement function checked. These findings do not prove all 157 authenticated SECURITY DEFINER functions safe. No privilege was revoked to hide the warnings. Fresh preflight confirms planning_manager and planning_branch_access still have PUBLIC/anon execution (covered by the unapplied 325); older catalog ACL evidence is superseded for these functions.

Eligibility evidence: scripts/v9/test-planning-staff-eligibility-db.mjs, tests/fixtures/production-planning/staff-eligibility.sql and /tmp/seri-planning-eligibility-test.log. Broader flow: /tmp/seri-planning-326-workflow.log. No local Supabase or real operational test writes.

## Verified migration 326 and packaging read-scope evidence

Independent migration 326 was approved by automatic review and applied through a guarded transaction. The operation checked all three original definition hashes, preserved ACLs, SECURITY DEFINER flags and owners, and atomically recorded 326 in the migration ledger. Read-back confirms 324 and 326 present and 325 absent; no denied 325 or packaging RLS action was executed. Evidence: /tmp/seri-326-{preflight,apply,verify}.json. The source is committed as 288b1d05. Authorised future db push needs --include-all for the earlier 325 once approved; the current ledger is intentionally not described as contiguous through 326.

Owner-authenticated production Planning still loads, exposes the draft's editable inputs and shows no load error. No values were saved. Screenshot /tmp/seri-oms-rework-977/live-326-owner-plan.png. Full regressions: 1,381 passed; SQL eligibility tests and the 52-case workflow passed. This fixes a real ended-staff access boundary; it does not clear the outstanding Advisor categories or prove every RPC safe.

A read-only seven-day execution plan, same Owner identity and unchanged Daily Records RLS/query shape, measured 538.054ms execution / 18.487ms planning. Source page currently eagerly reads 30 days even when displaying seven; the old 30-day baseline was 3,415.691ms. This is evidence for selected-period loading, not a deployed page-speed claim. Evidence: /tmp/seri-packaging-explain-7.{sql,json}. Thirty-day RLS optimization remains pending its specific approval.
