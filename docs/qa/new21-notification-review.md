# Notification candidate integration review — HOLD

Production read-only Supabase project nnvdsaftiwpqkekjfrgc, query837bf7a5-79e0-4fb5-9a7e-607faf66d21c.
No noninternal triggers on attendance_ot_claims or comp_time_transactions; cron.job absent. This does not exclude external application jobs.
Actual has_any_permission permits super_admin before deny overrides and permits explicit allow without an active role. Proposed recipient query requires an active role and globally excludes deny overrides, including super_admin. Ordinary current RO/OT decision RPCs check company+permission+self-review, without the proposed recipient branch filter. Thus notification recipient selection is NOT equivalent to actual approval eligibility; custom permission recipients can be omitted. No permission expansion performed. SQL hash01a228a171b7c405b23778acc75537973a82db3ef20f1d3003c113369ca421d7 remains unnumbered/uninstalled; do not include in installation approval until recipient contract is reconciled and external jobs checked.

SECURITY DEFINER has explicit pg_catalog,public search_path and explicit EXECUTE revoke from public/anon/authenticated/service_role. No new grant or table. INSERT-only behavior has no historical backfill; skipped reversals remain a separate limitation. All actions this review were SELECT only.

Integration fixed TypeScript property-code narrowing in OT API; initial final-types/build failure retained in logs, corrected run separate. Original failed live Reject/claim HTTP response remains unavailable; no root-cause claim.
