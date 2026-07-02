-- Sprint 6.9 security hotfix
-- Supabase Advisor: security definer views should use security_invoker to respect caller RLS.
-- Keep all existing view logic intact, but make view reads execute with the caller's
-- permissions/RLS instead of the view owner's privileges.

do $$
declare
  view_name text;
  view_names text[] := array[
    'item_stock_balances',
    'item_location_stock_balances',
    'stock_ledger_view',
    'inventory_valuation_view',
    'stock_balances_view',
    'low_stock_items'
  ];
begin
  foreach view_name in array view_names loop
    if to_regclass(format('public.%I', view_name)) is not null then
      execute format('alter view public.%I set (security_invoker = true)', view_name);
      execute format('revoke all privileges on table public.%I from anon', view_name);
      execute format('revoke all privileges on table public.%I from public', view_name);
      execute format('grant select on table public.%I to authenticated', view_name);
      execute format(
        'comment on view public.%I is %L',
        view_name,
        'Supabase Advisor: security definer views should use security_invoker to respect caller RLS.'
      );
    end if;
  end loop;
end $$;

-- security_invoker views require the caller to have privileges on underlying
-- tables as well. These grants do not bypass RLS; table policies still decide
-- which authenticated users can read rows.
grant select on table public.items to authenticated;
grant select on table public.locations to authenticated;
grant select on table public.branches to authenticated;
grant select on table public.suppliers to authenticated;
grant select on table public.stock_transactions to authenticated;
grant select on table public.stock_transaction_lines to authenticated;

-- Do not expose stock/inventory views to anonymous clients.
do $$
declare
  view_name text;
  view_names text[] := array[
    'item_stock_balances',
    'item_location_stock_balances',
    'stock_ledger_view',
    'inventory_valuation_view',
    'stock_balances_view',
    'low_stock_items'
  ];
begin
  foreach view_name in array view_names loop
    if to_regclass(format('public.%I', view_name)) is not null then
      execute format('revoke all privileges on table public.%I from anon', view_name);
    end if;
  end loop;
end $$;
