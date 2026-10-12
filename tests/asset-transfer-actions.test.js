const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const context={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/asset-transfer.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);const {assetTransferActions:actions}=context.exports;
const access={canApprove:true,canTransfer:true,canAccessSource:true,canAccessDestination:true};
test('transfer action availability matches each location and lifecycle stage',()=>{
 assert.deepEqual(Array.from(actions('requested',access)),['approve','reject']);assert.deepEqual(Array.from(actions('approved',access)),['dispatch']);assert.deepEqual(Array.from(actions('dispatched',access)),['receive']);
 for(const status of ['received','rejected','unknown'])assert.equal(actions(status,access).length,0);
 assert.equal(actions('requested',{...access,canAccessSource:false}).length,0);assert.equal(actions('requested',{...access,canApprove:false}).length,0);assert.equal(actions('approved',{...access,canAccessSource:false}).length,0);assert.equal(actions('dispatched',{...access,canAccessDestination:false}).length,0);assert.equal(actions('dispatched',{...access,canTransfer:false}).length,0);
 assert.deepEqual(Array.from(actions('dispatched',{...access,canAccessSource:false})),['receive']);assert.deepEqual(Array.from(actions('approved',{...access,canAccessDestination:false})),['dispatch']);
});
