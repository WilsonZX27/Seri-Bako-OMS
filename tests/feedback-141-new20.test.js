const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function syntax(path){return ts.createSourceFile(path,fs.readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)}
function find(source,predicate){let result;function visit(node){if(result)return;if(predicate(node)){result=node;return}ts.forEachChild(node,visit)}visit(source);assert.ok(result);return result}
function evaluate(code,globals={}){const exports={};vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,...globals});return exports}
test('role quick access uses the requested Chef order and retains the Outlet Daily remainder',()=>{
 const source=syntax('src/components/layout/mobile-app-navigation.tsx');const declaration=find(source,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='roleTabs').getText(source);
 const icons=Object.fromEntries(['Home','CheckCircle2','Boxes','ClipboardList','ClipboardCheck','CalendarDays','ReceiptText','FileText','PackageCheck','ShoppingCart'].map(name=>[name,name]));
 const {roleTabs}=evaluate('export '+declaration,icons);
 assert.deepEqual(Array.from(roleTabs('chef'),x=>x.href),['/dashboard','/purchase-requests','/goods-receivings','/asset-management']);
 for(const role of ['outlet_staff','outlet_supervisor'])assert.deepEqual(Array.from(roleTabs(role),x=>x.href),['/dashboard','/stock-counts','/asset-management','/outlet-daily-records']);
 for(const role of ['chef','outlet_staff'])assert.ok(roleTabs(role).every(x=>typeof x.permission==='string'));
 const code=fs.readFileSync(source.fileName,'utf8');assert.match(code,/filter\(\(tab\) => !tab.permission \|\| has\(permissionMap, tab.permission\)\)/);
});
test('removing manual PH does not relabel historical public holiday or off-in-lieu as Emergency Leave',()=>{
 const source=syntax('src/components/attendance/schedule-planner.tsx');const palette=find(source,n=>ts.isVariableDeclaration(n)&&n.name.getText(source)==='leavePalette').initializer.getText(source);
 const label=find(source,n=>ts.isVariableDeclaration(n)&&n.name.getText(source)==='cellLabel').initializer.getText(source);
 const {items,cellLabel}=evaluate(`export const items=${palette};export const cellLabel=${label}`,{templates:[]});
 assert.equal(items.some(x=>x.kind==='ph'),false);assert.equal(cellLabel({assignment_kind:'ph'}),'Holiday');assert.equal(cellLabel({assignment_kind:'oil'}),'OIL');
});
test('historical workbook PH/OIL mappings stay separate and EL is not silently imported as either',()=>{
 const source=syntax('src/lib/attendance/schedule-workbook.ts');const mapping=find(source,n=>ts.isVariableDeclaration(n)&&n.name.getText(source)==='KINDS').initializer.getText(source);
 const {kinds}=evaluate(`export const kinds=${mapping}`);assert.equal(kinds.PH,'ph');assert.equal(kinds.OIL,'oil');assert.equal(kinds.EL,'el');assert.match(fs.readFileSync(source.fileName,'utf8'),/!catalog\.paid_emergency_leave/);
});
