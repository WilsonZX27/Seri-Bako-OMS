const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const postcss=require('postcss');
const {compile,React,renderToStaticMarkup,renderDashboard}=require('./helpers/render-workspaces.cjs');
const read=p=>fs.readFileSync(p,'utf8');
test('Daily phone query gives the date a full value track and keeps the compact count in the same control row',()=>{
 const css=postcss.parse(read('src/app/design-system-v2.css'));
 const declarations={};css.walkAtRules('media',media=>{if(media.params!=='(max-width: 639px)')return;media.walkRules(rule=>{if(!rule.selector.includes('form.sb-outlet-daily-filters'))return;rule.walkDecls(d=>{declarations[rule.selector+'|'+d.prop]=d.value;});});});
 assert.equal(declarations['html[data-design-layer="v2"] form.sb-outlet-daily-filters .unified-list-row|grid-template-columns'],'minmax(8rem,1fr) minmax(0,1fr) 44px max-content');
 assert.equal(declarations['html[data-design-layer="v2"] form.sb-outlet-daily-filters .unified-list-result|grid-row'],'1');
});
test('Daily compact and table views hand off at the same established 1280px boundary',()=>{
 const source=ts.createSourceFile('page.tsx',read('src/app/(app)/outlet-daily-records/page.tsx'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const found={};
 function visit(n){if(ts.isJsxOpeningElement(n)){const tag=n.tagName.getText(source);if(tag==='Table'||tag==='OperationalList'){for(const attr of n.attributes.properties)if(ts.isJsxAttribute(attr)&&['compactUntil','showUntil','scrollbar'].includes(attr.name.text))found[tag+':'+attr.name.text]=attr.initializer?.text;}}ts.forEachChild(n,visit);}visit(source);
 assert.equal(found['Table:compactUntil'],'xl');assert.equal(found['OperationalList:showUntil'],'xl');assert.equal(found['Table:scrollbar'],'auto');
});
test('shared table exposes opt-in scrollbar without changing the default or keyboard region',()=>{
 const {Table}=compile('src/components/ui/table.tsx');
 for(const auto of [false,true]){const html=renderToStaticMarkup(React.createElement(Table,{scrollbar:auto?'auto':'hidden','aria-label':'Fixture table'}));assert.match(html,/role="region"/);assert.match(html,/tabindex="0"/);assert.match(html,/aria-label="Fixture table"/);assert.equal(html.includes('sb-scrollbar-none'),!auto);}
 const css=postcss.parse(read('src/app/design-system-v2.css'));let width;css.walkRules(rule=>{if(rule.selector==='.sb-table-region[data-scrollbar="auto"]')rule.walkDecls('scrollbar-width',d=>width=d.value);});assert.equal(width,'thin');
});
test('Inventory actual work action section precedes secondary movement chart without removing data or period controls',()=>{
 const text=read('src/app/(app)/inventory/page.tsx');assert.ok(text.indexOf('aria-labelledby="inventory-actions"')<text.indexOf('aria-labelledby="inventory-movement-activity"'));
 assert.equal((text.match(/<InventoryDailyMovementChart /g)||[]).length,1);assert.match(text,/name="consumption" defaultValue=\{period\}/);assert.match(text,/movement.unavailable/);assert.match(text,/permissions\[counter.permission\]/);
});
test('finance metric odd tail spans the two columns while retaining all amounts and links',()=>{
 const html=renderDashboard('finance');const due=html.match(/<a[^>]*href="\/supplier-invoices\/cash-flow"[^>]*>[\s\S]*?<\/a>/)?.[0];assert.ok(due);assert.match(due.split('>')[0],/class="[^"]*\bcol-span-2\b/);assert.match(due,/Due soon/);assert.match(html,/Overdue AP/);assert.match(html,/Missing due date/);assert.equal((html.match(/data-dashboard-payables/g)||[]).length,1);
});
