-- Sprint 7.2.7: permission and view access repair.
-- Fixes Supabase 42501 errors for operational inventory views used by dashboard/inventory.
-- This grants authenticated app users read access to app-owned operational views only.
-- No anon grants are added, and auth schema/data remains untouched.

grant usage on schema public to authenticated;

do $$
declare
  relation_name text;
  relation_names text[] := array[
    'stock_balances_view',
    'low_stock_items',
    'stock_ledger_view',
    'stock_balances',
    'item_stock_balances',
    'item_location_stock_balances'
  ];
begin
  foreach relation_name in array relation_names loop
    if to_regclass(format('public.%I', relation_name)) is not null then
      execute format('grant select on public.%I to authenticated', relation_name);

      if exists (
        select 1
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = relation_name
          and c.relkind = 'v'
      ) then
        execute format('alter view public.%I set (security_invoker = true)', relation_name);
      end if;
    end if;
  end loop;
end $$;

grant select on public.items to authenticated;
grant select on public.branches to authenticated;
grant select on public.locations to authenticated;
grant select on public.stock_transactions to authenticated;
grant select on public.stock_transaction_lines to authenticated;
