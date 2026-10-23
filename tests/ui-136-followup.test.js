const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {compile,React,renderToStaticMarkup}=require('./helpers/render-workspaces.cjs');
test('forecast controls retain selected outlet and every input while opting out of obscuring sticky cells',()=>{
 const tableProps=[];
 const wrap=({children})=>React.createElement('div',null,children);
 const table={Table:p=>{tableProps.push(p);return React.createElement('table',null,p.children);},...Object.fromEntries([['TableHeader','thead'],['TableBody','tbody'],['TableRow','tr'],['TableHead','th'],['TableCell','td']].map(([n,t])=>[n,p=>React.createElement(t,null,p.children)]))};
 const {EmployeeForecastEditor}=compile('src/components/production-planning-employee-forecasts.tsx',{'react':{...React,useState:v=>[v,()=>{}]},'@/components/ui/input':{Input:p=>React.createElement('input',p)},'@/components/ui/select-control':{SelectControl:p=>React.createElement('button',{'aria-label':p.ariaLabel},p.options.find(o=>o.value===p.value)?.label)},'@/components/ui/table':table,'@/lib/production-planning/forecast-csv':{parseForecastCsv:()=>[]}});
 const html=renderToStaticMarkup(React.createElement(EmployeeForecastEditor,{outlets:[{id:'b',branch_name:'Gurney Plaza'}],products:[{id:'p',product_name:'Long product',product_code:'SC01'}],values:{'b:p':{weekday:'0',weekend:'17',source:''}},onChange:()=>{},disabled:false}));
 assert.match(html,/Employee forecast outlet[^>]*>Gurney Plaza/);assert.match(html,/value="0"/);assert.match(html,/value="17"/);assert.match(html,/grid-cols-1[^"<]*sm:grid-cols-2/);assert.equal(tableProps[0].stickyColumn,'none');assert.equal(tableProps[0].scrollbar,'auto');assert.equal(tableProps[0]['aria-label'],'Employee demand forecasts');
});
test('both actual Daily date branches show Today only for today and retain machine date',()=>{
 const text=fs.readFileSync('src/app/(app)/outlet-daily-records/page.tsx','utf8');const source=ts.createSourceFile('daily.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const expr=[];
 function visit(n){if(ts.isConditionalExpression(n)&&n.condition.getText(source)==='row.record_date === data.summary.today'&&n.getText(source).includes('<time'))expr.push(n.getText(source));ts.forEachChild(n,visit);}visit(source);assert.equal(expr.length,2);
 for(const code of expr)for(const current of [true,false]){const result={};const row={record_date:current?'2026-10-23':'2026-10-22'};vm.runInNewContext(ts.transpileModule('export const value=('+code+');',{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:result,require,row,data:{summary:{today:'2026-10-23'}},formatDateOnly:()=> '22/10/2026'});const html=renderToStaticMarkup(result.value);assert.match(html,new RegExp('dateTime="'+row.record_date+'"'));assert.equal(html.includes('Today'),current);assert.equal(html.includes('22/10/2026'),!current);}
});
