const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p,'utf8');
test('reviewed lists have one visible phone create owner and scoped metadata styling', () => {
 const requests=read('src/app/(app)/purchase-requests/page.tsx');
 const requestHeader=requests.slice(requests.indexOf('<PageHeader'),requests.indexOf('<WorkspaceGrid',requests.indexOf('<PageHeader')));
 assert.doesNotMatch(requestHeader,/action=/);
 assert.match(requests,/permissions\["pr\.create"\] \? <Button[^>]*data-mobile-primary-action><Link href="\/purchase-requests\/new"/);
 assert.match(requests,/<FilterBar\s+key=\{JSON.stringify\(\[filters\./);

 const daily=read('src/app/(app)/outlet-daily-records/page.tsx');
 assert.doesNotMatch(daily,/<PageHeader[^>]*action=\{canCreate/);
 assert.match(daily,/canCreate \? <Button[^>]*data-mobile-primary-action><Link href="\/outlet-daily-records\/new"/);
 assert.match(daily,/<FilterBar\s+key=\{JSON.stringify\(\[filters\./);
 const rightConsole=read('src/components/layout/right-console.tsx');
 assert.match(rightConsole,/className="fixed[^\"]*md:hidden"/);

 const css=read('src/app/design-system-v2.css');
 assert.match(css,/#main-content \.sb-daily-record-metrics/);
 assert.match(css,/\.sb-pr-phone-supplier > span \{ white-space: normal; overflow-wrap: anywhere;/);
 assert.match(css,/\.sb-pr-phone-byline-date \{[^}]*white-space: nowrap/);
});
test('list filters stay in the centered dialog on phones and tablets', () => {
 const header=read('src/components/common/UnifiedListHeader.tsx');
 assert.match(header,/const sharedSearchRow = mobile && hasTextSearch && !phoneOnly && actions === undefined;/);
 assert.match(header,/const compactDrawer = sharedSearchRow \|\|/);
 assert.match(header,/const compactInline = !sharedSearchRow &&/);
 const counts=read('src/app/(app)/stock-counts/page.tsx');
 assert.match(counts,/phoneMode="drawer" tabletMode="drawer" stableResponsive/);
 const css=read('src/app/design-system-v2.css');
 assert.match(css,/grid-template-columns: minmax\(0, 1fr\) 44px 44px max-content/);
 assert.match(css,/\.sb-pr-phone-supplier > span \{ min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;/);
 assert.match(css,/\.unified-list-sheet-fields\s*\{[^}]*gap:\.5rem \.625rem;[^}]*padding:\.75rem 0;/);
});
test('outlet sales totals remain a two-column pair on phone widths', () => {
 const form=read('src/components/outlet-daily-record-form.tsx');
 assert.match(form,/className="grid grid-cols-2 gap-2"/);
 assert.match(form,/POS Total Sales \(RM\)/);
 assert.doesNotMatch(form,/grid gap-3 sm:grid-cols-2/);
});
test('error retry performs a full request and transfer filters use a compact tablet dialog', () => {
 const appError=read('src/app/error.tsx');
 const globalError=read('src/app/global-error.tsx');
 assert.match(appError,/onClick=\{\(\) => window\.location\.reload\(\)\}/);
 assert.match(globalError,/onClick=\{\(\) => window\.location\.reload\(\)\}/);
 const assets=read('src/app/(app)/asset-management/page.tsx');
 assert.match(assets,/tabletMode=\{view === "transfers" \? "drawer" : "auto"\}/);
 const css=read('src/app/design-system-v2.css');
 assert.match(css,/form\.unified-list-header\[data-tablet-mode\] :is\(\.unified-list-search-submit, \.unified-list-filter-trigger\)[\s\S]*?width: 44px !important;[\s\S]*?height: 44px !important;/);
 assert.match(css,/form\.sb-asset-query--transfers\[data-tablet-mode="drawer"\] \.unified-list-row--filter-only[\s\S]*?grid-template-columns: 44px max-content;/);
 assert.match(read('src/app/(app)/stock-counts/page.tsx'),/className="space-y-3" data-tablet-main-list/);
 assert.match(read('src/app/(app)/stock-counts/page.tsx'),/sb-stock-count-query/);
});
test('attention dots aggregate only visible items and notifications use nonshrinking semantic icons',()=>{
 const sidebar=read('src/components/layout/workspace-sidebar.tsx');
 assert.match(sidebar,/visibleItems.some\(item => item.hasAttention\)/);
 assert.match(sidebar,/hasAttention && groupClosed[\s\S]*?className="mr-2 size-1\.5 shrink-0 rounded-full bg-amber-400"/);
 assert.match(sidebar,/cn\("flex items-center gap-2 rounded-\[var\(--sb-control-radius\)\] px-2 font-medium transition-colors"/);
 assert.match(read('src/components/layout/nav-items.ts'),/getVisibleIaItems\(role, permissionMap\)/);
 const menu=read('src/components/layout/top-bar-activity-menu.tsx');
 for(const name of ['Wrench','ClipboardCheck','ShoppingCart','ReceiptText','ShieldAlert','Factory','Package']) assert.ok(menu.includes(`return ${name}`));
 assert.match(menu,/const Icon = actionIcon\(notification.action_url/);
 assert.match(menu,/h-4 w-4 shrink-0 text-primary/);
 assert.match(menu,/<Button asChild variant="outline" className="w-full"><Link href="\/activity"/);
});
test('attention destinations deduplicate and clear when current action data is empty',()=>{
 const activitySource=read('src/server/queries/topbar.ts');
 assert.match(activitySource,/\.\.\.actionableNotifications\.map\(\(item\) => item\.action_url \?\? ""\)/);
 assert.match(activitySource,/notifications: actionableNotifications\.slice\(0, 5\)/);
 const ts=require('typescript'),vm=require('node:vm');
 const source=activitySource.split('export function getNavAttentionHrefs')[1];
 const context={exports:{}};
 vm.runInNewContext(ts.transpileModule('export function getNavAttentionHrefs'+source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 const get=context.exports.getNavAttentionHrefs;
 assert.equal(JSON.stringify(get({pendingApprovals:[],notifications:[]})),'[]');
 const value=get({pendingApprovals:[{href:'/purchase-requests/one'},{href:'/purchase-requests/two'}],notifications:[{action_url:'/asset-management?view=maintenance'},{action_url:'https://example.com/outside'}]});
 assert.equal(JSON.stringify(value),JSON.stringify(['/purchase-requests','/asset-management']));
 const mixed=get({pendingApprovals:[{href:'/purchase-requests/one'}],attentionHrefs:['/purchase-requests/two','/attendance/schedule?week=2026-10-19','/stock-counts/late'],notifications:[]});
 assert.equal(JSON.stringify(mixed),JSON.stringify(['/purchase-requests','/attendance','/stock-counts']));
});
