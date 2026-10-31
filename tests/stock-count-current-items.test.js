const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('new count adds local lines without forcing draft submission and recovers their metadata',()=>{
 const s=read('src/components/stock-count-form.tsx');const add=s.slice(s.indexOf('async function addCurrentItem()'),s.indexOf('function continueInSavedDraft('));
 assert.match(add,/previewStockCountItem/);assert.doesNotMatch(add,/requestSubmit|router\.|createStockCount/);assert.match(add,/current.some/);assert.match(add,/activeBranchId.current!==branch/);assert.match(s,/recoveredExtra/);assert.match(s,/addedLine:/);assert.match(s,/addRequest.current \+= 1/);
});
test('extra count lines use scoped read preview and current-count-only atomic write proposal',()=>{
 const preview=read('src/server/actions/stock-count-item-preview.ts');assert.match(preview,/restrictToActorScope:true/);assert.match(preview,/requirePermission\("stock_count.create"\)/);assert.doesNotMatch(preview,/\.insert\(|\.update\(|\.delete\(/);
 const sql=read('docs/v10/proposals/stock-count-current-items-review-only.sql');assert.match(sql,/IS NOT TRUE/);assert.match(sql,/employment_end_date/);assert.match(sql,/Each item can appear only once/);assert.match(sql,/another count payload/);assert.match(sql,/added_item_ids/);assert.doesNotMatch(sql,/insert into public.branch_stock_count_items|insert into public.stock_movements|update public.stock_balances/i);
});

test('adding uses a synchronous lock and branch changes invalidate pending requests',()=>{
 const s=read('src/components/stock-count-form.tsx');
 const branch=s.slice(s.indexOf('function selectBranch('),s.indexOf('function updatePhysicalQty('));
 assert.match(branch,/closeAddItem\(\);/);
 const add=s.slice(s.indexOf('async function addCurrentItem()'),s.indexOf('function continueInSavedDraft('));
 assert.match(add,/if \(!addItemId \|\| addPending.current/);
 assert.ok(add.indexOf('addPending.current = true')<add.indexOf('await previewStockCountItem'));
 assert.match(add,/request!==addRequest.current/);
 assert.match(s,/function closeAddItem\(\) \{ addRequest.current \+= 1; addPending.current = false/);
});
