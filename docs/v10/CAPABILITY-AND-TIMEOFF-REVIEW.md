# Bounded local follow-up — capability readiness and O10

Base:9.2.139 dc3b822245d3cb1c4e9f599690c4b91250853638. No deployment, remote SQL, real data or role changes. This follow-up supersedes the single-request-function readiness check; earlier1818-suite/build evidence is historical, not this edited tree.

## Capability detection

Application helper accepts legacyv1 responses but enables neither feature from them. v2 batch UI requires both boolean readiness and exact batch revision1; incompatible or absent revisions fall back. Missing capability RPC preserves legacy mode; permission/network/malformed responses remain visible errors. Automatic numbering is disabled in both the helper and capability SQL pending review of allocator access, even if an older response advertises it.

Review-only SQL now checks exact request and transition argument signatures, UUID returns, security-definer/search_path, authenticated execute and absence of anon execute; matching revision markers installed atomically at the end of the batch proposal; invoker view/revision/SELECT access and every projected column type; batch RLS, enabled guard trigger, supporting columns; exact legacy request/transition/other-location/identity/permission helper signatures and returns. Revision comments are an installation convention, not a cryptographic proof against later authorised body replacement. Target installation still requires full reviewed hashes/catalog/RLS preflight. No global configuration/permissions were changed.

Validation:19 targeted JS/component/query tests passed.15 new PostgreSQL17 synthetic catalog cases passed as ordinary authenticated role: complete, missing request/transition/view/column/legacy transition, wrong revision/return/view shape/search_path, absent RLS/trigger/execute, anon execute and non-invoker view. Existing image, networknone, read-only root, tmpfs, no ports/host mounts, synthetic helpers only; container removed. No business RPC invoked in these catalog tests. Evidence:/tmp/oms38-capability-v2-review (results,isolation,script,logs). This does not revalidate real PostgREST/JWT or deployed schema.

## Number allocation — exact effective-permission matrix

Let D = any existing allocator permission in migration127 (documents.create or the listed procurement/stock/production create permissions); M = assets.manage. Both paths still require active same-company actor and an active sequence; asset registration additionally requires location access.

| Effective permissions | Existing127 asset allocation | Numbering proposal asset allocation | Register asset manually |
|---|---|---|---|
| D and M | allowed | allowed (no access extension) | allowed with location scope |
| D without M | allowed allocation only | unchanged allocation only | denied |
| M without D | denied | newly allowed for asset only | already allowed with location scope |
| neither | denied | denied | denied |

Other document types retain D requirement. Role337 gives asset management to manager/super_admin; super_admin's permission override already satisfies D. A manager or personal override may or may not have D; actual effective account permissions were not read, so the extension cannot be called necessary for the user's existing account. No grants should be inferred from a role label. The broader M-only allocator proposal remains separate, review-only and disabled at the application feature gate. A future decision must choose existing D+M eligibility or explicitly approve M-only asset-specific extension, against the exact target effective-permission diff; no role downgrade or blanket documents.create grant is recommended.

## O10 — existing functionality and demonstrated scope limitation

Original handoff wording: `/people/[id] 集中管理time-off balance`; permission-discoverable central entry, cross-employee balances/correction/approval, preserving minutes/history/approval. It did not authorise approval-free bulk overwrites.

Existing source already provides:
- people/[id]:one staff balance, history and comp_time.submit-gated correction entry.
- attendance/review:Reports & time-off balance, selected week and optional branch, comp_time.submit/approve action gates.
- getAttendanceActuals:relevant staff are the union of that week's assignments/reports/claims/reservations. Ledger includes those staff through weekEnd, not just that week's transactions. Approved entries are summed as an as-of-week-end balance.
- ActualAttendancePanel:balance cards resolve names via assignments; correction choices also come only from assignments; visible history is slice(0,20). Approval routes remain separate and permission checked.

Therefore it partly meets central management, but is NOT an all-eligible-staff directory: a staff member absent from the selected week's activity can disappear, report-only staff can show `Employee` and lack a correction option, and displayed history is a recent20-entry subset. These are source-demonstrated bounds, not evidence of a failed balance calculation or permission defect. Branch selection scopes which staff are discovered; the subsequent per-staff ledger is not branch-filtered, consistent with staff balance rather than branch-owned balance, subject to existing RLS. Do not silently change that accounting meaning.

No speculative UI rewrite made. A central all-staff entry needs an explicit permission/RLS-scoped staff query, identity source independent of assignments, clear as-of-period label and discoverable full history; this is a bounded data/UI follow-up, not an approval to broaden visibility. Existing code proves the original feature is partially present; real authenticated role/branch coverage and intended eligible-staff population remain unverified. No need for user to repeat all feedback.

## Remaining minimal prerequisites

1. Keep numbering disabled until target-specific allocator eligibility/configuration decision and exact SQL review; no sequence consumption during reads.
2. Before any batch install:target catalog/policies/grants/version preflight, complete atomic dependency installation and approved rollback preserving batch/audit data. No remote execution authorised.
3. O10:verify legitimate staff-directory visibility against existing permissions/RLS before adding the all-staff view; preserve current approval and minute semantics.
4. N9:original wording is “请你统一使用这种颜色和字号的字体。” The original attachment pixels remain unavailable locally; current dashboard screenshot is not that reference. Do not guess a global muted/italic restyle.
5. Real candidate shell/role/query acceptance remains distinct from synthetic local passes. Online139 status is unchanged. No overall green light.

## Implemented O10 follow-up (local only)
The independent directory is now wired into both existing balance panels and correction choices, with no fabricated shift assignments. It requires attendance.read + comp_time.read + staffs.read, an active tenant actor, and an explicit true can_access_company_branch(company,selectedBranch) result. The same ordinary client queries staff RLS and an inner staff_branches relation, company and selected branch filters, active/invited status, nondeleted records, and employment_end_date null or >= selected week start.500-row stable-ID pages avoid silent directory truncation. Existing historical activity/ledger identities remain; adding directory entries does not erase old history. The new directory does not invent an employment-start boundary absent from the existing contract.

| Actor/context | Existing access | New directory | Balance/approval authority |
|---|---|---|---|
| All3 read permissions + allowed selected branch | RLS-authorized staff and ledger | Eligible mapped staff including no weekly activity | Unchanged existing ledger RLS and submit/approve gates |
| Missing staff/comp-time read | Existing weekly panel | No independent staff enumeration | Unchanged |
| Forbidden branch or no branch selected | No added directory | Empty; no staff query | No expansion to all-company scope |
| Inactive/deleted or employment ended before selected week | Historical entries may remain under old path | Not newly enumerated | No history deletion or entitlement change |

UI names resolve independent identities before ledger fallback; correction choices include the same already-readable staff. No API/SQL mutation contract, grants, calculations, approval or audit logic changed. A company-wide view remains out of scope unless existing authority is separately established; this fixes omission within the already-selected authorized branch.

Final application suite1825/1825 passed before one additional ledger regression assertion was added; strengthened O10 focused suite5/5 subsequently passed. These tests simulate query boundaries/component SSR, not real database RLS acceptance. Typecheck passed; synthetic-config Next production build exit0 with known fonteditor/Supabase/webpack warnings, including lint/types/routes. Next-generated configuration changes were verified and restored. Build logs:/tmp/oms38-final-o10-build/build.log. No release/version bump or publication.
