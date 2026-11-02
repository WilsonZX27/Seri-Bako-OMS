// Full built Next route → existing Auth/PostgREST → existing isolated PostgreSQL.
// Short-lived synthetic JWTs stay in memory; no password/session/grant/schema changes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createServerClient}=require('@supabase/ssr'),{createClient}=require('@supabase/supabase-js');
assert.equal(process.versions.node.split('.')[0],'22');
const dbName='oms-role-acceptance-db',restName='oms-role-acceptance-20261021-rest-1',authName='oms-role-acceptance-20261021-auth-1';
const out=path.resolve('handoff/payslip-export-candidate-20261101/postgrest');fs.mkdirSync(out,{recursive:true});
const quote=x=>`'${String(x).replaceAll("'","''")}'`;
const sql=s=>cp.execFileSync('docker',['exec','-i',dbName,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const configs=JSON.parse(cp.execFileSync('docker',['inspect',restName,authName,dbName],{encoding:'utf8'}));
const env=c=>Object.fromEntries(c.Config.Env.map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)];}));
const restEnv=env(configs[0]),authEnv=env(configs[1]),secret=restEnv.PGRST_JWT_SECRET;
assert.ok(secret&&secret.length>=32&&!secret.startsWith('{'),'Existing local HS256 test key required');
assert.ok(secret===authEnv.GOTRUE_JWT_SECRET,'Existing Auth and PostgREST test keys must agree');
assert.ok(Object.values(configs[2].NetworkSettings.Networks).some(n=>n.Aliases.includes(new URL(restEnv.PGRST_DB_URI).hostname)),'PostgREST must target the named isolated database');
const actors=JSON.parse(sql(`select json_agg(x) from (select s.id,s.company_id,s.auth_user_id,s.full_name,s.staff_code,s.default_branch_id from public.staffs s where s.full_name in ('Synthetic staff','Synthetic other-staff','Synthetic people','Synthetic supervisor','Synthetic manager') or (s.full_name='Synthetic boundary owner' and s.company_id<>'efd08261-fbb7-4c7c-b4f1-8ac9a300f54f')) x;`));
const actor=name=>{const a=actors.find(x=>x.full_name==='Synthetic '+name);assert.ok(a,'Existing synthetic actor required: '+name);return a;};
const staff=actor('staff'),people=actor('people'),supervisor=actor('supervisor'),manager=actor('manager'),other=actor('other-staff'),foreign=actor('boundary owner');
assert.ok(foreign.company_id!==staff.company_id);for(const a of [staff,people,supervisor,manager,other,foreign])assert.match(a.auth_user_id,/^[0-9a-f-]{36}$/);
const run=crypto.randomUUID(),days=['2027-01-04','2027-01-05','2027-01-06'],resultIds=days.map(()=>crypto.randomUUID());
const baseLines=[{kind:'earning',label:'Synthetic basic',amount:1000.10},{kind:'earning',label:'Synthetic verified OT amount',amount:.20},{kind:'deduction',label:'Synthetic deduction',amount:12.35}];
const lines2=baseLines.map((x,i)=>i===1?{...x,amount:.30}:x);
let proxy,next,fixtures=[],seeded=false;const apiMatrix=[];const trace=[],checks=[];const serverLog=fs.createWriteStream(out+'/next.log');
function token(a,expiry=600){const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),now=Math.floor(Date.now()/1000),head=b({alg:'HS256',typ:'JWT'}),body=b({aud:'authenticated',role:'authenticated',sub:a.auth_user_id,iat:now,exp:now+expiry,iss:'http://local-synthetic-auth'});return head+'.'+body+'.'+crypto.createHmac('sha256',secret).update(head+'.'+body).digest('base64url');}
function cleanup(){
 const ids=resultIds.map(quote).join(','),dates=days.map(quote).join(',');
 return sql(`begin;do $$declare cs uuid[];ps uuid[];begin
 select array_agg(id) into cs from public.attendance_confirmations where company_id=${quote(staff.company_id)} and staff_id=${quote(staff.id)} and period_start in (${dates}) and attendance @> ${quote(JSON.stringify([{source_hash:run}]))}::jsonb;
 select array_agg(id) into ps from public.employee_payslips where confirmation_id=any(cs);
 delete from public.employee_payslip_events where payslip_id=any(ps);delete from public.employee_payslips where id=any(ps);
 delete from public.attendance_confirmation_events where confirmation_id=any(cs);delete from public.attendance_confirmations where id=any(cs);
 delete from public.attendance_schedule_refresh where company_id=${quote(staff.company_id)} and staff_id=${quote(staff.id)} and work_date in (${dates}) and source_hash=${quote(run)};
 delete from public.daily_attendance_results where id in (${ids}) and company_id=${quote(staff.company_id)} and staff_id=${quote(staff.id)} and calculation->>'schedule_source_hash'=${quote(run)};end$$;set constraints all immediate;commit;
 select json_build_object('results',(select count(*) from public.daily_attendance_results where id in (${ids})),'confirmations',(select count(*) from public.attendance_confirmations where staff_id=${quote(staff.id)} and period_start in (${dates}) and attendance @> ${quote(JSON.stringify([{source_hash:run}]))}::jsonb),'refreshJobs',(select count(*) from public.attendance_schedule_refresh where staff_id=${quote(staff.id)} and source_hash=${quote(run)}));`);
}
(async()=>{try{
 // Transport only: existing local services, no synthesized Auth/PostgREST responses.
 proxy=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');let service;
  if(url.pathname.startsWith('/rest/v1/')){service='rest';}
  else if(url.pathname.startsWith('/auth/v1/')){service='auth';}
  else{res.writeHead(404);res.end();return;}
  if(req.method!=='GET'&&!(req.method==='POST'&&service==='rest'&&url.pathname==='/rest/v1/rpc/attestation_people')){res.writeHead(403);res.end('{"message":"Read-only synthetic transport"}');return;}
  let body='';for await(const chunk of req)body+=chunk;
  const targetUrl=service==='rest'?'http://127.0.0.1:59651'+url.pathname.slice(8)+url.search:'http://127.0.0.1:59652'+url.pathname.slice(8)+url.search;
  const headers={};for(const name of ['authorization','accept','content-type','accept-profile','content-profile','prefer'])if(req.headers[name])headers[name]=req.headers[name];
  try{const response=await fetch(targetUrl,{method:req.method,headers,...(req.method==='POST'?{body}:{}),signal:AbortSignal.timeout(20000)});trace.push({service,method:req.method,path:url.pathname,status:response.status});res.writeHead(response.status,{'content-type':'application/json'});res.end(await response.text());}catch(error){trace.push({service,method:req.method,path:url.pathname,status:502,error:error.message});res.writeHead(502);res.end(JSON.stringify({message:'Local service transport unavailable'}));}
 });
 await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));const supabase='http://127.0.0.1:'+proxy.address().port,key='synthetic-local-transport-only';
 const cookies=async a=>{let store=[];const client=createServerClient(supabase,key,{cookies:{getAll:()=>store,setAll:updates=>{for(const u of updates){store=store.filter(x=>x.name!==u.name);store.push({name:u.name,value:u.value});}}}});const r=await client.auth.setSession({access_token:token(a),refresh_token:'synthetic-unused-no-refresh'});assert.ok(!r.error,'Existing local Auth must accept the short-lived synthetic JWT');assert.equal(r.data.user.id,a.auth_user_id);return store.map(x=>x.name+'='+x.value).join('; ');};
 const sessions={};for(const [name,a] of Object.entries({staff,people,other,foreign,supervisor,manager}))sessions[name]=await cookies(a);checks.push('Actual existing Auth verified all six short-lived synthetic JWT subjects; no password login or persistent session created');
 const initial=sql(`select count(*) from public.daily_attendance_results where staff_id=${quote(staff.id)} and work_date in (${days.map(quote).join(',')});select count(*) from public.attendance_confirmations where staff_id=${quote(staff.id)} and period_start<='2027-01-06' and period_end>='2027-01-04';`);assert.equal(initial,'0\n0','Use unused synthetic dates only');
 let seed='begin;';
 days.forEach((day,i)=>{seed+=`insert into public.daily_attendance_results(id,company_id,staff_id,branch_id,work_date,scheduled_start,scheduled_end,actual_first_in,actual_break_out,actual_break_in,actual_last_out,worked_seconds,calculation) values(${quote(resultIds[i])},${quote(staff.company_id)},${quote(staff.id)},${quote(staff.default_branch_id)},${quote(day)},${quote(day+' 09:00+08')},${quote(day+' 18:30+08')},${quote(day+' 09:00+08')},${quote(day+' 13:00+08')},${quote(day+' 14:00+08')},${quote(day+' 18:30+08')},30600,${quote(JSON.stringify({schedule_source_revision:1,schedule_source_hash:run,punches:['09:00','13:00','14:00','18:30'].map(t=>day+'T'+t+':00+08:00')}))}::jsonb);insert into public.attendance_schedule_refresh(company_id,staff_id,branch_id,work_date,status,source_revision,calculated_revision,source_hash) values(${quote(staff.company_id)},${quote(staff.id)},${quote(staff.default_branch_id)},${quote(day)},'ready',1,1,${quote(run)});`;});
 seed+='set constraints all immediate;';
 days.forEach((day,i)=>{seed+=`do $$declare c uuid;h text;p uuid;begin
 perform set_config('request.jwt.claim.sub',${quote(people.auth_user_id)},true);c:=public.prepare_attendance_confirmation(${quote(staff.id)},${quote(day)},${quote(day)});select source_hash into h from public.attendance_confirmations where id=c;
 perform set_config('request.jwt.claim.sub',${quote(staff.auth_user_id)},true);perform public.review_attendance_confirmation(c,h,'check',null,null);
 perform set_config('request.jwt.claim.sub',${quote(supervisor.auth_user_id)},true);perform public.review_attendance_confirmation(c,h,'verify',${quote(staff.default_branch_id)},null);
 perform set_config('request.jwt.claim.sub',${quote(manager.auth_user_id)},true);perform public.review_attendance_confirmation(c,h,'approve',${quote(staff.default_branch_id)},null);
 perform set_config('request.jwt.claim.sub',${quote(people.auth_user_id)},true);p:=public.save_employee_payslip(c,${quote(JSON.stringify(baseLines))}::jsonb);perform public.save_employee_payslip(c,${quote(JSON.stringify(lines2))}::jsonb);
 ${i===0?"perform public.advance_employee_payslip(p,2,'approve');perform public.advance_employee_payslip(p,2,'release');":i===2?'update public.employee_payslips set earnings=999 where id=p;':''}
 end$$;`;});
 seed+=`select json_agg(x) from (select p.id,p.version,p.state,c.period_start from public.employee_payslips p join public.attendance_confirmations c on c.id=p.confirmation_id where c.staff_id=${quote(staff.id)} and c.period_start in (${days.map(quote).join(',')}) order by c.period_start) x;commit;`;
 const seededText=sql(seed);seeded=true;fixtures=JSON.parse(seededText);assert.equal(fixtures.length,3);
 const client=a=>createClient(supabase,key,{auth:{persistSession:false,autoRefreshToken:false},accessToken:async()=>token(a)});
 const projection=fs.readFileSync('src/app/api/people/payslips/export/route.ts','utf8').match(/\.select\("([^"]+)"\)/)[1];
 const released=fixtures[0],draft=fixtures[1],mismatch=fixtures[2];
 const real=await client(staff).from('employee_payslips').select(projection).eq('id',released.id).maybeSingle();assert.ok(!real.error,'Actual PostgREST export projection must succeed: '+JSON.stringify(real.error));assert.ok(real.data,'Own released row must be visible');const conf=real.data.attendance_confirmations;assert.ok(conf&&!Array.isArray(conf));assert.ok(conf.staffs&&!Array.isArray(conf.staffs));assert.equal(conf.staffs.full_name,staff.full_name);assert.equal(conf.staffs.staff_code,staff.staff_code);
 const hr=await client(people).from('employee_payslips').select(projection).eq('id',draft.id).maybeSingle();assert.ok(!hr.error&&hr.data,'People exact projection must succeed');assert.equal(hr.data.attendance_confirmations.staffs.full_name,staff.full_name);assert.equal(hr.data.attendance_confirmations.staffs.staff_code,staff.staff_code);
 checks.push('Actual exact export SELECT returns object confirmation and object staffs with expected synthetic full_name/StaffCode for both employee and People');
 const anonOther=await client(other).from('employee_payslips').select('id').eq('id',released.id);assert.ok(!anonOther.error);assert.equal(anonOther.data.length,0);
 const anonForeign=await client(foreign).from('employee_payslips').select('id').eq('id',released.id);assert.ok(!anonForeign.error);assert.equal(anonForeign.data.length,0);
 const ownDraft=await client(staff).from('employee_payslips').select('id').eq('id',draft.id);assert.ok(!ownDraft.error);assert.equal(ownDraft.data.length,0);
 const visible=await client(people).from('employee_payslips').select('id,company_id').in('id',fixtures.map(x=>x.id));assert.ok(!visible.error);assert.equal(visible.data.length,3);assert.ok(visible.data.every(x=>x.company_id===people.company_id));checks.push('Real PostgREST RLS excludes own draft, same-company other employee and foreign-company reader; People sees original company fixture scope');
 const portServer=http.createServer();await new Promise(resolve=>portServer.listen(0,'127.0.0.1',resolve));const appPort=portServer.address().port;await new Promise(resolve=>portServer.close(resolve));const app='http://127.0.0.1:'+appPort;
 next=cp.spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(appPort)],{cwd:process.cwd(),env:{...process.env,NODE_ENV:'production',SUPABASE_URL:supabase,SUPABASE_PUBLISHABLE_KEY:key,NEXT_PUBLIC_SUPABASE_URL:supabase,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:key,NEXT_PUBLIC_ENABLE_MOCK_MODE:'false',NEXT_PUBLIC_APP_URL:app},stdio:['ignore','pipe','pipe']});next.stdout.pipe(serverLog,{end:false});next.stderr.pipe(serverLog,{end:false});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Local Next start timeout')),25000);next.stdout.on('data',x=>{if(String(x).includes('Ready in')){clearTimeout(timer);resolve();}});next.on('exit',()=>{clearTimeout(timer);reject(Error('Local Next exited before ready'));});});
 const download=async(who,fixture,version=fixture.version,format='xlsx')=>{const response=await fetch(`${app}/api/people/payslips/export?id=${fixture.id}&version=${version}&format=${format}`,{headers:{cookie:sessions[who]},redirect:'manual'});apiMatrix.push({actor:who,case:fixture.id===released.id?'released':fixture.id===draft.id?'draft':'mismatch',requestedVersion:version,format,status:response.status,...(response.ok?{}:{error:await response.clone().text()})});return response;};
 const r=await download('staff',released);assert.equal(r.status,200,'Actual Next route own released XLSX');assert.equal(r.headers.get('cache-control'),'private, no-store');const releasedBytes=Buffer.from(await r.arrayBuffer());fs.writeFileSync(out+'/staff-released.xlsx',releasedBytes);assert.ok(releasedBytes.toString().includes('>'+staff.full_name+'</t>'));assert.ok(releasedBytes.toString().includes('>'+staff.staff_code+'</t>'));assert.ok(releasedBytes.toString().includes('<v>988.05</v>'));
 const pdf=await download('staff',released,released.version,'pdf');assert.equal(pdf.status,200);fs.writeFileSync(out+'/staff-released.pdf',Buffer.from(await pdf.arrayBuffer()));
 assert.equal((await download('staff',draft)).status,404);assert.equal((await download('other',released)).status,404);assert.equal((await download('foreign',released)).status,404);assert.equal((await download('people',released,1)).status,409);assert.equal((await download('people',mismatch)).status,409);
 for(const who of ['supervisor','manager'])for(const format of ['xlsx','pdf']){assert.equal((await download(who,released,released.version,format)).status,404);assert.equal((await download(who,draft,draft.version,format)).status,404);}checks.push('Manager and Supervisor cannot download another employee released or draft salary in XLSX or PDF');
 const pr=await download('people',draft);assert.equal(pr.status,200,'People original-scope draft');const draftBytes=Buffer.from(await pr.arrayBuffer());fs.writeFileSync(out+'/people-draft.xlsx',draftBytes);assert.ok(draftBytes.toString().includes('>'+staff.full_name+'</t>'));assert.ok(draftBytes.toString().includes('>'+staff.staff_code+'</t>'));assert.ok(draftBytes.toString().includes('DRAFT — NOT APPROVED'));
 const pa=await download('people',released);assert.equal(pa.status,200);checks.push('Built Next middleware/Auth/profile/tenant actor/session client/export GET succeeds for employee released XLSX/PDF and People original-scope rows; own draft/other/foreign404, old version409, mismatched monetary snapshot409');
 const retained=JSON.parse(sql(`select json_agg(x) from (select p.id,p.version,p.state from public.employee_payslips p where id in (${fixtures.map(x=>quote(x.id)).join(',')}) order by id) x;`));assert.ok(retained.every(x=>x.version===2));assert.equal(retained.find(x=>x.id===released.id).state,'released');checks.push('Export requests left every monetary version/state unchanged');
 assert.ok(trace.filter(x=>x.service==='auth').every(x=>x.method==='GET'),'Auth verification must not create sessions or credentials');
 fs.writeFileSync(out+'/result.json',JSON.stringify({passed:true,run,checks,projection,relationShape:{confirmation:'object',staffs:'object',fullNameVerified:true,staffCodeVerified:true,actorsVerified:['staff','people']},apiMatrix,rlsRowCounts:{ownReleased:1,ownDraft:0,sameCompanyOther:0,foreignCompany:0,peopleOriginalScope:3},fixtures:fixtures.map(x=>({id:x.id,version:x.version,state:x.state,day:x.period_start})),trace,tokenLifetimeSeconds:600,credentialsPersisted:false,adapters:['loopback transport forwards bytes to dedicated local Auth/PostgREST with unchanged existing configuration; no identity, query or response mocks'],productionWrites:0,limits:['local service definitions and existing synthetic identities, not production acceptance','temporary synthetic fixtures committed for cross-connection HTTP visibility then exactly cleaned']},null,2));
 console.log('PASS actual built Next/Auth/PostgREST/RLS export path and nested employee metadata');
 }finally{
  fs.writeFileSync(out+'/attempt.json',JSON.stringify({run,checks,trace,apiMatrix},null,2));
  if(next){next.kill('SIGTERM');await new Promise(resolve=>{const t=setTimeout(()=>{next.kill('SIGKILL');resolve();},5000);next.once('exit',()=>{clearTimeout(t);resolve();});});}
  if(proxy){proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve));}
  if(seeded){const retained=JSON.parse(cleanup());assert.ok(Object.values(retained).every(x=>x===0),'Exact synthetic scope cleanup');fs.writeFileSync(out+'/cleanup.json',JSON.stringify({cleaned:true,run,resultIds,retained,credentialsPersisted:false},null,2));}
  serverLog.end();
 }
})().catch(error=>{console.error('Local verification failed: '+error.message);process.exitCode=1;});
