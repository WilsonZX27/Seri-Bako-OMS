const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports});return exports;}
const {buildForecastTemplate,matchForecastRows,defaultPlanningProducts}=load('src/lib/production-planning/menu.ts');
const {parseForecastCsv}=load('src/lib/production-planning/forecast-csv.ts');
const products=[{id:'p',product_code:'X-1',product_name:'Food, "One"',category:'Custom menu'},{id:'p2',product_code:'=2+2',product_name:'=CMD()',category:'Other'}],outlets=[{id:'o',branch_name:'Different Company, outlet'},{id:'o2',branch_name:'=evil()'}];
test('template is built from supplied menu and outlets, roundtrips quotes, blanks and spreadsheet-safe text',()=>{
 const csv=buildForecastTemplate(outlets,products);assert.ok(csv.startsWith('\uFEFFoutlet,'));assert.ok(!csv.includes('Seri Bako'));assert.ok(csv.includes("'=CMD()"));
 const rows=matchForecastRows(parseForecastCsv(csv),outlets,products);assert.equal(rows.length,4);assert.ok(rows.every(r=>r.weekday_qty===null&&r.weekend_qty===null));assert.deepEqual(Array.from(rows,r=>r.key),['o:p','o:p2','o2:p','o2:p2']);
});
test('unknown/ambiguous products or outlets and duplicate normalized matches reject entire import',()=>{
 const row={outlet:outlets[0].branch_name,product_code:'X-1',weekday_qty:0,weekend_qty:null};
 assert.throws(()=>matchForecastRows([row,{...row,product_code:'unknown'}],outlets,products),/Unknown, excluded/);
 assert.throws(()=>matchForecastRows([row],outlets,[...products,products[0]]),/ambiguous product/);
 assert.throws(()=>matchForecastRows([{...row,outlet:'Other kitchen'}],outlets,products),/Unknown or ambiguous outlet/);
 assert.throws(()=>matchForecastRows([row,row],outlets,products),/Duplicate/);
});
test('default menu includes products independently of batch and forecast; row limit prevents unusable templates',()=>{
 assert.deepEqual(Array.from(defaultPlanningProducts(products,[{product_id:'p'}],[{product_id:'p',weekday_qty:0,weekend_qty:null}])),['p','p2']);
 assert.deepEqual(Array.from(defaultPlanningProducts(products,[],[])),['p','p2']);
 assert.throws(()=>buildForecastTemplate(Array(5001).fill(outlets[0]),products),/10,000/);
});
