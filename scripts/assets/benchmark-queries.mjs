import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { randomBytes,randomUUID } from 'node:crypto';
import { pathToFileURL,fileURLToPath } from 'node:url';
import { stageSnapshot,ledgerTables } from './import-ledger.mjs';

// Whole-source performance rehearsal only. There is no remote target option.
const payload=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const catalogue=JSON.parse(await fs.readFile(process.argv[3],'utf8')).rows;
const output=resolve(process.argv[4]??'');
const root=fileURLToPath(new URL('../../',import.meta.url));
if(!process.env.EMBEDDED_POSTGRES_MODULE || !process.argv[4] || output.startsWith(root))throw new Error('Use an isolated PostgreSQL runtime and private output outside Git.');
const {default:EmbeddedPostgres}=await import(pathToFileURL(process.env.EMBEDDED_POSTGRES_MODULE));
const directory=await fs.mkdtemp(join(tmpdir(),'oms-asset-performance-'));
const server=new EmbeddedPostgres({databaseDir:join(directory,'data'),port:54389,user:'postgres',password:randomBytes(24).toString('hex'),persistent:false,postgresFlags:['-c','listen_addresses=127.0.0.1','-c',`unix_socket_directories=${directory}`],onLog:()=>{},onError:()=>{}});
let started=false,client;
try{
 await server.initialise();await server.start();started=true;
 client=server.getPgClient('postgres','127.0.0.1');await client.connect();
 const fixture=await fs.readFile('scripts/assets/test-asset-db.mjs','utf8');
 await client.query(fixture.split('await db.exec(`')[1].split('`);')[0]);
 await client.query(await fs.readFile('supabase/migrations/337_asset_management_foundation.sql','utf8'));
 const company=payload.asset_import_batches[0].company_id,actor=randomUUID();
 if(catalogue.some(branch=>branch.company_id!==company))throw new Error('Branch catalogue company mismatch.');
 await client.query('insert into companies values($1)',[company]);
 for(const branch of catalogue)await client.query('insert into branches values($1,$2)',[branch.id,company]);
 await stageSnapshot(client,payload,company,async record=>{const handle=await fs.open(join(directory,'before.json'),'wx',0o600);try{await handle.writeFile(JSON.stringify(record));await handle.sync();}finally{await handle.close();}});
 // Test-only activation inside this disposable database enables the real RLS.
 // Source originals and all production state remain untouched.
 await client.query("update asset_import_batches set state='live' where company_id=$1",[company]);
 await client.query('insert into staffs values($1,$2,$3,$4)',[actor,company,catalogue[0].id,'Synthetic performance actor']);
 for(const table of ledgerTables)await client.query(`analyze public.${table}`);
 const date=payload.asset_daily_checks.map(row=>row.check_date).sort().at(-1)??'2026-10-08';
 const location=payload.asset_daily_checks.find(row=>row.check_date===date)?.location_id??payload.asset_locations[0].id;
 const maintenance=payload.asset_maintenance[0]?.id;
 await client.query("select set_config('test.actor',$1,false),set_config('test.permissions','assets.view,assets.view_all,assets.manage',false)",[actor]);
 await client.query("set statement_timeout='15s';set role authenticated");
 const cases=[
  {name:'overview',sql:'select get_asset_overview($1) result',params:[date]},
  {name:'asset_register',sql:'select id,asset_code,item_name from assets where company_id=$1 order by asset_code limit 50',params:[company]},
  {name:'asset_register_count',sql:'select count(*) from assets where company_id=$1',params:[company]},
  {name:'maintenance_queue',sql:"select * from asset_maintenance where company_id=$1 order by (source_data->>'Created Date') desc,id desc limit 50",params:[company]},
  {name:'daily_check_queue',sql:'select * from asset_daily_checks where company_id=$1 and check_date=$2 order by check_date desc,id desc limit 50',params:[company,date]},
  {name:'location_checklist',sql:'select asset_id,location_id,quantity from asset_holdings where company_id=$1 and location_id=$2 order by asset_id limit 50',params:[company,location]},
  ...(maintenance?[{name:'maintenance_history',sql:'select id,source_id,author_name,source_data,created_at from asset_maintenance_updates where company_id=$1 and maintenance_id=$2 order by (source_data->>\'Update Date\') desc,id desc limit 50',params:[company,maintenance]}]:[]),
 ];
 const results=[];
 for(const item of cases){
  const times=[];
  for(let run=0;run<18;run++){const start=process.hrtime.bigint();await client.query(item.sql,item.params);times.push(Number(process.hrtime.bigint()-start)/1e6);}
  const warm=times.slice(3).sort((a,b)=>a-b);
  const explained=await client.query(`explain (analyze,buffers,format json) ${item.sql}`,item.params);
  const plan=explained.rows[0]['QUERY PLAN'][0];
  const nodes=[];const visit=node=>{nodes.push({type:node['Node Type'],rows:node['Actual Rows'],loops:node['Actual Loops'],shared_hits:node['Shared Hit Blocks']??0,shared_reads:node['Shared Read Blocks']??0});for(const child of node.Plans??[])visit(child);};visit(plan.Plan);
  results.push({name:item.name,first_ms:times[0],median_ms:warm[Math.floor(warm.length/2)],p95_ms:warm[Math.ceil(warm.length*.95)-1],execution_ms:plan['Execution Time'],planning_ms:plan['Planning Time'],nodes});
 }
 const report={version:1,engine:(await client.query('select version() version')).rows[0].version,scope:'Disposable PostgreSQL; actual source volume; real asset SQL/RLS with synthetic actor/permission helpers. Excludes hosted Auth/PostgREST/Storage/network/browser time.',runs:18,warm_runs:15,rows:Object.fromEntries(ledgerTables.map(table=>[table,payload[table].length])),results,production_writes:false};
 await fs.writeFile(output,JSON.stringify(report,null,2),{flag:'wx',mode:0o600});
 console.log(JSON.stringify({scope:report.scope,results:results.map(({nodes,...metrics})=>metrics),production_writes:false}));
}finally{if(client)await client.end();if(started)await server.stop();await fs.rm(directory,{recursive:true,force:true});}
