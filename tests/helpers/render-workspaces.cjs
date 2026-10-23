// Actual source execution with synthetic query inputs and inert shell wrappers.
// Does not test CSS, browser focus, auth/RLS or execute server queries/actions.
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const load=require('./load-source.cjs')();
const utils=load('src/lib/utils.ts');
const status=load('src/components/ui/status-badge.tsx');
const wrapper=({children})=>React.createElement('div',null,children);
function compile(file, overrides={}) {
 const result={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports:result,URLSearchParams,require(name){
  if(name in overrides)return overrides[name];
  if(name==='next/link')return {__esModule:true,default:({prefetch,children,...props})=>React.createElement('a',props,children)};
  if(name==='@/lib/utils')return utils;
  if(name==='@/components/ui/status-badge')return status;
  if(name==='@/components/layout/workspace-layout')return {WorkspaceGrid:({children,rightRail})=>React.createElement('main',null,children,React.createElement('aside',null,rightRail))};
  if(name==='@/components/layout/right-console')return {ConsoleSection:({title,children})=>React.createElement('section',null,React.createElement('h2',null,title),children)};
  if(name==='@/components/ui/button')return {Button:({children})=>React.createElement(React.Fragment,null,children)};
  if(name==='@/components/operational-hub')return {OperationalHub:({queue=[],tools=[],primaryAction})=>React.createElement('nav',null,[...queue,...tools,...(primaryAction?[primaryAction]:[])].map((x,i)=>React.createElement('a',{key:i,href:x.href},x.title??x.label)))};
  if(name==='@/components/ui/page-header')return {PageHeader:({title})=>React.createElement('h1',null,title)};
  if(name==='@/components/ui/card')return {Card:wrapper,CardContent:wrapper};
  if(name==='@/components/ui/select-native')return {SelectNative:wrapper};
  if(name==='@/components/reports/inventory-daily-movement-chart')return {InventoryDailyMovementChart:()=>null};
  if(['react/jsx-runtime','react','lucide-react'].includes(name))return require(name);
  throw Error(`Unmocked dependency ${name}`);
 }},{filename:file});
 return result;
}
const roles=['super_admin','people_operations','finance','manager','purchasing','chef','kitchen','outlet_supervisor','outlet_staff'];
function summary(role,patch={}){return {role,userName:'Fixture user',roleLabel:role,branchLabel:'Fixture branch',attentionSummary:{state:'ready',unavailableSources:[],sources:{pending_approvals:2,stock_count_due:0,overdue_payables:3}},lowStockCount:0,pendingApprovals:[],upcomingShifts:[],purchaseOrders:[],urgentRequests:[],today:{goodsReceiving:0},financeForecast:{receivingNotInvoiced:0},wastageAttention:0,wastageTrend:[],payablesAttention:{overdue_amount:12,critical_amount:0,overdue_count:1,missing_due_date_count:0,due_today_amount:0,due_next_7_amount:0},...patch};}
const Dashboard=compile('src/components/dashboard-workspace.tsx').DashboardWorkspace;
module.exports={compile,roles,summary,renderDashboard:(role,patch)=>renderToStaticMarkup(React.createElement(Dashboard,{summary:summary(role,patch)})),renderToStaticMarkup,React};
