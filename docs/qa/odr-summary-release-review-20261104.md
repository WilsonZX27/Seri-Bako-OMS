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
