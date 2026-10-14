const fs=require('fs'),{execFileSync}=require('child_process');
const fixture=JSON.parse(fs.readFileSync('outputs/wilson-qa/full-stack/fixture-private.json')), owner=fixture.accounts.find(x=>x.slug==='owner'), seed=JSON.parse(fs.readFileSync('/tmp/oms-recipe-atomic-fixture.json'));
seed.container=process.env.RECIPE_TEST_CONTAINER||seed.container; seed.source=process.env.RECIPE_TEST_SOURCE||seed.source; owner.staff=process.env.RECIPE_TEST_ACTOR||owner.staff;
const sql=`BEGIN;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from staffs where id='${owner.staff}'),true);
create function pg_temp.fail_stage() returns trigger language plpgsql as $$ begin if current_setting('qa.recipe.fail_stage',true)=TG_TABLE_NAME then raise exception 'Synthetic intermediate failure'; end if; return new; end $$;
${['document_revisions','recipe_lines','recipe_cost_snapshots','activity_logs','recipe_write_requests'].map(t=>`create trigger qa_atomic_failure before insert on ${t} for each row execute function pg_temp.fail_stage();`).join('\n')}
create function pg_temp.snapshot(r uuid) returns jsonb language sql as $$ select jsonb_build_object('header',to_jsonb(a),'lines',(select jsonb_agg(to_jsonb(l) order by id) from recipe_lines l where recipe_id=r),'snapshots',(select jsonb_agg(to_jsonb(s) order by id) from recipe_cost_snapshots s where recipe_id=r),'document',(select to_jsonb(d) from documents d where id=a.document_id),'revisions',(select jsonb_agg(to_jsonb(v) order by id) from document_revisions v where document_id=a.document_id)) from recipes a where id=r $$;
DO $$ declare body jsonb; result jsonb; key uuid; rid uuid; ts timestamptz; baseline jsonb; stage text; n integer; updatebody jsonb; copied uuid; workflow text; company uuid; foreign_company uuid; global_before jsonb; begin
 select jsonb_build_object('recipe_no','AUTO','version',1,'product_id',r.product_id,'yield_qty',r.yield_qty,'yield_unit',r.yield_unit,'effective_date',r.effective_date,'remarks','Synthetic atomic verification','lines',(select jsonb_agg(jsonb_build_object('ingredient_item_id',ingredient_item_id,'qty_required',qty_required,'recipe_uom',recipe_uom,'base_uom',base_uom,'conversion_factor',conversion_factor,'base_qty_required',base_qty_required,'wastage_percent',wastage_percent,'cost_per_unit',cost_per_unit,'remarks',remarks)) from recipe_lines where recipe_id=r.id)) into body from recipes r where id='${seed.source}';
 body:=body||jsonb_build_object('yield_qty',4,'lines',(select jsonb_agg(x||jsonb_build_object('qty_required',3,'base_qty_required',3,'conversion_factor',1,'cost_per_unit',2.5,'wastage_percent',10)) from jsonb_array_elements(body->'lines') x));
 update product_packaging set deleted_at=now() where product_id=(body->>'product_id')::uuid and deleted_at is null;
 insert into product_packaging(product_id,packaging_name,selling_uom,units_per_pack,min_order_qty,price,status) values((body->>'product_id')::uuid,'Synthetic six-unit pack','PCS',6,1,0,'active');
 select company_id into company from staffs where id='${owner.staff}';select id into foreign_company from companies where id<>company limit 1;assert foreign_company is not null,'Need second synthetic company';
 select count(*) into n from recipes;
 foreach stage in array array['document_revisions','recipe_lines','recipe_cost_snapshots','activity_logs','recipe_write_requests'] loop
  global_before:=jsonb_build_array((select count(*) from documents),(select count(*) from document_revisions),(select count(*) from activity_logs));key:=gen_random_uuid(); perform set_config('qa.recipe.fail_stage',stage,true);
  begin perform save_recipe_atomic('create',key,null,body); raise exception 'Expected injected failure'; exception when others then if SQLERRM<>'Synthetic intermediate failure' then raise; end if; end;
  assert global_before=jsonb_build_array((select count(*) from documents),(select count(*) from document_revisions),(select count(*) from activity_logs)),'Create left orphans';assert (select count(*) from recipes)=n, 'Create left partial recipe'; assert not exists(select from recipe_write_requests where request_key=key),'Create left ledger';
 end loop;
 perform set_config('qa.recipe.fail_stage','',true);key:=gen_random_uuid();result:=save_recipe_atomic('create',key,null,body);rid:=(result->>'id')::uuid;
 assert (save_recipe_atomic('create',key,null,body)->>'id')::uuid=rid,'Create replay differs';
 assert (select count(*) from recipe_cost_snapshots where recipe_id=rid)=1,'Create replay duplicated cost';
 assert (select total_ingredient_cost from recipe_cost_snapshots where recipe_id=rid)=round((select sum((x->>'base_qty_required')::numeric*(x->>'cost_per_unit')::numeric) from jsonb_array_elements(body->'lines') x),4),'Ingredient total differs';
 assert (select wastage_adjusted_cost from recipe_cost_snapshots where recipe_id=rid)=round((select sum((x->>'base_qty_required')::numeric*(x->>'cost_per_unit')::numeric*(1+(x->>'wastage_percent')::numeric/100)) from jsonb_array_elements(body->'lines') x),4),'Wastage total differs';
 assert (select cost_per_finished_unit from recipe_cost_snapshots where recipe_id=rid)=round((select sum((x->>'base_qty_required')::numeric*(x->>'cost_per_unit')::numeric*(1+(x->>'wastage_percent')::numeric/100))/(body->>'yield_qty')::numeric from jsonb_array_elements(body->'lines') x),6),'Unit cost differs';
 assert (select cost_per_pack from recipe_cost_snapshots where recipe_id=rid)=round((select sum((x->>'base_qty_required')::numeric*(x->>'cost_per_unit')::numeric*(1+(x->>'wastage_percent')::numeric/100))/(body->>'yield_qty')::numeric*6 from jsonb_array_elements(body->'lines') x),6),'Pack cost differs';

 begin perform save_recipe_atomic('create',key,null,body||jsonb_build_object('remarks','different'));raise exception 'Expected key rejection';exception when others then if SQLERRM not like 'Recipe request key was already%' then raise;end if;end;
 select updated_at, body||jsonb_build_object('recipe_no',recipe_no,'version',version,'remarks','Updated atomic verification') into ts,updatebody from recipes where id=rid;
 baseline:=pg_temp.snapshot(rid);
 foreach stage in array array['document_revisions','recipe_lines','recipe_cost_snapshots','activity_logs','recipe_write_requests'] loop
  perform set_config('qa.recipe.fail_stage',stage,true);key:=gen_random_uuid();
  begin perform save_recipe_atomic('update',key,rid,updatebody,ts);raise exception 'Expected injected failure';exception when others then if SQLERRM<>'Synthetic intermediate failure' then raise;end if;end;
  assert pg_temp.snapshot(rid)=baseline,'Update changed old contents';assert not exists(select from recipe_write_requests where request_key=key),'Update left ledger';
 end loop;
 perform set_config('qa.recipe.fail_stage','',true);key:=gen_random_uuid();perform save_recipe_atomic('update',key,rid,updatebody,ts);perform save_recipe_atomic('update',key,rid,updatebody,ts);
 assert (select count(*) from recipe_cost_snapshots where recipe_id=rid)=2,'Update replay duplicated cost';
 begin perform save_recipe_atomic('update',gen_random_uuid(),rid,updatebody,ts-interval '1 second');raise exception 'Expected stale rejection';exception when others then if SQLERRM not like 'Recipe changed%' then raise;end if;end;
 foreach workflow in array array['pending_approval','approved','rejected'] loop
 update recipes set status=workflow::recipe_status where id=rid;select updated_at into ts from recipes where id=rid;perform save_recipe_atomic('update',gen_random_uuid(),rid,updatebody,ts);assert (select status::text from recipes where id=rid)=workflow,'Workflow changed';end loop;
 foreach workflow in array array['active','archived'] loop
  begin
   update recipes set status='archived' where product_id=(body->>'product_id')::uuid and status='active';update recipes set status=workflow::recipe_status where id=rid;
   select updated_at into ts from recipes where id=rid;
   perform save_recipe_atomic('update',gen_random_uuid(),rid,updatebody,ts);raise exception 'Expected state rejection';
  exception when others then if SQLERRM<>'Active and archived recipes cannot be edited.' then raise;end if;end;
 end loop;
 begin perform save_recipe_atomic('copy',gen_random_uuid(),rid);raise exception 'Expected copy rejection';exception when others then if SQLERRM not like 'Only an active%' then raise;end if;end;
 update recipes set status='archived' where product_id=(body->>'product_id')::uuid and status='active';update recipes set status='active' where id=rid;
 foreach stage in array array['document_revisions','recipe_lines','recipe_cost_snapshots','activity_logs','recipe_write_requests'] loop
 global_before:=jsonb_build_array((select count(*) from documents),(select count(*) from document_revisions),(select count(*) from activity_logs));select count(*) into n from recipes;perform set_config('qa.recipe.fail_stage',stage,true);key:=gen_random_uuid();begin perform save_recipe_atomic('copy',key,rid);raise exception 'Expected injected failure';exception when others then if SQLERRM<>'Synthetic intermediate failure' then raise;end if;end;assert global_before=jsonb_build_array((select count(*) from documents),(select count(*) from document_revisions),(select count(*) from activity_logs)),'Copy left orphans';assert (select count(*) from recipes)=n,'Copy left partial recipe';end loop;
 perform set_config('qa.recipe.fail_stage','',true);key:=gen_random_uuid();copied:=(save_recipe_atomic('copy',key,rid)->>'id')::uuid;assert (save_recipe_atomic('copy',key,rid)->>'id')::uuid=copied,'Copy replay differs';assert (select count(*) from recipe_cost_snapshots where recipe_id=copied)=1,'Copy replay duplicated';
 -- Direct RPC authorization and company-boundary rejections, all mutations rolled back.
 global_before:=jsonb_build_array((select count(*) from recipes),(select count(*) from documents),(select count(*) from document_revisions),(select count(*) from recipe_lines),(select count(*) from recipe_cost_snapshots),(select count(*) from activity_logs),(select count(*) from recipe_write_requests));
 begin
 delete from staff_roles where staff_id='${owner.staff}';delete from staff_permission_overrides where staff_id='${owner.staff}';
 perform save_recipe_atomic('create',gen_random_uuid(),null,body);raise exception 'Expected permission rejection';
 exception when others then if SQLERRM<>'Missing recipe permission.' then raise;end if;end;
 begin
 update products set company_id=foreign_company where id=(body->>'product_id')::uuid;
 perform save_recipe_atomic('create',gen_random_uuid(),null,body);raise exception 'Expected product rejection';
 exception when others then if SQLERRM<>'Product is unavailable in your company.' then raise;end if;end;
 begin
 update products set company_id=foreign_company where id=(body->>'product_id')::uuid;
 update recipes set company_id=foreign_company where id=rid;
 perform save_recipe_atomic('copy',gen_random_uuid(),rid);raise exception 'Expected recipe rejection';
 exception when others then if SQLERRM<>'Recipe was not found in your company.' then raise;end if;end;
 assert global_before=jsonb_build_array((select count(*) from recipes),(select count(*) from documents),(select count(*) from document_revisions),(select count(*) from recipe_lines),(select count(*) from recipe_cost_snapshots),(select count(*) from activity_logs),(select count(*) from recipe_write_requests)),'Rejected RPC mutated records';
 assert not has_table_privilege('authenticated','recipe_write_requests','SELECT'),'Ledger exposed';assert not has_function_privilege('anon','save_recipe_atomic(text,uuid,uuid,jsonb,timestamptz)','EXECUTE'),'Anon RPC exposed';
 raise notice 'PASS 15 injected-stage rollbacks; create/update/copy replay; changed-key rejection; stale update; workflow preservation; ledger and RPC permissions';
END $$;
ROLLBACK;`;
const output=execFileSync('docker',['exec','-i',seed.container,'psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe']});fs.writeFileSync('outputs/qa/component-states/recipe-atomic-sql.json',JSON.stringify({passed:true,cases:['15 injected-stage rollback checks','create update copy replay','changed input key rejection','stale update rejection','workflow preservation','active and archived updates rejected','ingredient and wastage totals, unit and six-unit pack costs match','same-actor permission removal rejected','foreign-company product and recipe rejected','create/copy orphan counts unchanged','ACL'],output},null,2));console.log(output);
