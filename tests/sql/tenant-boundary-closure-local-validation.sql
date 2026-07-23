\set ON_ERROR_STOP on
begin;

-- Test-only role: transaction-scoped grants exercise RLS without widening
-- privileges for the production authenticated role.
do $$ begin
  create role rls_test_authenticated;
exception when duplicate_object then null;
end $$;
grant usage on schema public to rls_test_authenticated;
grant authenticated to rls_test_authenticated;
grant select, update, delete on public.companies, public.items, public.document_comments,
  public.purchase_order_lines, public.stock_transfer_lines, public.branches,
  public.staff_roles, public.staff_branches, public.documents, public.staffs,
  public.roles, public.permissions, public.purchase_orders,
  public.stock_transfers to rls_test_authenticated;
grant execute on function public.replace_staff_access_atomic(uuid,uuid,uuid,uuid[],public.record_status,text,text,text,text) to rls_test_authenticated;
grant execute on function public.has_permission(text), public.current_staff_role_codes(), public.has_role(text[]), public.current_user_role() to rls_test_authenticated;
select set_config('seri_bako.allow_protected_role_seed','on',true);
-- Fixture-only bootstrap capability; later assertions still switch to the
-- restricted test role and set a concrete authenticated subject.
select set_config('request.jwt.claim.role','service_role',true);

-- Disposable two-company identity and branch matrix.
insert into public.companies(id,company_code,company_name) values
 ('a1000000-0000-0000-0000-000000000001','TBC-A','Tenant Boundary A'),
 ('b1000000-0000-0000-0000-000000000001','TBC-B','Tenant Boundary B');
insert into public.branches(id,company_id,branch_code,branch_name,branch_type) values
 ('a2000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','TBC-A-CK','A Central Kitchen','central_kitchen'),
 ('a2000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','TBC-A-OUT','A Outlet','outlet'),
 ('a2000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001','TBC-A-CK2','A Unassigned Kitchen','central_kitchen'),
 ('b2000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','TBC-B-CK','B Central Kitchen','central_kitchen'),
 ('b2000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','TBC-B-OUT','B Outlet','outlet');

insert into public.roles(id,company_id,role_code,role_name) values
 ('a4000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','super_admin','A Owner'),
 ('a4000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','finance','A Finance'),
 ('a4000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001','manager','A Manager'),
 ('a4000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000001','purchasing','A Purchasing'),
 ('a4000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000001','kitchen','A Kitchen'),
 ('a4000000-0000-0000-0000-000000000006','a1000000-0000-0000-0000-000000000001','outlet_staff','A Outlet Staff'),
 ('b4000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','super_admin','B Owner'),
 ('b4000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','finance','B Finance'),
 ('b4000000-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000001','manager','B Manager'),
 ('b4000000-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000001','purchasing','B Purchasing'),
 ('b4000000-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000001','kitchen','B Kitchen'),
 ('b4000000-0000-0000-0000-000000000006','b1000000-0000-0000-0000-000000000001','outlet_staff','B Outlet Staff');

insert into auth.users(id,aud,role,email,created_at,updated_at)
select id,'authenticated','authenticated',email,now(),now() from (values
 ('a5000000-0000-0000-0000-000000000001'::uuid,'tbc-a-owner@example.invalid'),
 ('a5000000-0000-0000-0000-000000000002'::uuid,'tbc-a-finance@example.invalid'),
 ('a5000000-0000-0000-0000-000000000003'::uuid,'tbc-a-manager@example.invalid'),
 ('a5000000-0000-0000-0000-000000000004'::uuid,'tbc-a-purchasing@example.invalid'),
 ('a5000000-0000-0000-0000-000000000005'::uuid,'tbc-a-kitchen@example.invalid'),
 ('a5000000-0000-0000-0000-000000000006'::uuid,'tbc-a-outlet@example.invalid'),
 ('a5000000-0000-0000-0000-000000000007'::uuid,'tbc-a-disabled@example.invalid'),
 ('b5000000-0000-0000-0000-000000000001'::uuid,'tbc-b-owner@example.invalid'),
 ('b5000000-0000-0000-0000-000000000002'::uuid,'tbc-b-finance@example.invalid'),
 ('b5000000-0000-0000-0000-000000000003'::uuid,'tbc-b-manager@example.invalid'),
 ('b5000000-0000-0000-0000-000000000004'::uuid,'tbc-b-purchasing@example.invalid'),
 ('b5000000-0000-0000-0000-000000000005'::uuid,'tbc-b-kitchen@example.invalid'),
 ('b5000000-0000-0000-0000-000000000006'::uuid,'tbc-b-outlet@example.invalid')
) u(id,email);
insert into public.staffs(id,company_id,auth_user_id,staff_code,full_name,email,default_branch_id,status)
select ('a6000000-0000-0000-0000-00000000000'||n)::uuid,'a1000000-0000-0000-0000-000000000001',('a5000000-0000-0000-0000-00000000000'||n)::uuid,
 'TBC-A-'||n,'A Staff '||n,'tbc-a-'||n||'@example.invalid',case when n=6 then 'a2000000-0000-0000-0000-000000000002'::uuid else 'a2000000-0000-0000-0000-000000000001'::uuid end,'active'
from generate_series(1,6) n;
insert into public.staffs(id,company_id,auth_user_id,staff_code,full_name,email,default_branch_id,status)
values ('a6000000-0000-0000-0000-000000000007','a1000000-0000-0000-0000-000000000001','a5000000-0000-0000-0000-000000000007','TBC-A-DIS','A Disabled','tbc-a-disabled@example.invalid',null,'disabled');
insert into public.staffs(id,company_id,auth_user_id,staff_code,full_name,email,default_branch_id,status)
select ('b6000000-0000-0000-0000-00000000000'||n)::uuid,'b1000000-0000-0000-0000-000000000001',('b5000000-0000-0000-0000-00000000000'||n)::uuid,
 'TBC-B-'||n,'B Staff '||n,'tbc-b-'||n||'@example.invalid',case when n=6 then 'b2000000-0000-0000-0000-000000000002'::uuid else 'b2000000-0000-0000-0000-000000000001'::uuid end,'active'
from generate_series(1,6) n;
insert into public.staff_roles(staff_id,role_id,branch_id,is_primary)
select ('a6000000-0000-0000-0000-00000000000'||n)::uuid,('a4000000-0000-0000-0000-00000000000'||n)::uuid,
 case when n < 5 then null when n=5 then 'a2000000-0000-0000-0000-000000000001'::uuid else 'a2000000-0000-0000-0000-000000000002'::uuid end,true
from generate_series(1,6) n;
insert into public.staff_roles(staff_id,role_id,branch_id,is_primary)
select ('b6000000-0000-0000-0000-00000000000'||n)::uuid,('b4000000-0000-0000-0000-00000000000'||n)::uuid,
 case when n < 5 then null when n=5 then 'b2000000-0000-0000-0000-000000000001'::uuid else 'b2000000-0000-0000-0000-000000000002'::uuid end,true
from generate_series(1,6) n;
insert into public.staff_branches(staff_id,branch_id,access_level,is_default) values
 ('a6000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','full',true),
 ('a6000000-0000-0000-0000-000000000002','a2000000-0000-0000-0000-000000000001','manage',true),
 ('a6000000-0000-0000-0000-000000000003','a2000000-0000-0000-0000-000000000001','manage',true),
 ('a6000000-0000-0000-0000-000000000004','a2000000-0000-0000-0000-000000000001','manage',true),
 ('a6000000-0000-0000-0000-000000000005','a2000000-0000-0000-0000-000000000001','full',true),
 ('a6000000-0000-0000-0000-000000000006','a2000000-0000-0000-0000-000000000002','full',true),
 ('b6000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','full',true),
 ('b6000000-0000-0000-0000-000000000005','b2000000-0000-0000-0000-000000000001','full',true),
 ('b6000000-0000-0000-0000-000000000006','b2000000-0000-0000-0000-000000000002','full',true);

-- Representative capability separation. Owner is intrinsically all-capable.
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on
 (r.role_code='manager' and p.permission_code in ('branches.read','documents.read','production.view','stock_transfer.read','stock_wastage.read','staffs.read','staffs.update'))
 or (r.role_code='finance' and p.permission_code in ('branches.read','supplier_invoice.view','supplier_invoice.pay','documents.read'))
 or (r.role_code='purchasing' and p.permission_code in ('branches.read','items.create','items.update','suppliers.create','suppliers.update','supplier_items.create','supplier_items.update','purchase_order.read','purchase_order.create'))
 or (r.role_code='kitchen' and p.permission_code in ('branches.read','stock_transactions.read','purchase_request.read','pr.view_branch','production.view'))
 or (r.role_code='outlet_staff' and p.permission_code in ('branches.read','outlet_daily_record.view'))
where r.company_id in ('a1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001')
on conflict do nothing;

-- Representative tenant-owned and parent-owned records across affected domains.
insert into public.suppliers(id,company_id,supplier_code,name) values
 ('a7000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','TBC-SUP','A Supplier'),
 ('b7000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','TBC-SUP','B Supplier');
insert into public.items(id,company_id,item_code,item_name,category,purchase_unit,base_unit,supplier_id) values
 ('a7100000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','TBC-ITEM','A Item','Test','KG','KG','a7000000-0000-0000-0000-000000000001'),
 ('b7100000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','TBC-ITEM','B Item','Test','KG','KG','b7000000-0000-0000-0000-000000000001');
insert into public.products(id,company_id,product_code,product_name,category,selling_unit) values
 ('a7200000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','TBC-PROD','A Product','Test','PCS'),
 ('b7200000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','TBC-PROD','B Product','Test','PCS');
insert into public.supplier_items(id,company_id,supplier_id,item_id,supplier_item_code,supplier_item_name,purchase_uom) values
 ('a7300000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a7000000-0000-0000-0000-000000000001','a7100000-0000-0000-0000-000000000001','TBC-SI','A Mapping','KG'),
 ('b7300000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','b7000000-0000-0000-0000-000000000001','b7100000-0000-0000-0000-000000000001','TBC-SI','B Mapping','KG');
insert into public.uom_conversions(id,company_id,item_id,from_uom,to_uom,factor) values
 ('a7400000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a7100000-0000-0000-0000-000000000001','KG','G',1000),
 ('b7400000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','b7100000-0000-0000-0000-000000000001','KG','G',1000);
insert into public.product_packaging(id,product_id,packaging_name,selling_uom) values
 ('a7500000-0000-0000-0000-000000000001','a7200000-0000-0000-0000-000000000001','A Pack','PCS'),
 ('b7500000-0000-0000-0000-000000000001','b7200000-0000-0000-0000-000000000001','B Pack','PCS');
insert into public.branch_supplier_items(id,branch_id,supplier_item_id,item_id) values
 ('a7600000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','a7300000-0000-0000-0000-000000000001','a7100000-0000-0000-0000-000000000001'),
 ('b7600000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','b7300000-0000-0000-0000-000000000001','b7100000-0000-0000-0000-000000000001');
insert into public.recipes(id,company_id,product_id,version,yield_qty,yield_unit,recipe_no) values
 ('a7700000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a7200000-0000-0000-0000-000000000001',1,1,'PCS','TBC-A-R'),
 ('b7700000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','b7200000-0000-0000-0000-000000000001',1,1,'PCS','TBC-B-R');
insert into public.recipe_lines(id,recipe_id,ingredient_item_id,qty_required,unit,recipe_uom,base_uom,base_qty_required) values
 ('a7710000-0000-0000-0000-000000000001','a7700000-0000-0000-0000-000000000001','a7100000-0000-0000-0000-000000000001',1,'KG','KG','KG',1),
 ('b7710000-0000-0000-0000-000000000001','b7700000-0000-0000-0000-000000000001','b7100000-0000-0000-0000-000000000001',1,'KG','KG','KG',1);
insert into public.documents(id,company_id,document_no,document_type,title) values
 ('a7800000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','TBC-A-DOC','memo','A Document'),
 ('b7800000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','TBC-B-DOC','memo','B Document');
insert into public.document_comments(id,document_id,comment_text) values
 ('a7810000-0000-0000-0000-000000000001','a7800000-0000-0000-0000-000000000001','A Comment'),
 ('b7810000-0000-0000-0000-000000000001','b7800000-0000-0000-0000-000000000001','B Comment');
insert into public.purchase_orders(id,company_id,po_no,supplier_id,branch_id) values
 ('a7900000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','TBC-A-PO','a7000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001'),
 ('b7900000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','TBC-B-PO','b7000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001');
insert into public.purchase_order_lines(id,purchase_order_id,item_id,qty_ordered,uom) values
 ('a7910000-0000-0000-0000-000000000001','a7900000-0000-0000-0000-000000000001','a7100000-0000-0000-0000-000000000001',1,'KG'),
 ('b7910000-0000-0000-0000-000000000001','b7900000-0000-0000-0000-000000000001','b7100000-0000-0000-0000-000000000001',1,'KG');
insert into public.stock_transfers(id,company_id,transfer_no,from_branch_id,to_branch_id) values
 ('a7920000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','TBC-A-TR','a2000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000002'),
 ('b7920000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','TBC-B-TR','b2000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000002');
insert into public.stock_transfer_lines(id,stock_transfer_id,item_id,quantity,uom) values
 ('a7930000-0000-0000-0000-000000000001','a7920000-0000-0000-0000-000000000001','a7100000-0000-0000-0000-000000000001',1,'KG'),
 ('b7930000-0000-0000-0000-000000000001','b7920000-0000-0000-0000-000000000001','b7100000-0000-0000-0000-000000000001',1,'KG');
insert into public.stock_wastage(id,company_id,wastage_no,branch_id,reason) values
 ('a7940000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','TBC-A-W','a2000000-0000-0000-0000-000000000001','other'),
 ('b7940000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','TBC-B-W','b2000000-0000-0000-0000-000000000001','other');
insert into public.stock_wastage_lines(id,stock_wastage_id,item_id,quantity,uom,reason) values
 ('a7950000-0000-0000-0000-000000000001','a7940000-0000-0000-0000-000000000001','a7100000-0000-0000-0000-000000000001',1,'KG','other'),
 ('b7950000-0000-0000-0000-000000000001','b7940000-0000-0000-0000-000000000001','b7100000-0000-0000-0000-000000000001',1,'KG','other');
insert into public.production_jobs(id,company_id,branch_id,production_job_no,production_date,recipe_id,product_id,planned_output_qty,output_uom) values
 ('a7960000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','TBC-A-PJ',current_date,'a7700000-0000-0000-0000-000000000001','a7200000-0000-0000-0000-000000000001',1,'PCS'),
 ('b7960000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','TBC-B-PJ',current_date,'b7700000-0000-0000-0000-000000000001','b7200000-0000-0000-0000-000000000001',1,'PCS');
insert into public.production_job_ingredient_lines(id,production_job_id,item_id,required_qty) values
 ('a7970000-0000-0000-0000-000000000001','a7960000-0000-0000-0000-000000000001','a7100000-0000-0000-0000-000000000001',1),
 ('b7970000-0000-0000-0000-000000000001','b7960000-0000-0000-0000-000000000001','b7100000-0000-0000-0000-000000000001',1);

-- Owner A: same-company access and cross-company SELECT/UPDATE/DELETE/INSERT denial.
select set_config('seri_bako.allow_protected_role_seed','off',true);
set local role rls_test_authenticated;
select set_config('request.jwt.claim.sub','a5000000-0000-0000-0000-000000000001',true);
do $$ begin
  if (select count(*) from public.companies where id in ('a1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001')) <> 1 then raise exception 'Owner company SELECT boundary failed'; end if;
  if (select count(*) from public.items where id in ('a7100000-0000-0000-0000-000000000001','b7100000-0000-0000-0000-000000000001')) <> 1 then raise exception 'Master SELECT boundary failed'; end if;
  if exists (select 1 from public.document_comments where id='b7810000-0000-0000-0000-000000000001') then raise exception 'Parent document boundary failed'; end if;
  if exists (select 1 from public.purchase_order_lines where id='b7910000-0000-0000-0000-000000000001') then raise exception 'PO child boundary failed'; end if;
  if exists (select 1 from public.stock_transfer_lines where id='b7930000-0000-0000-0000-000000000001') then raise exception 'Transfer child boundary failed'; end if;
  update public.companies set company_name='FORGED' where id='b1000000-0000-0000-0000-000000000001';
  delete from public.items where id='b7100000-0000-0000-0000-000000000001';
  begin
    insert into public.items(company_id,item_code,item_name,category,purchase_unit,base_unit) values ('b1000000-0000-0000-0000-000000000001','FORGED','Forged','Test','KG','KG');
    raise exception 'FORGED_COMPANY_INSERT_ACCEPTED';
  exception when others then if sqlerrm='FORGED_COMPANY_INSERT_ACCEPTED' then raise; end if; end;
end $$;
reset role;
do $$ begin
 if (select company_name from public.companies where id='b1000000-0000-0000-0000-000000000001')='FORGED' then raise exception 'Cross-company update changed state'; end if;
 if not exists(select 1 from public.items where id='b7100000-0000-0000-0000-000000000001') then raise exception 'Cross-company delete changed state'; end if;
end $$;

-- Manager is company-wide; Kitchen and Outlet remain assigned-branch only.
set local role rls_test_authenticated;
select set_config('request.jwt.claim.sub','a5000000-0000-0000-0000-000000000003',true);
do $$ begin if (select count(*) from public.branches where company_id='a1000000-0000-0000-0000-000000000001') <> 3 then raise exception 'Manager company-wide branches failed'; end if; end $$;
select set_config('request.jwt.claim.sub','a5000000-0000-0000-0000-000000000005',true);
do $$ begin if (select count(*) from public.branches) <> 1 then raise exception 'Kitchen assigned branch failed'; end if; if exists(select 1 from public.branches where id='a2000000-0000-0000-0000-000000000003') then raise exception 'Kitchen read unassigned branch'; end if; end $$;
select set_config('request.jwt.claim.sub','a5000000-0000-0000-0000-000000000006',true);
do $$ begin if (select count(*) from public.branches) <> 1 or not exists(select 1 from public.branches where id='a2000000-0000-0000-0000-000000000002') then raise exception 'Outlet branch scope failed'; end if; end $$;
select set_config('request.jwt.claim.sub','a5000000-0000-0000-0000-000000000007',true);
do $$ begin if exists(select 1 from public.companies) or exists(select 1 from public.items) then raise exception 'Disabled staff received business access'; end if; end $$;
reset role;

-- Finance/Purchasing separation.
set local role rls_test_authenticated;
select set_config('request.jwt.claim.sub','a5000000-0000-0000-0000-000000000002',true);
do $$ begin if not public.has_permission('supplier_invoice.pay') or public.has_permission('pr.manager_approve') then raise exception 'Finance separation failed'; end if; end $$;
select set_config('request.jwt.claim.sub','a5000000-0000-0000-0000-000000000004',true);
do $$ begin if not public.has_permission('suppliers.create') or public.has_permission('supplier_invoice.pay') then raise exception 'Purchasing separation failed'; end if; end $$;
reset role;

-- Atomic staff access: cross-company inputs and last per-company Owner fail
-- without changing prior access; Manager receives every company branch.
set local role rls_test_authenticated;
select set_config('request.jwt.claim.sub','a5000000-0000-0000-0000-000000000001',true);
do $$ declare before_role uuid; before_branch uuid; begin
  select role_id into before_role from public.staff_roles where staff_id='a6000000-0000-0000-0000-000000000005' and is_primary;
  select branch_id into before_branch from public.staff_branches where staff_id='a6000000-0000-0000-0000-000000000005' and is_default;
  begin perform public.replace_staff_access_atomic('a6000000-0000-0000-0000-000000000005','b4000000-0000-0000-0000-000000000003','a2000000-0000-0000-0000-000000000001',array['a2000000-0000-0000-0000-000000000001']::uuid[]); raise exception 'CROSS_ROLE_ACCEPTED'; exception when others then if sqlerrm='CROSS_ROLE_ACCEPTED' then raise; end if; end;
  begin perform public.replace_staff_access_atomic('a6000000-0000-0000-0000-000000000005','a4000000-0000-0000-0000-000000000005','b2000000-0000-0000-0000-000000000001',array['b2000000-0000-0000-0000-000000000001']::uuid[]); raise exception 'CROSS_BRANCH_ACCEPTED'; exception when others then if sqlerrm='CROSS_BRANCH_ACCEPTED' then raise; end if; end;
  begin perform public.replace_staff_access_atomic('a6000000-0000-0000-0000-000000000005','a4000000-0000-0000-0000-000000000005','a2000000-0000-0000-0000-000000000002',array['a2000000-0000-0000-0000-000000000002']::uuid[]); raise exception 'KITCHEN_OUTLET_ACCEPTED'; exception when others then if sqlerrm='KITCHEN_OUTLET_ACCEPTED' then raise; end if; end;
  if (select role_id from public.staff_roles where staff_id='a6000000-0000-0000-0000-000000000005' and is_primary) is distinct from before_role
     or (select branch_id from public.staff_branches where staff_id='a6000000-0000-0000-0000-000000000005' and is_default) is distinct from before_branch then raise exception 'Failed atomic validation changed access'; end if;
  begin perform public.replace_staff_access_atomic('a6000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000003','a2000000-0000-0000-0000-000000000001',array['a2000000-0000-0000-0000-000000000001']::uuid[]); raise exception 'LAST_OWNER_REMOVED'; exception when others then if sqlerrm='LAST_OWNER_REMOVED' then raise; end if; end;
  if not exists(select 1 from public.staff_roles where staff_id='a6000000-0000-0000-0000-000000000001' and role_id='a4000000-0000-0000-0000-000000000001') then raise exception 'Last Owner check was not per-company atomic'; end if;
  perform public.replace_staff_access_atomic('a6000000-0000-0000-0000-000000000003','a4000000-0000-0000-0000-000000000003','a2000000-0000-0000-0000-000000000001',array['a2000000-0000-0000-0000-000000000001']::uuid[]);
  if (select count(*) from public.staff_branches where staff_id='a6000000-0000-0000-0000-000000000003') <> 3 then raise exception 'Manager atomic company-wide replacement failed'; end if;
end $$;
reset role;

-- Anonymous has no business-table privilege.
set local role anon;
do $$ begin
  begin perform count(*) from public.companies; raise exception 'ANON_SELECT_ACCEPTED';
  exception when insufficient_privilege then null; when others then if sqlerrm='ANON_SELECT_ACCEPTED' then raise; else raise; end if; end;
end $$;
reset role;

-- Final-state policy, grant, function, and view inventory assertions.
do $$ begin
  if exists (select 1 from pg_policies where schemaname='public' and (coalesce(qual,'') ~* '(^|[^a-z])true([^a-z]|$)' or coalesce(with_check,'') ~* '(^|[^a-z])true([^a-z]|$)')) then raise exception 'Literal true policy survived'; end if;
  if exists (select 1 from pg_policies where schemaname='public' and policyname not like 'tenant %') then raise exception 'Superseded policy name survived'; end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity and not exists(select 1 from pg_policy p where p.polrelid=c.oid)) then raise exception 'RLS table has no policy'; end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and (p.proconfig is null or array_to_string(p.proconfig,',') not like '%search_path=pg_catalog, public%' or has_function_privilege('public',p.oid,'execute') or has_function_privilege('anon',p.oid,'execute'))) then raise exception 'SECURITY DEFINER grant/search_path inventory failed'; end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('v','m') and (not ('security_invoker=true'=any(coalesce(c.reloptions,'{}'))) or has_table_privilege('anon',c.oid,'select'))) then raise exception 'View security inventory failed'; end if;
  if exists (select 1 from information_schema.role_table_grants where table_schema='public' and grantee='anon') then raise exception 'anon table grant survived'; end if;
end $$;

rollback;
\echo 'tenant boundary closure validation passed'
