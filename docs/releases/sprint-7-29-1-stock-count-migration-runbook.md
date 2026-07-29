# Sprint 7.29.1 Stock Count migration runbook

## Deployment guard

Migrations `110_sprint_7_29_1_stock_count_posting_integrity.sql` and
`111_central_kitchen_purchase_request_atomic.sql` are both local pending
migrations at this release boundary. Do not run `supabase db push` or any
command that applies all pending migrations. Migration 111 belongs to the
Purchasing flow and is outside the Stock Count release scope.

## Safe non-production sequence

1. Select an isolated non-production Supabase target and record its project ID.
2. Run `supabase/verification/sprint_7_29_1_stock_count_preflight.sql`.
3. Confirm the `kitchen` role and all eight canonical permission rows exist.
   `stock_balances.view` is an application-only legacy alias resolved to
   `stock_balance.read`; it is not a database grant. A missing role or
   canonical permission row is a hard stop. Kitchen may lack some grants before
   110 because migration 110 owns that grant operation.
4. Confirm the target migration history does not already contain 110 and note
   whether 111 is absent. Stop if the target or pending set is not the expected
   one.
5. Apply only the reviewed contents of migration 110 through the controlled
   non-production SQL migration runner. Do not invoke the all-pending command.
6. Re-run the preflight and then
   `supabase/verification/sprint_7_29_1_stock_count_readonly.sql`.
7. Using a Kitchen test account scoped to the target branch, verify Save draft,
   Confirm & Post, a zero-variance count, a non-zero-variance count, a legacy
   pending count, and a repeated click.
8. Confirm Stock Balance and transaction queries use the same company, branch,
   and item IDs as the posted count before considering production rollout.

This runbook does not authorize migration 111, production migration, push, or
deployment.
