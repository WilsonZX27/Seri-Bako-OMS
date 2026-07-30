# Production migration 112 RPC ACL remediation

Migration 112 is a forward-only permission repair for the Central Kitchen
Purchase Request RPC created by migration 111. It does not change Purchase
Request, Purchase Order, Purchasing, Stock Count, stock-hold, or posting logic.

## Pre-execution production evidence

- Migrations 110 and 111 are recorded once.
- No migration 112 or later was recorded at audit time.
- Migration 111 objects are complete.
- `purchase_request_stock_holds` contains zero rows.
- No Purchase Request currently uses a stock hold.
- The RPC ACL explicitly includes `anon=X`.
- The project is on the Free plan with no scheduled backup or PITR recovery
  point shown in Dashboard.

## Hard stop: recovery point

Do not apply migration 112 until a current, restorable production backup or
equivalent recovery point has been created and its restore procedure confirmed.
The absence of business data in migration 111 does not remove this requirement.

The production execution was subsequently performed only after the user
explicitly accepted the documented no-backup risk. That exception is historical
evidence, not a reusable waiver for later migrations.

## Preflight

1. Confirm the project ref is `nnvdsaftiwpqkekjfrgc` and Dashboard identifies
   the branch as `main PRODUCTION`.
2. Run
   `supabase/verification/production_migration_112_preflight_readonly.sql`
   manually in Dashboard SQL Editor.
3. Require:
   - 110 = 1, 111 = 1, 112 = 0, and 113+ = 0.
   - The table and RPC both exist.
   - `anon_can_execute_before = true`.
   - `authenticated_can_execute_before = true`.
4. Stop if any result differs. Do not repair migration history.

## Isolated execution

Apply only:

`supabase/migrations/112_restrict_central_kitchen_pr_rpc_acl.sql`

Do not use a command that applies every pending migration. Do not rerun,
overwrite, repair, or roll back migrations 110 or 111.

## Post-verification

Run
`supabase/verification/production_migration_112_post_readonly.sql` and require:

- 110 = 1, 111 = 1, 112 = 1, and 113+ = 0.
- `anon_can_execute_after = false`.
- `authenticated_can_execute_after = true`.
- The 111 table and RPC still exist.
- Stock-hold and linked Purchase Request counts have not changed.

If verification fails, stop. Do not edit migration history or improvise a
rollback. Prepare another separately reviewed forward-only migration.

## Recorded production result

- Migration 112 is recorded once as
  `restrict_central_kitchen_pr_rpc_acl`.
- Migration history contains one statement for version 112.
- `anon` no longer has execute permission for
  `create_central_kitchen_purchase_request_atomic(jsonb)`.
- `authenticated` execute permission remains.
- Migration 111 objects remain present.
- At verification time there were zero stock-hold rows, zero Purchase Requests
  using holds, and zero matching activity-log entries.
- The Central Kitchen Purchase Request feature has not received formal
  enablement authorization.

Do not rerun migration 112 or edit its historical file. Any future ACL change
must use a new forward-only migration.
