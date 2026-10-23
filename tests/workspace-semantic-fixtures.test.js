const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
const {compile,roles,renderDashboard,React,renderToStaticMarkup}=require('./helpers/render-workspaces.cjs');
const links=html=>Array.from(html.matchAll(/href="([^"]+)"/g),m=>m[1].replaceAll('&amp;','&'));
const fixtureAction=(id)=>({id,document_no:'OD/001',href:'/outlet-daily-records/fixture',step:'Ready to post',supplier_names:['POISON SUPPLIER'],estimated_total:987654.32,line_count:999,branch_name:'Fixture branch',updated_at:'2026-10-23',submitted_by_name:'Fixture author'});
test('Daily posting renders its document, status and real target without procurement distractors',()=>{
 const html=renderDashboard('super_admin',{pendingApprovals:[fixtureAction('outlet-daily-fixture')]});
 const row=html.match(/<a[^>]*data-dashboard-pending-row[^>]*>[\s\S]*?<\/a>/)?.[0];
 assert.ok(row);assert.match(row,/Outlet Daily · OD\/001/);assert.match(row,/Ready to post/i);assert.match(row,/Review outlet quantities and post to lock editing/);
 assert.match(row,/href="\/outlet-daily-records\/fixture"/);
 assert.doesNotMatch(row,/POISON|987|999|Supplier pending|sb-pr-phone-(supplier|items|amount)/);
 const pr=renderDashboard('super_admin',{pendingApprovals:[{...fixtureAction('pr-fixture'),href:'/purchase-requests/fixture'}]});
 assert.match(pr,/POISON SUPPLIER/);assert.match(pr,/999 items/);assert.match(pr,/987,654\.32/);
});
for(const role of roles)test(`Dashboard ${role} does not expose finance-only content or links outside finance roles`,()=>{
 const html=renderDashboard(role);const finance=role==='super_admin'||role==='finance';
 assert.equal(html.includes('data-dashboard-payables'),finance);
 assert.equal(links(html).some(x=>x.startsWith('/supplier-invoices')),finance);
 assert.match(html,/Fixture user/);assert.match(html,/Actions/);
 if(role==='kitchen')assert.match(html,/Kitchen staff workspace/);
 if(role.startsWith('outlet_')){assert.match(html,/Upcoming shifts/);assert.match(html,/Today&#x27;s completion/);}
});
test('actual optional payables query branch calls finance reader only for Owner and Finance',async()=>{
 const source=ts.createSourceFile('dashboard.ts',fs.readFileSync('src/server/queries/dashboard.ts','utf8'),ts.ScriptTarget.Latest,true);
 let expression;function visit(n){if(ts.isConditionalExpression(n)&&n.whenTrue.getText(source).includes('getPayablesAttention().catch'))expression=n.getText(source);ts.forEachChild(n,visit);}visit(source);assert.ok(expression);
 for(const role of roles){let calls=0;const value=await vm.runInNewContext(expression,{isOwner:role==='super_admin',isFinance:role==='finance',getPayablesAttention:()=>{calls++;return Promise.resolve('finance fixture');},warnOptionalQuery:()=>{}});assert.equal(calls,Number(['super_admin','finance'].includes(role)));assert.equal(value,calls?'finance fixture':null);}
 let warned=0;assert.equal(await vm.runInNewContext(expression,{isOwner:true,isFinance:false,getPayablesAttention:()=>Promise.reject(Error('fixture unavailable')),warnOptionalQuery:()=>warned++}),null);assert.equal(warned,1);
});
const allPermissions=new Proxy({},{get:()=>true});
for(const role of roles)test(`Procurement ${role} module eligibility and queue statuses use actual page execution`,async()=>{
 const page=compile('src/app/(app)/procurement/page.tsx',{'@/server/auth/permissions':{getPermissionMap:async()=>allPermissions},'@/server/queries/procurement':{getProcurementWorkspaceInsights:async()=>({role,managerReview:1,financeReview:2,pendingPoApproval:3,receivingToday:4,sentPo:5,invoiceFollowup:6,purchasingReview:7,readyToConvert:8,draftPo:9})}}).default;
 const html=renderToStaticMarkup(await page());const hrefs=links(html);
 assert.equal(hrefs.includes('/supplier-invoices'),['super_admin','finance'].includes(role));
 const expected={super_admin:'manager_review',manager:'manager_review',finance:'finance_review',purchasing:'admin_review'}[role];
 if(expected)assert.ok(hrefs.includes(`/purchase-requests?status=${expected}`));
 assert.ok(!hrefs.some(x=>/status=(in_review|awaiting_delivery|unpaid)(?:&|$)/.test(x)));
});
test('Procurement denied permissions remove modules and create controls even for Owner',async()=>{
 const page=compile('src/app/(app)/procurement/page.tsx',{'@/server/auth/permissions':{getPermissionMap:async()=>({})},'@/server/queries/procurement':{getProcurementWorkspaceInsights:async()=>({role:'super_admin'})}}).default;
 const hrefs=links(renderToStaticMarkup(await page()));assert.ok(!hrefs.includes('/purchase-requests/new'));assert.ok(!hrefs.includes('/supplier-invoices'));assert.ok(!hrefs.includes('/suppliers'));
});
for(const permission of [null,'low_stock.view','stock_count.read','stock_transfer.read','goods_receiving.read'])test(`Inventory counter/link isolation: ${permission??'deny all'}`,async()=>{
 const data={lowStockItems:1,stockCountDue:2,todaysTransfers:3,todaysReceiving:4,lowStockRows:[],topConsumedItems:[],topPurchasedItems:[]};
 const page=compile('src/app/(app)/inventory/page.tsx',{'@/server/auth/permissions':{getPermissionMap:async()=>permission?{[permission]:true}:{}},'@/server/queries/inventory':{getInventoryDashboard:async()=>data,getInventoryDailyMovement:async()=>({rows:[],unavailable:false})}}).default;
 const hrefs=links(renderToStaticMarkup(await page({searchParams:Promise.resolve({})})));
 for(const [key,target] of Object.entries({'low_stock.view':'/low-stock','stock_count.read':'/stock-counts?status=draft','stock_transfer.read':'/stock-transfers?date=today','goods_receiving.read':'/goods-receivings?date=today'}))assert.equal(hrefs.includes(target),key===permission,`${key} counter`);
});
