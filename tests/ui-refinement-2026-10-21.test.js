const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p,'utf8');
test('reviewed lists have one create owner and scoped metadata styling', () => {
 for (const route of ['purchase-requests','outlet-daily-records']) {
  const source=read(`src/app/(app)/${route}/page.tsx`);
  assert.ok(!source.slice(source.indexOf('<PageHeader'),source.indexOf('<WorkspaceGrid',source.indexOf('<PageHeader'))).includes('action='));
  assert.match(source,/data-mobile-primary-action/);
 }
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
