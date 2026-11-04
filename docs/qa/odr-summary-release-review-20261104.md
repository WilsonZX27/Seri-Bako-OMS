# ODR summary release review — 2026-11-04

Application base reviewed:8645a6cc11982b6e90aeedf332ea3dc755da7f76. Includes technical tables77c9bd2. No deployment performed. Build passed with placeholder localhost Supabase config,48 targeted tests, focused lint and20 isolated PostgreSQL assertions including rollback. Build warnings:fonteditor-core dynamic dependency and existing production-sheet unused index. Node24 local; no hosted-build claim.

## Exact database action requiring separate approval
Target Supabase project nnvdsaftiwpqkekjfrgc main Production. Replace only existing public.get_outlet_daily_today_summary(date) and public.get_outlet_daily_completed_summary(date). Receipt summaries exclude strictly empty, unconfirmed, unavailable daily-food historical lines. No record update/delete, posted status, sent confirmation gate, grant/revoke or schema table change. Existing functions security-invoker/search_path public and ACL postgres/authenticated/service_role are retained by CREATE OR REPLACE. Existing installation approvals for other migrations do not cover this candidate. Current delegation authorizes preparation/read-only verification, not installation.

SQL: sql-candidates/outlet_daily_empty_history_summary.REVIEW.sql
SHA256: eed2cde1f8afd7527a14e8853cd815a7551a23c54e9ff33d38a24faf41f48f62
Rollback: sql-candidates/outlet_daily_empty_history_summary.ROLLBACK.sql
SHA256: 283661cd02af02b3aaf9b3a3fe51e88127a3f1a092b4f867905a544d3072ffb7
Rollback restores original semantic bodies and preserves ACL/rows; it intentionally restores the old pending behavior. It is not an application/DB-wide rollback.

Before authorized installation recheck exact project, live bodies/ACL, schema signature and hash. Today MD5 b53082db89b7bb4f61cc8952418ad07d; completed MD5 cdcaee10d5b46c09f486229b04d4b4ae. Stop on substantive drift. Apply once atomically; inspect bodies/ACL and read results. If result uncertain read back first, never blindly retry. Preserve snapshot of original definitions for exact restoration. Candidate currently unnumbered; allocate ledger identifier using existing project procedure before any recorded migration installation, without substituting SQL silently.

Remaining: hosted visual/toggle tests, full save/post isolated workflow and RLS role fixture coverage. Actual original row creation causality not established. Application preserves existing sent-confirmation gates: receipt display repair does not claim to solve every blocked completion. Production remains unchanged. Need precise approval for SQL installation plus selected app deployment environment; do not infer Production authority from Preview approval or bypass prior rejection.

## Authorized installation receipt — 2026-11-04

User explicitly approved replacing these two functions (ok, relayed by parent). Supabase target nnvdsaftiwpqkekjfrgc main PRODUCTION verified in existing authorized SQL Editor. Preflight both old MD5 and ACL unchanged. Exact script length8177 and MD5 09646786d338a2641e9e9d18f4962cc2 matched file; SHA256 remains eed2cde1f8afd7527a14e8853cd815a7551a23c54e9ff33d38a24faf41f48f62.

First editor attempt retained old text and returned42601 unterminated dollar string. A clean read-only lookup confirmed BOTH old bodies unchanged before retry. Native select-all/paste replaced full editor text, executing the authorized transaction returned Success.No rows returned. No permission rejection or bypass.

Post-install read-only catalogue verification: today body MD5 d575f6ceb292846424a8fe1f40c38a58; completed614806c787be638cadc6cb7ba25623a3. Both exactly match local SQL function bodies. Security-invoker false definer flag, search_path=public and existing postgres/authenticated/service_role ACL unchanged; no new grants. Only two function replacements executed. No real daily row/status edit, no post/repost, no application deployment. This was a direct approved function repair; no migration number/ledger entry was created.

Application UI fixes still local at66b2109; hosted Preview f2b2dc2 and Production5fc88063 have not been updated in this operation. Therefore historical row visibility is not yet fixed in those hosted apps. Runtime totals under actual application roles still need read-only acceptance; catalogue verification is not that acceptance.
