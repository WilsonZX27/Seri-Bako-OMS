// Synthetic current monetary snapshots only; no database, login or production request.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
const {payslipRow}=require('../../tests/fixtures/payslip-export.cjs');
const load=require('../../tests/helpers/load-source.cjs')({Buffer,process});
const {payslipExportSnapshot}=load('src/lib/attendance/payslip-export.ts'),{buildPayslipWorkbook}=load('src/lib/attendance/payslip-workbook.ts');
const mod=new Module('payslip-pdf.ts',module);mod.paths=module.paths;mod.require=n=>n==='./payslip-export'?load('src/lib/attendance/payslip-export.ts'):require(n);mod._compile(ts.transpileModule(fs.readFileSync('src/lib/attendance/payslip-pdf.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,'payslip-pdf.ts');
const out=path.resolve('handoff/payslip-export-candidate-20261101');fs.mkdirSync(out,{recursive:true});
(async()=>{
 for(const state of ['released','approved','draft']){
  const row=payslipRow({state,...(state==='draft'?{approved_at:null,released_at:null}:state==='approved'?{released_at:null}:{})});
  const slip=payslipExportSnapshot(row,'2026-11-01T05:00:00Z');
  fs.writeFileSync(path.join(out,`synthetic-${state}.xlsx`),buildPayslipWorkbook(slip));
  fs.writeFileSync(path.join(out,`synthetic-${state}.pdf`),await mod.exports.buildPayslipPdf(slip));
  if(state==='released')fs.writeFileSync(path.join(out,'snapshot.json'),JSON.stringify(slip,null,2));
 }
 const long=payslipRow();long.detail.push(...Array.from({length:45},(_,i)=>({kind:'earning',label:`Synthetic zero row ${i+1} `+'Long description '.repeat(5),amount:0})));
 long.attendance_confirmations.period_start='2026-10-01';long.attendance_confirmations.period_end='2026-10-31';long.attendance_confirmations.attendance=Array.from({length:31},(_,i)=>({date:`2026-10-${String(i+1).padStart(2,'0')}`,statuses:['missing_check_out','late','Synthetic outstanding explanation '.repeat(3)]}));
 fs.writeFileSync(path.join(out,'synthetic-long.pdf'),await mod.exports.buildPayslipPdf(payslipExportSnapshot(long,'2026-11-01T05:00:00Z')));
 console.log('Generated released/approved/draft XLSX/PDF and long pagination fixture at '+out);
})().catch(e=>{console.error(e);process.exitCode=1;});
