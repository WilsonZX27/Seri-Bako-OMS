const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
test('register another remounts with a distinct request key and drops the stale sequence candidate',()=>{
 let saved; const props={requestKey:'old-key',nextCode:'SB-0446'};const exports={};let generated=0;
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/asset-master-form.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,crypto:{randomUUID:()=>`new-key-${++generated}`},require:name=>name==='react'?{createElement:(type,props)=>({type,props,key:props.key}),useState:initial=>[saved??initial,fn=>saved=fn(saved??{key:props.requestKey,generation:0})]}:name==='react/jsx-runtime'?{jsx:(type,props,key)=>({type,props,key})}:{}});
 const before=exports.AssetMasterForm(props);assert.equal(before.props.requestKey,'old-key');before.props.onRegisterAnother();const after=exports.AssetMasterForm(props);assert.equal(after.props.requestKey,'new-key-1');assert.equal(after.key,1);assert.equal(after.props.nextCode,null);
 const edit=exports.AssetMasterForm({...props,assetId:'existing'});assert.equal(edit.props.onRegisterAnother,undefined);
});
test('transfer history remains in document rail with phone access and pagination, without optional note',()=>{
 for(const path of ['src/components/asset-transfer-batch-detail.tsx','src/app/(app)/asset-management/transfers/[id]/page.tsx']){const s=fs.readFileSync(path,'utf8');assert.match(s,/mobileRailSummary="Document timeline"/);assert.match(s,/title="Document timeline"/);assert.doesNotMatch(s,/title="Action history"|\bshowNote\b/);const rail=s.slice(s.indexOf('rightRail='),s.indexOf('<AssetTransferProgress'));assert.match(rail,/data.total > 50/);assert.match(rail,/hidden md:block/);}
});
test('maintenance query distinguishes active, processed and explicit all without widening transfer filtering',()=>{
 const s=fs.readFileSync('src/server/queries/assets.ts','utf8');assert.match(s,/view === "maintenance" && status === "Outstanding"\) request = request.in\("status", \["Open", "Assigned"\]\)/);assert.match(s,/status === "Processed"\) request = request.in\("status", \["Resolved", "Closed"\]\)/);assert.match(s,/view === "transfers" \|\| view === "maintenance" && status !== "All"/);
 const page=fs.readFileSync('src/app/(app)/asset-management/page.tsx','utf8');assert.match(page,/Outstanding/);assert.match(page,/aria-label="Maintenance status shortcuts"/);assert.match(page,/page:"1",ticket:""/);
});
test('registration candidate only reads existing sequence, never allocates on page load',()=>{
 const s=fs.readFileSync('src/server/queries/assets.ts','utf8').split('export const getAssetRegistration')[1].split('export const ')[0];assert.match(s,/from\("document_sequences"\)/);assert.match(s,/from\("document_sequence_periods"\)/);assert.doesNotMatch(s,/nextval|\.insert\(|\.update\(/);assert.match(s,/sequence.error/);assert.match(s,/period.error/);
});
