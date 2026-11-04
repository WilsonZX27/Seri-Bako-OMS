# Empty unavailable Daily history presentation

Confirmed source discrepancy: omission previously depended on draft status and unlocked state; a save advancing status could reveal the same empty unavailable historical row. Presentation now depends only on availability and row evidence, consistently across record states. Existing form lock and permissions remain unchanged. Actual quantities, explicit zero confirmations, DO provenance, stockout flags and notes remain visible. The existing at-least-one-row fallback remains unchanged.

No database deletion, pending/completeness change, unlock or posted-record write. This is not a fix claim for the reported pending count: outlet/date and the actual record are still needed to establish that cause. No deployment or hosted save/post verification.

Validation: helper and caller contract checks cover unavailable/available rows, recorded zeros, provenance, notes, carryover and unchanged lock wiring. TypeScript and production-file ESLint pass. Local regression result recorded in integration handoff.

## Receipt summary alignment

Authenticated Preview same-record observation: Publika2026-11-02, a7c958aa-caef-4987-914f-293ac3760217 showed one pending receipt; MC07 was the only blank received control. Production-host login was unavailable; no production UI claim. List/detail receipt totals now use the same evidence-empty unavailable-row exclusion, evaluated on record date. Unknown catalogue rows remain pending. Raw lines, sent-confirmation workflow gates, status, database summaries and posting RPC remain unchanged; therefore this does not claim to resolve every completion/posted issue or dashboard SQL aggregates. No actual save/post performed. Nine isolated query/helper/input regression tests, typecheck and targeted lint passed.

## TRX zero-history follow-up

User screenshot: TRX2026-11-02 record f9e2151c-b3da-4ea5-a57e-29ebf5f25a2f shows posted MC01–07 zero-value rows. These differ from unconfirmed empty history. Local UI now collapses unavailable zero-only daily-food history with a labelled expandable button; confirmed zero evidence and all inputs remain mounted, submitted and stored. Nonzero quantities, notes/reasons and stockout evidence stay visible. Available rows remain visible. Search reveals matching history in editable forms. Lock/permission behavior is unchanged. Ten isolated regressions pass; typecheck and targeted lint pass. Hosted visual/toggle acceptance not yet performed; no deployment.

Global SQL investigation: repository migrations310 and332 include every non-packaging line in receipt bool_and, without availability/evidence exclusion. Prepared sql-candidates/outlet_daily_empty_history_summary.REVIEW.sql replacing only receipt filtering in both existing security-invoker bodies; no grants, sent-state changes, row writes or status changes. Live function/body/ACL comparison and isolated PostgreSQL execution remain outstanding (psql unavailable in current PATH). Candidate is unnumbered/uninstalled and must not be treated as production verification.

## Live read-only catalogue and isolated PostgreSQL verification

2026-11-04 Supabase nnvdsaftiwpqkekjfrgc main Production: read pg_proc under BEGIN READ ONLY / ROLLBACK. get_outlet_daily_today_summary body MD5 b53082db89b7bb4f61cc8952418ad07d; completed counterpart cdcaee10d5b46c09f486229b04d4b4ae. Both security-invoker, search_path=public, execute ACL postgres/authenticated/service_role; no anon/public ACL entry. Both live bodies lack availability/evidence filtering in received_by_record, matching repository logic. No functions installed or altered.

PGlite installed only in /tmp/oms-odr-summary-isolated with ignore-scripts. Seventeen isolated PostgreSQL assertions passed: original functions reproduce unavailable receipt from empty expired mooncake; candidate fixes both summaries; real receipt total remains4; sent authority remains null; posted count unchanged; stored rows identical; notes/nonzero/provenance remain pending; explicit receipt zero stays valid; inclusive end-date row remains required. This minimal fixture is not a real-role RLS test or full save/post flow. Harness: tests/fixtures/odr-summary-isolated.cjs; requires PGlite in caller environment and repository path argument. No production writes/deployment.
