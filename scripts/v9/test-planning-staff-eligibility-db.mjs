import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.PGLITE_MODULE??'@electric-sql/pglite');const db=new PGlite();
const q=async(s,args=[]) => (await db.query(s,args)).rows;const read=p=>readFileSync(p,'utf8');
const company=randomUUID(),kitchen=randomUUID(),staff=randomUUID(),auth=randomUUID(),role=randomUUID();
const config={kitchen_id:kitchen,enabled:false,draft_time:'20:00',buffer_percent:10,max_decrease_percent:10,recipients:[],batches:[],minimums:[]};
try{
 await db.exec(read('tests/fixtures/production-planning/base.sql'));
 await db.exec(read('tests/fixtures/production-planning/staff-eligibility.sql'));
 await q("insert into companies values($1,'Own')",[company]);await q("insert into branches(id,company_id,branch_type,branch_name) values($1,$2,'central_kitchen','Kitchen')",[kitchen,company]);
 await q("insert into staffs(id,company_id,auth_user_id,default_branch_id,employment_end_date) values($1,$2,$3,$4,(now() at time zone 'Asia/Kuala_Lumpur')::date-1)",[staff,company,auth,kitchen]);
 await q("insert into roles(id,company_id,role_code) values($1,$2,'manager')",[role,company]);await q('insert into staff_roles(staff_id,role_id) values($1,$2)',[staff,role]);
 await db.exec(read('supabase/migrations/319_production_planning_workflow.sql'));await db.exec(read('supabase/migrations/323_production_forecast_basis.sql'));await db.exec(read('supabase/migrations/324_production_plan_recalculate_aliases.sql'));
 await q("select set_config('request.jwt.claim.sub',$1,false)",[auth]);await db.exec('set role authenticated');
 // Reproduce the real mismatch: common eligibility denies while old Planning accepts an ended staff member.
 assert.equal((await q('select current_staff_id() id'))[0].id,null);
 assert.equal((await q('select planning_manager() manager'))[0].manager,true);
 await q('select configure_production_planning($1::jsonb)',[JSON.stringify(config)]);
 assert.equal((await q('select count(*)::int n from production_planning_settings'))[0].n,1);
 await db.exec('reset role');
 const aclBefore=await q("select proname,proacl::text,prosecdef,proowner from pg_proc where proname in ('planning_manager','planning_branch_access','planning_require_manager') order by proname");
 await db.exec(read('supabase/migrations/326_production_planning_staff_eligibility.sql'));
 assert.deepEqual(await q("select proname,proacl::text,prosecdef,proowner from pg_proc where proname in ('planning_manager','planning_branch_access','planning_require_manager') order by proname"),aclBefore);
 await db.exec('set role authenticated');
 assert.equal((await q('select planning_manager() manager'))[0].manager,false);
 assert.equal((await q('select count(*)::int n from production_planning_settings'))[0].n,0);
 await assert.rejects(q('select configure_production_planning($1::jsonb)',[JSON.stringify(config)]),/Manager or Owner permission required/);
 // Today remains eligible through the Malaysia end date, as does an open-ended assignment.
 for(const date of ["(now() at time zone 'Asia/Kuala_Lumpur')::date",'null']){
  await db.exec('reset role');await q(`update staffs set employment_end_date=${date} where id=$1`,[staff]);await db.exec('set role authenticated');
  assert.equal((await q('select planning_manager() manager'))[0].manager,true);await q('select configure_production_planning($1::jsonb)',[JSON.stringify(config)]);
  assert.equal((await q('select count(*)::int n from production_planning_settings'))[0].n,1);
 }
 await db.exec('reset role');await q("update staffs set status='inactive' where id=$1",[staff]);await db.exec('set role authenticated');
 assert.equal((await q('select planning_manager() manager'))[0].manager,false);await assert.rejects(q('select configure_production_planning($1::jsonb)',[JSON.stringify(config)]),/Manager or Owner permission required/);
 await db.exec('reset role;set role anon');await assert.rejects(q('select configure_production_planning($1::jsonb)',[JSON.stringify(config)]),/permission denied/);
 console.log('Planning eligibility: reproduced expired-staff RPC/read access, fixed denial, inclusive Malaysia end date, open-ended staff, inactive staff, anon denial and unchanged ACLs passed.');
}finally{await db.close();}
