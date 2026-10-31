const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {compile,React,renderToStaticMarkup}=require('./helpers/render-workspaces.cjs');
const read=p=>fs.readFileSync(p,'utf8');
test('transfer timeline groups only matching batch events and excludes audit internals',()=>{
 const Timeline=compile('src/components/asset-transfer-timeline.tsx').AssetTransferTimeline;
 const first={id:'1',created_at:'2026-10-30T09:00:00Z',author_name:'Fixture staff',source_data:{'Status Before':'dispatched','Status After':'received','Actor ID':'private-id'}};
 const history=[first,{...first,id:'2'},{...first,id:'3',created_at:'2026-10-30T10:00:00Z'}];
 const grouped=renderToStaticMarkup(React.createElement(Timeline,{history,groupBatchEvents:true}));
 assert.equal((grouped.match(/Transfer received/g)||[]).length,2);assert.doesNotMatch(grouped,/private-id|Complete update record/);assert.match(grouped,/lucide-clock/);
 const legacy=renderToStaticMarkup(React.createElement(Timeline,{history}));assert.equal((legacy.match(/Transfer received/g)||[]).length,3);
});
test('pagination is outside maintenance and inspection scroll bodies',()=>{
 const page=read('src/app/(app)/asset-management/page.tsx');
 assert.equal((page.match(/<div className={annotationStyles.queueBody}>\{recordContent\}<\/div>\{recordPagination/g)||[]).length,2);
 const css=read('src/app/(app)/asset-management/annotation21.module.css');assert.match(css,/\.queueBody \{ min-height: 0; flex: 1; overflow-y: auto/);assert.doesNotMatch(css,/\.maintenance > div \{/);
 assert.match(page,/<AssetMaintenanceQueue plain records=/);
});
test('document display names never change action location membership',()=>{
 for(const p of ['src/components/asset-transfer-batch-detail.tsx','src/app/(app)/asset-management/transfers/[id]/page.tsx']){
  const s=read(p);assert.match(s,/canAccessSource: locations.has/);assert.match(s,/canAccessDestination: locations.has/);assert.match(s,/transfer.from_location_name \?\? locations.get/);
 }
 const sql=read('docs/v10/proposals/asset-transfer-display-review-only.sql');assert.match(sql,/current_staff_id\(\) IS NULL/);assert.match(sql,/IS NOT TRUE/);assert.match(sql,/ARRAY\['super_admin','manager','chef','outlet_supervisor'\]/);assert.doesNotMatch(sql,/ALTER POLICY|GRANT SELECT|UPDATE public|INSERT INTO public/i);
});
test('destination creation stays owner-only and success uses feedback link',()=>{
 const route=read('src/app/(app)/asset-management/transfers/new/page.tsx'),form=read('src/components/asset-transfer-batch-form.tsx');
 assert.match(route,/canAddDestination=\{actor.roleCode === "super_admin"\}/);assert.doesNotMatch(route,/<AssetOtherLocationForm/);
 assert.match(form,/onCloseAutoFocus=/);assert.match(form,/linkLabel: "Open transfer"/);assert.doesNotMatch(form,/<Link[^>]+Open transfer/);
});
test('inspection footer fits navigation and transfer counts stay numeric',()=>{
 const css=read('src/app/(app)/asset-management/annotation21.module.css');
 assert.match(css,/max-height: min\(28rem, 55dvh\)/);
 assert.match(read('src/components/asset-transfer-rows.tsx'),/record\.batch_id \? record\.line_count : 1/);
 for(const p of ['src/components/asset-transfer-batch-detail.tsx','src/app/(app)/asset-management/transfers/[id]/page.tsx']) assert.match(read(p),/max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:shadow-none/);
});

test('asset detail transfer display resolves batch document labels without changing action membership',()=>{
 const query=read('src/server/queries/assets.ts');
 assert.match(query,/transfers: await withTransferDisplay\(db, results\[4\]\.data as AssetRecord\[\]\)/);
 assert.match(query,/labels.get\(row.batch_id \?\? row.id\)/);
 const page=read('src/app/(app)/asset-management/assets/[id]/page.tsx');
 assert.match(page,/t.from_location_name \?\? locations.get/);
 assert.match(page,/canAccessSource=\{locations.has/);
});
