// Executes the actual page orchestration, query functions and aggregation.
// Only the Supabase transport/options/auth boundary is synthetic; no service/RLS claim.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const load=require('./helpers/load-source.cjs')({URLSearchParams});
const period=load('src/lib/outlet-insight-period.ts');
const {readCompletePages}=load('src/server/queries/read-complete-pages.ts');
const {OutletDailyWastageChart}=load('src/components/outlet-daily-wastage-chart.tsx');
const {OutletDailyInsightMetrics}=load('src/components/outlet-daily-insight-metrics.tsx');
function compile(source,globals){const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,URLSearchParams,...globals});return exports;}
function selectedSource(file,names){const text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);return ast.statements.filter(s=>names.includes(s.name?.text)||(ts.isVariableStatement(s)&&s.declarationList.declarations.some(d=>names.includes(d.name.text)))).map(s=>s.getFullText(ast)).join('\n');}

test('month UI with period=7 drives30-day queries, prior30-day comparison, totals and all chart/table rows',async()=>{
 const records=Array.from({length:62},(_,i)=>({id:`r${i}`,branch_id:'outlet',record_date:new Date(Date.UTC(2026,8,3+i)).toISOString().slice(0,10),status:'evening_completed'}));
 const lines=records.map(r=>({id:`l${r.id}`,record_id:r.id,product_id:'food',morning_received_qty:r.record_date<'2026-10-04'?50:100,morning_received_provided:true,evening_leftover_qty:0,wastage_qty:r.record_date<'2026-10-04'?5:20,daily_tracking:'food_daily'}));
 const transport=[];
 const db={from(table){const predicates=[],trace={table};return {select(){return this},gte(k,v){trace.start=v;predicates.push(r=>r[k]>=v);return this},lte(k,v){trace.end=v;predicates.push(r=>r[k]<=v);return this},eq(k,v){predicates.push(r=>r[k]===v);return this},in(k,v){trace.ids=[...v];predicates.push(r=>v.includes(r[k]));return this},order(){return this},async range(from,to){const data=(table==='outlet_daily_records'?records:lines).filter(r=>predicates.every(p=>p(r)));transport.push(trace);return {data:data.slice(from,to+1),count:data.length,error:null};}};}};
 const options={branches:[{id:'outlet',branch_name:'Fixture outlet'}],products:[{id:'food',product_name:'Food',category:'Food'}]};
 const names=['getOutletDailyDemandTrend','buildDemandTrend','trendDateRange','receivedValueIsTrusted','isPackagingCategory','emptyTrendTotals','addTrendLine','wastagePercent'];
 const query=compile(selectedSource('src/server/queries/outlet-daily-records.ts',names),{...period,readCompletePages,getOutletDailyFormOptions:async()=>options,isMockMode:()=>false,createClient:async()=>db,hasPermission:async()=>true,todayInKualaLumpur:()=> '2026-11-02'});
 const calls=[];
 const sources={getOutletDailyFormOptions:async()=>options,getOutletDailyDemandTrend:async f=>{calls.push({...f});return query.getOutletDailyDemandTrend(f);},getOutletDailyHistoricalContext:async()=>null,getOutletDailyWastageCostSummary:async()=>{throw Error('No cost access in this fixture');}};
 const components={};const component=name=>components[name]??=(props=>React.createElement('div',{'data-component':name},props.children));
 const page=compile(fs.readFileSync('src/app/(app)/outlet-daily-records/insights/page.tsx','utf8'),{require(name){
  if(name==='react/jsx-runtime')return require(name);
  if(name==='@/lib/outlet-insight-period')return period;
  if(name==='@/lib/production-planning/forecast')return load('src/lib/production-planning/forecast.ts');
  if(name==='@/server/queries/outlet-daily-records')return sources;
  if(name==='@/server/auth/permissions')return {hasPermission:async()=>false};
  if(name==='@/lib/business-date')return {todayInKualaLumpur:()=> '2026-11-02'};
  if(name==='@/lib/utils')return load('src/lib/utils.ts');
  if(name==='@/server/observability/logger')return {logServerError:e=>{throw e;}};
  if(name==='@/components/outlet-daily-wastage-chart')return {OutletDailyWastageChart};
  if(name==='@/components/outlet-daily-insight-metrics')return {OutletDailyInsightMetrics};
  return new Proxy({}, {get:(_t,key)=>component(key)});
 }}).default;
 const tree=await page({searchParams:Promise.resolve({history_start:'2026-10-04',history_date:'2026-11-02',period:'7',compare:'previous',branch:'outlet',report:'trend'})});
 assert.equal(calls.length,2);
 assert.deepEqual(calls.map(c=>[c.period,c.history_start,c.history_date]),[['7','2026-10-04','2026-11-02'],['7','2026-09-04','2026-10-03']]);
 assert.deepEqual(transport.filter(t=>t.table==='outlet_daily_records').map(t=>[t.start,t.end]),[['2026-10-04','2026-11-02'],['2026-09-04','2026-10-03']]);
 for(const read of transport.filter(t=>t.table==='outlet_daily_record_lines'))assert.equal(read.ids.length,30);
 const found=[];function walk(n){if(!React.isValidElement(n))return;found.push(n);React.Children.forEach(n.props.children,walk);}walk(tree);
 const metrics=found.find(n=>n.type===OutletDailyInsightMetrics),chart=found.find(n=>n.type===OutletDailyWastageChart);
 assert.equal(metrics.props.trend.summary.received,3000);assert.equal(metrics.props.trend.summary.wastage,600);assert.equal(metrics.props.previous.summary.received,1500);assert.equal(metrics.props.previous.summary.wastage,150);
 assert.equal(metrics.props.trend.coverage.expected,30);assert.equal(metrics.props.previous.coverage.expected,30);
 assert.equal(chart.props.points,metrics.props.trend.daily);assert.equal(chart.props.points.length,30);assert.equal(chart.props.points[0].name,'2026-10-04');assert.equal(chart.props.points.at(-1).name,'2026-11-02');
 const chartHtml=renderToStaticMarkup(chart);assert.match(chartHtml,/30 recorded days/);assert.match(chartHtml,/>20%<\/strong>/);assert.match(chartHtml,/date=2026-10-04/);assert.match(chartHtml,/date=2026-11-02/);assert.doesNotMatch(chartHtml,/7-day/);
 const metricHtml=renderToStaticMarkup(metrics);assert.match(metricHtml,/Previous 1,500/);assert.match(metricHtml,/\+10 pp/);
 const picker=found.find(n=>n.type===components.DateRangePicker);assert.equal(picker.props.start,'2026-10-04');assert.equal(picker.props.end,'2026-11-02');
 const tabs=found.find(n=>n.type===components.WorkspaceTabs);for(const tab of tabs.props.items){const q=new URL(tab.href,'https://fixture.invalid').searchParams;assert.equal(q.get('history_start'),'2026-10-04');assert.equal(q.get('history_date'),'2026-11-02');}
});
