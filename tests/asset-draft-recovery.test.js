const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const context={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/asset-draft.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);const api=context.exports;
const storage=()=>{const rows=new Map();return {get length(){return rows.size},key:i=>[...rows.keys()][i]??null,getItem:key=>rows.get(key)??null,setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key)}};
const valid=v=>typeof v==='string';
test('draft recovery isolates actor/company, route, revision and expiry; explicit discard retains other routes',()=>{
 const s=storage(),now=100000;
 assert.equal(api.writeAssetDraft(s,'company:a','/assets/new:master','v1','unsaved',now),true);
 assert.equal(api.readAssetDraft(s,'company:a','/assets/new:master','v1',valid,now+1),'unsaved');
 assert.equal(api.readAssetDraft(s,'company:b','/assets/new:master','v1',valid,now+1),undefined);
 api.writeAssetDraft(s,'company:a','/assets/other:master','v1','other',now);
 api.clearAssetRouteDrafts(s,'company:a','/assets/new');
 assert.equal(api.readAssetDraft(s,'company:a','/assets/new:master','v1',valid,now+1),undefined);
 assert.equal(api.readAssetDraft(s,'company:a','/assets/other:master','v1',valid,now+1),'other');
 assert.equal(api.readAssetDraft(s,'company:a','/assets/other:master','v2',valid,now+1),undefined);
 api.writeAssetDraft(s,'company:a','form','v1','expired',now);
 assert.equal(api.readAssetDraft(s,'company:a','form','v1',valid,now+4*60*60*1000),undefined);
 api.writeAssetDraft(s,'company:a','form','v1','private',now);
 api.isolateAssetDrafts(s,'company:b',now+1);assert.equal(s.length,0);
});
test('draft malformed data and unavailable or full storage do not prevent normal editing',()=>{
 const s=storage();s.setItem(api.assetDraftKey('a','form'),'bad json');assert.equal(api.readAssetDraft(s,'a','form','v1',valid),undefined);
 api.writeAssetDraft(s,'a','form','v1',{unexpected:true});assert.equal(api.readAssetDraft(s,'a','form','v1',valid),undefined);
 assert.equal(api.writeAssetDraft(s,'a','form','v1','x'.repeat(250000)),false);
 const unavailable={getItem(){throw Error('Disabled')},setItem(){throw Error('Quota')},removeItem(){throw Error('Disabled')}};
 assert.equal(api.writeAssetDraft(unavailable,'a','form','v1','input'),false);assert.equal(api.readAssetDraft(unavailable,'a','form','v1',valid),undefined);
});
test('successful server action clears its draft before remount; failed actions retain inputs',async()=>{
 const s=storage(),scope='company:staff:auth',pathname='/assets/one',notices=[];
 const module={exports:{},window:{sessionStorage:s},require:name=>{
  if(name==='react')return {createContext:()=>({}),useContext:()=>scope,useCallback:callback=>callback,useRef:value=>({current:value})};
  if(name==='next/navigation')return {usePathname:()=>pathname};
  if(name==='@/lib/asset-draft')return api;
  if(name==='@/components/asset-action-feedback')return {useAssetFeedback:()=>notice=>notices.push(notice)};
  throw Error(name);
 }};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/asset-draft-state.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,module);
 const form='maintenance-update:one',key=`${pathname}:${form}`;
 api.writeAssetDraft(s,scope,key,'Open','note');
 const failed=module.exports.useAssetDraftAction(form,async()=>({ok:false,message:'retry'}));
 assert.equal((await failed({},{})).ok,false);assert.equal(api.readAssetDraft(s,scope,key,'Open',valid),'note');
 let attempts=0;const received=[],original={requestKey:'same-request',note:'original note'};
 const retry=module.exports.useAssetDraftAction(form,async(_,data)=>{received.push(data);if(attempts++===0)throw Error('Network');return {ok:true,message:'confirmed'};});
 const unknown=await retry({},original);
 assert.equal(unknown.ok,false);assert.match(unknown.message,/Could not confirm the result/);
 assert.equal(api.readAssetDraft(s,scope,key,'Open',valid),'note');
 assert.equal(notices.at(-1).tone,'error');assert.equal(notices.at(-1).message,unknown.message);
 assert.equal((await retry(unknown,{requestKey:'new-request',note:'edited'})).ok,true);
 assert.equal(received[0],original);assert.equal(received[1],original);
 assert.equal(api.readAssetDraft(s,scope,key,'Open',valid),undefined);
 assert.equal(notices.at(-1).tone,'success');assert.equal(notices.at(-1).message,'confirmed');
 api.writeAssetDraft(s,scope,key,'Open','note');
 api.writeAssetDraft(s,scope,'/assets/other:maintenance-update:one','Open','other');
 const success=module.exports.useAssetDraftAction(form,async()=>({ok:true,message:'saved'}));assert.equal((await success({},{})).ok,true);
 assert.equal(api.readAssetDraft(s,scope,key,'Open',valid),undefined);assert.equal(api.readAssetDraft(s,scope,'/assets/other:maintenance-update:one','Open',valid),'other');
});
test('inspection recovery validates date, current assets, unique selections, unknown versus zero and result fields',()=>{
 const id='00000000-0000-4000-8000-000000000040',today='2026-10-08';
 const draft={checkDate:today,selected:[id],fields:{[`quantity_${id}`]:'0',[`result_${id}`]:'Damaged',[`remark_${id}`]:'Review count'}};
 assert.equal(api.isAssetChecklistDraft(draft,[id],today),true);
 assert.equal(api.isAssetChecklistDraft({...draft,fields:{[`quantity_${id}`]:''}},[id],today),true);
 for(const bad of [
 {...draft,checkDate:'2026-02-30'}, {...draft,checkDate:'2026-10-09'},
 {...draft,selected:[id,id]}, {...draft,selected:['inaccessible']},
 {...draft,fields:{'remark_inaccessible':'private'}}, {...draft,fields:{[`result_${id}`]:'Invented'}},
 {...draft,fields:{[`quantity_${id}`]:'-1'}}, {...draft,fields:{[`quantity_${id}`]:'1.5'}},
 {...draft,fields:[]}, {...draft,fields:{[`remark_${id}`]:'x'.repeat(4001)}}
 ])assert.equal(api.isAssetChecklistDraft(bad,[id],today),false);
 assert.equal(api.isAssetChecklistDraft(draft,[],today),false);
});
test('disabled draft storage reports failure while the actual input hook keeps editing usable',()=>{
 let savedInput,contextId=0;const reports=[];
 const scopeContext={};
 const module={exports:{},window:{sessionStorage:{getItem:()=>null,setItem(){throw Error('Quota')},removeItem(){}}},require:name=>{
  if(name==='react')return {createContext:()=>contextId++===0?scopeContext:{},useContext:ctx=>ctx===scopeContext?'company:actor':(form,unavailable)=>reports.push([form,unavailable]),useRef:value=>({current:value}),useState:initial=>[initial,value=>{savedInput=value}],useEffect:effect=>effect(),useCallback:callback=>callback};
  if(name==='next/navigation')return {usePathname:()=>'/asset-management/assets/new'};
  if(name==='@/lib/asset-draft')return api;
  if(name==='@/components/asset-action-feedback')return {useAssetFeedback:()=>null};
  throw Error(name);
 }};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/asset-draft-state.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,module);
 const [,update]=module.exports.useAssetDraftState('master:new','v1','',valid,false);
 assert.doesNotThrow(()=>update('still editable'));assert.equal(savedInput,'still editable');
 assert.deepEqual(reports,[['/asset-management/assets/new:master:new',true]]);
});
