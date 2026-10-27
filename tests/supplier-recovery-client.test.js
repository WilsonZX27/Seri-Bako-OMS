const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const load=require('./helpers/load-source.cjs');
const {compile,React,renderToStaticMarkup}=require('./helpers/render-workspaces.cjs');
const base={role:'purchasing',canReview:true,status:'admin_review',supplierId:null,catalogLines:0,unresolvedLines:1};
test('supplier recovery presentation is confined to the approved role, state and line shape',()=>{
 const {canRecoverPurchaseRequestSupplier:can,supplierRecoveryInstalled}=load()('src/lib/procurement/supplier-recovery.ts');
 assert.equal(supplierRecoveryInstalled,false);
 for(const role of ['purchasing','super_admin'])assert.equal(can({...base,role}),true);
 for(const patch of [{role:'manager'},{role:'finance'},{canReview:false},{status:'manager_review'},{status:'finance_review'},{supplierId:'existing'},{catalogLines:1},{unresolvedLines:0}])assert.equal(can({...base,...patch}),false);
});
test('uninstalled and unavailable states contain no executable supplier form; installed form preserves version and explicit confirmation',()=>{
 const {PurchaseRequestSupplierRecovery:View}=compile('src/components/purchase-request-supplier-recovery.tsx',{'@/components/ui/submit-button':{SubmitButton:({children,...props})=>React.createElement('button',{type:'submit',className:props.className},children)}});
 const render=props=>renderToStaticMarkup(React.createElement(View,{installed:false,suppliers:[{id:'supplier',name:'Synthetic supplier'}],updatedAt:'2026-10-27T00:00:00Z',action:()=>{},...props}));
 assert.match(render({}),/installation and verification are pending/);assert.doesNotMatch(render({}),/<form|<button|<select/);
 for(const suppliers of [null,[]])assert.doesNotMatch(render({installed:true,suppliers}),/<form|<button|<select/);
 const html=render({installed:true});assert.match(html,/name="expected_updated_at" value="2026-10-27T00:00:00Z"/);assert.match(html,/<input(?=[^>]*name="confirm_supplier")(?=[^>]*required)[^>]*>/);assert.match(html,/name="supplier_id"/);assert.match(html,/Quantities, prices and approval status stay unchanged/);
});
const request='10000000-0000-4000-8000-000000000001',supplier='20000000-0000-4000-8000-000000000001';
async function actionCase({installed=true,role='purchasing',permission=true,values={},rpcError=null,rpcData=request}={}){
 const calls=[],out={};
 const redirect=(path,kind,message)=>{calls.push({redirect:path,kind,message});throw Object.assign(Error('redirect'),{redirect:true});};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/server/actions/procurement.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:out,require:id=>{
  if(id==='zod')return require('zod');
  if(id==='@/lib/procurement/supplier-recovery')return {supplierRecoveryInstalled:installed};
  if(id==='@/lib/mock-mode')return {isMockMode:()=>false};
  if(id==='@/server/auth/permissions')return {requirePermission:async code=>{calls.push({permission:code});if(!permission)throw Error('denied');}};
  if(id==='@/server/queries/common')return {getCurrentProfile:async()=>({role_code:role})};
  if(id==='@/lib/supabase/server')return {createClient:async()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:rpcData,error:rpcError};}})};
  if(id==='@/server/actions/revalidate')return {revalidateWorkspaceState:paths=>calls.push({revalidate:paths})};
  if(id==='@/server/actions/error-handling')return {safeRedirectWithMessage:redirect,rethrowRedirect:e=>{if(e.redirect)throw e;},formatActionError:e=>e.message};
  return {};
 }});
 const form=new FormData();for(const [k,v] of Object.entries({supplier_id:supplier,expected_updated_at:'2026-10-27T00:00:00+00:00',confirm_supplier:'yes',...values}))form.set(k,v);
 await assert.rejects(out.selectPurchaseRequestSupplier(request,form),/redirect/);return calls;
}
test('server entry refuses disabled capability, unauthorized roles, missing confirmation and malformed versions before RPC',async()=>{
 for(const options of [{installed:false},{role:'manager'},{permission:false},{values:{supplier_id:'invalid'}},{values:{expected_updated_at:'invalid'}},{values:{confirm_supplier:'no'}}])assert.equal((await actionCase(options)).filter(x=>x.name).length,0);
});
test('server entry sends only approved RPC arguments, preserves errors and never replays uncertain results',async()=>{
 const good=await actionCase();const rpc=good.filter(x=>x.name);assert.equal(rpc.length,1);assert.equal(rpc[0].name,'select_unassigned_purchase_request_supplier');assert.deepEqual(JSON.parse(JSON.stringify(rpc[0].args)),{target_request:request,target_supplier:supplier,expected_updated_at:'2026-10-27T00:00:00+00:00'});assert.equal(good.at(-1).kind,'success');
 for(const options of [{rpcError:{message:'The request changed. Reload before selecting a supplier.'}},{rpcData:null}]){const calls=await actionCase(options);assert.equal(calls.filter(x=>x.name).length,1);assert.equal(calls.at(-1).kind,'error');assert.equal(calls.filter(x=>x.revalidate).length,0);}
});
