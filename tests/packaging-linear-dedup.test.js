const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,data,source=fs.readFileSync(file,'utf8')){
 const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){
 if(name==='react')return {cache:fn=>fn};
 if(name.includes('business-date'))return {todayInKualaLumpur:()=> '2026-11-05',shiftBusinessDate:(day,n)=>{const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}};
 if(name.includes('mock-mode'))return {isMockMode:()=>false};if(name.includes('supabase/loose'))return {looseSupabase:x=>x};
 if(name.includes('supabase/server'))return {createClient:async()=>({rpc:async()=>({data,error:null})})};throw Error(name);
 }});return exports;
}
const base=rows=>({today:'2026-11-05',rows,opening:[],latest:[],products:[],outlets:[{id:'b'}]});
const row=(id,branchId='b')=>({id,branchId,date:'2026-11-05',code:'BOX',usage:0,closing:null,received:null});
test('report keeps first source identity, idless rows, order and null/zero values without mutating input',async()=>{
 const first=Object.freeze(row('a')),idless=Object.freeze(row('')),rows=Object.freeze([first,{...first},idless,idless,Object.freeze(row('c','c'))]);
 const report=await load('src/server/queries/outlet-packaging.ts',base(rows)).getOutletPackagingReport(30);
 assert.equal(report.rows.length,4);assert.equal(report.rows[0],first);assert.equal(report.rows[1],idless);assert.equal(report.rows[2],idless);assert.equal(report.rows[0].usage,0);assert.equal(report.rows[0].received,null);assert.equal(rows.length,5);
});
test('report source ID inspections scale linearly across a large unique cohort',async()=>{
 let reads=0;const size=2000;const rows=Array.from({length:size},(_,i)=>({...row('x','b'+i),get id(){reads++;return 'id'+i;}}));
 const report=await load('src/server/queries/outlet-packaging.ts',base(rows)).getOutletPackagingReport(30);assert.equal(report.rows.length,size);assert.ok(reads<size*15,`ID reads ${reads}`);
});
test('trend keeps first duplicate and idless source rows without converting missing usage to zero',()=>{
 const first={...row('same'),usage:2};const rows=Object.freeze([first,{...first,usage:99},{...row(''),usage:null}]);
 const points=load('src/lib/packaging-trend.ts').packagingTrendPoints(base(rows),'b','BOX',7,'usage');assert.equal(points.at(-1).rows.length,2);assert.equal(points.at(-1).rows[0],first);assert.equal(points.at(-1).value,null);assert.equal(rows.length,3);
});
test('trend source ID inspections stay linear even before product/outlet filtering',()=>{
 let reads=0;const size=2000,rows=Array.from({length:size},(_,i)=>({...row('x','b'+i),get id(){reads++;return 'id'+i;}}));
 load('src/lib/packaging-trend.ts').packagingTrendPoints(base(rows),'b0','BOX',7,'usage');assert.ok(reads<size*8,`ID reads ${reads}`);
});
module.exports={load,base,row};
