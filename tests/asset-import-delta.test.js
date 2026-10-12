import test from 'node:test';
import assert from 'node:assert/strict';
import { planDelta, fingerprint } from '../scripts/assets/plan-import-delta.mjs';

const snapshot = () => ({ asset_import_batches: [{company_id:'company',source_sha256:'snapshot',state:'rehearsal'}],
  asset_locations: [], assets: [{id:'asset',company_id:'company',asset_code:'SB-TEST',item_name:'Tray',import_batch_id:'old'}],
  asset_master_updates: [], asset_holdings: [{id:'holding',company_id:'company',asset_id:'asset',location_id:'location',quantity:null}],
  asset_maintenance: [], asset_maintenance_updates: [], asset_daily_checks: [], asset_transfers: [],
  asset_transfer_updates: [], asset_attachments: [], asset_suppliers: [], asset_calendar_days: [] });

test('asset delta ignores batch metadata and canonical JSON key order', () => {
  const before = snapshot(), after = snapshot(); after.assets[0].import_batch_id='new';
  assert.equal(planDelta(before,after).changes.length,0);
  assert.equal(fingerprint({b:1,a:{y:2,x:1}}),fingerprint({a:{x:1,y:2},b:1}));
});
test('asset delta preserves unknown quantities and records reviewed changes without activation', () => {
  const before=snapshot(),after=snapshot();after.asset_holdings[0].quantity=0;
  const plan=planDelta(before,after);
  assert.equal(plan.changes[0].before.quantity,null);assert.equal(plan.changes[0].after.quantity,0);
  assert.equal(plan.changes[0].expected,fingerprint(before.asset_holdings[0]));
  assert.equal(plan.ready_for_cutover,false);assert.equal(plan.ready_for_rehearsal,true);
});
test('asset delta rejects silent removals and historical row-key reuse', () => {
  const before=snapshot(),after=snapshot();after.assets=[];
  assert.equal(planDelta(before,after).ready_for_rehearsal,false);
  before.asset_daily_checks=[{id:'row-key',company_id:'company',asset_id:'asset',location_id:'location',submission_id:'old',check_date:'2026-10-08'}];
  after.asset_daily_checks=[{...before.asset_daily_checks[0],submission_id:'different'}];
  assert.match(planDelta(before,after).issues.at(-1).reason,/changed identity/);
  before.asset_daily_checks=[];after.asset_daily_checks=[];after.assets=before.assets;
  before.asset_attachments=[{id:'photo',company_id:'company',asset_id:'asset',maintenance_id:'request-a',location_id:'outlet-a',url:'same-file'}];
  after.asset_attachments=[{...before.asset_attachments[0],maintenance_id:'request-b'}];
  assert.equal(planDelta(before,after).ready_for_rehearsal,false);
  assert.match(planDelta(before,after).issues.at(-1).reason,/changed identity/);
});
test('asset delta fails closed for company mismatch, duplicate IDs and missing tables', () => {
  const before=snapshot(),after=snapshot();after.asset_import_batches[0].company_id='other';
  assert.throws(()=>planDelta(before,after),/companies differ/);
  const duplicate=snapshot();duplicate.assets.push({...duplicate.assets[0]});
  assert.throws(()=>planDelta(before,duplicate),/identity/);
  const missing=snapshot();delete missing.asset_holdings;
  assert.throws(()=>planDelta(before,missing),/Missing table/);
});
