const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const load=require('./helpers/load-source.cjs')({Buffer,Intl,Date,Set,Map,Uint8Array,DataView,TextDecoder,Blob,Response,DecompressionStream,crypto:require('node:crypto').webcrypto,process:{env:{},cwd:()=>process.cwd()},fetch:async()=>{throw Error("Unexpected network call in isolated test")}});
const policy=load('src/lib/attendance/emergency-leave.ts'),exportsPolicy=load('src/lib/attendance/export-policy.ts'),{payrollLineSchema}=load('src/lib/validations/payroll-line.ts');
const proof={statuses:['el_paid','emergency_leave'],calculation:{emergency_leave_policy:{version:1,assignment_id:'synthetic-assignment',source:'published_schedule'}}};
test('paid EL requires canonical versioned evidence, not merely a label or an unapproved report',()=>{
 assert.equal(policy.hasPaidEmergencyLeaveProof(proof),true);
 for(const row of [{statuses:['emergency_leave']},{statuses:['el_paid'],calculation:{emergency_leave_policy:{version:1}}},{...proof,calculation:{emergency_leave_policy:{version:2,assignment_id:'a',source:'published_schedule'}}},{...proof,calculation:{emergency_leave_policy:{version:1,assignment_id:'a',source:'approved_report'}}}])assert.equal(policy.hasPaidEmergencyLeaveProof(row),false);
 assert.equal(policy.hasPaidEmergencyLeaveProof({...proof,calculation:{emergency_leave_policy:{version:1,assignment_id:'a',source:'approved_report',report_id:'r'}}}),true);
});
test('EL exempts deductible short hours without manufacturing worked hours, punch evidence or overtime',()=>{
 const missing={...proof,worked_seconds:null,late_seconds:600,early_leave_seconds:3600};assert.equal(exportsPolicy.exportShortHoursSeconds(missing),0);assert.equal(exportsPolicy.exportWorkedSeconds(missing),null);
 const punches=['2026-10-19T01:00:00Z','2026-10-19T05:00:00Z','2026-10-19T06:00:00Z','2026-10-19T10:00:00Z'];
 const actual={...proof,worked_seconds:28800,late_seconds:600,early_leave_seconds:1200,scheduled_start:punches[0],scheduled_end:punches[3],calculation:{...proof.calculation,punches}};
 assert.equal(exportsPolicy.exportWorkedSeconds(actual),28800);assert.equal(exportsPolicy.exportShortHoursSeconds(actual),0);assert.equal(actual.late_seconds,600);assert.equal(actual.early_leave_seconds,1200);
 const pending={...actual,statuses:['emergency_leave'],calculation:{punches}};assert.equal(exportsPolicy.exportShortHoursSeconds(pending),1800);
});
test('payroll source validation rejects EL deductions but preserves unrelated manual deductions and verified earnings',()=>{
 assert.equal(payrollLineSchema.safeParse({kind:'deduction',label:'EL',amount:10,source_kind:'emergency_leave'}).success,false);
 assert.equal(payrollLineSchema.safeParse({kind:'deduction',label:'Short',amount:10,source_kind:'attendance_short_hours'}).success,false);
 assert.equal(payrollLineSchema.safeParse({kind:'deduction',label:'Short',amount:10,source_kind:'attendance_short_hours',source_dates:['2026-02-30']}).success,false);
 assert.equal(payrollLineSchema.safeParse({kind:'deduction',label:'Loan',amount:10}).success,true);
 assert.equal(policy.emergencyLeaveDeductionError({kind:'deduction',source_kind:'attendance_short_hours',source_dates:['2026-10-19']},['2026-10-19']), 'Emergency Leave dates cannot be included in a short-hours deduction.');
 assert.equal(policy.emergencyLeaveDeductionError({kind:'deduction',source_kind:'manual'},['2026-10-19']),null);
});
const {parseScheduleWorkbook:parse}=load('src/lib/attendance/schedule-workbook.ts'),{buildZipArchive,buildPeopleWorkbook}=load('src/lib/attendance/people-workbook.ts');
function workbook(label){const c=(col,row,value)=>`<c r="${col}${row}" t="inlineStr"><is><t>${value}</t></is></c>`;const xml=`<worksheet><sheetData><row r="1">${c('A',1,'PJS10-CK')}</row><row r="2">${[5,6,7,8,9,10,11].map((n,i)=>`<c r="${['B','D','F','H','J','L','N'][i]}2"><v>${n}</v></c>`).join('')}</row><row r="4">${c('A',4,'Person')}${c('B',4,label)}</row></sheetData></worksheet>`;const zip=buildZipArchive([{name:'xl/workbook.xml',content:Buffer.from('<workbook><sheets><sheet name="WEEK 28" r:id="r1"/></sheets></workbook>')},{name:'xl/_rels/workbook.xml.rels',content:Buffer.from('<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/></Relationships>')},{name:'xl/worksheets/sheet1.xml',content:Buffer.from(xml)}]);return{name:'EL.xlsx',size:zip.length,arrayBuffer:async()=>Uint8Array.from(zip).buffer}}
const catalog={branches:[{id:'b',name:'CK @ PJS10',status:'not_started'}],staff:[{id:'s',name:'Person',branch_id:'b',eligibility:[{from:'2026-01-01',to:null}]}],current_assignments:[]};
test('workbook EL is capability-gated, new manual PH is rejected, OIL remains distinct',async()=>{
 for(const label of ['EL','EMERGENCY LEAVE']){const disabled=await parse(workbook(label),'2026-10-05',catalog,{sheet:'WEEK 28',branchId:'b',confirmDateContext:true});assert.equal(disabled.assignmentCount,0);assert.ok(disabled.issues.some(i=>i.reason==='emergency_leave_not_enabled'));
 const ready=await parse(workbook(label),'2026-10-05',{...catalog,paid_emergency_leave:true},{sheet:'WEEK 28',branchId:'b',confirmDateContext:true});assert.equal(ready.assignmentCount,1);assert.equal(ready.outlets[0].assignments[0].assignment_kind,'el');assert.equal(ready.outlets[0].assignments[0].custom_start,undefined);}
 const holiday=await parse(workbook('PH'),'2026-10-05',catalog,{sheet:'WEEK 28',branchId:'b',confirmDateContext:true});assert.equal(holiday.assignmentCount,0);assert.ok(holiday.issues.some(i=>i.reason==='calendar_holiday'));
 const oil=await parse(workbook('OIL'),'2026-10-05',catalog,{sheet:'WEEK 28',branchId:'b',confirmDateContext:true});assert.equal(oil.outlets[0].assignments[0].assignment_kind,'oil');
});
test('people workbook displays EL and zero short-hour deduction, leaving unobserved work and punches blank',()=>{
 const xml=buildPeopleWorkbook([{name:'Synthetic',employee:'Synthetic',outlet:'Fixture',month:'2026-10',period:{start:'2026-10-05',end:'2026-10-11',draft:true,generatedAt:'2026-10-13T00:00:00Z'},days:[{date:'2026-10-05',day:'Mon',outlet:'Fixture',paidEmergencyLeave:true,event:'EL · Paid Emergency Leave',punches:[],workedSeconds:null,shortHoursSeconds:999}]}]).toString();
 const cell=ref=>xml.match(new RegExp(`<c r="${ref}"[^>]*?(?:/>|>[\\s\\S]*?</c>)`))?.[0];assert.match(cell('C8'),/>EL</);assert.match(cell('K8'),/<v>0<\/v>/);assert.match(cell('I8'),/\/>$/);assert.match(cell('E8'),/\/>$/);assert.match(xml,/Paid Emergency Leave/);assert.doesNotMatch(xml,/Unpaid Leave/);
});
test('capability discovery fails closed without requiring or allocating any business state',async()=>{
 const {readPaidEmergencyLeaveCapability:read}=load('src/server/queries/schedule-leave-capabilities.ts');let names=[];
 for(const code of ['PGRST202','42883','42501'])assert.equal(await read({rpc:async name=>(names.push(name),{error:{code,message:'synthetic'},data:null})}),false);
 assert.equal(await read({rpc:async()=>({data:{revision:1,paid_emergency_leave:true},error:null})}),true);
 assert.equal(await read({rpc:async()=>({data:{revision:2,paid_emergency_leave:true},error:null})}),false);
 assert.ok(names.every(name=>name==='schedule_leave_capabilities'));
});
