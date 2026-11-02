const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const load=require('./helpers/load-source.cjs')();
function submit({configIds=null,selection,buffer=10}={}){
 const calls=[],tasks=[],exports={};let state=0;
 const react={useEffect(){},useState(initial){const index=state++,value=typeof initial==='function'?initial():initial;return [index===1&&selection!==undefined?selection:index===4?buffer:value,()=>{}];},useTransition(){return [false,fn=>tasks.push(fn())];}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/production-planning-setup.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require(name){
  if(name==='react')return react;
  if(name==='react/jsx-runtime')return require(name);
  if(name==='@/server/actions/production-planning')return {configurePlanning:async payload=>{calls.push(payload);return {ok:true};}};
  if(name.startsWith('@/lib/production-planning/'))return load('src/'+name.slice(2)+'.ts');
  return new Proxy({},{get:()=>()=>null});
 }});
 const product={id:'p',product_code:'F',product_name:'Food',category:'Food'};
 const tree=exports.PlanningSetup({kitchens:[],kitchenId:'k',date:'2026-11-03',outlets:[],products:[product,{...product,id:'event-only',product_code:'E',product_name:'Event only'}],config:{kitchen_id:'k',enabled:false,buffer_percent:10,max_decrease_percent:10,recipients:[],included_product_ids:configIds},batches:[{product_id:'p',yield_per_tray:1}],minimums:[],forecasts:[{branch_id:'o',product_id:'p',weekday_qty:3,weekend_qty:3,source:'test',updated_at:'2026-11-01T00:00:00Z'}],mode:'settings',onBusyChange(){},onDirtyChange(){},onResult(){}});
 tree.props.children.props.onSubmit({preventDefault(){}});
 return Promise.all(tasks).then(()=>calls[0]);
}
test('only changing buffer preserves null legacy inclusion and its confirmed event-only products',async()=>{
 const payload=await submit({buffer:12});assert.equal(payload.buffer_percent,12);assert.equal('included_product_ids' in payload,false);assert.equal('expected_included_product_ids' in payload,false);
});
test('an intentional product change submits selection and prior null token',async()=>{
 const payload=await submit({selection:['p','event-only']});assert.deepEqual(Array.from(payload.included_product_ids),['p','event-only']);assert.equal(payload.expected_included_product_ids,null);
});
test('unchanged explicit product set, regardless of order, keeps existing selection',async()=>{
 const payload=await submit({configIds:['event-only','p'],selection:['p','event-only']});assert.equal('included_product_ids' in payload,false);
});
