// Local synthetic-only SQL/transaction acceptance. No production target or role
// grants; explicit fixtures and exact cleanup. Requires candidate381 installed.
const cp=require('node:child_process'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const db='oms-role-acceptance-db',out=path.resolve('handoff/scoped/lifecycle');fs.mkdirSync(out,{recursive:true});
const q=v=>`'${String(v).replaceAll("'","''")}'`,run=crypto.randomUUID(),reason='Synthetic template DB '+run;
const args=['exec','-i',db,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'];
function sql(text){return cp.execFileSync('docker',args,{input:text,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim()}
function asyncSql(text){return new Promise(resolve=>{const p=cp.spawn('docker',args,{stdio:['pipe','pipe','pipe']});let stdout='',stderr='';p.stdout.on('data',b=>stdout+=b);p.stderr.on('data',b=>stderr+=b);p.on('close',code=>resolve({ok:code===0,stdout:stdout.trim(),stderr}));p.stdin.end(text)})}
const people=JSON.parse(sql("select json_agg(x) from(select id,company_id,auth_user_id,full_name,default_branch_id from staffs where full_name in('Synthetic staff','Synthetic supervisor','Synthetic manager') or(full_name='Synthetic boundary owner' and company_id<>'efd08261-fbb7-4c7c-b4f1-8ac9a300f54f'))x;"));
const actor=name=>{const p=people.find(p=>p.full_name==='Synthetic '+name);assert.ok(p);return p};const staff=actor('staff'),supervisor=actor('supervisor'),manager=actor('manager'),foreign=actor('boundary owner');assert.equal(staff.company_id,supervisor.company_id);assert.equal(manager.company_id,staff.company_id);assert.notEqual(foreign.company_id,staff.company_id);
const branch=staff.default_branch_id,hidden=crypto.randomUUID();const add=(day,n)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10),week=i=>add('2030-01-07',i*7);assert.equal(new Date(week(0)).getUTCDay(),1);
const weeks=Array.from({length:16},(_,i)=>week(i)),hashes=new Set(),checks=[];let seeded=false;
const record=value=>{checks.push(value);fs.writeFileSync(out+'/progress.json',JSON.stringify({run,temporaryBranch:hidden,checks},null,2));};
const claim=a=>`do $$begin perform set_config('request.jwt.claim.sub',${q(a.auth_user_id)},true);end$$;set local role authenticated;`;
const metadata={source:'oms_schedule_template_v1',parserVersion:1,expectedAssignments:[]};
const shift=(date,start='08:00',end='17:00',night=false)=>({staff_id:staff.id,work_date:date,assignment_kind:'shift',shift_template_id:null,custom_start:start,custom_end:end,custom_crosses_midnight:night,custom_break_seconds:0,custom_maximum_recognised_seconds:480*60,custom_reason:reason});
const off=date=>({staff_id:staff.id,work_date:date,assignment_kind:'off',shift_template_id:null});
function call(w,rows,label,br=branch){const outlets=Array.isArray(rows[0]?.assignments)?rows:[{branch_id:br,assignments:rows}],hash=crypto.createHash('sha256').update(run+label).digest('hex');hashes.add(hash);return `public.import_schedule_template_drafts_atomic(${q(w)},${q('synthetic-'+run+'.xlsx')},${q(hash)},${q(JSON.stringify(outlets))}::jsonb,0,${q(JSON.stringify(metadata))}::jsonb,${q(hash)})`}
const tx=(a,call,pre='',after='')=>`begin;${pre}${claim(a)}select to_jsonb(${call});${after}commit;`;
const legacy=(br,w,rows)=>`public.save_schedule_week(${q(br)},${q(w)},${q(JSON.stringify(rows))}::jsonb)`;
async function pass(name,query){const r=await asyncSql(query);assert.ok(r.ok,name+': '+r.stderr);record({name,result:'pass'});return r.stdout}
async function deny(name,query,match=/not authorised|not eligible|cannot|changed|conflict|not active|Invalid/i){const r=await asyncSql(query);assert.ok(!r.ok,name+' unexpectedly committed');assert.match(r.stderr,match);assert.ok(!r.stderr.includes('DETAIL:'),name+' leaked constraint detail');record({name,result:'expected-denial',message:r.stderr.split('\n').find(s=>s.startsWith('ERROR:'))});return r}

(async()=>{try{
 assert.equal(sql(`select count(*) from schedule_weeks where company_id=${q(staff.company_id)} and week_start in(${weeks.map(q).join(',')});`),'0');
 await pass('legacy overnight seed',tx(manager,legacy(branch,week(0),[shift(week(0),'22:00','06:00',true)])));
 await pass('unrelated legacy overlap remains allowed',tx(manager,legacy(branch,week(0),[shift(week(0),'22:00','06:00',true),shift(add(week(0),1),'05:30','09:00')])));
 const initial=call(week(1),[shift(week(1),'22:00','06:00',true)],'source');await pass('source template created',tx(supervisor,initial));
 await deny('legacy cannot overlap active source',tx(supervisor,`public.append_schedule_workbook_rows(${q(branch)},${q(week(1))},${q(JSON.stringify([shift(add(week(1),1),'05:30','09:00')]))}::jsonb)`));
 await deny('IMMEDIATE legacy append cannot bypass protected source',tx(supervisor,`public.append_schedule_workbook_rows(${q(branch)},${q(week(1))},${q(JSON.stringify([shift(add(week(1),1),'05:30','09:00')]))}::jsonb)`,'set constraints all immediate;'));
 await pass('explicit OFF replacement ends original revision protection',tx(supervisor,legacy(branch,week(1),[off(week(1))])));
 await pass('legacy overlap after source retired is allowed',tx(supervisor,legacy(branch,week(1),[shift(week(1),'22:00','06:00',true),shift(add(week(1),1),'05:30','09:00')])));
 const replay=await pass('original receipt replay does not protect replacement',tx(supervisor,initial));assert.ok(JSON.parse(replay).idempotent);assert.equal(sql(`select count(*) from schedule_template_sources s join shift_assignment_revisions a on a.id=s.assignment_id where a.is_current and a.work_date=${q(week(1))};`),'0');
 await pass('two independent template source shifts',tx(supervisor,call(week(2),[shift(week(2)),shift(add(week(2),2),'22:00','06:00',true)],'two')));
 await pass('replace one source without retiring other source',tx(supervisor,legacy(branch,week(2),[shift(week(2),'08:00','16:00'),shift(add(week(2),2),'22:00','06:00',true)])));
 // Legacy full save above explicitly replaces BOTH revisions, so test survival
 // using direct synthetic-only retirement of one source in a separate week.
 await pass('independent surviving source fixture',tx(supervisor,call(week(3),[shift(week(3)),shift(add(week(3),2),'22:00','06:00',true)],'survivor')));
 sql(`begin;update shift_assignment_revisions set is_current=false where company_id=${q(staff.company_id)} and staff_id=${q(staff.id)} and work_date=${q(week(3))};commit;`);
 await deny('retiring one source does not expose another source',tx(manager,`public.append_schedule_workbook_rows(${q(branch)},${q(week(3))},${q(JSON.stringify([shift(add(week(3),3),'05:30','09:00')]))}::jsonb)`));
 sql(`begin;update shift_assignment_revisions set custom_start='23:00' where company_id=${q(staff.company_id)} and staff_id=${q(staff.id)} and work_date=${q(add(week(3),2))} and is_current;commit;`);
 await deny('in-place edited source remains protected',tx(manager,`public.append_schedule_workbook_rows(${q(branch)},${q(week(3))},${q(JSON.stringify([shift(add(week(3),3),'05:30','09:00')]))}::jsonb)`));
 sql(`begin;delete from shift_assignment_revisions where company_id=${q(staff.company_id)} and staff_id=${q(staff.id)} and work_date=${q(add(week(3),2))};commit;`);
 await pass('source deletion releases protection',tx(manager,`public.append_schedule_workbook_rows(${q(branch)},${q(week(3))},${q(JSON.stringify([shift(add(week(3),3),'05:30','09:00')]))}::jsonb)`));
 const cancelled=call(week(4),[shift(week(4))],'cancel');await pass('cancelled transaction rolls back source receipt and draft',`begin;${claim(supervisor)}select ${cancelled};rollback;`);assert.equal(sql(`select count(*) from schedule_weeks where company_id=${q(staff.company_id)} and week_start=${q(week(4))};`),'0');
 await pass('legacy neighbour for immediate constraints',tx(manager,legacy(branch,week(5),[shift(add(week(5),6),'22:00','09:00',true)])));
 await deny('IMMEDIATE marker insertion cannot bypass conflict validation',tx(supervisor,call(week(6),[shift(week(6))],'immediate'),'set constraints all immediate;'));
 sql(`insert into branches(id,company_id,branch_code,branch_name,branch_type,status) values(${q(hidden)},${q(staff.company_id)},${q('SYN-SCOPED-'+run.slice(0,8))},'Synthetic scoped move','outlet','active');insert into staff_branches(staff_id,branch_id,access_level,is_default) select ${q(staff.id)},${q(hidden)},access_level,false from staff_branches where staff_id=${q(staff.id)} and branch_id=${q(branch)} limit 1;`);
 await pass('protected move fixture',tx(manager,call(week(7),[shift(week(7),'22:00','06:00',true)],'move')));
 await pass('destination week fixture',tx(manager,legacy(hidden,week(7),[off(week(7))])));
 sql(`begin;update shift_assignment_revisions set is_current=false where company_id=${q(staff.company_id)} and branch_id=${q(hidden)} and work_date=${q(week(7))};update shift_assignment_revisions set revision=2,branch_id=${q(hidden)},schedule_week_id=(select id from schedule_weeks where branch_id=${q(hidden)} and week_start=${q(week(7))}) where company_id=${q(staff.company_id)} and branch_id=${q(branch)} and work_date=${q(week(7))} and is_current;commit;`);
 await deny('same-revision cross-branch move remains protected',tx(manager,`public.append_schedule_workbook_rows(${q(branch)},${q(week(7))},${q(JSON.stringify([shift(add(week(7),1),'05:30','09:00')]))}::jsonb)`));
 fs.writeFileSync(out+'/result.json',JSON.stringify({checks,production:false},null,2));console.log(JSON.stringify({checks:checks.length,status:'pass'}));
 }finally{sql(`begin;delete from schedule_workbook_receipts where company_id=${q(staff.company_id)} and file_hash in(${[...hashes].map(q).join(',')||'null'});delete from shift_assignment_revisions where company_id=${q(staff.company_id)} and schedule_week_id in(select id from schedule_weeks where company_id=${q(staff.company_id)} and week_start in(${weeks.map(q).join(',')}));delete from schedule_weeks where company_id=${q(staff.company_id)} and week_start in(${weeks.map(q).join(',')});delete from attendance_schedule_refresh where company_id=${q(staff.company_id)} and staff_id=${q(staff.id)} and work_date between ${q(week(0))} and ${q(add(week(15),6))};delete from staff_branches where staff_id=${q(staff.id)} and branch_id=${q(hidden)};delete from branches where id=${q(hidden)};commit;`);fs.writeFileSync(out+'/cleanup.json',JSON.stringify({remainingWeeks:Number(sql(`select count(*) from schedule_weeks where company_id=${q(staff.company_id)} and week_start in(${weeks.map(q).join(',')});`)),jobs:Number(sql('select count(*) from schedule_interval_guard_jobs;'))},null,2));}
})().catch(e=>{console.error(e.message);process.exitCode=1});
