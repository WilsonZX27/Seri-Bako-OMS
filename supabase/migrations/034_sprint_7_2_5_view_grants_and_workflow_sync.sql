-- Sprint 7.2.5
-- Inventory and dashboard views must be readable by authenticated app users.
-- Supabase Advisor/RLS remains respected by the underlying view definitions; this migration
-- only grants SELECT on app-owned reporting views and does not grant anon access.

grant usage on schema public to authenticated;

do $$
declare
  view_name text;
  view_names text[] := array[
    'stock_balances_view',
    'low_stock_items',
    'stock_balances',
    'item_stock_balances',
    'item_location_stock_balances',
    'stock_ledger_view'
  ];
begin
  foreach view_name in array view_names loop
    if to_regclass(format('public.%I', view_name)) is not null then
      execute format('grant select on public.%I to authenticated', view_name);
    end if;
  end loop;
end $$;
