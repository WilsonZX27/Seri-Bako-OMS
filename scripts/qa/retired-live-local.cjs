// Full built Next route → existing Auth/PostgREST → existing isolated PostgreSQL.
// Short-lived synthetic JWTs stay in memory; no password/session/grant/schema changes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createServerClient}=require('@supabase/ssr'),{createClient}=require('@supabase/supabase-js');
assert.equal(process.versions.node.split('.')[0],'22');
const dbName='oms-role-acceptance-db',restName='oms-role-acceptance-20261021-rest-1',authName='oms-role-acceptance-20261021-auth-1',gateway='oms-role-acceptance-20261021-gateway-1';
const out=path.resolve('handoff/retired-count/live');fs.mkdirSync(out,{recursive:true});
const quote=x=>`'${String(x).replaceAll("'","''")}'`;
const sql=s=>cp.execFileSync('docker',['exec','-i',dbName,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const configs=JSON.parse(cp.execFileSync('docker',['inspect',restName,authName,dbName],{encoding:'utf8'}));
const env=c=>Object.fromEntries(c.Config.Env.map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)];}));
const restEnv=env(configs[0]),authEnv=env(configs[1]),secret=restEnv.PGRST_JWT_SECRET;
assert.ok(secret&&secret.length>=32&&!secret.startsWith('{'),'Existing local HS256 test key required');
assert.ok(secret===authEnv.GOTRUE_JWT_SECRET,'Existing Auth and PostgREST test keys must agree');
assert.ok(Object.values(configs[2].NetworkSettings.Networks).some(n=>n.Aliases.includes(new URL(restEnv.PGRST_DB_URI).hostname)),'PostgREST must target the named isolated database');

const actors=JSON.parse(sql("select json_agg(x) from(select s.auth_user_id,s.full_name from staffs s where s.company_id='efd08261-fbb7-4c7c-b4f1-8ac9a300f54f' and s.full_name in('Synthetic owner','Synthetic supervisor'))x;"));
let proxy,next,qa;const trace=[];
function token(a,expiry=600){const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),now=Math.floor(Date.now()/1000),head=b({alg:'HS256',typ:'JWT'}),body=b({aud:'authenticated',role:'authenticated',sub:a.auth_user_id,iat:now,exp:now+expiry,iss:'http://local-synthetic-auth'});return head+'.'+body+'.'+crypto.createHmac('sha256',secret).update(head+'.'+body).digest('base64url');}

(async()=>{
assert.equal(sql("select count(*) from items where item_code like 'RETQA-%'"),'0');
assert.equal(sql("select count(*) from pg_proc where proname='get_retired_items_workspace'"),'0');
let seed=fs.readFileSync('scripts/qa/retired-items-rls-local.sql','utf8').split('set local role authenticated;')[0].replace('\\i sql-candidates/retired-items-workspace.sql',()=>fs.readFileSync('sql-candidates/retired-items-workspace.sql','utf8'));
sql(seed+'commit; notify pgrst, \'reload schema\';');
 proxy=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');let service,target;
  if(url.pathname.startsWith('/rest/v1/')){service='rest';target='http://rest:3000'+url.pathname.slice(8)+url.search;}
  else if(url.pathname.startsWith('/auth/v1/')){service='auth';target='http://auth:9999'+url.pathname.slice(8)+url.search;}
  else{res.writeHead(404);res.end();return;}
  if(req.method!=='GET'&&!(req.method==='POST'&&service==='rest'&&['attestation_people','get_items_workspace','get_retired_items_workspace','has_any_permission','get_allowed_permissions'].some(n=>url.pathname==='/rest/v1/rpc/'+n))){res.writeHead(403);res.end('{"message":"Read-only synthetic transport"}');return;}
  let body='';for await(const chunk of req)body+=chunk;
  const args=['exec',gateway,'wget','-S','-O','-','-T','15'];
  for(const name of ['authorization','accept','content-type','accept-profile','content-profile','prefer'])if(req.headers[name])args.push('--header',name+': '+req.headers[name]);
  if(req.method==='POST')args.push('--post-data',body);args.push(target);
  const child=cp.spawn('docker',args,{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);
  child.on('close',code=>{const statuses=[...stderr.matchAll(/HTTP\/[\d.]+\s+(\d{3})/g)],status=statuses.length?Number(statuses.at(-1)[1]):code===0?200:502;trace.push({service,method:req.method,path:url.pathname,status});res.writeHead(status,{'content-type':'application/json'});res.end(stdout||JSON.stringify({message:'Local service transport unavailable'}));});
 });
 await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));const supabase='http://127.0.0.1:'+proxy.address().port,key='synthetic-local-transport-only';
 const cookies=async a=>{let store=[];const client=createServerClient(supabase,key,{cookies:{getAll:()=>store,setAll:updates=>{for(const u of updates){store=store.filter(x=>x.name!==u.name);store.push({name:u.name,value:u.value});}}}});const r=await client.auth.setSession({access_token:token(a),refresh_token:'synthetic-unused-no-refresh'});assert.ok(!r.error,'Existing local Auth must accept the short-lived synthetic JWT');assert.equal(r.data.user.id,a.auth_user_id);return store.map(x=>x.name+'='+x.value).join('; ');};

const sessions={}; for(const a of actors)sessions[a.full_name==='Synthetic owner'?'owner':'supervisor']=await cookies(a);
assert.ok(sessions.owner,'Existing synthetic owner required');
qa=http.createServer((req,res)=>{const role=new URL(req.url,'http://localhost').searchParams.get('role')||'owner';if(!sessions[role]){res.writeHead(404);res.end();return;}res.writeHead(302,{'Set-Cookie':sessions[role].split('; ').map(x=>x+'; Path=/; HttpOnly; SameSite=Lax'),'Location':'http://127.0.0.1:3197/items?status=retired'});res.end();});
await new Promise(r=>qa.listen(3198,'127.0.0.1',r));
next=cp.spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3197'],{env:{...process.env,NEXT_DIST_DIR:'.next-retired-live',NEXT_PUBLIC_ENABLE_MOCK_MODE:'false',NEXT_PUBLIC_SUPABASE_URL:supabase,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:key},stdio:['ignore',fs.openSync(out+'/next.log','w'),fs.openSync(out+'/next-errors.log','w')]});
console.log('Synthetic local Next/Auth/PostgREST ready; session entry http://127.0.0.1:3198/ ; no production access.');
const cleanup=()=>{next?.kill();proxy?.close();qa?.close();fs.writeFileSync(out+'/trace.json',JSON.stringify(trace,null,2));sql("begin;delete from staff_permission_overrides where staff_id='5d43c3c8-7844-4af1-97d5-71aee6305757' and permission_id in(select id from permissions where permission_code in ('items.view','stock_count.create'));delete from branch_stock_count_items where item_id in(select id from items where item_code like 'RETQA-%');delete from stock_balances_summary where item_id in(select id from items where item_code like 'RETQA-%');delete from items where item_code like 'RETQA-%';delete from suppliers where id='00000000-0000-4000-8000-000000000379';drop function public.get_retired_items_workspace(jsonb);commit;notify pgrst,'reload schema';");console.log('Synthetic fixture/function cleanup complete');process.exit(0);};
process.on('SIGINT',cleanup);process.on('SIGTERM',cleanup);
// Actual Next server render -> authenticated PostgREST -> real RLS, without browser emulation.
const checks=[];
for(const [role,query,expected] of [['owner','status=retired&search=RETQA-',1202],['owner','status=retired&search=RETQA-&page=2',1202],['owner','status=retired&search=RETQA-&supplier=00000000-0000-4000-8000-000000000379',21],['owner','status=retired&search=RETQA-&stock_control=with_safety_stock',600],['owner','status=retired&search=RETQA-NOMATCH',0],['supervisor','status=retired&search=RETQA-',1201]]){
let response;for(let attempt=0;attempt<30;attempt++){try{response=await fetch('http://127.0.0.1:3197/items?'+query,{headers:{Cookie:sessions[role]}});break;}catch{await new Promise(r=>setTimeout(r,1000));}}
assert.ok(response,'Local Next ready');const html=await response.text();fs.writeFileSync(out+'/http-'+checks.length+'.html',html);
if(role==='supervisor'){assert.ok(response.url.includes('route-not-permitted'),'existing route role restriction preserved');checks.push({role,status:response.status,routeDenied:true});continue;}
assert.equal(response.status,200);assert.ok(html.includes('Retired from branch Stock Counts'),'authenticated Items page');
assert.ok(html.includes(String(expected)),'expected count rendered');checks.push({role,query,expected,status:response.status});
}
fs.writeFileSync(out+'/http-checks.json',JSON.stringify(checks,null,2));fs.writeFileSync(out+'/trace.json',JSON.stringify(trace,null,2));console.log('PASS actual Next/Auth/PostgREST nonempty/filter/page/empty/restricted HTTP checks');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
