// Isolated synthetic release fixture only. No environment URLs or credentials.
// Uses the named disposable Docker database and removes only this run's rows.
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const container='supabase_db_oms-ux-uat-20261010';
const quote=value=>`'${String(value).replaceAll("'","''")}'`;
const hash=value=>createHash('sha256').update(value).digest('hex');
const run=randomUUID(),fileHash=hash(run),week='2026-11-02';
function sql(input){return new Promise((resolve,reject)=>{const child=spawn('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1']);let out='',err='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);child.on('error',reject);child.on('close',code=>code?reject(new Error(err.trim())):resolve(out.trim()));child.stdin.end(input);});}
const fixture=JSON.parse(await sql(`select json_build_object('owner',owner.id,'auth',owner.auth_user_id,'company',owner.company_id,'staff',staff.id,'branch',sb.branch_id,'secondBranch',(select branch_id from staff_branches join staffs on staffs.id=staff_id where staffs.company_id=owner.company_id and full_name='Synthetic other-manager' limit 1),'staffAuth',staff.auth_user_id,'foreignBranch',(select id from branches where company_id<>owner.company_id limit 1)) from staffs owner join auth.users u on u.id=owner.auth_user_id join staffs staff on staff.company_id=owner.company_id and staff.full_name='Synthetic staff' join staff_branches sb on sb.staff_id=staff.id where owner.full_name='Synthetic owner' and u.email like 'release-%' limit 1;`));
for(const field of ['owner','auth','company','staff','branch','secondBranch','staffAuth','foreignBranch'])assert.match(fixture[field],/^[0-9a-f-]{36}$/);
assert.notEqual(fixture.branch,fixture.secondBranch);
const baseWhere=`company_id=${quote(fixture.company)}::uuid and staff_id=${quote(fixture.staff)}::uuid and work_date between ${quote(week)}::date and ${quote(week)}::date+6`;
assert.equal(await sql(`select count(*) from shift_assignment_revisions where ${baseWhere};`),'0','Choose an empty synthetic week; never clean pre-existing schedules.');
assert.equal(await sql(`select count(*) from staff_branches where staff_id=${quote(fixture.staff)}::uuid and branch_id=${quote(fixture.secondBranch)}::uuid;`),'0','Expected a currently unauthorized second-outlet employee.');
assert.equal(await sql(`select count(*) from schedule_weeks where company_id=${quote(fixture.company)}::uuid and week_start=${quote(week)}::date and branch_id in (${quote(fixture.branch)}::uuid,${quote(fixture.secondBranch)}::uuid);`),'0','Choose an empty synthetic week; preserve pre-existing empty rosters too.');
let addedMembership=false;
const actor=(auth=fixture.auth)=>`do $$ begin perform set_config('request.jwt.claim.sub',${quote(auth)},false); end $$;set role authenticated;`;
function payload(day,branch=fixture.branch){return [{branch_id:branch,assignments:[{staff_id:fixture.staff,work_date:day,assignment_kind:'off',shift_template_id:null}]}];}
function request(selection,key,auth=fixture.auth){return sql(`${actor(auth)}select public.append_schedule_workbook_drafts(${quote(week)},'synthetic-concurrency.xlsx',${quote(fileHash)},${quote(JSON.stringify(selection))}::jsonb,0,'{}',${quote(hash(run+key))});`).then(JSON.parse);}
try{
 const identical=await Promise.all(Array.from({length:6},()=>request(payload('2026-11-02'),'identical')));
 assert.equal(identical.filter(r=>!r.idempotent).length,1);assert.equal(identical.filter(r=>r.idempotent).length,5);
 const competing=await Promise.allSettled([request(payload('2026-11-03'),'competing-a'),request(payload('2026-11-03'),'competing-b')]);
 assert.equal(competing.filter(r=>r.status==='fulfilled').length,1);assert.match(competing.find(r=>r.status==='rejected').reason.message,/cannot be replaced/);
 const first=await request(payload('2026-11-04'),'partial-first');assert.equal(first.idempotent,false);
 await assert.rejects(request(payload('2026-11-05',fixture.secondBranch),'partial-second'),/outside this outlet catalogue/);
 const snapshot=await sql(`select to_jsonb(a)::text from shift_assignment_revisions a where ${baseWhere} and work_date='2026-11-04' and is_current;`);
 await sql(`insert into staff_branches(staff_id,branch_id) values(${quote(fixture.staff)},${quote(fixture.secondBranch)});`);addedMembership=true;
 const resumed=await request(payload('2026-11-05',fixture.secondBranch),'partial-second');assert.equal(resumed.idempotent,false);
 assert.equal((await request(payload('2026-11-04'),'partial-first')).idempotent,true);
 assert.equal(await sql(`select to_jsonb(a)::text from shift_assignment_revisions a where ${baseWhere} and work_date='2026-11-04' and is_current;`),snapshot);
 await assert.rejects(request(payload('2026-11-06'),'staff-denied',fixture.staffAuth),/not authorised/);
 await assert.rejects(request(payload('2026-11-06',fixture.foreignBranch),'foreign-denied'),/outside your access/);
 await assert.rejects(sql(`${actor()}select public.calculate_schedule_day_base(gen_random_uuid(),${quote(fixture.staff)}::uuid,'2026-11-02');`),/permission denied/);
 assert.equal(await sql(`select count(*) from shift_assignment_revisions where ${baseWhere} and is_current;`),'4');
 console.log(JSON.stringify({passed:true,checks:['6 simultaneous identical retries: one append, five receipts','competing keys: one success, one non-overwrite conflict','two-outlet partial success and corrected retry preserves first outlet','staff permission denial','cross-company outlet denial','private calculator RPC denial']}));
}finally{
 await sql(`begin;delete from shift_assignment_revisions where ${baseWhere};delete from attendance_schedule_refresh where ${baseWhere};delete from schedule_workbook_receipts where company_id=${quote(fixture.company)}::uuid and file_hash=${quote(fileHash)};delete from schedule_weeks w where company_id=${quote(fixture.company)}::uuid and week_start=${quote(week)}::date and branch_id in (${quote(fixture.branch)}::uuid,${quote(fixture.secondBranch)}::uuid) and not exists(select 1 from shift_assignment_revisions a where a.schedule_week_id=w.id);${addedMembership?`delete from staff_branches where staff_id=${quote(fixture.staff)}::uuid and branch_id=${quote(fixture.secondBranch)}::uuid;`:''}commit;`);
}
