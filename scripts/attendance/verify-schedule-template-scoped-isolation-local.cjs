// Local synthetic-only SQL/transaction acceptance. No production target or role
// grants; explicit fixtures and exact cleanup. Requires candidate381 installed.
const cp=require('node:child_process'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const db='oms-role-acceptance-db',out=path.resolve('handoff/scoped/isolation');fs.mkdirSync(out,{recursive:true});
const q=v=>`'${String(v).replaceAll("'","''")}'`,run=crypto.randomUUID(),reason='Synthetic template DB '+run;
const args=['exec','-i',db,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'];
function sql(text){return cp.execFileSync('docker',args,{input:text,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim()}
function asyncSql(text){return new Promise(resolve=>{const p=cp.spawn('docker',args,{stdio:['pipe','pipe','pipe']});let stdout='',stderr='';p.stdout.on('data',b=>stdout+=b);p.stderr.on('data',b=>stderr+=b);p.on('close',code=>resolve({ok:code===0,stdout:stdout.trim(),stderr}));p.stdin.end(text)})}
const people=JSON.parse(sql("select json_agg(x) from(select id,company_id,auth_user_id,full_name,default_branch_id from staffs where full_name in('Synthetic staff','Synthetic supervisor','Synthetic manager') or(full_name='Synthetic boundary owner' and company_id<>'efd08261-fbb7-4c7c-b4f1-8ac9a300f54f'))x;"));
const actor=name=>{const p=people.find(p=>p.full_name==='Synthetic '+name);assert.ok(p);return p};const staff=actor('staff'),supervisor=actor('supervisor'),manager=actor('manager'),foreign=actor('boundary owner');assert.equal(staff.company_id,supervisor.company_id);assert.equal(manager.company_id,staff.company_id);assert.notEqual(foreign.company_id,staff.company_id);
const branch=staff.default_branch_id,hidden=crypto.randomUUID();const add=(day,n)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10),week=i=>add('2031-01-06',i*7);assert.equal(new Date(week(0)).getUTCDay(),1);
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
 for(const [index,isolation]of['repeatable read','serializable'].entries()){
  const w=week(index);await pass(isolation+' seed',tx(supervisor,call(w,[shift(w)],isolation+'seed')));seeded=true;
  const p=cp.spawn('docker',args,{stdio:['pipe','pipe','pipe']});let stdout='',stderr='';p.stdout.on('data',b=>stdout+=b);p.stderr.on('data',b=>stderr+=b);const ended=new Promise(r=>p.on('close',code=>r({code,stderr})));
  p.stdin.write(`begin isolation level ${isolation};select count(*) from public.shift_assignment_revisions where staff_id=${q(staff.id)};select 'SNAPSHOT_READY';\n`.replaceAll('\\n','\n'));
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Snapshot barrier timeout')),15000);const check=()=>{if(stdout.includes('SNAPSHOT_READY')){clearTimeout(timeout);resolve()}};p.stdout.on('data',check);check()});
  await pass(isolation+' concurrent writer commits',tx(supervisor,call(w,[shift(add(w,1),'22:00','06:00',true)],isolation+'B')));
  p.stdin.end(`${claim(supervisor)}select ${call(w,[shift(add(w,2),'05:30','09:00')],isolation+'A')};commit;`);
  const result=await ended;assert.notEqual(result.code,0);assert.match(result.stderr,/could not serialize|Schedule interval conflict/);assert.ok(!result.stderr.includes('DETAIL:'));record({name:isolation+' stale snapshot',result:'safe-rejection-no-detail',message:result.stderr.split('\n').find(s=>s.startsWith('ERROR:'))});
 }
 fs.writeFileSync(out+'/result.json',JSON.stringify({checks,localOnly:true,production:false},null,2));console.log(JSON.stringify({checks:checks.length,status:'pass'}));
 }finally{if(seeded){sql(`begin;delete from schedule_workbook_receipts where company_id=${q(staff.company_id)} and file_hash in(${[...hashes].map(q).join(',')});delete from shift_assignment_revisions where company_id=${q(staff.company_id)} and schedule_week_id in(select id from schedule_weeks where company_id=${q(staff.company_id)} and week_start in(${weeks.map(q).join(',')}));delete from schedule_weeks where company_id=${q(staff.company_id)} and week_start in(${weeks.map(q).join(',')});delete from attendance_schedule_refresh where company_id=${q(staff.company_id)} and staff_id=${q(staff.id)} and work_date between ${q(week(0))} and ${q(add(week(15),6))};commit;`);fs.writeFileSync(out+'/cleanup.json',JSON.stringify({syntheticOnly:true,remainingWeeks:Number(sql(`select count(*) from schedule_weeks where company_id=${q(staff.company_id)} and week_start in(${weeks.map(q).join(',')});`)),queueRows:Number(sql('select count(*) from schedule_interval_guard_jobs;'))},null,2));}}
})().catch(e=>{console.error(e.message);process.exitCode=1});
