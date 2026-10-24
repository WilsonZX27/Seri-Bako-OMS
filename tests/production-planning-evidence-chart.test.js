const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function render(history,selectedDate=null){let index=0,chart;const values=[history,false,'',0,'b','wastage',selectedDate];const ctx={exports:{},Map,Math,Array,require(name){
 if(name==='react')return {...React,useEffect:()=>{},useState:initial=>[values[index++]??initial,()=>{}]};
 if(name==='react/jsx-runtime')return require(name);
 if(name==='next/link')return {default:p=>React.createElement('a',p,p.children)};
 if(name.endsWith('/button'))return {Button:p=>React.createElement('button',p,p.children)};
 if(name.endsWith('/select-control'))return {SelectControl:require('./helpers/render-select-control.cjs')};
 if(name.endsWith('/interactive-line-chart'))return {InteractiveLineChart:p=>{chart=p;return React.createElement('svg',{'aria-label':p.ariaLabel});}};
 if(name.endsWith('/table'))return Object.fromEntries(['Table','TableHeader','TableBody','TableRow','TableHead','TableCell'].map((n,i)=>[n,p=>React.createElement(['table','thead','tbody','tr','th','td'][i],p,p.children)]));
 if(name.endsWith('/production-planning'))return {readPlanningHistory:()=>{throw Error('SSR must not fetch');}};
 if(name.endsWith('/utils'))return {formatNumber:x=>String(x),formatDateOnly:x=>x};
 if(name.endsWith('/business-date'))return {shiftBusinessDate:(day,n)=>{const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}};
 throw Error(name);
}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/production-planning-evidence.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,ctx);
const html=renderToStaticMarkup(React.createElement(ctx.exports.PlanningEvidence,{planId:'plan',productId:'p',date:'2026-10-07',kitchenId:'k',unit:'PCS',allocations:[{product_id:'p',branch_id:'b',suggested_qty:null,minimum_qty:0,evidence:{method:'manual',manualReason:'Multi-day',evidence:[]}}],outlets:[{id:'b',branch_name:'Gurney'}]}));return {html,chart};}
const row={branchId:'b',recordId:'r',date:'2026-10-05',received:16,leftover:0,wastage:0};
test('evidence chart preserves calendar gaps and explicit zero, scoped to selected outlet',()=>{const {html,chart}=render([row,{...row,branchId:'other',date:'2026-10-06',wastage:99}]);assert.equal(chart.points.length,56);assert.equal(chart.points[0].id,'2026-08-12');assert.equal(chart.points.at(-1).id,'2026-10-06');assert.equal(chart.points.find(p=>p.id==='2026-10-05').value,0);assert.equal(chart.points.at(-1).value,null);assert.equal(chart.tone,'danger');assert.match(html,/Manager quantity required/);assert.match(html,/All records · 1/);assert.ok(!html.includes('99'));assert.ok(!html.includes('<details open'));});
test('selecting an unknown day does not substitute the latest record',()=>{const {html}=render([row],'2026-10-06');assert.match(html,/2026-10-06 · No completed record/);assert.ok(!html.includes('2026-10-05 · Open record'));});
