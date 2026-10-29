const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function load(file,bindings={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>bindings[name]??require(name),File,FormData,Buffer});return module.exports;}
const content=load('src/lib/asset-attachments.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function harness(options={}){
 const calls=[],actor={companyId:id(1),staffId:id(2)},asset=id(3),attachment={id:id(4),storage_path:`${id(1)}/${options.general ? `maintenance/${id(6)}` : asset}/${id(4)}.jpg`,verified:!!options.verified};let actors=0,reserves=0;
 const db={rpc:async(name,args)=>{calls.push({name,args});if(name==="report_asset_maintenance_v2")return options.v2?{data:id(6),error:null}:{data:null,error:{code:"PGRST202"}};if(options.rpcError)return {data:null,error:options.rpcError};if(name==="report_asset_maintenance") return {data:id(6),error:null};reserves++;return options.denied || (options.accessChanged && reserves===2)?{data:null,error:{message:'Access denied'}}:{data:attachment,error:null};}};
 const bucket={upload:async(path,bytes,config)=>{calls.push({name:'upload',path,config});return {error:options.uploadError?{message:'Upload response lost'}:null};},download:async path=>{calls.push({name:'download',path});return options.downloadError?{data:null,error:{message:'Unavailable'}}:{data:new Blob([options.corrupt?Buffer.from([255,216,255,9]):Buffer.from([255,216,255,1])]),error:null};}};
 const admin={storage:{from:name=>{assert.equal(name,'asset-documents');return bucket;}},rpc:async(name,args)=>{calls.push({name,args});return {data:true,error:null};}};
 const actions=load('src/server/actions/assets.ts',{
  'next/cache':{revalidatePath:path=>calls.push({name:'revalidate',path})},
  '@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>{actors++;return options.sessionChanged&&actors>1?{...actor,companyId:id(9)}:actor;}},
  '@/server/auth/permissions':{hasPermission:async permission=>options.general ? permission==="assets.report" : !options.operator,requirePermission:async permission=>{calls.push({name:'permission',permission});if(options.permissionRevoked&&actors>1)throw new Error('Permission revoked');}},
  '@/lib/supabase/server':{createClient:async()=>db},'@/server/queries/asset-feature-capabilities':{assetFeatureCapabilities:async()=>({automaticId:false,transferBatch:false})},'@/lib/asset-transfer':require('./helpers/load-source.cjs')()('src/lib/asset-transfer.ts'),'@/lib/supabase/loose':{looseSupabase:value=>value},
  '@/lib/supabase/admin':{createAdminClient:()=>admin},'@/lib/asset-attachments':content,
  '@/lib/asset-master':{assetMasterFields:[]},'@/lib/production-planning/forecast':{addDays:()=>{}},
 });
 const form=new FormData();for(const [key,value] of Object.entries({asset_id:options.general?"":asset,client_key:id(5),label:'Synthetic photo',kind:'Photo',...(options.parent?{maintenance_id:id(6)}:{})}))form.set(key,value);
 form.set('file',new File([Buffer.from([255,216,255,1])],'synthetic.jpg',{type:'image/jpeg'}));
 return {actions,form,calls};
}
test('real upload action verifies stored bytes and rechecks session/access before privileged finalization',async()=>{
 const h=harness({parent:true});const result=await h.actions.uploadAssetAttachment({ok:false,message:''},h.form);
 assert.equal(result.ok,true);assert.deepEqual(h.calls.filter(c=>!['permission','revalidate'].includes(c.name)).map(c=>c.name),['reserve_asset_attachment','upload','download','reserve_asset_attachment','verify_native_asset_attachment']);
 assert.equal(h.calls.find(c=>c.name==='upload').config.upsert,false);
 assert.equal(h.calls.filter(c=>c.name==='revalidate').length,2);
});
test('lost upload response is safely recovered only when stored content matches',async()=>{
 const h=harness({uploadError:true});assert.equal((await h.actions.uploadAssetAttachment({ok:false,message:''},h.form)).ok,true);
 for(const options of [{uploadError:true,downloadError:true},{corrupt:true},{accessChanged:true},{sessionChanged:true},{permissionRevoked:true},{denied:true}]){const h=harness(options);assert.equal((await h.actions.uploadAssetAttachment({ok:false,message:''},h.form)).ok,false);assert.equal(h.calls.some(c=>c.name==='verify_native_asset_attachment'),false);assert.equal(h.calls.some(c=>c.name==='revalidate'),false);}
});
test('verified retries do not rewrite Storage and maintenance operators cannot upload master files or invoices',async()=>{
 const h=harness({verified:true});assert.equal((await h.actions.uploadAssetAttachment({ok:false,message:''},h.form)).ok,true);assert.equal(h.calls.some(c=>['upload','download','verify_native_asset_attachment'].includes(c.name)),false);
 for(const options of [{operator:true},{operator:true,parent:true,invoice:true}]){const h=harness(options);if(options.invoice)h.form.set('kind','Invoice');assert.equal((await h.actions.uploadAssetAttachment({ok:false,message:''},h.form)).ok,false);assert.equal(h.calls.some(c=>c.name==='reserve_asset_attachment'),false);}
 const operator=harness({operator:true,parent:true});assert.equal((await operator.actions.uploadAssetAttachment({ok:false,message:''},operator.form)).ok,true);
});
test('misleading file type is rejected before reservation',async()=>{
 const h=harness();h.form.set('file',new File(['<script>'],'photo.jpg',{type:'image/jpeg'}));assert.equal((await h.actions.uploadAssetAttachment({ok:false,message:''},h.form)).ok,false);assert.equal(h.calls.some(c=>c.name==='reserve_asset_attachment'),false);
});

function readHarness(change={}){
 const calls=[],row={asset_id:id(3),storage_path:`${id(1)}/${id(3)}/${id(4)}.jpg`,verified_at:'2026-10-08T01:00:00Z',content_sha256:'a'.repeat(64),...change};
 const query={select:()=>query,eq:(key,value)=>{calls.push({name:'scope',key,value});return query;},maybeSingle:async()=>({data:change.missing?null:row,error:change.queryError?{message:'Unavailable'}:null})};
 const client={from:()=>query,storage:{from:()=>({createSignedUrl:async(path,seconds)=>{calls.push({name:'sign',path,seconds});return {error:null,data:{signedUrl:'https://example.test/private-synthetic-file'}};}})}};
 const route=load('src/app/(app)/asset-management/attachments/[id]/route.ts',{'@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>({companyId:id(1),staffId:id(2)})},'@/server/auth/permissions':{requirePermission:async permission=>calls.push({name:'permission',permission})},'@/lib/supabase/server':{createClient:async()=>client},'@/server/queries/asset-feature-capabilities':{assetFeatureCapabilities:async()=>({automaticId:false,transferBatch:false})},'@/lib/asset-transfer':require('./helpers/load-source.cjs')()('src/lib/asset-transfer.ts'),'@/lib/supabase/loose':{looseSupabase:value=>value}});
 return {route,calls};
}
test('actual attachment route signs only scoped verified metadata with a private noncached redirect',async()=>{
 const h=readHarness(),result=await h.route.GET(new Request('https://example.test/asset'),{params:Promise.resolve({id:id(4)})});
 assert.equal(result.status,307);assert.equal(result.headers.get('cache-control'),'private, no-store');assert.equal(h.calls.find(c=>c.name==='sign').seconds,60);assert.ok(h.calls.some(c=>c.name==='scope'&&c.key==='company_id'&&c.value===id(1)));
});
test('pending, absent, malformed or foreign-path attachments cannot reach URL signing',async()=>{
 for(const change of [{verified_at:null},{verified_at:'invalid'},{content_sha256:null},{content_sha256:'invalid'},{storage_path:`${id(9)}/${id(3)}/photo.jpg`},{missing:true},{queryError:true}]){
  const h=readHarness(change),result=await h.route.GET(new Request('https://example.test/asset'),{params:Promise.resolve({id:id(4)})});assert.ok([404,503].includes(result.status));assert.equal(h.calls.some(c=>c.name==='sign'),false);
 }
});

test('general problem without asset uses request-owned private path and verified reads',async()=>{
 const h=harness({general:true,parent:true});assert.equal((await h.actions.uploadAssetAttachment({ok:false,message:''},h.form)).ok,true);
 assert.equal(h.calls.find(c=>c.name==='reserve_asset_attachment').args.p_asset,null);
 const r=readHarness({asset_id:null,maintenance_id:id(6),storage_path:`${id(1)}/maintenance/${id(6)}/${id(4)}.jpg`});
 assert.equal((await r.route.GET(new Request('https://example.test/asset'),{params:Promise.resolve({id:id(4)})})).status,307);
});
test('report action returns saved ticket even if its optional photo upload fails',async()=>{
 const h=harness({general:true,parent:true,downloadError:true});
 h.form.set('location_id',id(8));h.form.set('description','Light not working');h.form.set('priority','Normal');h.form.set('photo_key',id(9));h.form.set('photo',h.form.get('file'));
 const result=await h.actions.reportAssetMaintenance({ok:false,message:''},h.form);
 assert.equal(result.ok,true);assert.equal(result.requestId,id(6));assert.match(result.photoError,/Retry/);
 assert.equal(h.calls.find(c=>c.name==='report_asset_maintenance').args.p_asset,null);
});
test('invalid optional photo prevents ticket creation; a report needs no photo',async()=>{
 const h=harness({general:true});h.form.set('location_id',id(8));h.form.set('description','Light not working');h.form.set('priority','Normal');h.form.set('photo_key',id(9));h.form.set('photo',new File(['bad'],'x.jpg',{type:'image/jpeg'}));
 assert.equal((await h.actions.reportAssetMaintenance({ok:false,message:''},h.form)).ok,false);assert.equal(h.calls.some(c=>c.name==='report_asset_maintenance'),false);
 h.form.delete('photo');assert.equal((await h.actions.reportAssetMaintenance({ok:false,message:''},h.form)).ok,true);
});

test('registration duplicate-code feedback does not mask unrelated server failures',async()=>{
 const friendly='An asset with this ID already exists. Open the existing asset to check whether your earlier registration succeeded.';
 for(const [code,constraint,expected] of [['23505','assets_company_id_asset_code_key',friendly],['23505','asset_code_case_unique',friendly],['23505','other_key',null],['42501','assets_company_id_asset_code_key',null]]){
  const message=`duplicate key value violates unique constraint "${constraint}"`,h=harness({rpcError:{code,message}});
  for(const [key,value] of Object.entries({asset_id:'',item_name:'Fictional asset',reason:'Fictional registration',asset_code:'FINAL-AUDIT',location_id:id(7)}))h.form.set(key,value);
  const result=await h.actions.saveAssetMaster({},h.form);assert.equal(result.ok,false);assert.equal(result.message,expected??message);
 }
});

test('new repair endpoint retains optional-photo recovery and never falls through to old mutation',async()=>{
 const h=harness({general:true,parent:true,v2:true,downloadError:true});h.form.set('location_id',id(8));h.form.set('description','Additional issue');h.form.set('priority','Normal');h.form.set('photo_key',id(9));h.form.set('photo',h.form.get('file'));
 const result=await h.actions.reportAssetMaintenance({ok:false,message:''},h.form);assert.equal(result.ok,true);assert.equal(result.requestId,id(6));assert.match(result.photoError,/Retry/);assert.equal(h.calls.filter(c=>c.name==='report_asset_maintenance_v2').length,1);assert.equal(h.calls.some(c=>c.name==='report_asset_maintenance'),false);
});
