# OMS authenticated follow-up — 2026-09-15

## Application verification

Authenticated as Owner on the fixed branch Preview (v9.2.69). This is application Preview evidence, not evidence of Production promotion or all-role mutation UAT. The previous [33-route read-only sweep](SYSTEM_QUALITY_2026-09-14.md) remains historical evidence.

- ALMA/PJS10 roster eligibility was restored by migration 287 (8/12 staff observed).
- Jakel Mall, week 2026-09-07, loads seven employees. SQL timestamp dates caused an actual RangeError during this follow-up; normalization now preserves the roster calendar day, validates dates, and deduplicates date/timestamp equivalents. Four employees have 24 genuinely missing days, grouped by employee and expandable. No OFF days or schedules were invented.
- PR list displays names without “Submitted by”. At 430px the PR detail action bar has Open PO, Files & activity and an accessible ellipsis on one row. Both dialogs open and close successfully. No delete action was executed.
- GRN/AUG26/005 shows Ordered 5, Previously 0, Received 5 and Remaining 0. Summary and purchase-chain cards use two columns on phone. No stock quantities were mutated.
- Dashboard and document pages remained within viewport width in the observed 430px/1440px layouts. Prior sweep covers additional read routes; this does not establish every possible content/viewport combination.
- Operational list links no longer prefetch all unopened document details. A PR list previously launched 12 detail fetches together; normal double-click/tap navigation is preserved.

## Database improvements applied to linked Production

All comparisons below are PostgreSQL execution times under the current Owner identity, not whole-page load times or a production percentile/SLA. Measurements are paired samples and can vary with load/cache.

| Migration | Query | Before | Candidate | Correctness check |
| --- | --- | ---: | ---: | --- |
| 288 | Ready-to-post daily queue, limit 5 | 1007.594ms | 0.029ms | Same empty queue; partial index avoids scanning unrelated rows |
| 289 | Dashboard core snapshot | 1582.263ms | 726.065ms | Entire JSON result equal in a repeatable-read transaction |
| 290 | Seven-day daily lines, 3,016 rows | 1501.167ms | 468.424ms | Same result count; full visible line-ID digest identical in repeatable read |

288 adds only a partial index on updated_at for evening_completed. A broader index was tested in a rollback transaction and rejected because it was not selected.

289 aggregates the existing inventory source once per statement. It remains security invoker with public search_path; grants and output keys are retained. Verified body MD5: `67e98d44a5a8b46663e4746155f621b8`.

290 retains the parent branch gate and view permission, evaluates the constant permission via an InitPlan, and lets child lines inherit parent SELECT RLS instead of repeating those checks. RLS remains enabled on both tables. There are still two SELECT policies scoped to authenticated. Write policies, role grants and business records are unchanged. The live ledger was read back as 290 after applying the guarded transaction.

The isolated PostgreSQL fixture in `scripts/qa/verify-outlet-daily-policy.mjs` executes the actual migration against seven visibility scenarios: company A owner, single outlet, kitchen routed outlet, company B, permission denied, unassigned, and missing identity. All before/after results match expected scope; an orphan line is invisible. This fixture tests policy composition with deterministic scope helpers; it does not substitute for real-user workflow UAT.

After migration 290, the authenticated Dashboard rendered its full workdesk and linked daily-records GET returned 200. The latest sampled Supabase daily-line request was 1,009ms including service/network overhead (earlier sample 2,216ms); this is not a percentile and remains a follow-up performance baseline.

## Validation and boundaries

- Full application suite: 1,257 tests passed (follow-up date regression included); lint, TypeScript and production build passed for the application changes.
- Additional isolated PostgreSQL fixture: seven scenarios passed.
- Production DB ledger: 290. Application changes are on `codex/system-quality-verification`; Production application promotion is a separate step.
- Local password files remain ignored and are not part of commits or Vercel uploads.
- No evidence currently justifies replacing the entire system architecture. Measured redundant reads, repeated permission work and missing targeted indexing explain actionable bottlenecks. Whole-page latency includes additional queries, network and rendering and is not claimed to equal the database figures above.
- No irreversible business mutation, schedule publication, purchasing deletion or inventory posting was performed for these read-only checks.
