# Carryover wastage installation review — 2026-11-04 MYT

## Observed live, read only

Target: Supabase Seri Bako Project `nnvdsaftiwpqkekjfrgc`, main PRODUCTION, existing signed-in SQL Editor. Queries used explicit READ ONLY transactions, 10s timeout and ROLLBACK. No installation, business update, save/post RPC or role change.

Function | body MD5 | execute ACL
--- | --- | ---
save_outlet_daily_record | a78b07884b9089aecd6cd214279fe812 | postgres/authenticated/service_role
save_outlet_daily_record_before_saleable_stock | 49714b7b99e0f96c28d8cfd66a2eda56 | postgres/service_role only
save_outlet_daily_record_before_planning | 0876499cf644ff62eaa523670ebcee7d | postgres/service_role only
save_outlet_daily_record_checked | ca1b5d6975c6ad1c9302bb65240f401e | postgres/authenticated/service_role
save_outlet_daily_record_v92 | f668490e9a0cbb324ef8c0a387bcf666 | postgres/authenticated/service_role
save_outlet_daily_record_with_sales_channels | 7bfd2e14bd4d0e3c30c032911215a4db | postgres/authenticated

All owned by postgres, SECURITY DEFINER. Private tracking wrapper search_path=public, exact reviewed old body matches. Checked/sales-channel wrappers use pg_catalog, public. Public save calls tracking wrapper, which calls before_planning. The checked wrapper also calls v92 (catalog regex truncated numeric suffix; verify exact source for full-chain tests).

`carryover_wastage_provided` absent. Existing usage_qty and saleable_next_day_qty are nullable numeric. wastage_qty NOT NULL default 0, wastage_provided NOT NULL default false. Line RLS enabled, not forced. Existing triggers: guard_do_managed_sent, updated_at, snapshot_daily_tracking, touch_outlet_daily_line_revision, validate_outlet_daily_wastage_reason. No trigger replacement proposed.

Ledger latest 390 attendance_person63_scoped_recovery; 389 notifications, 388 sales wiring, 387 sales settings, 386 roster, 385 basket, 384 KG, 383 AT present. This does not imply direct SQL repairs after 390 are absent. No new migration number reserved/inserted.

## Historical baseline

1,259 carryover lines: usage NULL 77, zero 824, nonzero 358. Sorted MD5 over JSON arrays `(id,usage_qty,wastage_qty,wastage_reason,notes,saleable_next_day_qty)` = `82a13f921dfc1845595ac110ced0319c`.

This is a time-specific baseline, not a claim that other users will not edit later. The candidate obtains its own in-transaction full-row baseline after locking and compares all pre-existing carryover fields before commit (excluding only the new metadata column). Installation aborts if invariant fails.

## Exact candidate and pause

- Install: `sql-candidates/outlet_daily_carryover_wastage.REVIEW.sql`, SHA256 `84ab8db1b0666ebac7fc0d3d118ddb92ef07c72e58f0318508de684ea4cfe4a6`.
- Adds one boolean confirmation column, default false; no Usage backfill or conversion.
- Replaces only existing private tracking function; exact body, owner, ACL, definer and search_path guard; no grants or public RPC signature changes. New body MD5 `85c808b214acd1ba9deba8ea78c79413`.
- ACCESS EXCLUSIVE line-table lock, 3s lock timeout, 30s statement timeout. Briefly blocks line-table readers/writers; timeout aborts transaction, never blind retry.
- Pause: `sql-candidates/outlet_daily_carryover_wastage.PAUSE.sql`, SHA256 `9e3361e91509f33a83440c88eb08d659fc091cbffd2355338374013586d5066b`. Requires exact installed candidate body, retains column/data and rejects carryover writes. Other tracking behavior retained. Do not restore legacy zeroing SQL after new wastage is stored.
- 17 isolated wrapper assertions pass, including unchanged data after pause and blocked subsequent carryover save. Base authorization/posted checks are stubbed; full chain/RLS/concurrent sessions remain unverified.

## Release boundary and specific authorization

NOT ready for isolated installation into the shared Production DB: the old Production UI does not send the new protocol marker and its carryover saves would be rejected. Coordinate SQL and the compatible app release or a bounded maintenance window. A Preview sharing the same DB does not remove this impact.

Before execution: complete full-chain isolated checks, confirm compatible app rollout allowed, recheck hashes/ACL/ledger and prepare approved maintenance timing. Required specific approval covers the additive column, replacement private function, brief table lock and old-client carryover-save interruption. It does not authorize rewriting historical Usage, real test posting, broader grants or an unrelated app deployment. Existing Production deployment rejection cannot be bypassed by this SQL installation.

After an approved execution: verify body/ACL/column/triggers, transaction data-invariant success, installed app commit and read-only UI. Do not create a real Daily submission merely to test. Any uncertain installation result requires read-only inspection before retry.

## Compatibility revision — supersedes earlier candidate hashes and blanket old-client rejection

Install SHA256 `a26df44e8bee1a8922a5d0045ff70e72572975b970ba53713144f6b88a3b62ff`; pause SHA256 `72a3760c87ddfc701e1c4b7a316c7250da08aecd59120c7807315434689932ba`. Neither installed.

Old forms may save when submitted historical Usage matches the stored value. Their hidden wastage zero/empty reason/notes are replaced with stored values and independent confirmation. Any attempted Usage change fails explicitly and asks for the new form, rather than silently ignoring it. Old completion still cannot certify an unconfirmed wastage quantity. This allows compatible draft edits during a short SQL-before-app transition; it does not make the old interface suitable for new Wastage capture. Schedule app rollout promptly, avoid starting a shift's completion process mid-transition, and explain refresh requirements.

`tests/fixtures/odr-carryover-full-chain.cjs` loads all six actual saving functions; their pre-change body MD5s equal the live read-only hashes above. It runs the sales-settings → checked-revision → sales → public save → tracking → original save chain, with original revision triggers and wastage validation. 28 assertions pass: creating/readback, historical Usage immunity, stale revision, subsequent negative-sales failure rolling back quantity/revision writes, old/new client transitions, blank confirmation/reason rejection, posted lock, identity/company/permission checks, daily-food/packaging/beverage unaffected, and safe pause preserving rows. Identity and permission helpers and tables are fictional. This verifies function guard composition, not complete production RLS or two simultaneous database connections.

Additional wrapper checks: 19 pass. Docker daemon unavailable (local socket absent); PGlite supplied the isolated database. Actual concurrent lock-wait test remains unperformed; no production database operation used as a substitute. The 3s installation lock timeout remains.

Shared-surface timing patch also applied locally with 71 related tests, TypeScript and targeted lint passing. Black blur flicker has no authenticated reproduction/acceptance evidence and is not closed. No deployment or production change performed.

Current compatible tracking-function body MD5: `1d98b1a9716638553f2c2fbd2e302839`.
