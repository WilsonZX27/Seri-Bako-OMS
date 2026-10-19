# Asset readiness and measured optimization

## Final asset interface checkpoint — v9.2.102 deployed, 2026-10-09

Formal system.seribako.com.my is on v9.2.102. Migration 339 remains applied; no business rows changed during subsequent UI releases. All 1,464 regressions passed and the hosted build completed type/lint checks. Daily Checklist filters now precede a compact status register, progress follows the selected location, and historical inspections are collapsed. Its final five-width screenshots show no root or table overflow and fully visible Inspect links. Phone submission remains fixed; the tablet toolbar stays fixed above navigation after scrolling at 820/1143px. Earlier v9.2.99 sticky-toolbar verification failed and is superseded. Both original photos opened after the privacy migration. Evidence and exact limits are in docs/qa/ASSET_SCOPE_UX_2026-10-09.md. Human visual approval, keyboard overlap and real business submission are not claimed; Penang confirmed configuration remains separate.


## 正式发布核验 — 2026-10-09 v9.2.98

339 已在正式 Supabase 项目执行，配套部署 dpl_8Nergf2V4zx62ZJkGBEDjEr3sBm1 已提升至 system.seribako.com.my。员工、经理及主管均受所属／获授权门店限制；Overview 与 Maintenance 限 Super Admin、Manager、Supervisor。Super Admin 保留公司范围访问。

正式迁移后 13 张资产业务表的行数及整行指纹全部与冻结快照相符：445 个编号、已知数量 2,080、31 项未知数量，21,988 条历史检查与 2 份已验证附件均保留。八种现有角色身份的线上 SQL 只读验证通过：门店范围、完整历史范围、管理功能限制、原始字段与私人 Storage 隔离、直接写入拒绝。这不是八个独立浏览器登录验收。

预览实际登录后检查了 390／430／820／1143／1440 五个概览宽度，根页面无横向溢出，两张趋势图均为 200px。实际验证桌面右 Console、ALMA 筛选返回 73 项及名称排序、紧凑维修队列、ALMA 检查完整载入 73 项、手机全部勾选／撤销、异常展开和未保存丢弃保护；390px 提交栏固定。五宽度正式 ALMA 清单均完整显示 73 项且无横向溢出；进一步视觉核验发现 820／1143px 的提交入口隐藏，正在发布 v9.2.99 置顶操作栏修复，不能将该问题记为已通过。正式域名已确认 v9.2.98 与资产数量。两份原始照片也在 339 应用后通过正式 OMS 路由成功打开。完整工作树回归通过 1,464 项。截图保存于 outputs/asset-migration-private/2026-10-09/rework-339/。

未宣称完成项：正式检查提交被自动审批阻止，以免测试写入真实业务记录；提交负载与数据库生命周期由隔离测试覆盖。独立员工浏览器会话、每个明细在每个宽度的交互及键盘遮挡尚待完整验收。Penang 厨师长确认资料仍未齐，不应将发布当作整个三批计划收口。原先 v9.2.97 和未应用 339 的记载作为历史阶段保留，以本段为最新状态。


## Reopened UI acceptance — 9 October 2026

The owner rejected the shipped interface. Earlier root-overflow checks and v9.2.97 density statements below do not prove visual or task-flow acceptance. The revised plan is ASSET_UX_REBUILD_PLAN_2026-10-09.md. A v9.2.98 candidate has built successfully without moving the formal system domain. Its preview needs an authenticated session before real interface acceptance. The full working-tree regression suite passed 1,461 tests; the isolated release package's retained asset suite passed 11 tests. These counts describe different scopes.

The owner explicitly authorized migration 339 and its paired frontend release. Phase A additive identity/checklist RPCs are applied; existing read policies and formal v9.2.97 remain in place. Full 339 was rehearsed in a hosted transaction with eight existing role identities, asserting assigned-location scope despite prior broad grants, complete check/maintenance history, private Storage scope, raw source-column denial, management overview gating and direct-write denial, then rolled back. This is SQL identity evidence, not eight separate browser logins. Final restrictions, formal alias promotion, responsive screenshots and interaction acceptance remain pending. Source asset quantities and history were not intentionally changed.

Current checkpoint (9 October 2026): the owner authorized activation at action time; the guarded final asset batch is live in the existing OMS project. Thirteen-table production reconciliation passed before activation and again after browser acceptance, allowing only the authorized batch state change. Both verified original photos opened through the actual Owner OMS route. Eight actual-role SQL identity simulations passed full ledger and private Storage scope in the live environment. Five workspace views render; overview, maintenance queue and Gurney check inputs passed five-width root-overflow checks. Unsaved Stay/discard and zero draft retention passed with no business submission. The two density issues found during acceptance are corrected and deployed in v9.2.97; both updated views passed five-width checks. Real browser write lifecycles and separate non-Owner sessions are not claimed. The old system remains stopped; no technical write lock is claimed. Penang confirmed configuration remains outstanding. Dated sections retain historical evidence and do not override this checkpoint.

Version 2 recovery was additionally rehearsed against the full private source snapshot: the runner reopened the durably written recovery file, checked both full-state fingerprints and restored the disposable ledger. This verifies file-based staging recovery at source volume. It does not verify legacy attachment bytes, hosted Storage or recovery after live operations.

## Optimization and feature priorities after the asset rework

The first priority remains acceptance of the current asset task flows, not adding more dashboard content. The source facts below suggest focused follow-ups:

| Evidence in the current implementation | Useful next improvement | Completion evidence |
| --- | --- | --- |
| Maintenance has status, priority, descriptions and authored updates, but no structured assignee or due date | Add an authorized assignee and optional due date, then show an owned queue and overdue work | Assignment history, scoped user selection, and real manager/staff task completion |
| Imported author names are preserved; comments already exist as maintenance and transfer updates | Keep comments attached to the record; add internal mentions and unread indicators only when the recipient can access that record | No cross-store notifications or attachment links, preserved authors/times, and clear read state |
| 31 holding quantities are unknown | Provide a manager queue for physical confirmation, preserving unknown until an explicit authorized observation | Unknown-to-confirmed audit, distinct zero, and transfer protection until confirmation |
| Daily checks are distinct from physical quantity counts | Keep quick condition checks; offer a separate scheduled physical-count task when needed | Checked status never creates a quantity observation, and actual count discrepancies require an exception |
| The migration preserves warranty fields, but legacy missing dates cannot establish expiry | Add expiry reminders only for valid recorded warranty dates and verified supporting attachments | Unknown dates remain unavailable; reminders drill into the source record |
| Hosted SQL reuse improved one measured overview query; prior Inventory loading remains an observation rather than a diagnosed cause | Measure complete page request count, server latency and browser interaction before optimizing | Repeatable measurements with date/data volume and comparable before/after scope |

These are recommendations, not shipped features. New notifications stay internal to OMS unless the owner separately requests an external channel. No automatic repair approval, purchase request, transfer or production reduction is implied.

## Query baseline

`scripts/assets/benchmark-queries.mjs` imports the reviewed source volume into disposable PostgreSQL, applies migration 337 and exercises asset SQL with its RLS policies. The actor and permission helpers are synthetic. Hosted authentication, PostgREST, Storage, network and browser rendering are excluded. Eighteen measurements per query include three initial runs excluded from the fifteen warm measurements below.

| Query | Warm median | Warm p95 |
| --- | ---: | ---: |
| Overview | 61.76 ms | 63.51 ms |
| Asset register | 1.63 ms | 1.70 ms |
| Register count | 1.52 ms | 1.55 ms |
| Maintenance queue | 0.35 ms | 0.43 ms |
| Daily check queue | 0.69 ms | 0.81 ms |
| Location checklist | 0.27 ms | 0.32 ms |
| Maintenance history | 0.73 ms | 0.81 ms |

The private report is retained outside Git. These are warm local SQL timings, not page-load targets. Keep the existing register, checklist and maintenance queries. Overview is the next hosted measurement candidate: its plan recorded substantially more shared-buffer hits. Measure actual authorized requests and query plans before changing it; preserve company and location checks through any optimization.

## Required gates still open

| Gate | Current evidence | Next work |
| --- | --- | --- |
| Hosted integration | Deployed Owner inactive-page smoke checks, eight actual-role SQL identity simulations, local lifecycle/concurrency checks and 1,457 passing regressions; 337/338 applied | Verify real OMS operational views and scoped private attachment delivery; SQL identity simulation alone does not prove authenticated browser delivery |
| Source attachments | All six source references resolved; two folder inventories reviewed; both Storage download-back JPEG hashes match originals; two attachment rows finalized | Verify delivery through the scoped OMS attachment route during live acceptance |
| Recovery after copying attachments | Durable version-2 checkpoint preserves the original pre-final-delta destination; full-volume local restore and guard tests pass | Production thirteen-table equality passed; the retained staging snapshot must not erase live operations |
| Unsaved navigation | All asset input forms have scoped session drafts. Real local browser verified recovery after non-cancelable repeated Back, including inspection selections, zero counts, remarks and attachment name/type. A synthetic file was selected: upload enabled, then disabled after leaving/reentering while name/type recovered and the reselect notice appeared. No upload was submitted. Explicit discard and action-completion clearing covered; failed actions retain drafts. Identity changes remount the workspace. 1,454 tests passed before the subsequent count-boundary correction; configured project build passed at the draft-recovery checkpoint | Local Storage SecurityError fixture now verifies visible recovery warning and continued name/note editing; no save/upload submitted. Verify hosted authentication scope before claiming complete operational acceptance |
| Final migration | Owner-confirmed operational freeze, final export and fully guarded delta committed; all source attachment bytes verified; zero live batches | Authorized operational cutover is complete; keep legacy entry stopped and preserve subsequent OMS operations in any recovery; no technical legacy write lock is claimed |
| Penang readiness | Chef confirmation worksheet exists | Obtain confirmed yield, shelf-life, overnight rules and minimum display quantities, then validate a dated plan |

## Product decisions

Prefer contextual comments already associated with maintenance and transfers: they retain author, time and record context. An independent chat module would add another place to search without solving a demonstrated task. Extend record comments only after real users identify a missing workflow.

Keep unknown quantity distinct from zero. Prioritize quantity confirmation and dated exception queues over additional dashboard cards. Warranty reminders can be considered once warranty dates and attachment completeness are reconciled; incomplete source fields must not generate confident alerts.

Use the reusable date range picker on period analysis, beginning with Daily Records Insights. Preserve single-date controls for operational records and checklist days. Add it to asset trends when the real reporting workflow requires a selectable interval, with the same business-date and comparison rules.

No broad dependency cleanup, query rewrite or new automation is justified by this baseline alone. Capture hosted request counts and browser interaction timings before choosing further performance work.

## Result-count verification

Asset register, maintenance/transfer lists, location holdings and paged maintenance/master history reject missing, negative, fractional or unsafe exact counts instead of presenting zero. Actual compiled workspace-query tests verify null/undefined/invalid counts fail, while zero and positive counts remain valid. Targeted query tests, strict TypeScript and ESLint passed for this change. Production remains v9.2.95; the current OMS browser session was observed authenticated, which does not prove hosted asset integration.

Location holdings, master history and maintenance history additionally reject invalid/nonfinite/out-of-bound pages before database lookup. Compiled query boundary tests exercise page 21 (offset 1,000), company filtering, exact counts, unavailable counts and real zero independently; they establish query pagination behavior, not hosted row-volume acceptance.

## Current release checkpoint — 8 October 2026

After the result-count and history-pagination corrections, the configured full Next.js production build exited successfully and the full project regression suite passed 1,457 tests with no skips. Logs are retained privately outside Git. These checks prove the current local candidate builds and its automated regression passes; they do not prove real tenant sessions, Storage delivery, the 445-asset final migration or operational cutover.

Completion remains unproven against the accepted delivery requirements:

| Requirement | Evidence available | Missing authoritative evidence |
| --- | --- | --- |
| Five asset workspace views and compact operational input | Source routes/components, local responsive browser fixtures | Authenticated deployed asset workflow and role/location acceptance |
| Original IDs, quantities, metadata, historical relations | Reviewed private snapshot, deterministic import and full-source rehearsal | Frozen final export, actual destination reconciliation and release record |
| Partial transfer lifecycle and concurrency | Local SQL/RLS and independent PostgreSQL backend tests | Real approved test-environment sessions and final operational acceptance |
| Photos, invoices and warranty attachments | Private upload/copy tools, local content/permission/idempotency tests | Authorized original bytes and folder inventories, actual hosted copy/readback |
| Daily operating checks and Event handling | Owner-confirmed rules, source implementation and local SQL tests | Deployed calendar/checklist acceptance with authorized users |
| Contextual comments and traceability | Maintenance/transfer notes and paged author/time history | Real-user review of the deployed flows |
| Recovery and one-time cutover | Durable inactive-ledger recovery and guarded attachment checkpoint | Actual copied-object recovery rehearsal, final freeze/delta, signed-off cutover |
| Existing modules stay usable | Current project regression plus earlier authenticated v9.2.95 density checks | Authenticated integration regression of the final asset release |
| Penang valid production plan | Chef confirmation worksheet and protected manager/manual modes | Confirmed chef inputs and a dated, valid two-outlet plan |
| Optimization and feature decisions | Source-volume SQL baseline and evidence-based product decisions above | Hosted page/request/interaction measurements before further performance changes |

Do not mark these requirements achieved on the strength of local tests. An independent test environment is optional after the owner authorized existing-project inactive staging. Real hosted acceptance remains required before cutover. Source attachment access remains deferred at the owner's request. No source attachment retrieval, production migration or activation was performed at this checkpoint.

## Authorized direct staging — 8 October 2026

The owner authorized direct migration into the existing OMS Supabase project. Production migration 337 was applied alone in a transaction; migration 325 was not applied. Before-state permissions, role grants and migration history were saved privately. All thirteen new asset tables were independently verified with RLS enabled.

The reviewed source was then staged through the authenticated Supabase SQL Editor without extracting production credentials. Its query-size limit required smaller transaction batches. Each batch preserved complete materialized rows, checked the exact company prefix and inactive state, compared full typed rows before commit, and had a durably written complete-prefix version 2 recovery snapshot before execution. The exact SQL batches and recovery fingerprints were first rehearsed locally, including restoring the final snapshot. Private scripts, payloads, snapshots and receipts remain outside the repository.

Independent production readback returned 445 assets and unique codes, 445 holdings, 2,080 known units, 31 unknown quantities, 152 multi-quantity holdings, 13 locations, 15 maintenance requests, 335 maintenance updates, 21,904 checks and two attachment records. Original permissions, role grants and preexisting migration history matched their before-state hashes/records. All asset tables retain RLS and live batches remain zero. Every imported batch row was fully reconciled during its transaction; source attachment bytes have not been verified or fetched.

This proves authorized inactive staging of the reviewed 8 October snapshot, not final source freeze, final delta, live role/Storage acceptance or formal cutover. The source system continues to be authoritative until that cutover. The existing-project staging path replaces the earlier assumption that an independent Supabase project was mandatory; a separate test project remains an option, not a requirement.

Application v9.2.96 was deployed successfully to the formal OMS domain after all 1,457 regression tests passed. The isolated deployment artifact excludes source workbooks, private migration snapshots, QA outputs and credentials. The earlier artifact build failed due to omitted runtime helpers; a mistaken source-directory retry was canceled with confirmed CANCELED status. The corrected isolated deployment reached Ready and the formal alias. Asset navigation redirected to login in both a temporary tab and the original OMS tab; login footer confirmed v9.2.96. The owner was asked to restore the expired session before authenticated acceptance. No activation or source freeze was performed.

## Authenticated deployed acceptance — 8 October 2026

The restored real Owner session accessed the deployed v9.2.96 asset workspace. Its five navigation entries are present and its inactive migration gate correctly prevents operational entry. At 390, 430, 820, 1143 and 1440 CSS pixels, the asset entry, date-range dialog and posted Queensbay daily record had no root horizontal overflow. The deployed date-range Cancel action retained the original range. Posted daily quantities remained locked, and no Sold out entry was present. Packaging retained the 7 October physical counts on 8 October and reported zero outlets updating the latest day's chart point; no current-day stock was invented. Procurement, Inventory, Production Jobs and Attendance rendered under the real Owner session. These are read-only smoke checks, not submission regressions.

Two production database acceptance transactions simulated JWT subjects of actual existing active staff, one representative for each of eight roles: Owner, Manager, Finance, Purchasing, Kitchen, Outlet Supervisor, Outlet Staff and People Operations. Both temporarily changed the asset batch state only inside their uncommitted transaction and explicitly rolled back. Assertions verified inactive asset denial, expected company/location holdings and location counts, company-wide asset completeness, permissionless denial, direct table write denial, and history visibility for the latest check per source location plus all fifteen imported maintenance requests. The result independently reported eight roles and zero live batches after rollback. These SQL identity simulations are not separate authenticated browser sessions and do not prove Storage delivery or live mutation workflows.

An earlier combined scan over the full historical ledger hit the SQL Editor upstream timeout. Independent follow-up reported zero active/idle acceptance sessions, zero live batches and 445 unchanged assets. Smaller scope and indexed-ID history assertions passed. This supplies a hosted query-size/runtime constraint; do not infer that full history UI requests are fast from the earlier local SQL baseline. Positive live workflow, Storage, final source delta/freeze and formal cutover remain outstanding. Private SQL and result receipts are retained outside Git.

## Hosted read-scope optimization — migration 338

Production EXPLAIN ANALYZE under an actual active Owner JWT subject exposed a real bottleneck in the original 337 policies. One execution of the overview RPC took 24,929.434 ms with 352,354 shared-buffer hits; register and date-filtered checklist reads took 166.040 and 178.147 ms. This measured database execution only, excluding HTTP, Auth round trips and browser rendering.

Migration 338 changes six asset SELECT policies to reuse the RLS-filtered accessible-location and visible-holding/transfer sets as statement subqueries. Current company, live-batch and read permission checks remain mandatory. Mutation helpers, table grants, role grants, all other modules and business data are unchanged. This avoids repeating staff/role/location helper lookups for every historical row; it does not introduce cross-request permission caching.

A production rollback rehearsal compared the complete Owner overview JSON before/after and found it identical. Candidate timings were 586.061 ms for overview, 3.570 ms for register and 40.825 ms for checklist, with overview buffer hits reduced to 14,293. These are single-run comparisons, not medians, p95s or end-to-end guarantees. An additional rollback rehearsal tested eight existing active role representatives against exact accessible holdings/location counts and the entire imported checklist and maintenance ledger. Inactive gate, direct-write denial, location scope and full history scope passed.

Local differential acceptance compared complete visible rows across twelve asset tables and the overview before/after 338, including branch-scoped, company-wide, permissionless, independently live foreign-company and inactive states. The existing database lifecycle checks also passed. Six policy definitions were saved privately and a restoration SQL artifact durably flushed before application. Guarded migration 338 was then applied alone; independent readback verified its exact stored source, six authenticated SELECT policies, thirteen RLS-enabled asset tables, 445 unchanged assets and zero live batches. No source record was changed and no permanent activation was performed.

The optimization closes the measured database bottleneck; hosted live interaction/Storage acceptance and final cutover remain separate requirements.

Post-release verification repeated the eight-role full-ledger assertions against the deployed 338 policies, without altering those policies; all passed and activation rolled back to zero live batches. A separate post-release EXPLAIN execution measured overview 1,193.384 ms, register 4.210 ms and checklist 39.521 ms. The variation from the rehearsal reinforces that neither single run is a latency guarantee; the measured overview is substantially faster than the 24,929.434 ms original baseline. The final full regression run passed all 1,457 tests with zero skips. Two earlier runs failed the migration-ceiling documentation contract until PRODUCT/schema authority was updated; they are not counted as successful verification. The initial sandboxed run also could not open the test-only loopback server; the existing suite then ran with approved loopback access.

### Authorized original attachment review — 2026-10-08/09

The owner authorized the two original Drive images and their two source folders, replacing the earlier deferral. Both original JPEGs were downloaded through their Drive file viewers and checked locally (167,792 and 172,345 bytes). Each folder contained one visible member; the selected member’s Details iframe thumbnail identified the exact original Drive file ID. The six historical references reconcile to two files and two reviewed folders, with zero unresolved local references. Private evidence is retained outside Git.

Both files were uploaded through the authenticated Supabase Dashboard into the existing private `asset-documents` bucket using the reviewed company/asset/legacy-attachment paths. Dashboard listings confirm upload completion. Storage download-back content hashes have **not** yet been verified and `verify_legacy_asset_attachment` has **not** been called: both attachment metadata records remain unfinalized. Upload success alone is not cutover acceptance. One empty nested directory was created during navigation and is recorded in the private receipt for later cleanup; no business file was uploaded there.

The owner scheduled legacy entry cessation for 8 October 2026. This is a scheduled date, not verified proof that the old system is frozen. Final source export/delta reconciliation, attachment readback, live operational acceptance and formal cutover remain outstanding.

### Owner-confirmed source cessation and final export — 2026-10-09

The owner confirmed that all legacy users stopped business entry. This is an operational freeze confirmed by the owner; no technical source write lock is claimed. A fresh Google Sheets XLSX export after that confirmation contains 445 unique assets, 2,080 known quantity, 31 unknown quantities, and 21,988 daily checks. Comparison with the staged snapshot finds 84 added checks dated 2026-10-08, 84 associated master/holding updates, no removed rows and no historical identity reuse. Master changes are limited to Last Checked Date (84), Last Checked By (44), and Updated Date (84). Maintenance/history and both attachment rows are unchanged. Local preparation and reconciliation report zero issues. Attachment evidence is rebound to the final export SHA and passes all six-reference reconciliation.

The final delta is prepared, **not yet applied** to production. Storage originals are visible in private previews but downloaded-byte readback is still outstanding. No attachment verification or live activation has been recorded.

### Final delta rehearsal and guarded production attempt — 2026-10-09

The exact compact SQL delta (222,359 bytes) was exercised against the complete materialized staging ledger in local PostgreSQL, followed by full after-state checks and a successful restoration to the exact original ledger. Durable version-2 before/after recovery snapshots were written and fsynced before the production attempt. The production transaction stopped at its first batch precondition, before any insert/update, and was explicitly rolled back. Production still has the original rehearsal batch and 21,904 checks.

A direct production comparison of the complete expected import-batch record reports JSONB equality and identical server-side text/semantic hashes. However, the hashes generated in the local PostgreSQL 18 rehearsal do not match PostgreSQL 17.6 production across nonempty tables. The cause remains unproven; cross-engine hashes are not accepted as evidence of a business change or used to waive the guard. The subsequent semantic-hash candidate was rehearsed locally but **not** applied. Before retrying, full expected-row equality needs to be evaluated on production or the serialization discrepancy resolved. No live activation occurred.

### Final delta applied with timezone-stable full-ledger guards — 2026-10-09

The precondition discrepancy is resolved: the reviewed staging ledger rendered timestamptz values in Asia/Kuala_Lumpur, whereas the production SQL session rendered UTC. Explicitly setting the transaction-local timezone to Asia/Kuala_Lumpur makes all 12 ledger-table full-row aggregate text hashes and counts match the materialized review. The earlier semantic-hash candidate was not used. Stored timestamps were not modified to address serialization.

The compact final delta (222,399 bytes), with complete before/after table hash and count guards, was re-exercised locally with restoration and then committed in production. All guards passed. Production now contains 445 assets and 21,988 daily checks; the final source SHA is `ee87deb7d361b8168d5308baafd27bd2d9b9b277fa365ff16abd7d7539abf736`. The new final batch is rehearsal, the earlier batch remains traceable as superseded, and live batches remain zero. Durable recovery version 2, exact SQL and production receipt/screenshot are retained privately. Attachment byte readback and finalization, live operational acceptance and formal cutover are still outstanding.

### Attachment download-back and verification complete — 2026-10-09

The owner supplied both Supabase asset-folder ZIP downloads from Downloads. Each JPEG’s archive member path matches its deterministic company/asset/legacy-attachment target. Extracted original bytes are 167,792 and 172,345 bytes; SHA-256 values match the independently downloaded Drive originals exactly. The first archive also includes the previously recorded empty nested-folder placeholder; it is not an asset photo and was not imported.

The guarded finalization transaction checked every final-delta ledger hash before invoking the service-only legacy verification helper for both files. Production now reports two verified attachment rows with the exact storage paths and content hashes, unchanged source/maintenance/location associations, and zero live batches. The final source SHA remains unchanged. Private receipts and the actual database result are retained. A recovery checkpoint candidate preserves the original rollback destination and incorporates the two verification fields; full checkpoint validation remains necessary before activation. Live browser operational/role acceptance and formal cutover remain pending.

### Attachment recovery checkpoint rehearsal (2026-10-09)

The shared `checkpointAttachmentRecovery` helper validated the complete materialized final ledger with both finalized attachment rows and storage-object entries. A durable version-2 checkpoint preserves the original pre-final-delta recovery destination. Local restoration reproduced its exact full-ledger fingerprint. This is a local rehearsal, not a production restore.

A read-only, time-zone-explicit query is prepared to compare every production ledger table against the checkpoint. Browser automatic approval review rejected Supabase origin access as broader than the named-project scope; production checkpoint equality remains unverified until access is restored. The asset workspace remains inactive; no formal cutover is claimed.

### Production recovery checkpoint equality — 2026-10-09

After owner confirmation of domain-level browser access restricted to project nnvdsaftiwpqkekjfrgc, the read-only transaction returned `tables: 13` and `all_match: true`. Each complete company ledger table hash and row count matches the validated attachment checkpoint, including the two attachment verification records and 21,988 daily checks. The query used the reviewed Asia/Kuala_Lumpur timezone. No asset business row was modified and no production restoration or activation occurred. The private result and screenshot are retained.

### Authorized activation and live acceptance — 2026-10-09

The owner explicitly authorized enabling the final batch and continuing acceptance. Guarded activation rechecked every ledger hash/count and changed only final batch 90795179-2e32-5ff7-9b2e-56892e0bb0b7 from rehearsal to live. Prior batch remains superseded. Staging restore now intentionally refuses this ledger; recovery after live business entry requires preservation of subsequent operations.

Actual Owner browser evidence covers all five views, original-ID search, multi-quantity holdings, imported maintenance authors/history and both source photos delivered through the OMS route. Eight actual-role JWT identity simulations passed full live ledger, location and private Storage scope with direct-table-write denial. No permission or bucket-publicity changes occurred.

The original user tab did not honor viewport overrides; its first attempted multi-width receipt is invalid and is not counted. A dedicated authenticated agent tab reported actual widths matching 390/430/820/1143/1440, with root scroll width equal at every width for overview, maintenance queue and Gurney inspection inputs. The initial original-tab checklist-to-maintenance click did not navigate; the dedicated-tab repeat succeeded. The route itself and subsequent workspace navigation rendered normally; no root cause or code fix is claimed.

A Gurney checkbox and zero count were entered only as a local browser draft. Unsaved Back opened the dialog; Stay retained zero; Discard & leave completed without submission. Production full-table reconciliation afterward returned all thirteen matches, normalizing only the authorized live batch state. No test business records were created.

Two concrete density issues remain: inspection mode repeats all holdings below its input form, and imported maintenance history expands every source field by default. These require source/UI refinement before final interface acceptance. Actual role-separated browser and submitted-write flows are still distinct from SQL/local concurrency coverage.

### Density refinements prepared locally — 2026-10-09

Inspection mode now renders its input form without repeating the same holdings as a second list; non-inspection holdings and pagination remain available. Maintenance history shows date, author, update type, comment and actual status transitions; complete original fields and identifiers remain in native expandable details with 44px summary targets. Existing responsive `sm` field grids and OMS surfaces are reused. No database, authorization or action behavior changes. TypeScript checking and thirteen relevant attachment/draft/history tests pass. These source refinements are not yet deployed or visually accepted; v9.2.96 remains the live application.

### v9.2.97 deployed and verified — 2026-10-09

The isolated release changes only the two asset density views and application/package version metadata relative to the deployed v9.2.96 artifact. Vercel deployment dpl_4xLdurbh7PPoTMQQaFTwLWAaeuxu reached Ready before promotion to the formal domain. The initial regression run failed two release-documentation contracts; after adding the v9.2.97 entry, all 1,457 tests passed with zero skips. Hosted build, lint and type checking succeeded.

The actual formal page reports v9.2.97. Gurney inspection has 27 checkboxes and zero duplicate asset-detail list links. Maintenance details are collapsed by default; expanding them exposes the original precise source timestamp. Both updated pages passed root-overflow checks at actual 390/430/820/1143/1440 widths. No business submission was performed. Existing procurement, inventory, production, attendance and daily-record pages rendered under Owner after promotion. Inventory initially remained in its loading state beyond the observation deadline, then completed with no captured error; this is a follow-up measurement candidate, not a diagnosed bottleneck.

Final source, import payload, full before/after recovery checkpoint, photos, reconciliation/activation/role receipts and key screenshots are additionally retained under `outputs/asset-migration-private/2026-10-09/` (ignored by Git and absent from the isolated deployment). Files are owner-only, flushed and read-back verified; a SHA-256 manifest covers 23 retained files. The snapshot is for audit and reviewed recovery planning, not automatic rollback after live entry.

Asset operational cutover is complete. Local/transactional lifecycle tests and live RLS simulations cover partial transfers, concurrency and role isolation; actual Owner browser coverage is read/input/draft/attachment acceptance, not invented production submissions or eight separate role logins. Penang chef-confirmed configuration and a dated valid production plan remain open in the broader accepted plan.
