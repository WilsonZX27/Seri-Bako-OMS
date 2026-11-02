\set ON_ERROR_STOP on
begin;

select set_config('request.jwt.claim.role','service_role',true);

insert into public.companies (id, company_code, company_name)
values ('91000000-0000-0000-0000-000000000001', 'INV-GO-LIVE', 'Inventory Go-Live Validation');
insert into public.branches (id, company_id, branch_code, branch_name, branch_type)
values
  ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'ALMA-T', 'ALMA Test', 'central_kitchen'),
  ('92000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', 'PJS10-T', 'PJS10 Test', 'outlet');
insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('94000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'inventory.owner@example.invalid', now(), now()),
  ('94000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'inventory.kitchen@example.invalid', now(), now());
insert into public.staffs (id, company_id, auth_user_id, staff_code, full_name, email, default_branch_id)
values
  ('95000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000001', 'INV-OWNER-T', 'Inventory Owner Test', 'inventory.owner@example.invalid', '92000000-0000-0000-0000-000000000001'),
  ('95000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000002', 'INV-KITCHEN-T', 'Inventory Kitchen Test', 'inventory.kitchen@example.invalid', '92000000-0000-0000-0000-000000000001');
insert into public.roles(company_id,role_code,role_name) values
 ('91000000-0000-0000-0000-000000000001','super_admin','Super Admin / Owner'),
 ('91000000-0000-0000-0000-000000000001','kitchen','Kitchen');
insert into public.role_permissions(role_id,permission_id)
select distinct target.id,rp.permission_id from public.roles target join public.roles template on template.role_code=target.role_code and template.company_id is distinct from target.company_id join public.role_permissions rp on rp.role_id=template.id
where target.company_id='91000000-0000-0000-0000-000000000001' on conflict do nothing;
insert into public.staff_roles (staff_id, role_id, branch_id, is_primary)
select '95000000-0000-0000-0000-000000000001', id, null, true from public.roles where role_code = 'super_admin' and company_id='91000000-0000-0000-0000-000000000001';
insert into public.staff_roles (staff_id, role_id, branch_id, is_primary)
select '95000000-0000-0000-0000-000000000002', id, '92000000-0000-0000-0000-000000000001', true from public.roles where role_code = 'kitchen' and company_id='91000000-0000-0000-0000-000000000001';
insert into public.staff_branches (staff_id, branch_id, access_level, is_default)
values
  ('95000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', 'full', true),
  ('95000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000001', 'full', true);

insert into public.suppliers (id, company_id, supplier_code, name, status)
values ('96000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'INV-SUP-T', 'Inventory Supplier Test', 'active');
insert into public.items (id, company_id, item_code, item_name, category, purchase_unit, base_unit, cost, status)
values
  ('97000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'INV-ITEM-1', 'Canonical Inventory Item', 'Validation', 'CTN', 'CTN', 4, 'active'),
  ('97000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', 'INV-ITEM-2', 'Canonical Inventory Item Two', 'Validation', 'PCS', 'PCS', 2, 'active');
insert into public.supplier_items (
  id, company_id, supplier_id, item_id, supplier_item_code, supplier_item_name, purchase_uom, unit_cost
) values (
  '96500000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-000000000001',
  '97000000-0000-0000-0000-000000000001', 'INV-SUP-ITEM-1', 'Inventory Supplier Item One', 'CTN', 4
);
insert into public.branch_supplier_items (branch_id, supplier_item_id, item_id, is_preferred)
values (
  '92000000-0000-0000-0000-000000000001', '96500000-0000-0000-0000-000000000001',
  '97000000-0000-0000-0000-000000000001', true
);


insert into public.stock_count_kg_items(company_id,item_id) values ('91000000-0000-0000-0000-000000000001','97000000-0000-0000-0000-000000000001');
insert into public.branch_stock_count_items(company_id,branch_id,item_id) values
 ('91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','97000000-0000-0000-0000-000000000001'),
 ('91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','97000000-0000-0000-0000-000000000002') on conflict do nothing;
-- A newly activated KG SKU needs count scope, not an opening balance or purchase mapping.
insert into public.items(id,company_id,item_code,item_name,category,base_unit,purchase_unit,conversion_to_base_unit,status)
values('97000000-0000-0000-0000-000000000003','91000000-0000-0000-0000-000000000001','NEW-SPICE-TEST','New spice test','TEST','KG','KG',1,'active');
do $$ begin
 if exists(select 1 from public.stock_count_eligible_items where item_id='97000000-0000-0000-0000-000000000003') then raise exception 'New item unexpectedly included'; end if;
end $$;
insert into public.branch_stock_count_items(company_id,branch_id,item_id,status)
values('91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','97000000-0000-0000-0000-000000000003','active');
do $$ begin
 if not exists(select 1 from public.stock_count_eligible_items where item_id='97000000-0000-0000-0000-000000000003' and base_unit='KG' and current_qty=0) then raise exception 'Scope-only inclusion failed'; end if;
 if exists(select 1 from public.stock_transactions where item_id='97000000-0000-0000-0000-000000000003') then raise exception 'Inclusion created inventory'; end if;
end $$;
delete from public.branch_stock_count_items where item_id='97000000-0000-0000-0000-000000000003';
insert into public.branch_stock_count_items(company_id,branch_id,item_id,status) values('91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000002','97000000-0000-0000-0000-000000000001','active');
set local role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000001',true);
select public.post_opening_stock('KG-TEST-OPEN','92000000-0000-0000-0000-000000000001','97000000-0000-0000-0000-000000000001',current_date,5,4,'synthetic');
reset role;
grant select on public.branches,public.staffs,public.staff_branches,public.stock_counts,public.stock_count_lines,public.items,public.stock_transactions,public.roles,public.role_permissions,public.permissions to authenticated;
create function public.kg_test_post_failure() returns trigger language plpgsql as $$ begin
 if current_setting('test.kg_force_failure',true)='true' and new.status='posted' then raise exception 'synthetic posting failure'; end if;
 return new; end $$;
create trigger kg_test_post_failure before update of status on public.stock_counts for each row execute function public.kg_test_post_failure();
set local role authenticated;
do $$
declare result jsonb; payload jsonb; cid uuid; only_cid uuid; lid uuid; before_movements integer; caught boolean;
begin
 payload:=jsonb_build_object('count_no','KG-DRAFT-TEST','count_date',current_date,'branch_id','92000000-0000-0000-0000-000000000001','tolerance_percent',0,'idempotency_key',gen_random_uuid(),'lines',jsonb_build_array(
  jsonb_build_object('item_id','97000000-0000-0000-0000-000000000001','uom','KG','physical_qty',5.125,'theoretical_qty',5,'weight_setup',jsonb_build_object('units_per_purchase',null,'kg_per_unit',null)),
  jsonb_build_object('item_id','97000000-0000-0000-0000-000000000002','uom','PCS','physical_qty',2,'theoretical_qty',0)));
 result:=public.save_stock_count_kg_draft(null,payload); cid:=(result->>'id')::uuid;
 if (select counted_kg from public.stock_count_kg_latest where stock_count_id=cid)<>5.125 then raise exception 'KG not preserved'; end if;
 if (select physical_qty from public.stock_count_lines where stock_count_id=cid and item_id='97000000-0000-0000-0000-000000000001') is not null then raise exception 'Unknown base quantity was fabricated'; end if;
 if (select physical_qty from public.stock_count_lines where stock_count_id=cid and item_id='97000000-0000-0000-0000-000000000002')<>2 then raise exception 'Normal item changed'; end if;
 if public.save_stock_count_kg_draft(null,payload)->>'id'<>cid::text then raise exception 'Create replay duplicated'; end if;
 if (select count(*) from public.stock_count_kg_measurements where stock_count_id=cid)<>1 then raise exception 'Replay duplicated evidence'; end if;
 select id into lid from public.stock_count_lines where stock_count_id=cid and item_id='97000000-0000-0000-0000-000000000001';
 payload:=jsonb_set(payload,'{lines}',(select jsonb_agg(e||jsonb_build_object('line_id',l.id)) from jsonb_array_elements(payload->'lines') e join public.stock_count_lines l on l.stock_count_id=cid and l.item_id=(e->>'item_id')::uuid));
 payload:=jsonb_set(payload,'{lines,0,weight_setup}','{"units_per_purchase":4,"kg_per_unit":2.5,"package_description":"sealed 2.5 KG packs","evidence":"Net weight printed on label"}');
 perform public.save_stock_count_kg_draft(cid,payload);
 if (select units_per_purchase*kg_per_unit from public.stock_count_kg_latest where stock_count_id=cid)<>10 then raise exception 'Packaging not stored'; end if;
 if (select count(*) from public.stock_count_kg_measurements where stock_count_id=cid)<>2 then raise exception 'Audit version missing'; end if;
 perform public.save_stock_count_kg_draft(cid,payload);
 if (select count(*) from public.stock_count_kg_measurements where stock_count_id=cid)<>2 then raise exception 'Unchanged save duplicated evidence'; end if;
 select count(*) into before_movements from public.stock_transactions;
 caught:=false;
 begin perform public.post_stock_count_atomic(cid); exception when others then caught:=position('KG_COUNT_REVIEW_REQUIRED' in sqlerrm)>0; end;
 if not caught or (select count(*) from public.stock_transactions)<>before_movements then raise exception 'Posting was not fully rolled back'; end if;
 caught:=false;
 begin perform public.save_stock_count_kg_draft(cid,jsonb_set(payload,'{lines,0,weight_setup,kg_per_unit}','0')); exception when check_violation then caught:=true; end;
 if not caught or (select count(*) from public.stock_count_kg_measurements where stock_count_id=cid)<>2 then raise exception 'Invalid net weight not atomic'; end if;
 caught:=false;
 begin perform public.save_stock_count_kg_draft(cid,jsonb_set(payload,'{lines,0,weight_setup,evidence}','""')); exception when check_violation then caught:=true; end;
 if not caught then raise exception 'Unproven ratio accepted'; end if;
 if (select base_unit from public.items where id='97000000-0000-0000-0000-000000000001')<>'CTN' or (select purchase_unit from public.items where id='97000000-0000-0000-0000-000000000001')<>'CTN' then raise exception 'Shared units changed'; end if;
 if public.inventory_item_branch_balance('97000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001')<>5 then raise exception 'Balance changed'; end if;
 caught:=false; begin update public.stock_count_kg_measurements set counted_kg=99 where stock_count_id=cid; exception when insufficient_privilege then caught:=true; end;
 if not caught then raise exception 'Audit evidence is directly writable'; end if;
 caught:=false; begin perform public.save_stock_count_kg_draft(cid,jsonb_set(payload,'{lines,0,uom}','"CTN"')); exception when others then caught:=position('physical weight in KG' in sqlerrm)>0; end;
 if not caught then raise exception 'Wrong measurement unit accepted'; end if;
 caught:=false; begin perform public.save_stock_count_kg_draft(cid,jsonb_set(payload,'{lines,0,physical_qty}','5.12345')); exception when others then caught:=position('Invalid measured KG' in sqlerrm)>0; end;
 if not caught then raise exception 'Unsupported precision accepted'; end if;
 result:=public.save_stock_count_kg_draft(null,jsonb_build_object('count_no','KG-ONLY-TEST','count_date',current_date,'branch_id','92000000-0000-0000-0000-000000000002','tolerance_percent',0,'idempotency_key',gen_random_uuid(),'lines',jsonb_build_array(jsonb_build_object('item_id','97000000-0000-0000-0000-000000000001','uom','KG','physical_qty',1.79,'theoretical_qty',0,'weight_setup',jsonb_build_object('units_per_purchase',null,'kg_per_unit',null)))));
 only_cid:=(result->>'id')::uuid;
 caught:=false; begin perform public.post_stock_count_verified_lines(only_cid,array['97000000-0000-0000-0000-000000000001'::uuid]); exception when others then caught:=position('Only weight reviews remain' in sqlerrm)>0; end;
 if not caught or (select status from public.stock_counts where id=only_cid)<>'draft' then raise exception 'Weight-only count incorrectly posted'; end if;
 -- Kitchen has branch scope but saving still uses the existing explicit update permission.
 perform set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000002',true);
 if public.has_permission('stock_count.update') then perform public.save_stock_count_kg_draft(cid,payload); end if;
 perform set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000001',true);
 caught:=false; begin perform public.post_stock_count_verified_lines(cid,array['97000000-0000-0000-0000-000000000002'::uuid]); exception when others then caught:=position('Review set changed' in sqlerrm)>0; end;
 if not caught then raise exception 'Changed confirmation accepted'; end if;
 perform set_config('test.kg_force_failure','true',true);
 caught:=false; begin perform public.post_stock_count_verified_lines(cid,array['97000000-0000-0000-0000-000000000001'::uuid]); exception when others then caught:=position('synthetic posting failure' in sqlerrm)>0; end;
 if not caught or (select count(*) from public.stock_count_lines where stock_count_id=cid)<>2 or exists(select 1 from public.stock_count_kg_reviews where stock_count_id=cid and review_status='pending') or (select count(*) from public.stock_transactions)<>before_movements then raise exception 'Failed verified posting was not atomic'; end if;
 perform set_config('test.kg_force_failure','false',true);
 result:=public.post_stock_count_verified_lines(cid,array['97000000-0000-0000-0000-000000000001'::uuid]);
 if (result->>'pending_weight_reviews')::integer<>1 or (select status from public.stock_counts where id=cid)<>'posted' then raise exception 'Verified post missing review disclosure'; end if;
 if (select count(*) from public.stock_count_lines where stock_count_id=cid)<>1 or (select count(*) from public.stock_count_kg_reviews where stock_count_id=cid and review_status='pending')<>1 then raise exception 'Formal and review lines not separated'; end if;
 if public.inventory_item_branch_balance('97000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001')<>5 or public.inventory_item_branch_balance('97000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-000000000001')<>2 then raise exception 'Wrong inventory affected'; end if;
 perform public.post_stock_count_verified_lines(cid,array['97000000-0000-0000-0000-000000000001'::uuid]);
 if (select count(*) from public.stock_transactions)<>before_movements+1 then raise exception 'Posting replay duplicated inventory'; end if;
 perform public.save_stock_count_weight_review(lid,'{"counted_kg":5.125,"units_per_purchase":4,"kg_per_unit":2.5,"package_description":"Sealed packs","evidence":"Updated label evidence"}');
 if (select count(*) from public.stock_count_kg_measurements where line_id=lid)<>3 or (select review_status from public.stock_count_kg_reviews where line_id=lid)<>'pending' then raise exception 'Evidence update did not preserve pending audit'; end if;
 if (select count(*) from public.stock_transactions)<>before_movements+1 then raise exception 'Review update affected stock'; end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',true);
 caught:=false; begin perform public.save_stock_count_kg_draft(cid,payload); exception when others then caught:=true; end;
 if not caught then raise exception 'Unknown identity accepted'; end if;
 if exists(select 1 from public.stock_count_kg_latest where stock_count_id=cid) or exists(select 1 from public.stock_count_kg_reviews where stock_count_id=cid) then raise exception 'Tenant read boundary failed'; end if;
 raise notice 'KG draft, exact decimals, packaging evidence, versioning, replay, invalid-ratio rollback, unchanged units/balance, explicit verified posting, failure rollback, replay, unchanged BWY ledger, separate review supplement, weight-only draft and identity/read-scope tests passed';
end $$;
-- 377 and KG cooperate when this draft has an item outside future branch count scope.
do $$
declare payload jsonb; result jsonb; cid uuid; before_versions integer; rejected boolean:=false;
begin
 perform set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000001',true);
 payload:=jsonb_build_object('count_no','KG-ADDED-TEST','count_date',current_date,'branch_id','92000000-0000-0000-0000-000000000001','tolerance_percent',0,'idempotency_key',gen_random_uuid(),'lines',jsonb_build_array(
 jsonb_build_object('item_id','97000000-0000-0000-0000-000000000001','uom','KG','physical_qty',1.234,'weight_setup',jsonb_build_object('units_per_purchase',null,'kg_per_unit',null)),
 jsonb_build_object('item_id','97000000-0000-0000-0000-000000000002','uom','PCS','physical_qty',2),
 jsonb_build_object('item_id','97000000-0000-0000-0000-000000000003','uom','KG','physical_qty',0.112)));
 result:=public.save_stock_count_kg_draft(null,payload); cid:=(result->>'id')::uuid;
 if (select count(*) from public.stock_count_lines where stock_count_id=cid)<>3 then raise exception 'Added item missing from mixed KG draft'; end if;
 if public.save_stock_count_kg_draft(null,payload)->>'id'<>cid::text then raise exception 'Mixed added-item replay duplicated'; end if;
 select count(*) into before_versions from public.stock_count_kg_measurements where stock_count_id=cid;
 begin perform public.save_stock_count_kg_draft(null,jsonb_set(payload,'{lines,0,physical_qty}','9.999')); exception when others then rejected:=position('different KG evidence' in sqlerrm)>0; end;
 if not rejected or (select count(*) from public.stock_count_kg_measurements where stock_count_id=cid)<>before_versions then raise exception 'Changed replay modified KG evidence'; end if;
 raise notice 'PASS: mixed KG + 377 added item, exact 0.112 KG, same replay, changed replay rejected, future scope unchanged';
end $$;
-- Scope-table visibility is intentionally unavailable to the actor. Inspect this
-- invariant as the fixture owner rather than widening the actor's SELECT grant.
reset role;
do $$ begin
 if exists(select 1 from public.branch_stock_count_items where item_id='97000000-0000-0000-0000-000000000003') then raise exception 'Current-count add changed future branch scope'; end if;
end $$;
\ir stock-count-kg-recovery.sql
rollback;
