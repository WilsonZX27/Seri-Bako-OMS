const test=require('node:test'),assert=require('node:assert/strict');
const {compile}=require('./helpers/render-workspaces.cjs');
const line='11111111-1111-4111-8111-111111111111',batch='22222222-2222-4222-8222-222222222222';
function harness(complete){const calls=[];const Route=compile('src/app/(app)/asset-management/transfers/[id]/page.tsx',{
 '@/components/sortable-table':{PaginationControls:()=>null},
 '@/server/queries/assets':{getAssetTransferBatchDetail:async id=>{calls.push({batch:id});return id===batch&&complete?{transfer:{id:batch},lines:[{},{}]}:null},getAssetTransferDetail:async()=>({transfer:{batch_id:batch}})},
 '@/server/auth/permissions':{getPermissionMap:async()=>({})},'next/navigation':{redirect:path=>{throw Error('REDIRECT:'+path)},notFound:()=>{throw Error('NOTFOUND')}},
 '@/components/asset-transfer-batch-detail':{AssetTransferBatchDetail:()=>null},'@/components/asset-transfer-form':{AssetTransferAction:()=>{throw Error('No single-line action for batches')}},
 '@/lib/asset-transfer':{assetTransferActions:()=>[]},'@/components/ui/empty-state':{EmptyState:()=>null},'@/lib/utils':{},
 }).default;return {calls,run:()=>Route({params:Promise.resolve({id:line}),searchParams:Promise.resolve({})})};}
test('legacy batch-line URL redirects only after the complete visible batch can be read',async()=>{
 const h=harness(true);await assert.rejects(h.run(),new RegExp('REDIRECT:/asset-management/transfers/'+batch));assert.equal(h.calls[1].batch,batch);
});
test('incomplete batch read contract shows a safe unavailable page, not single-line actions or a broken redirect',async()=>{
 const h=harness(false);const result=await h.run();assert.ok(result);assert.equal(h.calls[1].batch,batch);
});
