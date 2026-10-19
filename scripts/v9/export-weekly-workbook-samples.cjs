const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const output = process.argv[2];
if (!output) throw new Error('Supply a private output directory.');
const moduleObject = {exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/attendance/people-workbook.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {module:moduleObject,exports:moduleObject.exports,Buffer,Intl,Date,Set,Map});
const {buildPeopleWorkbook,buildZipArchive}=moduleObject.exports;
const dates=Array.from({length:7},(_,i)=>{const d=new Date('2026-09-28T00:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10)});
fs.mkdirSync(output,{recursive:true,mode:0o700});
const files=['Sample Outlet A','Sample Outlet B'].map(outlet=>{
 const name=`People Workbook - ${outlet} - 2026-09-28 to 2026-10-04 - Draft.xlsx`;
 const content=buildPeopleWorkbook([{name:'Synthetic Employee',employee:'Synthetic Employee',outlet,month:'2026-09',period:{start:dates[0],end:dates[6],draft:true,generatedAt:'2026-10-09T01:00:00Z'},days:dates.map(date=>({date,day:new Intl.DateTimeFormat('en-MY',{weekday:'short',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z')),outlet,scheduleStart:'09:00:00',scheduleEnd:'17:30:00',punches:[],workedSeconds:date==='2026-10-02'?0:null,event:date==='2026-10-02'?'Unpaid Leave':'Normal',exceptions:date==='2026-10-01'?'Missing punches':''}))}]);
 fs.writeFileSync(path.join(output,name),content,{mode:0o600});return {name,content};
});
fs.writeFileSync(path.join(output,'People Workbooks - 2026-09-28 to 2026-10-04 - Draft.zip'),buildZipArchive(files),{mode:0o600});
console.log('Two synthetic weekly XLSX samples and their multi-outlet ZIP exported by the application generator.');
