const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('stock transfer line editor submits only selected parallel payload fields and retains inventory limits',()=>{
 const s=read('src/components/stock-operation-forms.tsx').split('export function StockTransferLines(')[1].split('function LineGrid(')[0];
 for(const name of ['line_item_id','line_enabled','line_quantity','line_uom','line_remarks'])assert.ok(s.includes(`name="${name}"`));
 assert.match(s,/max=\{item.available_qty\}/);assert.match(s,/line.available_qty <= 0/);
 assert.match(s,/other.key !== row.key && other.itemId === line.item_id/);
 assert.match(s,/saved.getAll\("line_quantity"\)\[index\]/);
 assert.match(s,/searchable startEmpty/);assert.match(s,/>Add line</);
 assert.doesNotMatch(s,/seedLines.map\(\(line, index\) =>/);
});
test('session expiry rechecks activity and catches nested input and scroll events without extending policy',()=>{
 const s=read('src/components/session-timeout-provider.tsx');
 assert.match(s,/Date.now\(\) - lastActivityAt.current < sessionLogoutAfterMs/);
 assert.match(s,/passive: true, capture: true/);assert.match(s,/"pointerdown"/);assert.match(s,/"input"/);
 assert.match(s,/signOutExpired\(true\)/);
 const error=read('src/app/(app)/error.tsx');assert.match(error,/auth.getUser\(\)/);assert.match(error,/error.status === 401/);assert.match(error,/Your session has expired/);assert.doesNotMatch(error,/refreshSession|signOut\(/);
});
test('PR pending context uses scoped supplier and branch metadata',()=>{
 const q=read('src/server/queries/topbar.ts'),ui=read('src/components/layout/top-bar-activity-menu.tsx');
 assert.match(q,/getCurrentUserPendingActionSnapshot\(5, true, false, false, true\)/);
 assert.match(ui,/supplier_names\.join/);assert.match(ui,/repair.branch_name/);
});
test('schedule matching groups are distinct cards and assignment total is not repeated in every heading',()=>{
 const s=read('src/components/attendance/schedule-workbook-import.tsx');
 assert.ok((s.match(/sb-import-card/g)||[]).length>=5);
 assert.match(s,/eligibleCount !== preview.assignmentCount/);
 assert.match(s,/Review recognised assignments/);
 assert.doesNotMatch(s,/safe assignments are readable|View \{preview.assignmentCount\} recognised/);
 assert.match(s,/catalog\?\.can_manage_exemptions/);
});
