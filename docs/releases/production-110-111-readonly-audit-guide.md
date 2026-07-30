# Production migration 110/111 read-only audit guide

This guide collects evidence only. It does not authorize a migration, repair,
rollback, RPC call, code deployment, or database change.

## Before running the SQL

1. Sign in to the Supabase Dashboard through the normal administrator login.
2. Open the project whose ref is `nnvdsaftiwpqkekjfrgc`.
3. Confirm the project name shown in the Dashboard and record its operational
   purpose. A project name alone is not proof that it is production.
4. Open **SQL Editor**. Do not open the migration runner.
5. Open
   `supabase/verification/production_migration_110_111_readonly_audit.sql`
   locally and review it before copying it.
6. Do not add credentials, keys, tokens, connection strings, staff email
   addresses, or personal information to either the SQL or the exported result.

## Execute the audit

The script is intentionally divided into independent transactions. Run the
numbered sections one at a time in order. For every section:

1. Verify the first identity result reports
   `transaction_read_only = on` where that identity query is present.
2. Confirm the section begins with `begin transaction read only;`.
3. Confirm the section ends with `rollback;`.
4. Export or copy the result grids, preserving their section numbers.
5. If one section fails, record the exact error and continue with the next
   independent section. Do not edit the database to make a section pass.

The optional migration 111 exact-count section is commented out because the
table may not exist. Only run that section separately when section 07 reports
`stock_holds_table_exists = true`. Do not run it when the table is absent.

Do not execute either function definition returned by section 04 or section 07.
Those definitions are evidence for comparison only.

## Compare migration 110

Compare the exported definitions of:

- `public.update_stock_count_draft_atomic(uuid,jsonb)`
- `public.post_stock_count_atomic(uuid)`

against the current canonical file:

- `supabase/migrations/110_sprint_7_29_1_stock_count_posting_integrity.sql`

Record structural differences in the audit template. Supabase migration history
does not necessarily contain a file checksum, so do not infer a checksum match
from the migration version alone.

If migration 110 is recorded but the remote definition differs, do not rerun
110 and do not repair migration history. The safe follow-up is a separately
authorized, forward-only remediation migration with a new version.

## Backup and PITR evidence

SQL Editor cannot reliably establish Supabase managed-backup or PITR status.
In the Dashboard, open the project backup/database backup page and record:

- Project ref
- Project name
- Current environment purpose
- Whether PITR is enabled
- Most recent available backup timestamp
- Retention period
- Whether a usable recovery point is shown

Screenshots must exclude API keys, database passwords, tokens, connection
strings, and other credentials. If the Dashboard does not expose a value or the
account cannot access it, record `UNKNOWN`; do not infer that a backup exists.

## Return the evidence

Fill in
`docs/qa/PRODUCTION_MIGRATION_110_111_AUDIT_TEMPLATE.md` and attach the exported
result grids. Do not place production results containing sensitive identifiers
into Git.

Until the evidence is reviewed:

- Do not rerun migration 110.
- Do not execute migration 111.
- Do not modify migration history.
- Do not create a remediation migration.
- Do not attempt a rollback.
