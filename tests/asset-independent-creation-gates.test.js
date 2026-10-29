const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript'),vm=require('node:vm');
const company='10000000-0000-4000-8000-000000000001';
function api(batch,env={}){let source=fs.readFileSync('src/server/queries/asset-feature-capabilities.ts','utf8').replace(/ASSET_BATCH_CREATION_ENABLED = (true|false)/,'ASSET_BATCH_CREATION_ENABLED = '+batch);const out={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:out,process:{env}});return out.assetFeatureCapabilities;}
const ready={rpc:async()=>({data:{version:3,transfer_batch:true,transfer_batch_revision:1,automatic_id:true,automatic_id_revision:1},error:null})};
const enabled={ASSET_NUMBERING_COMPANY_ID:company,ASSET_NUMBERING_RELEASE:'verified-allocator-v1'};
test('default empty deployment configuration keeps numbering off, batch independent',async()=>{const v=await api(true)(ready,company);assert.equal(v.automaticId,false);assert.equal(v.transferBatch,true)});
test('exact company plus verified configuration and backend enables numbering only',async()=>{const v=await api(false,enabled)(ready,company);assert.equal(v.automaticId,true);assert.equal(v.transferBatch,false)});
test('foreign or missing actor company cannot inherit numbering configuration',async()=>{for(const id of [undefined,'other'])assert.equal((await api(true,enabled)(ready,id)).automaticId,false)});
test('configuration alone cannot enable missing or outdated allocator',async()=>{for(const data of [null,{version:3,automatic_id:true,automatic_id_revision:0},{version:3,automatic_id:false,automatic_id_revision:1}])assert.equal((await api(true,enabled)({rpc:async()=>({data,error:null})},company)).automaticId,false)});
test('incorrect release acknowledgement remains off',async()=>assert.equal((await api(true,{...enabled,ASSET_NUMBERING_RELEASE:'true'})(ready,company)).automaticId,false));
test('missing capability endpoint fails closed',async()=>assert.equal((await api(true,enabled)({rpc:async()=>({data:null,error:{code:'PGRST202'}})},company)).automaticId,false));
