-- Read-only compatibility receipt; run only on an authorized existing connection.
begin read only;
select version from supabase_migrations.schema_migrations order by version desc limit 5;
select to_regprocedure('public.get_retired_items_workspace(jsonb)') as existing_candidate;
select table_name,column_name,data_type from information_schema.columns
where table_schema='public' and table_name in('branch_stock_count_items','items','branches','suppliers','stock_balances_summary') order by table_name,ordinal_position;
select tablename,policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='public' and tablename in('branch_stock_count_items','items','branches','suppliers','stock_balances_summary');
select p.oid::regprocedure as signature,p.prosecdef,p.proacl,pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in('current_staff_company_id','can_access_inventory_branch','has_any_permission','natural_sort_key','get_items_workspace','get_retired_items_workspace');
rollback;
