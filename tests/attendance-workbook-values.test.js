const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/attendance/people-workbook.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports,Buffer,Intl,Date,Set,Map});
const base={name:'Synthetic',employee:'Synthetic',outlet:'Test',month:'2026-10',period:{start:'2026-10-05',end:'2026-10-11',draft:true,generatedAt:'2026-10-13T00:00:00Z'}};
const day={date:'2026-10-05',day:'Mon',outlet:'Test',scheduleStart:'22:00',scheduleEnd:'06:00',punches:['22:00','02:00','03:00','06:00'],workedSeconds:25200,overtimeSeconds:0,shortHoursSeconds:0};
function sheet(days,extra={}){return mod.exports.buildPeopleWorkbook([{...base,...extra,days}]).toString();}
function cell(xml,ref){return xml.match(new RegExp(`<c r="${ref}"[^>]*?(?:/>|>[\\s\\S]*?</c>)`))?.[0];}
function cached(xml,ref){return Number(cell(xml,ref)?.match(/<v>([^<]*)<\/v>/)?.[1]);}
test('typed date/clock/duration inputs and real summary formulas use Excel days',()=>{
 const xml=sheet([{...day,overtimeSeconds:5400}]); assert.match(cell(xml,'A8'),/<v>46300<\/v>/);
 assert.ok(Math.abs(cached(xml,'I8')-7/24)<1e-10); assert.match(cell(xml,'I8'),/<f>.*MOD\(F8-E8,1\)/); assert.ok(Math.abs(cached(xml,'C8')-22/24)<1e-10);
 assert.match(cell(xml,'J16'),/<f>IF\(COUNT\(J8:J14\)=0,&quot;&quot;,SUM\(J8:J14\)\)/);
 assert.match(cell(xml,'J17'),/J16\*1440/);assert.equal(cached(xml,'J17'),90);
});
test('missing is not zero; extra punches are preserved in remarks without guessed calculations',()=>{
 let xml=sheet([{...day,workedSeconds:null,punches:['22:00']}]);assert.match(cell(xml,'I8'),/\/>$/);assert.match(cell(xml,'J8'),/<v>0<\/v>/);
 xml=sheet([{...day,punches:['01:00','02:00','03:00','04:00','05:00','06:00']}]);assert.match(cell(xml,'P8'),/05:00, 06:00/);assert.match(cell(xml,'M8'),/See remarks/);
});
test('date-driven totals ignore input order and never double-count a date',()=>{
 const second={...day,date:'2026-10-06',overtimeSeconds:3600};
 assert.equal(cached(sheet([second,day]),'J17'),60);
 assert.throws(()=>sheet([day,day]),/Duplicate/);assert.throws(()=>sheet([{...day,date:'2026-11-01'}]),/out-of-period/);
});
test('salary/rates/PPH/allowance/passport and unknown object properties never enter ZIP parts',()=>{
 const secrets={basic_salary:'SECRET_BASIC',passport_number:'SECRET_ID',bank:'SECRET_BANK',meal_allowance:'SECRET_ALLOWANCE',rate:'SECRET_RATE',pphSeconds:999123,hidden:'SECRET_HIDDEN'};
 const xml=sheet([{...day,...secrets}],secrets);
 for(const value of Object.values(secrets))assert.ok(!xml.includes(String(value)),String(value));
 assert.ok(!xml.includes('xl/theme/'));assert.match(cell(xml,'L8'),/\/>$/);assert.match(cell(xml,'O8'),/\/>$/);
});

test('work totals that conflict with four-punch evidence stay blank pending review',()=>{ const xml=sheet([{...day,workedSeconds:25000}]);assert.match(cell(xml,'I8'),/\/>$/); });
