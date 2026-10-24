const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript'),vm=require('vm'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const load=require('./helpers/load-source.cjs')({process:{env:{}},Error,TypeError});
test('informational guidance uses one neutral rounded Info pattern while warning/error stay distinct',()=>{
 const {Notice}=load('src/components/ui/system-states.tsx');
 const info=renderToStaticMarkup(React.createElement(Notice,null,'Choose an asset.'));
 assert.match(info,/lucide-info/);assert.doesNotMatch(info,/lucide-triangle-alert|--sb-info-bg|mt-0.5/);assert.match(info,/rounded-lg/);assert.match(info,/text-xs leading-4/);assert.match(info,/role="status"/);
 const error=renderToStaticMarkup(React.createElement(Notice,{tone:'error'},'Correct the quantity.'));assert.match(error,/role="alert"/);assert.match(error,/--sb-danger-bg/);
 const warning=renderToStaticMarkup(React.createElement(Notice,{tone:'warning'},'Review before deleting.'));assert.match(warning,/--sb-warning-bg/);
});
test('historical holiday is a noninteractive note and does not become a new leave kind',()=>{
 const text=fs.readFileSync('src/components/attendance/schedule-planner.tsx','utf8'),source=ts.createSourceFile('p.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let fn;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='ScheduleDayCell')fn=n;ts.forEachChild(n,visit)}visit(source);const e={};vm.runInNewContext(ts.transpileModule('export '+fn.getText(source),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports:e,require,cn:(...parts)=>parts.join(' ')});let clicks=0;
 const row={assignmentKind:'ph',children:'Holiday',onClick:()=>clicks++};const note=e.ScheduleDayCell(row);assert.equal(note.type,'span');assert.equal(note.props.role,'note');assert.equal(note.props.onClick,undefined);assert.equal(row.assignmentKind,'ph');assert.equal(clicks,0);
 assert.equal(e.ScheduleDayCell({...row,assignmentKind:'el'}).type,'button');assert.match(text,/kind: "el", tone: "el"/);assert.match(text,/tone === "el"/);assert.match(text,/copied && copied.assignment_kind !== "ph"/);assert.match(text,/value\?\.assignment_kind!=="ph"/);
});
test('RO correction has one reason input, keeps existing nullable note contract and removes repeated prose',()=>{
 const source=fs.readFileSync('src/components/attendance/comp-time-correction-form.tsx','utf8');assert.match(source,/name="reason" required minLength=\{3\}/);assert.doesNotMatch(source,/name="note"|Use this for a verified/);assert.match(source,/note:null/);assert.match(source,/api\/attendance\/comp-time/);
});
test('transfer defaults to workspace-owned primary action, grouped stock fields and optional line notes',()=>{
 const form=fs.readFileSync('src/components/stock-operation-forms.tsx','utf8'),page=fs.readFileSync('src/app/(app)/stock-transfers/new/page.tsx','utf8');assert.match(form,/showSubmit = false, canCreateDestination/);assert.match(page,/mobilePrimaryAction=\{primaryAction\}/);assert.match(page,/sidePanel=/);assert.match(page,/showSubmit=\{false\}/);assert.match(form,/grid-cols-\[minmax\(0,1fr\)_2.75rem_2.75rem\]/);assert.doesNotMatch(form,/destinationName/);assert.match(form,/row.notesOpen \?/);
});
