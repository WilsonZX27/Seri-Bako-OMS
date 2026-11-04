// Disposable, network-disabled PostgreSQL only; no production credentials or data.
import {execFileSync,spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID as uid} from 'node:crypto';
import assert from 'node:assert/strict';
const container='oms-planning-append-test-20261104';
const database=`planning_append_fixture_${Date.now()}`;
const args=['exec','-i',container,'psql','-XqAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',database];
const sql=s=>execFileSync('docker',args,{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const file=p=>readFileSync(p,'utf8');
const quote=s=>`'${s.replaceAll("'","''")}'`;
const id=()=>quote(uid());
let checks=0;
const check=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};
const denied=(s,re)=>{try{sql(s);assert.fail('Expected rejection');}catch(e){assert.match(String(e.stderr??e.message),re);checks++;}};
execFileSync('docker',['exec',container,'createdb','-U','postgres',database]);
try {
 let base=file('tests/fixtures/production-planning/base.sql').replace('create role anon; create role authenticated; create role service_role bypassrls;',()=>`do $$ begin create role anon; exception when duplicate_object then null; end $$; do $$ begin create role authenticated; exception when duplicate_object then null; end $$; do $$ begin create role service_role bypassrls; exception when duplicate_object then null; end $$;`);
 sql(base+file('tests/fixtures/production-planning/staff-eligibility.sql'));
 const company=id(),other=id(),kitchen=id(),kitchen2=id(),outlet=id(),expiredOutlet=id(),foreignOutlet=id(),manager=id(),auth=id(),worker=id(),workerAuth=id(),role=id(),workerRole=id(),plan=id();
 sql(`insert into companies values(${company},'Fixture'),(${other},'Other');
 insert into branches(id,company_id,branch_type,branch_name) values(${kitchen},${company},'central_kitchen','PJS fixture'),(${kitchen2},${company},'central_kitchen','Other kitchen'),(${outlet},${company},'outlet','Outlet'),(${expiredOutlet},${company},'outlet','Expired'),(${foreignOutlet},${other},'outlet','Foreign');
 insert into roles(id,company_id,role_code) values(${role},${company},'manager'),(${workerRole},${company},'kitchen');
 insert into staffs(id,company_id,auth_user_id,default_branch_id) values(${manager},${company},${auth},${kitchen}),(${worker},${company},${workerAuth},${kitchen});
 insert into staff_roles(staff_id,role_id) values(${manager},${role}),(${worker},${workerRole});`);
 for(const f of ['191_guard_outlet_completion_qty_sent','319_production_planning_workflow','320_daily_record_do_provenance','321_outlet_daily_prior_stock_wastage','323_production_forecast_basis','324_production_plan_recalculate_aliases','326_production_planning_staff_eligibility','327_production_plan_partial_drafts','329_production_tray_modes_event_supply','331_product_supply_periods','332_outlet_daily_completed_summary','334_production_external_order_kind','335_production_in_app_release']) sql(file(`supabase/migrations/${f}.sql`));
 sql(file('sql-candidates/planning-menu-selection.sql'));
 sql(file('sql-candidates/planning-optional-reasons.sql'));
 sql(file('sql-candidates/planning-append-missing.sql'));
 const authenticated=(s,who=auth)=>`set role authenticated; select set_config('request.jwt.claim.sub',${who},false); ${s}`;
 const invoke=(p=plan,rev=1,key=id())=>`select append_missing_production_plan_products(${p},${rev},${key});`;
 const call=(rev,key)=>JSON.parse(sql(authenticated(invoke(plan,rev,key))).split('\n').at(-1));
 sql(`insert into production_plans(id,company_id,kitchen_id,delivery_date,version,buffer_percent,max_decrease_percent,forecast_version) values(${plan},${company},${kitchen},'2026-11-11',1,10,10,'fixture');
 insert into branch_supply_routes(company_id,source_branch_id,destination_branch_id,effective_to) values(${company},${kitchen},${outlet},null),(${company},${kitchen},${expiredOutlet},'2026-11-10'),(${other},${kitchen},${foreignOutlet},null);
 insert into production_planning_settings(company_id,kitchen_id) values(${company},${kitchen});`);
 const old=Array.from({length:20},()=>id());
 for(const [i,p] of old.entries())sql(`insert into products(id,company_id,product_code,product_name) values(${p},${company},'OLD${i}','Existing'); insert into production_plan_products(plan_id,product_id,yield_per_tray,trays,retained_qty,reason,tray_mode) values(${plan},${p},16,${i},${i},'keep ${i}','manual'); insert into production_plan_allocations(plan_id,product_id,branch_id,suggested_qty,approved_qty,minimum_qty,evidence,reason) values(${plan},${p},${outlet},${i%2?i:'null'},${i===0?0:i===1?'null':i*7},0,'{"original":true}','manual reason ${i}');`);
 const newProducts=Array.from({length:28},()=>id());
 for(const [i,p] of newProducts.entries())sql(`insert into products(id,company_id,product_code,product_name,available_from,available_until) values(${p},${company},'NEW${i}','Missing',${i===0?"'2026-11-11'":'null'},${i===0?"'2026-11-11'":'null'});`);
 const excluded=id();
 for(const [p,values] of [[id(),`${other},'active',null,'Food',null,null`],[id(),`${company},'inactive',null,'Food',null,null`],[id(),`${company},'active',now(),'Food',null,null`],[id(),`${company},'active',null,' Packaging ',null,null`],[id(),`${company},'active',null,'Food','2026-11-12',null`],[id(),`${company},'active',null,'Food',null,'2026-11-10'`],[excluded,`${company},'active',null,'Food',null,null`]])sql(`insert into products(id,product_name,company_id,status,deleted_at,category,available_from,available_until) values(${p},'Excluded',${values});`);
 sql(`update production_planning_settings set included_product_ids=array[${[...old,...newProducts].join(',')}]::uuid[] where kitchen_id=${kitchen}; insert into production_batch_rules(company_id,kitchen_id,product_id,yield_per_tray) values(${company},${kitchen},${newProducts[0]},11); insert into production_outlet_minimums(company_id,kitchen_id,branch_id,product_id,minimum_qty,confirmed_by) values(${company},${kitchen},${outlet},${newProducts[0]},0,${manager});`);
 const snapshot=()=>sql(`select jsonb_build_object('products',(select jsonb_agg(to_jsonb(l) order by product_id) from production_plan_products l where plan_id=${plan} and product_id=any(array[${old.join(',')}]::uuid[])),'allocations',(select jsonb_agg(to_jsonb(l) order by product_id,branch_id) from production_plan_allocations l where plan_id=${plan} and product_id=any(array[${old.join(',')}]::uuid[])),'plan',(select to_jsonb(p)-'revision' from production_plans p where id=${plan}));`);
 const original=snapshot(),key=id();
 denied(authenticated(invoke(),workerAuth),/Manager or Owner/);
 denied(authenticated(invoke(plan,2)),/Plan changed/);
 sql(`update production_plans set status='submitted' where id=${plan}`);denied(authenticated(invoke()),/Only draft/);sql(`update production_plans set status='approved' where id=${plan}`);denied(authenticated(invoke()),/Only draft/);sql(`update production_plans set status='draft' where id=${plan}`);
 const foreignPlan=id();sql(`insert into production_plans(id,company_id,kitchen_id,delivery_date,version,buffer_percent,max_decrease_percent,forecast_version) values(${foreignPlan},${other},${kitchen2},'2026-11-12',1,10,10,'fixture')`);denied(authenticated(invoke(foreignPlan)),/Plan changed/);
 const result=call(1,key);check(result.added_products,28);check(result.added_allocations,28);check(result.revision,2);check(snapshot(),original);
 check(sql(`select count(*) from production_plan_products where plan_id=${plan}`),'48');
 check(sql(`select count(*) from production_plan_allocations where plan_id=${plan} and product_id=any(array[${newProducts.join(',')}]::uuid[]) and approved_qty is null and suggested_qty is null and branch_id=${outlet}`),'28');
 check(sql(`select count(*) from production_plan_products where plan_id=${plan} and product_id=any(array[${newProducts.join(',')}]::uuid[]) and trays is null`),'28');
 check(sql(`select yield_per_tray from production_plan_products where plan_id=${plan} and product_id=${newProducts[0]}`),'11');
 check(sql(`select count(*) from production_plan_products where plan_id=${plan} and yield_per_tray is null`),'27');
 check(call(1,key),result);check(snapshot(),original);denied(authenticated(invoke(plan,2,key)),/different input/);
 const none=call(2,id());check(none.added_products,0);check(none.revision,2);
 // Explicit empty menu keeps all old lines. No deletion, no guessed quantities.
 sql(`update production_planning_settings set included_product_ids='{}' where kitchen_id=${kitchen}`);check(call(2,id()).added_products,0);check(snapshot(),original);
 // Null menu uses all otherwise eligible products, including no-batch products.
 sql(`update production_planning_settings set included_product_ids=null where kitchen_id=${kitchen}`);
 const next=call(2,id());check(next.added_products,1);check(next.revision,3);check(snapshot(),original);
 // Changed event snapshot aborts before insertion; no stale event propagation.
 const event=id();sql(`insert into production_planning_events(id,company_id,kitchen_id,event_date,name,confirmed,lines,demand_kind) values(${event},${company},${kitchen},'2026-11-11','Changed',true,'[]','corporate_event')`);
 denied(authenticated(invoke(plan,3)),/Confirmed events changed/);check(snapshot(),original);
 sql(`delete from production_planning_events where id=${event}`);
 // Force failure after product insertion: the whole statement and receipt roll back.
 const failure=id();sql(`insert into products(id,company_id,product_name) values(${failure},${company},'Failure fixture'); create function reject_fixture() returns trigger language plpgsql as $$ begin raise exception 'fixture allocation failure'; end $$; create trigger reject_fixture before insert on production_plan_allocations for each row execute function reject_fixture();`);
 denied(authenticated(invoke(plan,3)),/fixture allocation failure/);check(sql(`select count(*) from production_plan_products where plan_id=${plan} and product_id=${failure}`),'0');check(sql(`select revision from production_plans where id=${plan}`),'3');check(snapshot(),original);sql('drop trigger reject_fixture on production_plan_allocations');
 // Two independent sessions contend for the same revision: one commit, one stale rejection.
 const asyncSql=s=>new Promise(resolve=>{const p=spawn('docker',args);let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);p.on('close',code=>resolve({code,out,err}));p.stdin.end(s);});
 const outcomes=await Promise.all([asyncSql(authenticated(invoke(plan,3))),asyncSql(authenticated(invoke(plan,3)))]);
 check(outcomes.filter(x=>x.code===0).length,1);check(outcomes.filter(x=>/Plan changed/.test(x.err)).length,1);check(snapshot(),original);check(sql(`select count(*) from production_plan_products where plan_id=${plan} and product_id=${failure}`),'1');
 // Kitchen without routes retains unknown production rather than rendering an inferred zero.
 const noRoutePlan=id();sql(`insert into production_plans(id,company_id,kitchen_id,delivery_date,version,buffer_percent,max_decrease_percent,forecast_version) values(${noRoutePlan},${company},${kitchen2},'2026-11-11',1,10,10,'fixture')`);
 sql(authenticated(invoke(noRoutePlan,1)));
 check(sql(`select count(*) from production_plan_products where plan_id=${noRoutePlan} and (trays is not null or tray_mode<>'manual')`),'0');
 check(sql(`select count(*) from production_plan_allocations where plan_id=${noRoutePlan}`),'0');
 check(snapshot(),original);
 check(sql(`select has_function_privilege('anon','append_missing_production_plan_products(uuid,integer,uuid)','EXECUTE')`),'f');
 check(sql(`select has_table_privilege('authenticated','production_plan_products','INSERT')`),'f');
 console.log(`PASS ${checks} assertions: isolated PostgreSQL;20 original rows preserved;28 additions;permissions/retry/concurrency/rollback.`);
} finally {
 // Keep isolated fixture for follow-up inspection. No real data or network access.
}
