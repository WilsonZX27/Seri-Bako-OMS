import fs from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
const db=new PGlite();const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const foundation=fs.readFileSync('supabase/migrations/337_asset_management_foundation.sql','utf8');
const management=fs.readFileSync('supabase/migrations/339_asset_assigned_location_management_roles.sql','utf8');
await db.exec(`create role authenticated;create role anon;
create table companies(id uuid primary key);create table branches(id uuid primary key);
create table staffs(id uuid primary key,full_name text);
create table roles(id uuid primary key default gen_random_uuid(),role_code text);
create table permissions(id uuid primary key default gen_random_uuid(),permission_code text unique,module text,action text,description text);
create table role_permissions(role_id uuid,permission_id uuid,unique(role_id,permission_id));
create function current_staff_company_id() returns uuid language sql stable as $$select current_setting('test.company')::uuid$$;
create function current_staff_id() returns uuid language sql stable as $$select current_setting('test.actor')::uuid$$;
create function asset_management_role() returns boolean language sql stable as $$select current_setting('test.manager')='true'$$;
create function has_permission(p text) returns boolean language sql stable as $$select p='assets.view' or (p='assets.report' and current_setting('test.report')='true') or (p in ('assets.manage','assets.maintenance') and asset_management_role())$$;
create function asset_company_live(p uuid) returns boolean language sql stable as $$select p=current_staff_company_id()$$;
create function asset_original_record_access(p uuid) returns boolean language sql stable as $$select false$$;`);
for(const table of ['asset_import_batches','asset_locations','assets','asset_holdings','asset_maintenance','asset_maintenance_updates','asset_attachments','asset_daily_checks']) {
 const start=foundation.indexOf(`create table public.${table} (`),end=foundation.indexOf('\n);',start)+4;await db.exec(foundation.slice(start,end));
}
await db.exec(`create function asset_location_access(p uuid) returns boolean language sql stable security definer as $$select exists(select 1 from asset_locations where id=p and company_id=current_staff_company_id() and id=current_setting('test.location')::uuid)$$;
alter table asset_maintenance enable row level security;alter table asset_attachments enable row level security;alter table asset_maintenance_updates enable row level security;
create policy asset_maintenance_read on asset_maintenance for select to authenticated using(false);
create policy asset_attachments_read on asset_attachments for select to authenticated using(false);
create policy asset_maintenance_updates_read on asset_maintenance_updates for select to authenticated using(company_id=current_staff_company_id() and exists(select 1 from asset_maintenance m where m.id=maintenance_id));
grant usage on schema public to authenticated;grant select on all tables in schema public to authenticated;
insert into companies values('${id(1)}'),('${id(2)}');insert into branches values('${id(10)}');
insert into staffs values('${id(20)}','Reporter'),('${id(21)}','Other staff'),('${id(22)}','Manager');
insert into asset_locations(id,company_id,source_name,branch_id,kind) values('${id(30)}','${id(1)}','Synthetic outlet','${id(10)}','branch'),('${id(31)}','${id(1)}','Other outlet','${id(10)}','branch'),('${id(32)}','${id(2)}','Other company','${id(10)}','branch');
insert into assets(id,company_id,asset_code,item_name) values('${id(40)}','${id(1)}','TEST','Synthetic lamp');
insert into asset_holdings(company_id,asset_id,location_id,quantity) values('${id(1)}','${id(40)}','${id(30)}',1);`);
await db.exec(`
create schema auth; create function auth.uid() returns uuid language sql stable as $$select current_setting('test.actor')::uuid$$;
alter table staffs add company_id uuid, add status text default 'active', add deleted_at timestamptz, add auth_user_id uuid, add default_branch_id uuid;
alter table roles add company_id uuid, add status text default 'active', add deleted_at timestamptz;
create table staff_branches(staff_id uuid,branch_id uuid);
create table staff_roles(staff_id uuid,role_id uuid,effective_from date,effective_to date);
create table staff_permission_overrides(staff_id uuid,permission_id uuid,effect text);
create table notifications(id uuid default gen_random_uuid(),company_id uuid,recipient_staff_id uuid,title text,message text,priority text,action_url text,entity_type text,entity_id uuid,is_company_wide boolean,dismissed_at timestamptz);
update staffs set company_id='${id(1)}',auth_user_id=id,default_branch_id='${id(10)}';
insert into roles(id,role_code,company_id) values('${id(90)}','manager','${id(1)}');
insert into staff_roles values('${id(22)}','${id(90)}',null,null);
insert into permissions(permission_code) values('assets.view'),('assets.maintenance');
insert into role_permissions select '${id(90)}',id from permissions;
`);
await db.exec(fs.readFileSync('supabase/migrations/346_general_maintenance_requests.sql','utf8'));
await db.exec(`create trigger asset_attachment_parent before insert or update on asset_attachments for each row execute function asset_attachment_parent_guard();`);
await db.exec('grant select on notifications to authenticated');
await db.exec(fs.readFileSync('supabase/migrations/347_checklist_maintenance_actions.sql','utf8'));
const checklistStart=foundation.indexOf('create function public.submit_asset_check(');
await db.exec(foundation.slice(checklistStart,foundation.indexOf('end $$;',checklistStart)+7));
await db.exec(`create or replace function has_permission(p text) returns boolean language sql stable as $$select p in ('assets.view','assets.check') or (p='assets.report' and current_setting('test.report')='true') or (p in ('assets.manage','assets.maintenance') and asset_management_role())$$;`);
const start=management.indexOf('create or replace function public.update_asset_maintenance(');await db.exec(management.slice(start,management.indexOf('end $$;',start)+7));
async function actor(n=20,manager=false,company=1,location=30,report=true){await db.exec(`reset role;set test.actor='${id(n)}';set test.company='${id(company)}';set test.location='${id(location)}';set test.manager='${manager}';set test.report='${report}';set role authenticated;`);}
let count=0;const check=(actual,expected)=>{assert.deepEqual(actual,expected);count++};
async function denied(sql,args=[]){await assert.rejects(()=>db.query(sql,args));count++;}
const report=(key,asset=null,location=id(30),description='Light not working')=>db.query('select report_asset_maintenance($1,$2,$3,$4,$5) id',[asset,location,description,'Normal',id(key)]);
await actor();const request=(await report(50)).rows[0].id;check((await report(50)).rows[0].id,request);
check((await db.query('select count(*)::int n from asset_maintenance')).rows[0].n,1);
check((await db.query('select asset_id,reported_by,status from asset_maintenance')).rows[0],{asset_id:null,reported_by:id(20),status:'Open'});
await denied('select report_asset_maintenance(null,$1,$2,$3,$4)',[id(30),'Different','Normal',id(50)]);
await denied('select report_asset_maintenance(null,$1,$2,$3,$4)',[id(31),'Problem','Normal',id(51)]);
await denied('select report_asset_maintenance(null,$1,$2,$3,$4)',[id(32),'Problem','Normal',id(51)]);
check((await report(52,id(40))).rows.length,1);
await denied('select report_asset_maintenance($1,$2,$3,$4,$5)',[id(99),id(30),'Problem','Normal',id(53)]);
const reserve=(key=60,parent=request,asset=null,type='image/jpeg')=>db.query('select reserve_asset_attachment($1,$2,$3,$4,$5,$6,$7,$8) data',[asset,id(key),'Lamp photo','Photo',type,4,'a'.repeat(64),parent]);
const attachment=(await reserve()).rows[0].data;check(attachment.storage_path.startsWith(`${id(1)}/maintenance/${request}/`),true);check(attachment.verified,false);check((await reserve()).rows[0].data.id,attachment.id);
await denied('select reserve_asset_attachment(null,$1,$2,$3,$4,$5,$6,$7)',[id(61),'Photo','Photo','application/pdf',4,'a'.repeat(64),request]);
await denied('select update_asset_maintenance($1,$2,$3,$4,$5)',[request,'Closed','Fixed',id(70),'Open']);
await actor(21);check((await db.query('select count(*)::int n from asset_maintenance')).rows[0].n,0);check((await db.query('select count(*)::int n from asset_attachments')).rows[0].n,0);await assert.rejects(()=>reserve(62));count++;
await assert.rejects(()=>report(50));count++;
await actor(22,true);check((await db.query('select count(*)::int n from asset_maintenance')).rows[0].n,2);
await db.query('select update_asset_maintenance($1,$2,$3,$4,$5)',[request,'Assigned','Technician arranged',id(70),'Open']);
await actor();check((await db.query('select status from asset_maintenance where id=$1',[request])).rows[0].status,'Assigned');check((await db.query('select count(*)::int n from asset_maintenance_updates')).rows[0].n,1);
await actor(21);check((await db.query('select count(*)::int n from asset_maintenance_updates')).rows[0].n,0);
await actor(22,true,1,31);check((await db.query('select count(*)::int n from asset_maintenance')).rows[0].n,0);
await actor(22,true,2,32);check((await db.query('select count(*)::int n from asset_maintenance')).rows[0].n,0);
await actor(20,false,1,30,false);await assert.rejects(()=>report(80));count++;

await actor();
const notifications=async()=>Number((await db.query('select count(*) n from notifications')).rows[0].n);
const before=await notifications();
const lines=(result='Checked')=>JSON.stringify([{asset_id:id(40),quantity:null,result,remark:result==='Checked'?'':'Broken fitting'}]);
await db.query('select submit_asset_check($1,current_date,$2,$3)',[id(30),id(100),lines()]);
check(await notifications(),before);
await db.query('select submit_asset_check($1,current_date,$2,$3)',[id(30),id(101),lines('Damaged')]);
check(await notifications(),before+1);
await db.query('select submit_asset_check($1,current_date,$2,$3)',[id(30),id(101),lines('Damaged')]);
check(await notifications(),before+1);
await denied('select submit_asset_check($1,current_date,$2,$3)',[id(31),id(102),lines('Damaged')]);
check(await notifications(),before+1);
await actor(22,true);
const actions=async()=>(await db.query('select get_my_maintenance_actions(100) a')).rows[0].a;
const active=await actions();check(active.total,3);
for(const item of active.items) await db.query('select update_asset_maintenance($1,$2,$3,$4,$5)',[item.id,'Closed','Fixed',crypto.randomUUID(),item.id===request?'Assigned':'Open']);
check((await actions()).total,0);
check(Number((await db.query('select count(*) n from notifications where dismissed_at is null')).rows[0].n),0);
await db.exec('reset role');
await db.exec(`insert into staffs(id,full_name,company_id,auth_user_id,status) values('${id(23)}','Unassigned executive','${id(1)}','${id(23)}','active');insert into staff_roles values('${id(23)}','${id(90)}',null,null);`);
await actor();await report(110);
check((await db.query('select distinct recipient_staff_id from notifications')).rows,[{recipient_staff_id:id(22)}]);
await db.exec('reset role');
await db.exec(`insert into staff_permission_overrides select '${id(22)}',id,'deny' from permissions where permission_code='assets.maintenance';`);
await actor();const n=await notifications();await report(111);check(await notifications(),n);
await actor(22,true);check((await actions()).total,0);
// A failed notification aborts the request transaction; retry is exactly once.
await db.exec('reset role;delete from staff_permission_overrides;');
await db.exec(`create function fail_notification() returns trigger language plpgsql as $$begin raise exception 'synthetic notification failure';end$$;create trigger fail_notification before insert on notifications for each row execute function fail_notification();`);
await actor();await assert.rejects(()=>report(112));count++;
await db.exec('reset role;drop trigger fail_notification on notifications;');
await actor();const retried=(await report(112)).rows[0].id;check((await report(112)).rows[0].id,retried);check(await notifications(),n+1);
await db.exec('reset role');
for (const change of [
 `update staffs set status='inactive' where id='${id(22)}'`,
 `update staffs set status='active',default_branch_id=null where id='${id(22)}'`,
 `update staffs set default_branch_id='${id(10)}' where id='${id(22)}';update staff_roles set effective_to=current_date-1 where staff_id='${id(22)}'`,
 `update staff_roles set effective_to=null where staff_id='${id(22)}';update roles set company_id='${id(2)}' where id='${id(90)}'`
]) {
 await db.exec(change);
 check((await db.query('select asset_maintenance_responsible($1) id',[id(30)])).rows,[]);
}
await db.exec(`update roles set company_id='${id(1)}' where id='${id(90)}'`);
check((await db.query('select asset_maintenance_responsible($1) id',[id(30)])).rows,[{id:id(22)}]);
// No permission expansion or public recipient-directory endpoint.
await actor();await denied('select asset_maintenance_responsible($1)',[id(30)]);
await db.close();console.log(`Wilson checklist maintenance: ${count} database assertions passed. Synthetic database only; no production connection.`);
