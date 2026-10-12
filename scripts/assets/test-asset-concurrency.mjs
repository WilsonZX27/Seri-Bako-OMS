import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import {stageSnapshot,applySnapshotDelta,restoreStagingLedger,ledgerTables} from './import-ledger.mjs';

if (!process.env.EMBEDDED_POSTGRES_MODULE) throw new Error('Set EMBEDDED_POSTGRES_MODULE to an isolated installed test runtime.');
const { default: EmbeddedPostgres } = await import(pathToFileURL(process.env.EMBEDDED_POSTGRES_MODULE));
const directory = await fs.mkdtemp(join(tmpdir(), 'oms-asset-race-'));
const server = new EmbeddedPostgres({ databaseDir: join(directory,'data'), port: 54389,
  user:'postgres',password:randomBytes(24).toString('hex'),persistent:false,
  postgresFlags:['-c','listen_addresses=127.0.0.1','-c',`unix_socket_directories=${directory}`],
  onLog:()=>{},onError:()=>{} });
const clients=[];
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let started=false;
try {
  await server.initialise();await server.start();started=true;
  const connect=async()=>{const client=server.getPgClient('postgres','127.0.0.1');clients.push(client);await client.connect();return client;};
  const admin=await connect(),left=await connect(),right=await connect();
  const fixture=await fs.readFile('scripts/assets/test-asset-db.mjs','utf8');
  await admin.query(fixture.split('await db.exec(`')[1].split('`);')[0]);
  await admin.query(await fs.readFile('supabase/migrations/337_asset_management_foundation.sql','utf8'));
  await admin.query('insert into companies values($1)',[id(1)]);
  await admin.query('insert into branches values($1,$3),($2,$3)',[id(11),id(12),id(1)]);
  await admin.query('insert into staffs values($1,$2,$3,$4)',[id(20),id(1),id(11),'Synthetic operator']);
  await admin.query("insert into asset_import_batches(company_id,source_sha256,reconciliation,state) values($1,'synthetic-race','{}','live')",[id(1)]);
  await admin.query("insert into asset_locations(id,company_id,source_name,branch_id,kind) values($1,$3,'A',$4,'branch'),($2,$3,'B',$5,'branch')",[id(31),id(32),id(1),id(11),id(12)]);
  await admin.query("insert into assets(id,company_id,asset_code,item_name) values($1,$2,'SYNTHETIC-RACE','Tray')",[id(40),id(1)]);
  await admin.query('insert into asset_holdings(company_id,asset_id,location_id,quantity) values($1,$2,$3,10)',[id(1),id(40),id(31)]);
  for(const client of [left,right]) await client.query(`set test.actor='${id(20)}';set test.permissions='assets.view,assets.view_all,assets.transfer,assets.approve,assets.maintenance,assets.manage';set role authenticated;set statement_timeout='10s';`);
  const pids=await Promise.all([left,right].map(async client=>(await client.query('select pg_backend_pid() pid')).rows[0].pid));
  assert.notEqual(pids[0],pids[1]);
  const waitForLock=async()=>{
    const deadline=Date.now()+3000;
    while(Date.now()<deadline){
      const activity=await admin.query('select wait_event_type from pg_stat_activity where pid=$1',[pids[1]]);
      if(activity.rows[0]?.wait_event_type==='Lock') return;
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    throw new Error('Independent second backend did not reach a lock wait.');
  };
  const request=(client,quantity)=>client.query('select request_asset_transfer($1,$2,$3,$4,$5) id',[id(40),id(31),id(32),quantity,'Synthetic concurrency test']);
  await left.query('begin');
  const transfer=(await request(left,6)).rows[0].id;
  const competing=request(right,6).then(()=>({ok:true}),error=>({ok:false,message:error.message}));
  await waitForLock();await left.query('commit');
  const reservationResult=await competing;
  assert.equal(reservationResult.ok,false);assert.match(reservationResult.message,/unreserved/);
  assert.equal((await admin.query('select count(*)::int n from asset_transfers')).rows[0].n,1);
  for(const action of ['approve','dispatch']) await left.query('select advance_asset_transfer($1,$2)',[transfer,action]);
  await left.query('begin');await left.query("select advance_asset_transfer($1,'receive')",[transfer]);
  const duplicate=right.query("select advance_asset_transfer($1,'receive')",[transfer]).then(()=>({ok:true}),error=>({ok:false,message:error.message}));
  await waitForLock();await left.query('commit');
  const receiptResult=await duplicate;
  assert.equal(receiptResult.ok,false);assert.match(receiptResult.message,/receipt unavailable/);
  assert.equal((await admin.query('select sum(quantity)::int n from asset_holdings')).rows[0].n,10);
  assert.equal((await admin.query("select sum(quantity)::int n from asset_holdings where location_id=$1",[id(32)])).rows[0].n,6);
  const outbound=(await left.query('select request_asset_transfer($1,$2,$3,2,$4) id',[id(40),id(31),id(32),'Opposite receipt A'])).rows[0].id;
  const inbound=(await right.query('select request_asset_transfer($1,$2,$3,3,$4) id',[id(40),id(32),id(31),'Opposite receipt B'])).rows[0].id;
  for(const move of [outbound,inbound]) for(const action of ['approve','dispatch']) await left.query('select advance_asset_transfer($1,$2)',[move,action]);
  await left.query('begin');await left.query("select advance_asset_transfer($1,'receive')",[outbound]);
  const opposite=right.query("select advance_asset_transfer($1,'receive')",[inbound]).then(()=>({ok:true}),error=>({ok:false,message:error.message}));
  await waitForLock();await left.query('commit');assert.equal((await opposite).ok,true);
  assert.deepEqual((await admin.query('select quantity from asset_holdings order by location_id')).rows.map(row=>row.quantity),[5,5]);
  const maintenance=(await left.query('select report_asset_maintenance($1,$2,$3,$4,$5) id',[id(40),id(31),'Synthetic issue','Normal',id(91)])).rows[0].id;
  await left.query('begin');await left.query('select update_asset_maintenance($1,$2,$3,$4,$5)',[maintenance,'Assigned','First update',id(92),'Open']);
  const stale=right.query('select update_asset_maintenance($1,$2,$3,$4,$5)',[maintenance,'Closed','Stale update',id(93),'Open']).then(()=>({ok:true}),error=>({ok:false,message:error.message}));
  await waitForLock();await left.query('commit');const staleResult=await stale;
  assert.equal(staleResult.ok,false);assert.match(staleResult.message,/status changed/);
  assert.equal((await admin.query('select count(*)::int n from asset_maintenance_updates')).rows[0].n,1);
  const nativeArgs=['SYNTHETIC-MASTER','New tray',id(31),null,'{}','Native master concurrency',id(94)];
  await left.query('begin');
  const native=(await left.query('select create_asset_master($1,$2,$3,$4,$5::jsonb,$6,$7) id',nativeArgs)).rows[0].id;
  const sameCreation=right.query('select create_asset_master($1,$2,$3,$4,$5::jsonb,$6,$7) id',nativeArgs);
  await waitForLock();await left.query('commit');assert.equal((await sameCreation).rows[0].id,native);
  const stamp=(await admin.query('select updated_at::text stamp from assets where id=$1',[native])).rows[0].stamp;
  await left.query('begin');await left.query('select update_asset_master($1,$2,$3::jsonb,$4,$5,$6::timestamptz)',[native,'Updated tray','{}','First edit',id(95),stamp]);
  const staleMaster=right.query('select update_asset_master($1,$2,$3::jsonb,$4,$5,$6::timestamptz)',[native,'Stale tray','{}','Stale edit',id(96),stamp]).then(()=>({ok:true}),error=>({ok:false,message:error.message}));
  await waitForLock();await left.query('commit');const staleMasterResult=await staleMaster;
  assert.equal(staleMasterResult.ok,false);assert.match(staleMasterResult.message,/master changed/);
  assert.equal((await admin.query('select count(*)::int n from asset_master_updates where asset_id=$1',[native])).rows[0].n,2);
  const attachmentArgs=[native,id(110),'Synthetic invoice','Invoice','application/pdf',25,'b'.repeat(64)];
  await left.query('begin');
  const pendingAttachment=(await left.query('select reserve_asset_attachment($1,$2,$3,$4,$5,$6,$7) result',attachmentArgs)).rows[0].result;
  const sameAttachment=right.query('select reserve_asset_attachment($1,$2,$3,$4,$5,$6,$7) result',attachmentArgs);
  await waitForLock();await left.query('commit');
  assert.deepEqual((await sameAttachment).rows[0].result,pendingAttachment);
  assert.equal((await admin.query('select count(*)::int n from asset_attachments where asset_id=$1',[native])).rows[0].n,1);
  // Exercise the same import transaction/recovery core on real PostgreSQL,
  // using a separate, unactivated synthetic company.
  await admin.query('insert into companies values($1)',[id(2)]);
  await admin.query('insert into branches values($1,$2)',[id(13),id(2)]);
  const source=Object.fromEntries(ledgerTables.map(table=>[table,[]]));
  source.asset_import_batches=[{id:id(120),company_id:id(2),source_sha256:'c'.repeat(64),reconciliation:{rows:1},state:'rehearsal'}];
  source.asset_locations=[{id:id(35),company_id:id(2),source_name:'Import fixture',branch_id:id(13),kind:'branch'}];
  source.assets=[{id:id(50),company_id:id(2),asset_code:'SYNTHETIC-IMPORT',item_name:'Import tray',source_data:{Qty:null},import_batch_id:id(120)}];
  source.asset_holdings=[{id:id(62),company_id:id(2),asset_id:id(50),location_id:id(35),quantity:null}];
  const saveBackup=async(name,record)=>{const handle=await fs.open(join(directory,name),'wx',0o600);try{await handle.writeFile(JSON.stringify(record));await handle.sync();}finally{await handle.close();}};
  let importBackup;
  await stageSnapshot(admin,source,id(2),async record=>{await saveBackup('import-before.json',record);importBackup=record;});
  assert.equal((await stageSnapshot(admin,source,id(2),async()=>assert.fail('A replay must not replace its backup'))).unchanged,true);
  const finalSource=structuredClone(source);
  finalSource.asset_import_batches[0]={...finalSource.asset_import_batches[0],id:id(121),source_sha256:'d'.repeat(64)};
  finalSource.assets[0].import_batch_id=id(121);finalSource.asset_holdings[0].quantity=0;
  let finalBackup;
  await applySnapshotDelta(admin,source,finalSource,id(2),async record=>{await saveBackup('delta-before.json',record);finalBackup=record;});
  assert.equal((await admin.query('select quantity from asset_holdings where asset_id=$1',[id(50)])).rows[0].quantity,0);
  await restoreStagingLedger(admin,finalBackup,id(2));await restoreStagingLedger(admin,importBackup,id(2));
  assert.equal((await admin.query('select count(*)::int n from assets where company_id=$1',[id(2)])).rows[0].n,0);
  // Two migration workers cannot replace a verified legacy hash.
  await admin.query("insert into asset_import_batches(id,company_id,source_sha256,reconciliation,state) values($1,$2,$3,'{}','rehearsal')",[id(122),id(2),'e'.repeat(64)]);
  await admin.query("insert into assets(id,company_id,asset_code,item_name,import_batch_id) values($1,$2,'SYNTHETIC-PHOTO','Legacy photo fixture',$3)",[id(52),id(2),id(122)]);
  await admin.query("insert into asset_attachments(id,company_id,asset_id,source_key,url,source_data) values($1,$2,$3,'Attachments:2','https://source.invalid/photo','{\"Uploaded By\":\"Original author\"}')",[id(112),id(2),id(52)]);
  const legacyPath=`${id(2)}/${id(52)}/legacy-${id(112)}.jpg`;
  await admin.query("insert into storage.objects(bucket_id,name) values('asset-documents',$1)",[legacyPath]);
  const legacyArgs=[id(2),id(112),'e'.repeat(64),'Attachments:2','https://source.invalid/photo',id(52),null,null,'image/jpeg',legacyPath,'f'.repeat(64)];
  const legacySql='select verify_legacy_asset_attachment($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) valid';
  await left.query('reset role;set role service_role');await right.query('reset role;set role service_role');
  await left.query('begin');assert.equal((await left.query(legacySql,legacyArgs)).rows[0].valid,true);
  const changedLegacy=right.query(legacySql,[...legacyArgs.slice(0,-1),'a'.repeat(64)]).then(()=>({ok:true}),error=>({ok:false,message:error.message}));
  await waitForLock();await left.query('commit');const legacyRace=await changedLegacy;
  assert.equal(legacyRace.ok,false);assert.match(legacyRace.message,/verification changed/);
  assert.equal((await right.query(legacySql,legacyArgs)).rows[0].valid,true);
  assert.equal((await admin.query('select content_sha256 from asset_attachments where id=$1',[id(112)])).rows[0].content_sha256,'f'.repeat(64));
  assert.equal((await admin.query('select state from asset_import_batches where id=$1',[id(122)])).rows[0].state,'rehearsal');
  console.log(JSON.stringify({passed:true,engine:(await admin.query('select version() version')).rows[0].version,
    independentBackends:pids,verifiedLockWaits:8,checks:['over-reservation rejected','duplicate receipt rejected','quantity conserved','opposite-direction receipts serialized','stale concurrent maintenance update rejected','concurrent master registration idempotent','stale master edit rejected','concurrent attachment reservation idempotent','atomic staging, delta and recovery verified','concurrent legacy verification cannot replace hash or activate source']}));
} finally {
  await Promise.allSettled(clients.map(client=>client.end()));
  if(started) await server.stop();
  await fs.rm(directory,{recursive:true,force:true});
}
