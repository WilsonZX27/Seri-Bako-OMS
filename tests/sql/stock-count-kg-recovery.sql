-- Included by the local KG fixture inside its rolled-back transaction.
reset role;
select set_config('test.kg_pending_line',(select line_id::text from public.stock_count_kg_reviews r join public.stock_counts c on c.id=r.stock_count_id where c.count_no='KG-DRAFT-TEST'),true);
select set_config('test.kg_only_count',(select id::text from public.stock_counts where count_no='KG-ONLY-TEST'),true);
select set_config('test.kg_posted_count',(select id::text from public.stock_counts where count_no='KG-DRAFT-TEST'),true);
create function pg_temp.kg_expect_denied(statement text, expected text) returns void language plpgsql as $$
declare rejected boolean:=false;
begin
 begin execute statement; exception when others then
  if position(expected in sqlerrm)=0 then raise exception 'Unexpected rejection: %',sqlerrm; end if;
  rejected:=true;
 end;
 if not rejected then raise exception 'Unauthorized operation succeeded: %',statement; end if;
end $$;
-- Give the synthetic branch-scoped Kitchen identity exact stock-count permissions only.
delete from public.role_permissions where role_id in(select id from public.roles where company_id='91000000-0000-0000-0000-000000000001' and role_code='kitchen');
insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r cross join public.permissions p where r.company_id='91000000-0000-0000-0000-000000000001' and r.role_code='kitchen' and p.permission_code in('stock_count.read','stock_count.create','stock_count.update','stock_count.post');
set local role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000002',true);
do $$ begin
 if not public.has_permission('stock_count.post') or public.can_access_inventory_branch('91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000002') then raise exception 'Invalid branch fixture'; end if;
 if exists(select 1 from public.stock_count_kg_reviews where stock_count_id=current_setting('test.kg_only_count')::uuid) or exists(select 1 from public.stock_count_kg_latest where stock_count_id=current_setting('test.kg_only_count')::uuid) then raise exception 'Cross-branch evidence leaked'; end if;
 if not exists(select 1 from public.stock_count_kg_reviews where stock_count_id=current_setting('test.kg_posted_count')::uuid) then raise exception 'Own branch evidence not readable'; end if;
end $$;
select pg_temp.kg_expect_denied(format('select public.save_stock_count_kg_draft(%L,''{"lines":[{}]}'')',current_setting('test.kg_only_count')),'not an editable branch draft');
select pg_temp.kg_expect_denied(format('select public.post_stock_count_verified_lines(%L,array[''97000000-0000-0000-0000-000000000001''::uuid])',current_setting('test.kg_only_count')),'unavailable');
-- Relocate only the synthetic posted fixture temporarily to test a pending supplement across branches.
reset role;
update public.stock_counts set branch_id='92000000-0000-0000-0000-000000000002' where id=current_setting('test.kg_posted_count')::uuid;
set local role authenticated;
select pg_temp.kg_expect_denied(format('select public.save_stock_count_weight_review(%L,''{"counted_kg":8}'')',current_setting('test.kg_pending_line')),'unavailable');
reset role;
update public.stock_counts set branch_id='92000000-0000-0000-0000-000000000001' where id=current_setting('test.kg_posted_count')::uuid;
-- Post-only permission must not expose snapshots, raw measurements, the latest view or configuration.
delete from public.role_permissions rp using public.roles r,public.permissions p where rp.role_id=r.id and rp.permission_id=p.id and r.company_id='91000000-0000-0000-0000-000000000001' and r.role_code='kitchen' and p.permission_code in('stock_count.read','stock_count.create','stock_count.update');
set local role authenticated;
do $$ begin
 if public.has_permission('stock_count.read') or not public.has_permission('stock_count.post') or public.has_permission('stock_count.create') or public.has_permission('stock_count.update') then raise exception 'Invalid post-only read fixture'; end if;
 if exists(select 1 from public.stock_count_lines where stock_count_id=current_setting('test.kg_posted_count')::uuid) then raise exception 'Baseline formal line policy unexpectedly readable'; end if;
 if exists(select 1 from public.stock_count_kg_reviews where line_id=current_setting('test.kg_pending_line')::uuid) or exists(select 1 from public.stock_count_kg_measurements where line_id=current_setting('test.kg_pending_line')::uuid) or exists(select 1 from public.stock_count_kg_latest where line_id=current_setting('test.kg_pending_line')::uuid) or exists(select 1 from public.stock_count_kg_items where company_id='91000000-0000-0000-0000-000000000001') then raise exception 'Post-only KG read expansion'; end if;
 -- The authorized posting replay still performs internal checks without granting snapshot reads.
 perform public.post_stock_count_verified_lines(current_setting('test.kg_posted_count')::uuid,array['97000000-0000-0000-0000-000000000001'::uuid]);
 raise notice 'PASS: post-only cannot read KG resources; authorized posting replay retains internal access';
end $$;
reset role;
-- Each existing legal-reader permission individually reads exactly the own-branch evidence.
do $$ declare permission_name text; begin
 foreach permission_name in array array['stock_count.read','stock_count.create','stock_count.update'] loop
  delete from public.role_permissions where role_id in(select id from public.roles where company_id='91000000-0000-0000-0000-000000000001' and role_code='kitchen');
  insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r cross join public.permissions p where r.company_id='91000000-0000-0000-0000-000000000001' and r.role_code='kitchen' and p.permission_code=permission_name;
  execute 'set local role authenticated';
  if not exists(select 1 from public.stock_count_lines where stock_count_id=current_setting('test.kg_posted_count')::uuid) or not exists(select 1 from public.stock_count_kg_reviews where line_id=current_setting('test.kg_pending_line')::uuid) or not exists(select 1 from public.stock_count_kg_measurements where line_id=current_setting('test.kg_pending_line')::uuid) or not exists(select 1 from public.stock_count_kg_latest where line_id=current_setting('test.kg_pending_line')::uuid) then raise exception 'Legal reader denied: %',permission_name; end if;
  if exists(select 1 from public.stock_count_kg_reviews where stock_count_id=current_setting('test.kg_only_count')::uuid) or exists(select 1 from public.stock_count_kg_latest where stock_count_id=current_setting('test.kg_only_count')::uuid) then raise exception 'Legal reader crossed branch: %',permission_name; end if;
  execute 'reset role';
 end loop;
 raise notice 'PASS: read-only, create-only and update-only readers retain own-branch evidence access';
end $$;
insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r cross join public.permissions p where r.company_id='91000000-0000-0000-0000-000000000001' and r.role_code='kitchen' and p.permission_code in('stock_count.read','stock_count.create','stock_count.update') on conflict do nothing;
-- No update/post: own-branch reads still work; both mutation routes must reject.
reset role;
delete from public.role_permissions rp using public.roles r,public.permissions p where rp.role_id=r.id and rp.permission_id=p.id and r.company_id='91000000-0000-0000-0000-000000000001' and r.role_code='kitchen' and p.permission_code in('stock_count.update','stock_count.post');
set local role authenticated;
select pg_temp.kg_expect_denied(format('select public.save_stock_count_kg_draft(%L,''{"lines":[{}]}'')',current_setting('test.kg_posted_count')),'permission denied');
select pg_temp.kg_expect_denied(format('select public.save_stock_count_weight_review(%L,''{"counted_kg":8}'')',current_setting('test.kg_pending_line')),'permission denied');
select pg_temp.kg_expect_denied(format('select public.post_stock_count_verified_lines(%L,array[''97000000-0000-0000-0000-000000000001''::uuid])',current_setting('test.kg_posted_count')),'permission denied');
-- Active foreign-company user, not merely an unknown JWT.
reset role;
insert into public.companies(id,company_code,company_name) values('91000000-0000-0000-0000-000000000002','KG-FOREIGN','Foreign company test');
insert into auth.users(id,aud,role,email,created_at,updated_at) values('94000000-0000-0000-0000-000000000003','authenticated','authenticated','kg.foreign@example.invalid',now(),now());
insert into public.staffs(id,company_id,auth_user_id,staff_code,full_name,email) values('95000000-0000-0000-0000-000000000003','91000000-0000-0000-0000-000000000002','94000000-0000-0000-0000-000000000003','KG-FOREIGN','Foreign actor','kg.foreign@example.invalid');
insert into public.roles(company_id,role_code,role_name) values('91000000-0000-0000-0000-000000000002','super_admin','Owner');
insert into public.staff_roles(staff_id,role_id,is_primary) select '95000000-0000-0000-0000-000000000003',id,true from public.roles where company_id='91000000-0000-0000-0000-000000000002' and role_code='super_admin';
set local role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000003',true);
do $$ begin
 if not public.has_permission('stock_count.update') then raise exception 'Foreign owner fixture lacks permission'; end if;
 if exists(select 1 from public.stock_count_kg_items where company_id='91000000-0000-0000-0000-000000000001') or exists(select 1 from public.stock_count_kg_reviews where stock_count_id=current_setting('test.kg_posted_count')::uuid) or exists(select 1 from public.stock_count_kg_measurements where stock_count_id=current_setting('test.kg_posted_count')::uuid) then raise exception 'Cross-company read leaked'; end if;
end $$;
select pg_temp.kg_expect_denied(format('select public.save_stock_count_kg_draft(%L,''{"lines":[{}]}'')',current_setting('test.kg_only_count')),'not an editable branch draft');
select pg_temp.kg_expect_denied(format('select public.save_stock_count_weight_review(%L,''{"counted_kg":8}'')',current_setting('test.kg_pending_line')),'unavailable');
select pg_temp.kg_expect_denied(format('select public.post_stock_count_verified_lines(%L,array[''97000000-0000-0000-0000-000000000001''::uuid])',current_setting('test.kg_only_count')),'unavailable');
reset role;
-- Inspect effective grants, including inherited PUBLIC rights, rather than only SQL text.
do $$ declare table_name text; rpc text; grantee text; begin
 foreach table_name in array array['stock_count_kg_items','stock_count_kg_reviews','stock_count_kg_measurements'] loop
  if not has_table_privilege('authenticated','public.'||table_name,'SELECT') or not has_table_privilege('service_role','public.'||table_name,'SELECT') or has_table_privilege('anon','public.'||table_name,'SELECT') then raise exception 'Unexpected SELECT grant: %',table_name; end if;
  foreach grantee in array array['anon','authenticated','service_role'] loop
   if has_table_privilege(grantee,'public.'||table_name,'INSERT,UPDATE,DELETE') then raise exception 'Unexpected evidence DML grant: % %',grantee,table_name; end if;
  end loop;
 end loop;
 foreach rpc in array array['public.save_stock_count_kg_draft(uuid,jsonb)','public.post_stock_count_verified_lines(uuid,uuid[])','public.save_stock_count_weight_review(uuid,jsonb)','public.post_stock_count_atomic(uuid)'] loop
  if not has_function_privilege('authenticated',rpc,'EXECUTE') or has_function_privilege('anon',rpc,'EXECUTE') or has_function_privilege('service_role',rpc,'EXECUTE') then raise exception 'Unexpected RPC grant: %',rpc; end if;
 end loop;
 if has_function_privilege('authenticated','public.post_stock_count_before_kg_drafts(uuid)','EXECUTE') then raise exception 'Legacy bypass callable'; end if;
end $$;
-- Snapshot all evidence and ledger before exercising the exact operator scripts.
create temp table kg_pause_snapshot as select 'reviews' kind,to_jsonb(r) data from public.stock_count_kg_reviews r union all select 'measurements',to_jsonb(m) from public.stock_count_kg_measurements m union all select 'ledger',to_jsonb(t) from public.stock_transactions t;
\ir ../../scripts/ops/pause-stock-count-kg.sql
set local role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000001',true);
select pg_temp.kg_expect_denied(format('select public.save_stock_count_kg_draft(%L,''{"lines":[{}]}'')',current_setting('test.kg_only_count')),'permission denied');
select pg_temp.kg_expect_denied(format('select public.save_stock_count_weight_review(%L,''{"counted_kg":8}'')',current_setting('test.kg_pending_line')),'permission denied');
select pg_temp.kg_expect_denied(format('select public.post_stock_count_verified_lines(%L,array[''97000000-0000-0000-0000-000000000001''::uuid])',current_setting('test.kg_only_count')),'permission denied');
select pg_temp.kg_expect_denied(format('select public.post_stock_count_atomic(%L)',current_setting('test.kg_only_count')),'KG_COUNT_REVIEW_REQUIRED');
select pg_temp.kg_expect_denied(format('select public.post_stock_count_before_kg_drafts(%L)',current_setting('test.kg_only_count')),'permission denied');
do $$ begin
 if not exists(select 1 from public.stock_count_kg_latest where line_id=current_setting('test.kg_pending_line')::uuid) or not exists(select 1 from public.stock_count_kg_reviews where line_id=current_setting('test.kg_pending_line')::uuid) then raise exception 'Pause hid evidence'; end if;
end $$;
reset role;
-- Database guards also stop privileged accidental evidence writes and status bypass.
select pg_temp.kg_expect_denied('update public.stock_count_kg_measurements set counted_kg=99','KG_WRITE_PAUSED');
select pg_temp.kg_expect_denied('update public.stock_count_kg_reviews set original_line=''{}''','KG_WRITE_PAUSED');
select pg_temp.kg_expect_denied(format('update public.stock_counts set status=''posted'' where id=%L',current_setting('test.kg_only_count')),'KG_COUNT_REVIEW_REQUIRED');
select pg_temp.kg_expect_denied(format('delete from public.stock_count_lines where stock_count_id=%L',current_setting('test.kg_only_count')),'verified-items confirmation');
do $$ begin
 if exists(with current_rows as(select 'reviews' kind,to_jsonb(r) data from public.stock_count_kg_reviews r union all select 'measurements',to_jsonb(m) from public.stock_count_kg_measurements m union all select 'ledger',to_jsonb(t) from public.stock_transactions t) select * from ((select * from kg_pause_snapshot except select * from current_rows) union all (select * from current_rows except select * from kg_pause_snapshot)) difference) then raise exception 'Pause mutated saved evidence or ledger'; end if;
end $$;
\ir ../../scripts/ops/resume-stock-count-kg.sql
set local role authenticated;
select public.save_stock_count_weight_review(current_setting('test.kg_pending_line')::uuid,'{"counted_kg":5.125,"package_description":"","evidence":"Resumed local rehearsal"}');
do $$ begin
 if (select version from public.stock_count_kg_latest where line_id=current_setting('test.kg_pending_line')::uuid)<>4 then raise exception 'Resume did not restore evidence append'; end if;
 raise notice 'PASS: cross-company, cross-branch, missing update/post; pause/resume, retained readable evidence, immutable ledger, legacy CTN posting and delete guards';
end $$;
reset role;
