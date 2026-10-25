const test=require('node:test'),assert=require('node:assert/strict');
const {compile,React,renderToStaticMarkup}=require('./helpers/render-workspaces.cjs');
const model=require('./helpers/load-source.cjs')()('src/lib/asset-transfer-draft.ts');
const one='11111111-1111-4111-8111-111111111111',two='22222222-2222-4222-8222-222222222222',source='33333333-3333-4333-8333-333333333333',to='44444444-4444-4444-8444-444444444444';
function harness({pending=false,message='',ok=false,ready=true}={}){
 let draft;const focused=[];const wrap=tag=>p=>React.createElement(tag,p,p.children),Picker=()=>null;
 const {AssetTransferBatchForm}=compile('src/components/asset-transfer-batch-form.tsx',{
  react:{...React,useRef:()=>({current:{focus:()=>focused.push('search')}}),useActionState:()=>[{ok,message,requestId:ok?'synthetic-document':undefined},()=>{throw Error('No real submit')},pending]},
  'react-dom':{createPortal:child=>child},'lucide-react':{Plus:()=>null,X:()=>null},
  '@/server/actions/assets':{requestAssetTransferBatch:()=>{throw Error('No business action')}},
  '@/components/asset-draft-state':{useAssetDraftAction:()=>()=>{},useAssetDraftState:(_form,_revision,initial)=>{draft??=initial;return[draft,next=>{draft=typeof next==='function'?next(draft):next},false]}},
  '@/components/asset-unsaved-guard':{useAssetFormGuard:()=>{}},'@/components/asset-transfer-action-slots':{useAssetTransferActionSlots:()=>[]},
  '@/components/item-combobox':{ItemCombobox:Picker},'@/components/request-line-row':{RequestLineRow:wrap('div'),RequestLineHeader:wrap('div')},'@/components/ui/field':{Field:wrap('div')},
  '@/components/ui/button':{Button:wrap('button')},'@/components/ui/input':{Input:wrap('input')},'@/components/ui/select-control':{SelectControl:require('./helpers/render-select-control.cjs')},'@/components/ui/system-states':{Notice:wrap('div')},'@/lib/asset-transfer-draft':model
 });
 const props={locations:[{id:source,source_name:'Synthetic source'},{id:to,source_name:'Synthetic destination'}],choices:[{id:one,asset_code:'SYN-1',item_name:'Synthetic mixer',holdings:{[source]:4}},{id:two,asset_code:'SYN-2',item_name:'Synthetic scale',holdings:{[source]:2}}],requestKey:'synthetic-key',today:'2026-10-24',canSubmit:ready};
 const tree=()=>AssetTransferBatchForm(props);
 function nodes(node,match){if(!node)return[];if(Array.isArray(node))return node.flatMap(x=>nodes(x,match));if(!React.isValidElement(node))return[];return[...(match(node)?[node]:[]),...nodes(node.props.children,match)];}
 return {tree,nodes,focused,get draft(){return draft},picker:()=>nodes(tree(),n=>n.type===Picker)[0],change:(name,value)=>nodes(tree(),n=>n.props.name===name)[0].props.onChange({target:{value}}),html:()=>renderToStaticMarkup(tree())};
}
test('request details are editable before any selection even when backend submission is unavailable',()=>{
 const h=harness({ready:false});const tree=h.tree();assert.equal(h.nodes(tree,n=>n.type==='fieldset')[0].props.disabled,false);h.change('reason','Move together');assert.equal(h.draft.reason,'Move together');
 assert.equal(h.nodes(h.tree(),n=>n.props.type==='submit')[0].props.disabled,true);assert.match(h.html(),/Multi-asset submission is not enabled/);assert.match(h.html(),/Request details/);assert.match(h.html(),/Requested assets/);
});
test('shared multi-picker adds directly, retains details and quantities through search, and removes only one selected line',()=>{
 const h=harness();h.tree();h.change('reason','Synthetic relocation');h.picker().props.onSelect({id:one});h.picker().props.onSelect({id:two});h.change('quantity_'+one,'3');h.picker().props.onValueChange('scale');
 assert.deepEqual(Object.keys(h.draft.selected),[one,two]);assert.equal(h.draft.selected[one],'3');assert.equal(h.draft.reason,'Synthetic relocation');assert.equal(h.draft.query,'scale');
 const node=h.nodes(h.tree(),n=>n.props['aria-label']==='Remove Synthetic scale')[0];
 const form={ownerDocument:{defaultView:{requestAnimationFrame:fn=>fn()}},querySelector:selector=>({focus:()=>h.focused.push(selector)})};
 node.props.onClick({currentTarget:{form}});
 assert.equal(h.focused[0],`input[name="quantity_${one}"]`);
 assert.equal(h.draft.selected[one],'3');assert.equal(Object.hasOwn(h.draft.selected,two),false);assert.equal(h.nodes(h.tree(),n=>n.props.name==='client_key')[0].props.value,'synthetic-key');
});
test('pending and uncertain outcomes keep the request, disable only pending edits and never display false success',()=>{
 const h=harness({pending:true,message:'Synthetic result not confirmed'});assert.equal(h.nodes(h.tree(),n=>n.type==='fieldset')[0].props.disabled,true);assert.match(h.html(),/role="alert"/);assert.doesNotMatch(h.html(),/Open transfer/);
 assert.match(harness({ok:true}).html(),/\/asset-management\/transfers\/synthetic-document/);
});
test('draft validation retains selection across source changes but rejects missing holdings, bad dates, quantities and duplicate destinations',()=>{
 const choices=[{id:one,asset_code:'SYN-1',item_name:'Synthetic mixer',holdings:{[source]:4}}],locations=[{id:source},{id:to}];
 const draft={from:source,to,date:'2026-10-24',reason:'Synthetic relocation',query:'mixer',selected:{[one]:'3'}};
 assert.equal(model.transferDraftError(draft,choices,locations),'');assert.equal(model.validTransferDraft(draft),true);
 for(const change of [{from:to,to:source},{to:source},{date:'2026-02-30'},{reason:''},{selected:{[one]:''}},{selected:{[one]:'1.5'}},{selected:{[one]:'5'}}])assert.ok(model.transferDraftError({...draft,...change},choices,locations));
 assert.equal(draft.selected[one],'3');assert.equal(model.validTransferDraft({...draft,selected:{bad:1}}),false);
});
test('multi-select limit and removal never replace existing quantities or silently clear other lines',()=>{
 const selected=Object.fromEntries(Array.from({length:100},(_,i)=>['asset-'+i,String(i+1)]));
 assert.equal(Object.keys(model.toggleTransferAsset(selected,'extra')).length,100);
 const removed=model.toggleTransferAsset(selected,'asset-50');assert.equal(Object.keys(removed).length,99);assert.equal(removed['asset-49'],'50');assert.equal(selected['asset-50'],'51');
});
