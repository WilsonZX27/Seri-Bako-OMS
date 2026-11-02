const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const cache=new Map();
function load(file,bindings={}) {file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,require:n=>n in bindings?bindings[n]:n.startsWith('.')?load(path.resolve(path.dirname(file),n+'.ts'),bindings):require(n),Buffer,TextDecoder,TextEncoder,Uint8Array,DataView,Blob,File,Response,Request,Headers,FormData,DecompressionStream,crypto:require('node:crypto').webcrypto,URL,URLSearchParams,console});return m.exports;}
const {buildScheduleTemplate:build}=load('src/lib/attendance/schedule-template-workbook.ts');
const {parseScheduleTemplate:parse}=load('src/lib/attendance/schedule-template.ts');
const {readScheduleWorkbookSheets:read,parseScheduleWorkbooks:parseAll}=load('src/lib/attendance/schedule-workbook.ts');
const {buildZipArchive}=load('src/lib/attendance/people-workbook.ts');
const b='11111111-1111-4111-8111-111111111111',b2='22222222-2222-4222-8222-222222222222',s='33333333-3333-4333-8333-333333333333',s2='44444444-4444-4444-8444-444444444444',company='55555555-5555-4555-8555-555555555555';
const catalog=()=>({company_id:company,branches:[{id:b,name:'Synthetic North',status:'not_started'},{id:b2,name:'Synthetic South',status:'draft'}],staff:[{id:s,name:'Same Name',branch_id:b,eligibility:[{from:'2026-01-01',to:null}]},{id:s2,name:'Same Name',branch_id:b,eligibility:[{from:'2026-01-01',to:null}]},{id:s,name:'Same Name',branch_id:b2,eligibility:[{from:'2026-01-01',to:null}]}],template_memberships:[{staff_id:s,branch_id:b},{staff_id:s2,branch_id:b},{staff_id:s,branch_id:b2}],current_assignments:[]});
const week='2026-10-26';
const row=(changes={})=>({staffId:s,name:'Display name can change',branchId:b,date:week,kind:'shift',start:'08:00',end:'17:00',nextDay:false,breakMinutes:60,capMinutes:480,reason:'Synthetic authorised custom shift',...changes});
const file=(rows=[],cat=catalog())=>new File([build(cat,week,'2026-11-02T00:00:00Z',rows)],'OMS-schedule.xlsx');
module.exports={load,catalog,file,row,week,b,b2,s,s2,company,build,parse,read,parseAll};
