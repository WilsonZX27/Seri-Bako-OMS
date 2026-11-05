const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const sourceLoad=require('./helpers/load-source.cjs')();
const basis=sourceLoad('src/lib/daily-quantity-basis.ts');
const wrapper=({children,rightRail})=>React.createElement(React.Fragment,null,children,rightRail);
function load(file,stubs={},suffix=''){
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8')+suffix,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,URLSearchParams,console,require(n){
 if(n in stubs)return stubs[n];if(n==='@/lib/daily-quantity-basis')return basis;
 if(n==='@/lib/utils')return {formatNumber:String};if(n==='@/lib/table-state')return {hasActiveFilters:()=>false};
 if(n==='@/server/observability/logger')return {logServerError(){}};
 if(n.startsWith('@/components/'))return new Proxy({},{get:(_,key)=>key==='MetricStrip'?({items})=>React.createElement('div',null,items.map(x=>`${x.label}: ${x.value}`).join('|')):key.endsWith('Chart')?()=>React.createElement('div',{'data-test-chart':key}):wrapper});
 if(n==='next/link')return {default:wrapper};if(n==='react'||n==='react/jsx-runtime'||n==='lucide-react')return require(n);return {};
 }});return exports;
}
const query=load('src/server/queries/outlet-daily-records.ts',{},'\nexport { buildDemandTrend, buildProductionDemandVariance };');
function fixture(verified=false){
 const records=[{id:'r',branch_id:'b',record_date:'2026-11-05',status:'reviewed'}];
 const lines=['p','q'].map((product_id,i)=>({record_id:'r',product_id,daily_tracking:'food_daily',morning_received_qty:100+i,morning_received_provided:true,evening_leftover_qty:30,wastage_qty:15,...(verified?{quantity_unit_snapshot:i?'LITRE':'KG',quantity_unit_verified:true}:{})}));
 return {records,lines,branches:[{id:'b',branch_name:'Outlet'}],products:[{id:'p',product_name:'Flour',category:'Food',selling_unit:'KG'},{id:'q',product_name:'Drink',category:'Food',selling_unit:'LITRE'}],start:'2026-11-05',end:'2026-11-05',period:'7',status:'all'};
}
test('per-product/outlet basis ignores current catalogue and unverified historical rows require manual review',()=>{
 const trend=query.buildDemandTrend(fixture());assert.equal(trend.quantity_totals_available,false);
 const variance=query.buildProductionDemandVariance({...trend,coverage:{...trend.coverage,confidence:'High'},product_outlets:trend.product_outlets.map(x=>({...x,low_sample:false}))});
 assert.equal(variance.variance.summary.high_wastage,null);assert.equal(variance.variance.summary.over_supplied,null);assert.equal(variance.variance.summary.low_confidence,2);
 assert.ok(variance.variance.all_rows.every(x=>!x.quantity_totals_available&&x.quantity_unit===null&&x.variance_signal==='review_manual'));
});
test('verified per-group units stay separate even when whole-report units are mixed',()=>{
 const trend=query.buildDemandTrend(fixture(true));assert.equal(trend.quantity_totals_available,false);
 assert.deepEqual(Array.from(trend.product_outlets,x=>x.quantity_unit).sort(),['KG','LITRE']);
 assert.ok(trend.product_outlets.every(x=>x.quantity_totals_available));
});
test('zero received never produces balanced automatic supply classification',()=>{
 const trend=query.buildDemandTrend(fixture(true));const row={...trend.product_outlets[0],received:0,movement:0,leftover:0,wastage_percent:0,low_sample:false};
 const report=query.buildProductionDemandVariance({...trend,coverage:{...trend.coverage,confidence:'High'},product_outlets:[row]});assert.equal(report.variance.rows[0].variance_signal,'review_manual');
});
async function renderPage(file,report,name){return renderToStaticMarkup(await load(file,{'@/server/queries/outlet-daily-records':{[name]:async()=>report}}).default({searchParams:Promise.resolve({})}));}
test('Demand Trends hides legacy numbers, plots and rankings while retaining coverage and filters',async()=>{
 const trend=query.buildDemandTrend(fixture());trend.summary.received=987654;
 const html=await renderPage('src/app/(app)/reports/demand-trends/page.tsx',trend,'getOutletDailyDemandTrend');
 assert.match(html,/Quantity trends unavailable/);assert.match(html,/Completed outlet-days/);assert.match(html,/Filter/);assert.doesNotMatch(html,/987654|data-test-chart/);
});
test('even verified mixed product population is not quantity-ranked; selected verified product has labelled unit',async()=>{
 const trend=query.buildDemandTrend({...fixture(true),productId:'p'});
 const all=await renderPage('src/app/(app)/reports/demand-trends/page.tsx',{...trend,filters:{...trend.filters,product:'all'}},'getOutletDailyDemandTrend');assert.match(all,/Quantity trends unavailable/);
 const one=await renderPage('src/app/(app)/reports/demand-trends/page.tsx',trend,'getOutletDailyDemandTrend');assert.match(one,/Quantities in KG/);assert.match(one,/data-test-chart/);
});
test('Variance desktop/mobile suppress unknown quantities and signals rather than showing balanced or zero',async()=>{
 const trend=query.buildDemandTrend(fixture());const report=query.buildProductionDemandVariance(trend);
 report.variance.rows=report.variance.rows.map(x=>({...x,received:987654,variance_signal:'balanced'}));
 const html=await renderPage('src/app/(app)/production/variance/page.tsx',report,'getProductionDemandVariance');
 assert.match(html,/Supply signals unavailable/);assert.match(html,/Review manually/);assert.match(html,/Unavailable/);assert.doesNotMatch(html,/987654|>Balanced<|data-test-chart/);
});
test('Dashboard projection returns null for missing or unverified basis, not an empty no-activity result',()=>{
 const source=fs.readFileSync('src/server/queries/dashboard.ts','utf8');const expression=source.match(/wastageTrend: (wastageTrend\?\.quantity_totals_available[^\n]+),/)[1];
 for(const trend of [null,{daily:[{name:'d',wastage_percent:99}]},{quantity_totals_available:false,quantity_unit:'KG',daily:[]}])assert.equal(vm.runInNewContext(expression,{wastageTrend:trend}),null);
 const points=vm.runInNewContext(expression,{wastageTrend:{quantity_totals_available:true,quantity_unit:'KG',daily:[{name:'d',wastage_percent:5}]}});assert.equal(points[0].rate,5);
});
test('Dashboard null-state text says unavailable instead of claiming no records',()=>{
 const source=fs.readFileSync('src/components/dashboard-workspace.tsx','utf8');const card=source.slice(source.indexOf('function WastageTrendCard'),source.indexOf('export function DashboardWorkspace'));
 const exports={};vm.runInNewContext(ts.transpileModule(card+';exports.Card=WastageTrendCard;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require,Panel:wrapper,Link:wrapper});
 const html=renderToStaticMarkup(React.createElement(exports.Card,{points:null}));assert.match(html,/Wastage rate unavailable/);assert.doesNotMatch(html,/No completed|<svg/);
});
