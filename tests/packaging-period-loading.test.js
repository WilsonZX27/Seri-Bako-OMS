const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const source=fs.readFileSync('src/app/(app)/outlet-packaging/page.tsx','utf8');const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const reportNode=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='Report');
test('the actual server report reads only the selected period once and preserves client filter identity',async()=>{
 const calls=[];const context={exports:{},require, getOutletPackagingReport:async days=>{calls.push(days);return {rows:[]};},OutletPackagingReport:()=>null};vm.runInNewContext(compile(reportNode.getText(ast)),context);
 for(const days of [7,30]){const element=await context.Report({days});assert.equal(element.props.days,days);assert.equal(element.key,null);}
 assert.deepEqual(calls,[7,30]);
});
test('a failed period read offers the shared retry action and never renders unverified report data',async()=>{
 const failure=new Error('Database unavailable');const logged=[];const context={exports:{},require,getOutletPackagingReport:async()=>{throw failure;},logServerError:e=>logged.push(e),WorkspaceGrid:()=>null,ErrorState:()=>null,RetryButton:()=>null};vm.runInNewContext(compile(reportNode.getText(ast)),context);
 const element=await context.Report({days:30});const errorState=element.props.children;assert.equal(errorState.type,context.ErrorState);assert.equal(errorState.props.action.type,context.RetryButton);assert.equal(logged[0],failure);assert.ok(!errorState.props.description.includes('Database'));
});
const report={today:'2026-10-04',products:[{id:'p',code:'PKG1',name:'Box',unit:'PCS'}],outlets:[{id:'b',name:'A'}],rows:[{id:'r',date:'2026-10-01',code:'PKG1',branchId:'b',branch:'A',usage:0,unit:'PCS'}],latest:[{id:'r',date:'2026-10-01',code:'PKG1',branchId:'b',branch:'A',closing:0,unit:'PCS'}]};
function render(pending){const navigations=[];let period;const context={exports:{},URL,window:{location:{href:'https://system.seribako.com.my/outlet-packaging?keep=1'}},require:n=>{
 if(n==='react')return {...React,useTransition:()=>[pending,work=>work()]};if(n==='react/jsx-runtime')return require(n);
 if(n==='next/navigation')return {useRouter:()=>({replace:(...args)=>navigations.push(args)})};if(n==='next/link')return {__esModule:true,default:p=>React.createElement('a',p,p.children)};
 if(n.endsWith('/workspace-layout'))return {WorkspaceGrid:p=>React.createElement('main',null,p.children,p.rightRail)};
 if(n.endsWith('/right-console'))return {ConsoleSection:p=>React.createElement('section',null,p.children)};
 if(n.endsWith('/button'))return {buttonVariants:()=>''};if(n.endsWith('/filter-bar'))return {FilterBar:p=>React.createElement('div',null,p.children)};
 if(n.endsWith('/select-native'))return {SelectNative:p=>{if(p['aria-label']==='Report period')period=p;return React.createElement('select',p,p.children);}};
 if(n.endsWith('/system-states'))return {SectionLoadingState:p=>React.createElement('span',{'role':'status'},p.label)};
 if(n.endsWith('/interactive-line-chart'))return {InteractiveLineChart:p=>React.createElement('div',{'data-chart':true},p.points.map(x=>React.createElement('span',{key:x.id},x.previewValue)))};
 if(n.endsWith('/utils'))return {formatNumber:x=>String(x),formatDateOnly:x=>x};
 if(n.endsWith('/business-date'))return {shiftBusinessDate:(date,offset)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);}};throw Error(n);
 }};vm.runInNewContext(compile(fs.readFileSync('src/components/outlet-packaging-report.tsx','utf8')),context);const html=renderToStaticMarkup(React.createElement(context.exports.OutletPackagingReport,{report,days:7}));return {html,period,navigations};}
test('pending period loads hide stale totals, coverage and chart gaps while keeping genuine stock visible',()=>{
 const {html,period}=render(true);assert.equal(period.disabled,true);assert.equal(period['aria-busy'],true);assert.match(html,/Loading packaging usage trend/);assert.match(html,/Loading packaging report coverage/);assert.ok(!html.includes('data-chart'));assert.ok(!html.includes('1/7 days recorded'));assert.ok(!html.includes('No completed records'));assert.match(html,/0<span[^>]*>PCS/);
});
test('loaded explicit zero usage is visible and period changes navigate once without eager zero-month data',()=>{
 const {html,period,navigations}=render(false);assert.match(html,/data-chart/);assert.match(html,/0 PCS/);assert.match(html,/1\/7 days recorded/);period.onChange({target:{value:'30'}});assert.equal(navigations.length,1);assert.equal(navigations[0][0],'/outlet-packaging?keep=1&days=30');assert.equal(navigations[0][1].scroll,false);
});
