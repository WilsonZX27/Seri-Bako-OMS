const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const {assetTransferNumber}=require('./helpers/load-source.cjs')()('src/lib/asset-transfer-number.ts');
test('persisted transfer number wins while readable legacy references remain unchanged',()=>{const row={id:'uuid',source_id:'OLD-42'};assert.equal(assetTransferNumber({...row,document_no:'AT-001'}),'AT-001');assert.equal(assetTransferNumber(row),'OLD-42');assert.equal(assetTransferNumber({id:'uuid'}),'Unnumbered');assert.equal(row.source_id,'OLD-42');});
const source=fs.readFileSync('src/server/queries/assets.ts','utf8');const start=source.indexOf('async function withTransferDisplay'),end=source.indexOf('async function withCanonicalBranchNames');
function enrich(rpc){const exports={};vm.runInNewContext(ts.transpileModule(source.slice(start,end)+'\nexport {withTransferDisplay};',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports});return rows=>exports.withTransferDisplay({rpc},rows);}
test('list/detail/history join the same persisted document number for all batch lines',async()=>{const calls=[];const run=enrich(async(name,args)=>{calls.push([name,args]);return {data:name==='get_asset_transfer_numbers'?[{document_id:'batch',document_no:'AT-001'}]:[],error:null}});const result=await run([{id:'line-a',batch_id:'batch'},{id:'line-b',batch_id:'batch'}]);assert.equal(result[0].document_no,'AT-001');assert.equal(result[1].document_no,'AT-001');assert.equal(calls[0][1].p_ids.length,1);assert.equal(result[0].id,'line-a');});
test('uninstalled read RPC keeps legacy detail; unavailable installed RPC fails explicitly',async()=>{const row={id:'legacy',source_id:'OLD-42'};const result=await enrich(async name=>name==='get_asset_transfer_numbers'?{data:null,error:{code:'PGRST202'}}:{data:[],error:null})([row]);assert.equal(assetTransferNumber(result[0]),'OLD-42');await assert.rejects(()=>enrich(async()=>({data:null,error:{code:'57014'}}))([row]),/numbers unavailable/);});

test('missing numbers never invent a prefix or expose UUID as a business number',()=>{
  const id='11111111-1111-4111-8111-111111111111';
  for(const source_id of [null,undefined,'','  ',id,id.toUpperCase()]) {
    const row={id,source_id,document_no:'  '};
    assert.equal(assetTransferNumber(row),'Unnumbered');
    assert.equal(row.id,id);
  }
  for(const document_no of ['AT-001','AST-001']) assert.equal(assetTransferNumber({id,document_no}),document_no);
});
