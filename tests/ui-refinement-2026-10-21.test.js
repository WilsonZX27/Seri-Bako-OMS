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
test('attention dots aggregate only visible items and notifications use nonshrinking semantic icons',()=>{
 assert.match(read('src/components/layout/workspace-sidebar.tsx'),/visibleItems.some\(item => item.hasAttention\)/);
 assert.match(read('src/components/layout/nav-items.ts'),/getVisibleIaItems\(role, permissionMap\)/);
 const menu=read('src/components/layout/top-bar-activity-menu.tsx');
 for(const name of ['Wrench','ClipboardCheck','ShoppingCart','ReceiptText','ShieldAlert','Factory','Package']) assert.ok(menu.includes(`return ${name}`));
 assert.match(menu,/const Icon = actionIcon\(notification.action_url/);
 assert.match(menu,/h-4 w-4 shrink-0 text-primary/);
 assert.match(menu,/<Button asChild variant="outline" className="w-full"><Link href="\/activity"/);
});
test('attention destinations deduplicate and clear when current action data is empty',()=>{
 const ts=require('typescript'),vm=require('node:vm');
 const source=read('src/server/queries/topbar.ts').split('export function getNavAttentionHrefs')[1];
 const context={exports:{}};
 vm.runInNewContext(ts.transpileModule('export function getNavAttentionHrefs'+source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 const get=context.exports.getNavAttentionHrefs;
 assert.equal(JSON.stringify(get({pendingApprovals:[],notifications:[]})),'[]');
 const value=get({pendingApprovals:[{href:'/purchase-requests/one'},{href:'/purchase-requests/two'}],notifications:[{action_url:'/asset-management?view=maintenance'},{action_url:'https://example.com/outside'}]});
 assert.equal(JSON.stringify(value),JSON.stringify(['/purchase-requests','/asset-management']));
 const mixed=get({pendingApprovals:[{href:'/purchase-requests/one'}],attentionHrefs:['/purchase-requests/two','/attendance/schedule?week=2026-10-19','/stock-counts/late'],notifications:[]});
 assert.equal(JSON.stringify(mixed),JSON.stringify(['/purchase-requests','/attendance','/stock-counts']));
});
