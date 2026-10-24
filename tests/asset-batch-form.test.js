const test=require('node:test'),assert=require('node:assert/strict');
const {compile,React,renderToStaticMarkup}=require('./helpers/render-workspaces.cjs');
function harness({pending=false,message='',ok=false}={}){
 const values=[];let cursor=0;const wrap=tag=>p=>React.createElement(tag,p,p.children);
 const {AssetTransferBatchForm}=compile('src/components/asset-transfer-batch-form.tsx',{
 'react':{...React,useState:initial=>{const index=cursor++;if(!(index in values))values[index]=initial;return [values[index],next=>{values[index]=typeof next==='function'?next(values[index]):next}];},useActionState:()=>[{ok,message,requestId:ok?'synthetic-document':undefined},()=>{throw Error('No real submit')},pending]},
 '@/server/actions/assets':{requestAssetTransferBatch:()=>{throw Error('No business action')}},'@/components/asset-draft-state':{useAssetDraftAction:()=>()=>{}},'@/components/asset-unsaved-guard':{useAssetFormGuard:()=>{}},'@/components/ui/button':{Button:wrap('button')},'@/components/ui/input':{Input:wrap('input')},'@/components/ui/select-control':{SelectControl:require('./helpers/render-select-control.cjs')}
 });const props={source:'source',locations:[{id:'source',source_name:'Synthetic source'},{id:'to',source_name:'Synthetic destination'}],choices:[{id:'one',asset_code:'SYN-1',item_name:'Synthetic mixer',quantity:4},{id:'two',asset_code:'SYN-2',item_name:'Synthetic scale',quantity:2}],requestKey:'synthetic-key',today:'2026-10-24'};
 function tree(){cursor=0;return AssetTransferBatchForm(props)}
 function nodes(node,match){if(!node)return [];if(Array.isArray(node))return node.flatMap(x=>nodes(x,match));if(!React.isValidElement(node))return [];return [...(match(node)?[node]:[]),...nodes(node.props.children,match)];}
 return {tree,nodes,html:()=>renderToStaticMarkup(tree())};
}
test('actual batch form retains selected payload while searching and changing quantities, then removes only requested item',()=>{
 const h=harness();let t=h.tree();const checks=h.nodes(t,n=>n.props.type==='checkbox');assert.equal(checks.length,2);checks[0].props.onChange({target:{checked:true}});t=h.tree();assert.equal(h.nodes(t,n=>n.props.name==='asset_id')[0].props.value,'one');
 h.nodes(t,n=>n.props.type==='search')[0].props.onChange({target:{value:'scale'}});t=h.tree();assert.equal(h.nodes(t,n=>n.props.type==='checkbox').length,1);assert.equal(h.nodes(t,n=>n.props.name==='asset_id')[0].props.value,'one');
 const quantity=h.nodes(t,n=>n.props.name==='quantity_one')[0];assert.equal(quantity.props.max,4);assert.equal(quantity.props.min,'1');quantity.props.onChange({target:{value:'3'}});t=h.tree();assert.equal(h.nodes(t,n=>n.props.name==='quantity_one')[0].props.value,'3');assert.equal(h.nodes(t,n=>n.props.name==='client_key')[0].props.value,'synthetic-key');
 h.nodes(t,n=>n.props['aria-label']==='Remove Synthetic mixer')[0].props.onClick({currentTarget:{form:null}});assert.equal(h.nodes(h.tree(),n=>n.props.name==='asset_id').length,0);
});
test('request details and assets list preserve clear labels, single search, pending lock and unconfirmed error',()=>{
 const h=harness({pending:true,message:'Synthetic result not confirmed'}),html=h.html();assert.match(html,/Request details/);assert.match(html,/Assets list/);assert.equal((html.match(/type="search"/g)||[]).length,1);assert.match(html,/<fieldset disabled=""/);assert.match(html,/role="alert"/);assert.doesNotMatch(html,/Open transfer/);assert.match(html,/Synthetic result not confirmed/);
 const saved=harness({ok:true});assert.match(saved.html(),/href="\/asset-management\/transfers\/synthetic-document"/);
});

test('removal restores focus to adjacent selected quantity, then removed choice or search fallback',()=>{
 const h=harness();let t=h.tree();const checks=h.nodes(t,n=>n.props.type==='checkbox');checks[0].props.onChange({target:{checked:true}});checks[1].props.onChange({target:{checked:true}});
 const focused=[];const form={ownerDocument:{defaultView:{requestAnimationFrame:cb=>cb()}},querySelector:selector=>({focus:()=>focused.push(selector)})};
 t=h.tree();h.nodes(t,n=>n.props['aria-label']==='Remove Synthetic mixer')[0].props.onClick({currentTarget:{form}});
 assert.equal(focused[0],'input[name="quantity_two"]');
 t=h.tree();h.nodes(t,n=>n.props['aria-label']==='Remove Synthetic scale')[0].props.onClick({currentTarget:{form}});
 assert.equal(focused[1],'input[data-asset-choice="two"]');assert.equal(h.nodes(h.tree(),n=>n.props.name==='asset_id').length,0);
 const last=harness();t=last.tree();last.nodes(t,n=>n.props.type==='checkbox')[0].props.onChange({target:{checked:true}});
 const fallback={ownerDocument:form.ownerDocument,querySelector:selector=>selector==='input[type="search"]'?{focus:()=>focused.push('search')}:null};
 last.nodes(last.tree(),n=>n.props['aria-label']==='Remove Synthetic mixer')[0].props.onClick({currentTarget:{form:fallback}});assert.equal(focused[2],'search');
});

test('removing last selected row restores previous quantity without changing its value',()=>{
 const h=harness();let t=h.tree();const checks=h.nodes(t,n=>n.props.type==='checkbox');checks[0].props.onChange({target:{checked:true}});checks[1].props.onChange({target:{checked:true}});
 t=h.tree();h.nodes(t,n=>n.props.name==='quantity_one')[0].props.onChange({target:{value:'2'}});
 let focused='';const form={ownerDocument:{defaultView:{requestAnimationFrame:cb=>cb()}},querySelector:selector=>({focus:()=>focused=selector})};
 h.nodes(h.tree(),n=>n.props['aria-label']==='Remove Synthetic scale')[0].props.onClick({currentTarget:{form}});
 assert.equal(focused,'input[name="quantity_one"]');assert.equal(h.nodes(h.tree(),n=>n.props.name==='quantity_one')[0].props.value,'2');
});
