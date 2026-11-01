const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {id,payslipRow}=require('./fixtures/payslip-export.cjs');
const load=require('./helpers/load-source.cjs')({Buffer,process});
const {payslipExportSnapshot:snapshot,payslipCents}=load('src/lib/attendance/payslip-export.ts');
const {buildPayslipWorkbook}=load('src/lib/attendance/payslip-workbook.ts');
// pdf-lib checks host-realm Array identity; compile PDF source in the host module like existing PDF tests.
const Module=require('node:module'),pdfModule=new Module('payslip-pdf.ts',module);pdfModule.paths=module.paths;pdfModule.require=n=>n==='./payslip-export'?load('src/lib/attendance/payslip-export.ts'):require(n);
pdfModule._compile(ts.transpileModule(fs.readFileSync('src/lib/attendance/payslip-pdf.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,'payslip-pdf.ts');
const {buildPayslipPdf}=pdfModule.exports;
const generated='2026-11-01T05:00:00Z';
function route({row=payslipRow(),people=true,accessError=null,active=true,queryError=null,actor={companyId:id(2),staffId:id(3)}}={}){
 const calls=[],exports={},query={};
 for(const method of ['select','eq'])query[method]=(...args)=>{calls.push({method,args});return query;};
 query.maybeSingle=async()=>({data:row,error:queryError});
 const mocks={
  'next/server':{NextResponse:class extends Response{static json(body,options){return new Response(JSON.stringify(body),{...options,headers:{...options?.headers,'content-type':'application/json'}});}}},
  '@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>{if(!active)throw Error('Inactive');return actor;}},
  '@/lib/supabase/server':{createClient:async()=>({from:table=>{calls.push({table});return query;},rpc:async(name,args)=>{calls.push({name,args});return {data:people,error:accessError};}})},
  '@/lib/supabase/loose':{looseSupabase:x=>x},
  '@/lib/attendance/payslip-export':{payslipExportSnapshot:snapshot},
  '@/lib/attendance/payslip-workbook':{buildPayslipWorkbook},'@/lib/attendance/payslip-pdf':{buildPayslipPdf},
 };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/people/payslips/export/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,Uint8Array,require:n=>mocks[n]??require(n)});
 return {calls,get:(suffix='')=>exports.GET(new Request(`http://localhost/api/people/payslips/export?id=${id(1)}&version=3&format=xlsx${suffix}`))};
}
test('money uses exact cents and validates snapshot conservation, dates and currency',()=>{
 const s=snapshot(payslipRow(),generated);assert.equal(s.earningsCents,100040);assert.equal(s.deductionsCents,1235);assert.equal(s.staffCode,'00068');assert.equal(s.outstanding[0].date,'2026-10-26');
 assert.equal(snapshot(payslipRow({approved_at:'2026-11-01T12:00:00+08:00'}),generated).approvedAt,'2026-11-01T04:00:00.000Z');
 for(const value of [null,-1,.001,Infinity,'1e4'])assert.throws(()=>payslipCents(value));
 for(const change of [{earnings:1000.41},{currency:'USD'},{state:'superseded'},{released_at:null},{detail:[]},{attendance_confirmations:{...payslipRow().attendance_confirmations,state:'superseded'}},{attendance_confirmations:{...payslipRow().attendance_confirmations,period_start:'2026-02-30'}}])assert.throws(()=>snapshot(payslipRow(change),generated));
 const zero=snapshot(payslipRow({detail:[{kind:'earning',label:'Zero',amount:0},{kind:'deduction',label:'Verified',amount:.01}],earnings:0,deductions:.01}),generated);assert.equal(zero.earningsCents-zero.deductionsCents,-1);
});
test('XLSX has only fixed amount-summary formulas; labels and IDs remain text',()=>{
 const s=snapshot(payslipRow(),generated),xml=buildPayslipWorkbook(s).toString();
 assert.equal((xml.match(/<f>/g)||[]).length,3);assert.match(xml,/<f>SUM\(C11:C15\)<\/f>/);assert.match(xml,/<f>C16-D16<\/f>/);
 assert.match(xml,/t="inlineStr"><is><t xml:space="preserve">=HYPERLINK/);assert.match(xml,/>00068<\/t>/);assert.match(xml,/<v>988.05<\/v>/);assert.ok(!xml.includes('externalLink'));
 assert.match(xml,/calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/);assert.match(xml,/Employee signature/);assert.match(xml,/Outstanding stays beside its date/);
});
test('draft XLSX is explicitly unapproved and never receives an approval timestamp',()=>{
 const s=snapshot(payslipRow({state:'draft',approved_at:null,released_at:null}),generated),xml=buildPayslipWorkbook(s).toString();assert.match(xml,/DRAFT — NOT APPROVED/);assert.equal(s.approvedAt,null);
});
test('session-scoped export binds current company/version and uses existing RLS',async()=>{
 const h=route(),response=await h.get('&staff_id='+id(9)+'&company_id='+id(9));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.match(response.headers.get('content-disposition'),/v3-released.xlsx/);
 assert.ok(h.calls.some(x=>x.method==='eq'&&x.args[0]==='company_id'&&x.args[1]===id(2)));
 assert.equal((await route({row:payslipRow({version:4})}).get()).status,409);assert.equal((await route({row:payslipRow({state:'superseded'})}).get()).status,409);
 assert.equal((await route({row:payslipRow({company_id:id(9)})}).get()).status,404);
});
test('employee can export only own released snapshot; People can export marked draft',async()=>{
 const h=route({people:false});assert.equal((await h.get()).status,200);assert.ok(h.calls.some(x=>x.method==='eq'&&x.args[0]==='staff_id'&&x.args[1]===id(3)));assert.ok(h.calls.some(x=>x.method==='eq'&&x.args[0]==='state'&&x.args[1]==='released'));
 assert.equal((await route({people:false,row:payslipRow({staff_id:id(9)})}).get()).status,404);assert.equal((await route({people:false,row:payslipRow({state:'approved'})}).get()).status,404);
 assert.equal((await route({row:payslipRow({state:'draft',approved_at:null,released_at:null})}).get()).status,200);
});
test('missing session, unavailable permission/query and broken snapshot fail closed',async()=>{
 const inactive=route({active:false});assert.equal((await inactive.get()).status,403);assert.equal(inactive.calls.length,0);
 assert.equal((await route({accessError:{message:'Unavailable'}}).get()).status,503);assert.equal((await route({people:null}).get()).status,503);
 assert.equal((await route({queryError:{message:'Unavailable'}}).get()).status,503);assert.equal((await route({row:null}).get()).status,404);assert.equal((await route({row:payslipRow({earnings:null})}).get()).status,409);
});
test('invalid query is rejected before reads and repeated downloads never invoke a mutation RPC',async()=>{
 const bad=route();assert.equal((await bad.get('&version=invalid')).status,400);assert.equal(bad.calls.length,0);
 const h=route();assert.equal((await h.get()).status,200);assert.equal((await h.get()).status,200);
 assert.ok(h.calls.filter(x=>x.name).every(x=>x.name==='attestation_people'));
 assert.equal(h.calls.filter(x=>x.table==='employee_payslips').length,2);
});
test('PDF response uses same snapshot and renders multilingual approved and draft files',async()=>{
 const {PDFDocument}=require('pdf-lib');
 for(const state of ['released','approved','draft']){
  const row=payslipRow({state,...(state==='draft'?{approved_at:null,released_at:null}:state==='approved'?{released_at:null}:{})});
  const bytes=await buildPayslipPdf(snapshot(row,generated));assert.equal(bytes.subarray(0,5).toString(),'%PDF-');const doc=await PDFDocument.load(bytes);assert.ok(doc.getPageCount()>=1);assert.match(doc.getTitle(),new RegExp(state));
 }
 const response=await route().get('&format=pdf');assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/pdf');
});
