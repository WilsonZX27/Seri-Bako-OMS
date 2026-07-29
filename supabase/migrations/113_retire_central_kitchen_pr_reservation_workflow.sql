-- Retire the unapproved Central Kitchen PR workflow introduced by migration 111.
--
-- Canonical behavior:
--   * a user explicitly chooses items from Stock Count, Low Stock, or PR;
--   * the result is an ordinary PR Draft;
--   * creating a PR never reserves inventory;
--   * the existing PR approval state machine remains authoritative.
--
-- Preserve the holds table temporarily for audit. Do not delete possible
-- production evidence until the owner has reviewed its row count.

do $$
begin
  if to_regprocedure(
    'public.create_central_kitchen_purchase_request_atomic(jsonb)'
  ) is not null then
    revoke all on function
      public.create_central_kitchen_purchase_request_atomic(jsonb)
    from public, anon, authenticated;

    drop function
      public.create_central_kitchen_purchase_request_atomic(jsonb);
  end if;
end;
$$;

revoke all on table public.purchase_request_stock_holds
from public, anon, authenticated;

comment on table public.purchase_request_stock_holds is
  'Deprecated audit-only artifact from migration 111. No application workflow may create inventory holds for purchase requests.';
