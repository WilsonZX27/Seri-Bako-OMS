\set ON_ERROR_STOP on
begin;
\i sql-candidates/retired-items-workspace.sql
create temporary table retired_test_ids(id uuid primary key,n integer);
insert into retired_test_ids select gen_random_uuid(),n from generate_series(1,1201)n;
insert into public.items(id,company_id,item_code,item_name,category,purchase_unit,base_unit,safety_stock)
select id,'efd08261-fbb7-4c7c-b4f1-8ac9a300f54f','RETQA-'||n,'Retired QA '||n,'QA','PCS','PCS',case when n%2=0 then 10 else 0 end from retired_test_ids;
insert into public.branch_stock_count_items(company_id,branch_id,item_id,status,retired_at)
select 'efd08261-fbb7-4c7c-b4f1-8ac9a300f54f','d0ec2aa4-b52f-4e51-9fbb-a7756d31e40d',id,'retired','2026-01-01' from retired_test_ids;
insert into public.branch_stock_count_items(company_id,branch_id,item_id,status,retired_at)
select 'efd08261-fbb7-4c7c-b4f1-8ac9a300f54f','d10d0e28-0b4a-4053-9297-fcd1b1eaa70b',id,'retired','2026-01-01' from retired_test_ids where n=1;
insert into public.suppliers(id,company_id,supplier_code,name,status)
values('00000000-0000-4000-8000-000000000379','efd08261-fbb7-4c7c-b4f1-8ac9a300f54f','RETQA-SUP','Retired QA Supplier','active');
update public.items set supplier_id='00000000-0000-4000-8000-000000000379' where id in(select id from retired_test_ids where n<=20);
insert into public.stock_balances_summary(item_id,branch_id,company_id,item_code,item_name,branch_name,is_low_stock)
select id,'d0ec2aa4-b52f-4e51-9fbb-a7756d31e40d','efd08261-fbb7-4c7c-b4f1-8ac9a300f54f','RETQA-'||n,'Retired QA '||n,'Synthetic outlet A',n=1 from retired_test_ids where n<=2
on conflict(item_id,branch_id) do update set is_low_stock=excluded.is_low_stock;
-- Synthetic positive fixture: existing branch-A-only actor gets Items read, not inventory access.
do $$begin assert not exists(select 1 from public.staff_permission_overrides o join public.permissions p on p.id=o.permission_id where o.staff_id='5d43c3c8-7844-4af1-97d5-71aee6305757' and p.permission_code in ('items.view','stock_count.create')),'dedicated fixture override must be absent';end$$;
insert into public.staff_permission_overrides(staff_id,permission_id,effect)
select '5d43c3c8-7844-4af1-97d5-71aee6305757',id,'allow' from public.permissions where permission_code in ('items.view','stock_count.create');
set local role authenticated;
select set_config('request.jwt.claim.sub','c67719ba-c806-4806-b522-f34385c647b7',true);
do $$declare p jsonb;q jsonb;begin
p:=public.get_retired_items_workspace('{"search":"RETQA-"}');
assert (p->>'total_rows')::integer=1202,'exact total beyond1000';
assert jsonb_array_length(p->'rows')=15,'bounded first page';
q:=public.get_retired_items_workspace('{"search":"RETQA-","page":"2"}');
assert not exists(select 1 from jsonb_array_elements(p->'rows')a,jsonb_array_elements(q->'rows')b where a->>'id'=b->>'id'),'stable nonoverlapping pages';
assert q=public.get_retired_items_workspace('{"search":"RETQA-","page":"2"}'),'repeat stable';
p:=public.get_retired_items_workspace('{"search":"RETQA-","page":"99999999"}');
assert (p->>'page')::integer=81 and jsonb_array_length(p->'rows')=2,'clamped last page';
p:=public.get_retired_items_workspace('{"search":"RETQA-NO-MATCH","page":"2"}');
assert (p->>'total_rows')::integer=0 and (p->>'page')::integer=1,'zero count';
p:=public.get_retired_items_workspace('{"search":"RETQA-","stock_control":"with_safety_stock"}');
assert (p->>'total_rows')::integer=600,'filter before count';
p:=public.get_retired_items_workspace('{"search":"RETQA-","supplier":"00000000-0000-4000-8000-000000000000"}');
assert (p->>'total_rows')::integer=0,'supplier predicate';
p:=public.get_retired_items_workspace('{"search":"RETQA-","supplier":"00000000-0000-4000-8000-000000000379"}');
assert (p->>'total_rows')::integer=21 and jsonb_array_length(p->'rows')=15,'supplier filtered count before pagination';
p:=public.get_retired_items_workspace('{"search":"RETQA-","sort":"item_code","dir":"asc"}');
assert p->'rows'->0->'item'->>'item_code'='RETQA-1','natural code sorting';
p:=public.get_retired_items_workspace('{"search":"%"}');
assert not exists(select 1 from jsonb_array_elements(p->'rows')r where r->'item'->>'item_code' like 'RETQA-%'),'literal wildcard search';
p:=public.get_retired_items_workspace('{"search":"RETQA-","low_stock":"yes"}');
assert (p->>'total_rows')::integer=2,'visible low item at2retired branches';
p:=public.get_retired_items_workspace('{"search":"RETQA-","low_stock":"no"}');
assert (p->>'total_rows')::integer=1,'unknown summary not healthy';
raise notice 'PASS: exact count/page/zero/filter/stable/literal search/stock truth';
end$$;
select set_config('request.jwt.claim.sub','9b1f71e2-1392-4177-835a-0bdba1cf82eb',true);
do $$begin assert (public.get_retired_items_workspace('{"search":"RETQA-"}')->>'total_rows')::integer=0,'cross company denied';raise notice 'PASS: cross company';end$$;
select set_config('request.jwt.claim.sub','309ad0c3-9117-4f5d-bdfb-bd5e9a828690',true);
do $$begin
assert (public.get_retired_items_workspace('{"search":"RETQA-"}')->>'total_rows')::integer=0,'staff read denied';
begin perform public.get_retired_items_workspace('{"low_stock":"no"}');raise exception 'expected42501'; exception when insufficient_privilege then null;end;
raise notice 'PASS: staff and unavailable stock denied';end$$;
select set_config('request.jwt.claim.sub','260fc30b-0637-4eb2-9acf-cc53e01a111d',true);
do $$declare p jsonb;r jsonb;begin
p:=public.get_retired_items_workspace('{"search":"RETQA-"}');
assert (p->>'total_rows')::integer=(select count(*) from public.branch_stock_count_items where status='retired' and item_id in(select id from public.items where item_code like 'RETQA-%')),'same existing RLS result count';
raise notice 'restricted count %, items.read %, branch access %',p->>'total_rows',public.has_any_permission(array['items.read']),public.can_access_inventory_branch('efd08261-fbb7-4c7c-b4f1-8ac9a300f54f','d0ec2aa4-b52f-4e51-9fbb-a7756d31e40d');
assert (p->>'total_rows')::integer=1201,'positive assigned branch only';
assert not exists(select 1 from jsonb_array_elements(p->'rows')x where x->>'branch_id'='d10d0e28-0b4a-4053-9297-fcd1b1eaa70b'),'unassigned branch denied';
begin perform public.get_retired_items_workspace('{"low_stock":"no"}');raise exception 'expected42501';exception when insufficient_privilege then null;end;
raise notice 'PASS: positive restricted actor1201 and invisible inventory42501';
for r in select value from jsonb_array_elements(p->'rows') loop
assert public.can_access_inventory_branch(public.current_staff_company_id(),(r->>'branch_id')::uuid),'branch scoped';
end loop;
raise notice 'PASS: supervisor branch policy applied';end$$;
reset role;
do $$begin
assert not has_function_privilege('anon','public.get_retired_items_workspace(jsonb)','execute'),'anon denied';
assert not has_function_privilege('service_role','public.get_retired_items_workspace(jsonb)','execute'),'service role denied';
end$$;
rollback;
select not exists(select 1 from items where item_code like 'RETQA-%') as fixtures_rolled_back;
