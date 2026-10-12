const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function fixture(){
 const tables=['asset_import_batches','asset_locations','assets','asset_master_updates','asset_holdings','asset_maintenance','asset_maintenance_updates','asset_daily_checks','asset_transfers','asset_transfer_updates','asset_attachments','asset_suppliers','asset_calendar_days'];
 const payload=Object.fromEntries(tables.map(t=>[t,[]])),source='a'.repeat(64),url='https://source.invalid/photo',bytes=Buffer.from([255,216,255,1]);
 payload.asset_import_batches=[{id:id(10),company_id:id(1),source_sha256:source,state:'rehearsal'}];payload.asset_attachments=[{id:id(30),company_id:id(1),asset_id:id(20),maintenance_id:id(21),location_id:id(22),source_key:'Attachments:2',url,source_data:{'Uploaded By':'Original author'}}];
 return {payload,snapshot:{source_sha256:source,attachments:[{table:'Attachments',row:2,field:'File URL',url}]},evidence:{source_sha256:source,files:[{source_url:url,local_path:'/tmp/synthetic.jpg',sha256:createHash('sha256').update(bytes).digest('hex'),mime_type:'image/jpeg'}],folders:[]},bytes};
}
function storage(options={}){
 const calls=[],path=`${id(1)}/${id(20)}/legacy-${id(30)}.jpg`;
 const bucket={
  upload:async(path,bytes,config)=>{calls.push({name:'upload',path,config});return {error:options.lostResponse?{message:'Already uploaded'}:null};},
  download:async path=>{calls.push({name:'download',path});return {error:options.missing?{message:'Missing'}:null,data:new Blob([options.corrupt?Buffer.from([255,216,255,2]):Buffer.from([255,216,255,1])])};},
 };
 const client={rpc:async(name,args)=>{calls.push({name,args});return {data:name==='legacy_asset_attachment_target'?path:!options.finalizeError,error:options.prepareError?{message:'Source changed'}:null};},storage:{from:name=>{assert.equal(name,'asset-documents');return bucket;}}};
 return {calls,client};
}
test('legacy copy worker verifies actual stored bytes before finalization and preserves parents',async()=>{
 const {copyLegacyAttachments}=await import('../scripts/assets/copy-legacy-attachments.mjs'),f=fixture(),s=storage({lostResponse:true});
 const result=await copyLegacyAttachments(f.snapshot,f.payload,f.evidence,s.client,async()=>f.bytes);assert.equal(result.activated,false);assert.equal(result.attachments.length,1);
 assert.deepEqual(s.calls.map(c=>c.name),['legacy_asset_attachment_target','upload','download','verify_legacy_asset_attachment']);assert.equal(s.calls[1].config.upsert,false);
 const args=s.calls[3].args;assert.equal(args.p_maintenance,id(21));assert.equal(args.p_location,id(22));assert.equal(args.p_source_sha256,f.snapshot.source_sha256);assert.equal(f.payload.asset_attachments[0].source_data['Uploaded By'],'Original author');
});
test('unresolved evidence, changed local bytes, changed source and bad stored copies stop verification',async()=>{
 const {copyLegacyAttachments}=await import('../scripts/assets/copy-legacy-attachments.mjs');
 for(const options of [{prepareError:true},{corrupt:true},{missing:true}]){const f=fixture(),s=storage(options);await assert.rejects(()=>copyLegacyAttachments(f.snapshot,f.payload,f.evidence,s.client,async()=>f.bytes));assert.equal(s.calls.some(c=>c.name==='verify_legacy_asset_attachment'),false);}
 const f=fixture(),s=storage();let reads=0;await assert.rejects(()=>copyLegacyAttachments(f.snapshot,f.payload,f.evidence,s.client,async()=>++reads===1?f.bytes:Buffer.from([255,216,255,2])),/changed after/);assert.equal(s.calls.some(c=>c.name==='upload'),false);
 f.evidence.files=[];const empty=storage();await assert.rejects(()=>copyLegacyAttachments(f.snapshot,f.payload,f.evidence,empty.client,async()=>f.bytes),/Resolve every/);assert.equal(empty.calls.length,0);
});
test('a failed database finalization is not reported as a successful copy',async()=>{
 const {copyLegacyAttachments}=await import('../scripts/assets/copy-legacy-attachments.mjs'),f=fixture(),s=storage({finalizeError:true});await assert.rejects(()=>copyLegacyAttachments(f.snapshot,f.payload,f.evidence,s.client,async()=>f.bytes),/verification stopped/);
});
test('receipt persistence failure stops completion instead of silently claiming a completed migration',async()=>{
 const {copyLegacyAttachments}=await import('../scripts/assets/copy-legacy-attachments.mjs'),f=fixture(),s=storage();
 await assert.rejects(()=>copyLegacyAttachments(f.snapshot,f.payload,f.evidence,s.client,async()=>f.bytes,async()=>{throw new Error('Private receipt disk unavailable');}),/receipt disk unavailable/);
 assert.equal(s.calls.at(-1).name,'verify_legacy_asset_attachment');
});
