const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');
const exports_ = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/procurement/purchase-request-draft.ts', 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {exports:exports_});
const {purchaseRequestDraftSignature:signature,purchaseRequestSubmitBlock:block}=exports_;
const line={itemId:'item-a',itemSearch:'A - Item',qty:'3',uom:'KG',supplierId:'supplier-a',cost:'0',remarks:'',reason:''};
const draft={branchId:'branch-a',supplierId:'supplier-a',priority:'normal',neededByDate:'2026-11-03',remarks:'',lines:[line]};

test('every persisted editor value and non-catalog description marks the draft dirty',()=>{
  for(const [field,value] of Object.entries({branchId:'other',priority:'urgent',neededByDate:'2026-11-04',remarks:'Change'})) assert.notEqual(signature(draft),signature({...draft,[field]:value}),field);
  for(const [field,value] of Object.entries({itemId:'other',qty:'10',uom:'CAN',supplierId:'other',cost:'2',remarks:'Changed',reason:'Changed'})) assert.notEqual(signature(draft),signature({...draft,lines:[{...line,[field]:value}]}),field);
  const unresolved={...line,itemId:'',itemSearch:'Requested powder'};
  assert.notEqual(signature({...draft,lines:[unresolved]}),signature({...draft,lines:[{...unresolved,itemSearch:'Requested oil'}]}));
  assert.notEqual(signature(draft),signature({...draft,lines:[]}));
  assert.notEqual(signature(draft),signature({...draft,lines:[line,{...line,itemId:'new'}]}));
});

test('successful numeric normalization, unordered DB rows, labels and unsaved-only metadata do not trap saved requests',()=>{
  assert.equal(signature(draft),signature({...draft,lines:[{...line,qty:'3.000',cost:'0.00',itemSearch:'Renamed catalogue label'}]}));
  const second={...line,itemId:'b'};
  assert.equal(signature({...draft,lines:[line,second]}),signature({...draft,lines:[second,line]}));
  const unresolved={...line,itemId:'',itemSearch:'Oil',supplierId:'',cost:'0',reason:''};
  assert.equal(signature({...draft,supplierId:'',lines:[unresolved]}),signature({...draft,lines:[{...unresolved,supplierId:'chosen',cost:'1',reason:'not persisted'}]}));
  assert.equal(signature(draft),signature({...draft,lines:[line,{...line,itemId:'',itemSearch:'',qty:'',uom:''}]}));
});

test('save failure or concurrent server change cannot clear dirty state; a verified saved payload can',()=>{
  const edited={...draft,lines:[{...line,qty:'10'}]};
  assert.notEqual(signature(edited),signature(draft));
  assert.notEqual(signature(edited),signature({...draft,lines:[{...line,qty:'7'}]}));
  assert.equal(signature(edited),signature({...edited,lines:[{...line,qty:'10.000'}]}));
  assert.equal(signature(draft),signature({...edited,lines:[line]}));
});

test('submit fails closed for missing/mismatched editor, unsaved values and in-flight actions',()=>{
  assert.match(block(null,'pr-a'),/unavailable/);
  assert.match(block({dataset:{prRequestId:'pr-b',prDirty:'false'}},'pr-a'),/unavailable/);
  assert.match(block({dataset:{prRequestId:'pr-a'}},'pr-a'),/Save request/);
  assert.match(block({dataset:{prRequestId:'pr-a',prDirty:'true'}},'pr-a'),/Save request/);
  for(const operation of ['save','submit'])assert.match(block({dataset:{prRequestId:'pr-a',prDirty:'false',prOperation:operation}},'pr-a'),/finish/);
  assert.match(block({dataset:{prRequestId:'pr-a',prDirty:'false',prSaveFailed:'true'}},'pr-a'),/not confirmed/);
  assert.equal(block({dataset:{prRequestId:'pr-a',prDirty:'false'}},'pr-a'),'');
});

test('both detail Submit entries use the PR guard; new creation and approval forms retain their existing owners',()=>{
  const page=fs.readFileSync('src/app/(app)/purchase-requests/[id]/page.tsx','utf8');
  assert.equal((page.match(/<PurchaseRequestSubmit requestId=\{request.id\}/g)||[]).length,2);
  assert.match(page,/guardRequestId=\{request.id\}/);
  assert.doesNotMatch(page,/DocumentActionForm action=\{submitPurchaseRequest/);
  assert.match(page,/ConfirmActionForm action=\{managerApprovePurchaseRequest/);
  assert.match(page,/ConfirmActionForm action=\{financeApprovePurchaseRequest/);
  const create=fs.readFileSync('src/app/(app)/purchase-requests/new/page.tsx','utf8');
  assert.doesNotMatch(create,/guardRequestId|PurchaseRequestSubmit/);
});
