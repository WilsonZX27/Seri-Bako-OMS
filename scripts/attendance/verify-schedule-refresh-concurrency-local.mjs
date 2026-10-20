// Isolated synthetic release fixture only. No environment URLs or credentials.
// Uses the named disposable Docker database and removes only this run's rows.
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const container='supabase_db_oms-ux-uat-20261010';
const quote=value=>`'${String(value).replaceAll("'","''")}'`;
const hash=value=>createHash('sha256').update(value).digest('hex');
const run=randomUUID(),fileHash=hash(run),week='2026-11-09';
function sql(input,onOutput){return new Promise((resolve,reject)=>{const child=spawn('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1']);let out='',err='';child.stdout.on('data',b=>{out+=b;onOutput?.(out);});child.stderr.on('data',b=>err+=b);child.on('error',reject);child.on('close',code=>code?reject(new Error(err.trim())):resolve(out.trim()));child.stdin.end(input);});}
const fixture=JSON.parse(await sql(`select json_build_object('owner',owner.id,'auth',owner.auth_user_id,'company',owner.company_id,'staff',staff.id,'branch',sb.branch_id,'secondBranch',(select branch_id from staff_branches join staffs on staffs.id=staff_id where staffs.company_id=owner.company_id and full_name='Synthetic other-manager' limit 1),'staffAuth',staff.auth_user_id,'foreignBranch',(select id from branches where company_id<>owner.company_id limit 1)) from staffs owner join auth.users u on u.id=owner.auth_user_id join staffs staff on staff.company_id=owner.company_id and staff.full_name='Synthetic staff' join staff_branches sb on sb.staff_id=staff.id where owner.full_name='Synthetic owner' and u.email like 'release-%' limit 1;`));
for(const field of ['owner','auth','company','staff','branch','secondBranch','staffAuth','foreignBranch'])assert.match(fixture[field],/^[0-9a-f-]{36}$/);
assert.notEqual(fixture.branch,fixture.secondBranch);
const day='2026-11-15',jobWhere=`company_id=${quote(fixture.company)}::uuid and staff_id=${quote(fixture.staff)}::uuid and work_date=${quote(day)}::date`;
const weekWhere=`company_id=${quote(fixture.company)}::uuid and branch_id=${quote(fixture.branch)}::uuid and week_start=${quote(week)}::date`;
assert.equal(await sql(`select count(*) from schedule_weeks where ${weekWhere};`),'0','Never replace an existing fixture roster.');
assert.equal(await sql(`select count(*) from daily_attendance_results where ${jobWhere};`),'0','Never replace an existing fixture result.');
const actor=`do $$ begin perform set_config('request.jwt.claim.sub',${quote(fixture.auth)},false); end $$;set role authenticated;`;
const batch1=randomUUID(),batch2=randomUUID(),event1=randomUUID(),event2=randomUUID(),lockId=randomUUID(),person=`test-refresh-${run}`;
const failTrigger=`test_refresh_${run.replaceAll('-','')}`;
const refresh=()=>sql(`${actor}select public.refresh_schedule_attendance(${quote(week)},${quote(fixture.branch)}::uuid);`).then(JSON.parse);
let failInstalled=false;
try{
 const selection=[{branch_id:fixture.branch,assignments:[{staff_id:fixture.staff,work_date:day,assignment_kind:'shift',shift_template_id:null,custom_start:'20:00',custom_end:'05:00',custom_crosses_midnight:true,custom_break_seconds:0,custom_maximum_recognised_seconds:32400,custom_reason:'Synthetic concurrency test'}]}];
 await sql(`${actor}select public.append_schedule_workbook_drafts(${quote(week)},'synthetic-concurrent-refresh.xlsx',${quote(fileHash)},${quote(JSON.stringify(selection))}::jsonb,0,'{}',${quote(hash(run+'import'))});`);
 await refresh();assert.equal(await sql(`select status from attendance_schedule_refresh where ${jobWhere};`),'waiting_punches');
 await sql(`begin;
 insert into attendance_import_batches(id,company_id,parser_profile,week_start,file_name,file_hash,status,uploader_staff_id,finalised_at) values
 (${quote(batch1)},${quote(fixture.company)},'view_attendance_punch',${quote(week)},'synthetic-punches-1.xlsx',${quote(fileHash)},'finalised',${quote(fixture.owner)},now()-interval '1 minute'),
 (${quote(batch2)},${quote(fixture.company)},'view_attendance_punch','2026-11-16','synthetic-punches-2.xlsx',${quote(fileHash)},'finalised',${quote(fixture.owner)},now());
 insert into ngteco_person_mappings(company_id,person_id,staff_id,created_by) values(${quote(fixture.company)},${quote(person)},${quote(fixture.staff)},${quote(fixture.owner)});
 insert into attendance_raw_punch_events(id,company_id,person_id,occurred_at,local_timestamp,timezone_offset,source_code,punch_type,event_fingerprint,raw_row) values
 (${quote(event1)},${quote(fixture.company)},${quote(person)},'2026-11-15 20:00+08','2026-11-15 20:00','+08:00','SYNTHETIC','in',${quote(hash(run+'in'))},'{}'),
 (${quote(event2)},${quote(fixture.company)},${quote(person)},'2026-11-16 05:00+08','2026-11-16 05:00','+08:00','SYNTHETIC','out',${quote(hash(run+'out'))},'{}');
 insert into attendance_import_batch_events(batch_id,event_id,source_row_number,disposition) values(${quote(batch1)},${quote(event1)},1,'inserted'),(${quote(batch2)},${quote(event2)},1,'inserted');commit;`);
 const concurrent=await Promise.all(Array.from({length:6},()=>refresh()));
 assert.equal(concurrent.reduce((sum,result)=>sum+result.calculated,0),1);
 assert.equal(await sql(`select count(*) from daily_attendance_results where ${jobWhere};`),'1');
 assert.equal(await sql(`select sum(worked_seconds) from daily_attendance_results where company_id=${quote(fixture.company)}::uuid and staff_id=${quote(fixture.staff)}::uuid and is_current and work_date between '2026-11-09' and '2026-11-15';`),'32400');
 assert.equal(await sql(`select count(*) from daily_attendance_results where company_id=${quote(fixture.company)}::uuid and staff_id=${quote(fixture.staff)}::uuid and is_current and work_date between '2026-11-16' and '2026-11-22';`),'0');
 const prior=await sql(`select to_jsonb(r)::text from daily_attendance_results r where ${jobWhere} and is_current;`);
 // A scoped failure injection proves rollback preserves the preceding result.
 await sql(`begin;create function public.${failTrigger}() returns trigger language plpgsql as $$begin if new.staff_id=${quote(fixture.staff)}::uuid and new.work_date=${quote(day)}::date then raise exception 'Synthetic calculation failure';end if;return new;end$$;create trigger ${failTrigger} before insert on daily_attendance_results for each row execute function public.${failTrigger}();update shift_assignment_revisions set custom_start='20:30' where ${jobWhere} and is_current;commit;`);failInstalled=true;
 await refresh();assert.equal(await sql(`select status from attendance_schedule_refresh where ${jobWhere};`),'failed');
 assert.equal(await sql(`select to_jsonb(r)::text from daily_attendance_results r where ${jobWhere} and is_current;`),prior);
 await sql(`drop trigger ${failTrigger} on daily_attendance_results;drop function public.${failTrigger}();`);failInstalled=false;
 const retried=await refresh();assert.equal(retried.calculated,1);
 assert.equal(await sql(`select count(*) from daily_attendance_results where ${jobWhere};`),'2');
 // The next edit waits behind an in-progress job. It must requeue after the
 // first calculation commits instead of being marked ready with stale input.
 await sql(`update shift_assignment_revisions set custom_start='20:00' where ${jobWhere} and is_current;`);
 let markLocked;const locked=new Promise(resolve=>markLocked=resolve);
 const held=sql(`begin;select staff_id from attendance_schedule_refresh where ${jobWhere} for update;${actor}
\\echo SCHEDULE_JOB_LOCKED
select pg_sleep(0.5);select public.refresh_schedule_attendance(${quote(week)},${quote(fixture.branch)}::uuid);commit;`,text=>{if(text.includes('SCHEDULE_JOB_LOCKED'))markLocked();});
 await Promise.race([locked,held.then(()=>{throw new Error('Worker did not acquire its fixture lock');})]);
 const edited=sql(`update shift_assignment_revisions set custom_start='21:00' where ${jobWhere} and is_current;`);
 await Promise.all([held,edited]);
 const queued=JSON.parse(await sql(`select json_build_object('status',status,'source',source_revision,'calculated',calculated_revision) from attendance_schedule_refresh where ${jobWhere};`));
 assert.equal(queued.status,'pending');assert.ok(queued.source>queued.calculated);
 assert.equal((await refresh()).calculated,1);
 const latest=await sql(`select to_jsonb(r)::text from daily_attendance_results r where ${jobWhere} and is_current;`);
 await sql(`begin;insert into attendance_period_locks(id,company_id,branch_id,week_start,locked_by) values(${quote(lockId)},${quote(fixture.company)},${quote(fixture.branch)},${quote(week)},${quote(fixture.owner)});update shift_assignment_revisions set custom_start='22:00' where ${jobWhere} and is_current;commit;`);
 await refresh();assert.equal(await sql(`select status from attendance_schedule_refresh where ${jobWhere};`),'needs_review');
 assert.equal(await sql(`select to_jsonb(r)::text from daily_attendance_results r where ${jobWhere} and is_current;`),latest);
 console.log(JSON.stringify({passed:true,checks:['roster first waits for punches','6 concurrent refreshes produce one revision','Sunday shift sums once in its originating week','failed refresh rolls back result changes','retry succeeds once after failure','concurrent schedule edit requeues after stale worker completes','period lock preserves exact result and flags review']}));
}finally{
 await sql(`begin;${failInstalled?`drop trigger if exists ${failTrigger} on daily_attendance_results;drop function if exists public.${failTrigger}();`:''}
 delete from attendance_exceptions where result_id in(select id from daily_attendance_results where ${jobWhere});
 delete from daily_attendance_results where ${jobWhere};delete from shift_assignment_revisions where ${jobWhere};delete from attendance_schedule_refresh where ${jobWhere};
 delete from attendance_period_locks where id=${quote(lockId)};delete from schedule_workbook_receipts where company_id=${quote(fixture.company)} and file_hash=${quote(fileHash)};
 delete from attendance_import_batch_events where batch_id in(${quote(batch1)},${quote(batch2)});delete from attendance_raw_punch_events where id in(${quote(event1)},${quote(event2)});delete from ngteco_person_mappings where company_id=${quote(fixture.company)} and person_id=${quote(person)};delete from attendance_import_batches where id in(${quote(batch1)},${quote(batch2)});delete from schedule_weeks where ${weekWhere};commit;`);
}
