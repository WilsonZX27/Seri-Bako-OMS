const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, URLSearchParams, Intl, require(id) {
    if (id in mocks) return mocks[id];
    throw Error(`Unexpected import: ${id}`);
  }});
  return exports;
}
const location = load('src/lib/asset-location-display.ts');
test('OMS branch labels override legacy aliases and missing mapping stays explicit and identifiable', () => {
  const row = { source_name: 'PNG - ALMA (Central Kitchen)', kind: 'branch', branch_id: 'alma' };
  assert.equal(location.assetLocationDisplayName(row, new Map([['alma', 'CK @ ALMA']])), 'CK @ ALMA');
  for (const branches of [new Map(), new Map([['alma', '   ']])]) {
    assert.equal(location.assetLocationDisplayName(row, branches), 'PNG - ALMA (Central Kitchen) · Unmapped location');
  }
  assert.equal(location.assetLocationDisplayName({ ...row, branch_id: null }, new Map()), 'PNG - ALMA (Central Kitchen) · Unmapped location');
  assert.equal(location.assetLocationDisplayName({ ...row, kind: 'event' }, new Map()), row.source_name);
  assert.equal(row.source_name, 'PNG - ALMA (Central Kitchen)');
});
const metrics = load('src/lib/operational-value-display.ts', { '@/lib/utils': { formatNumber: String, formatQuantity: String } });
const daily = { total_received: null, received_pending_lines: 16, received_zero_with_sent: false, total_wastage: 159, wastage_percent: null, status: 'draft' };
test('compact daily cards distinguish pending quantities from confirmed zero and unfinalized wastage', () => {
  assert.equal(metrics.receivedDisplay(daily).value, 'Pending');
  assert.equal(metrics.receivedDisplay(daily).title, '16 food lines still need a Received value');
  assert.equal(metrics.receivedDisplay({ ...daily, total_received: 0, received_pending_lines: 0 }).value, '0');
  assert.equal(metrics.receivedDisplay({ ...daily, total_received: 0, received_zero_with_sent: true }).value, '0 · verify');
  assert.equal(metrics.compactWastageDisplay(daily).value, 'Not final');
  assert.equal(metrics.compactWastageDisplay(daily).title, 'Draft wastage: 159; not final');
  assert.equal(metrics.wastageDisplay(daily).value, '159'); // Detailed/table view retains the saved draft quantity.
  assert.equal(metrics.compactWastageDisplay({ ...daily, status: 'evening_completed', total_wastage: 0 }).value, '0');
  assert.equal(metrics.compactWastageDisplay({ ...daily, status: 'reviewed', total_wastage: 3.5 }).value, '3.5');
  assert.equal(metrics.compactWastageDisplay({ ...daily, status: 'reviewed' }).title, 'Pending receipt');
});
const transfers = load('src/lib/asset-transfer.ts');
test('selecting and changing an asset preserve GET search/page without introducing extra query parameters', () => {
  const query = { q: 'Chiller & fridge=2', page: 3 };
  const selected = new URL(transfers.assetTransferPickerHref(query, 'asset-1'), 'https://oms.example');
  assert.equal(selected.pathname, '/asset-management/transfers/new');
  assert.equal(selected.searchParams.get('q'), query.q);
  assert.equal(selected.searchParams.get('page'), '3');
  assert.equal(selected.searchParams.get('asset'), 'asset-1');
  assert.equal([...selected.searchParams].length, 3);
  const picker = new URL(transfers.assetTransferPickerHref(query), selected);
  assert.equal(picker.searchParams.get('q'), query.q);
  assert.equal(picker.searchParams.get('page'), '3');
  assert.equal(picker.searchParams.has('asset'), false);
  assert.equal(transfers.assetTransferPickerHref({}), '/asset-management/transfers/new');
});
test('repair dedup keeps distinct IDs and out-of-cap notifications while removing only a displayed duplicate', async () => {
  const routes = load('src/lib/document-routing.ts');
  const pending = ['a', 'b', 'd', 'e', 'f', 'c'].map(id => ({ id: `maintenance-${id}`, href: `/asset-management/maintenance/${id}`, document_no: 'Repair request', title: 'Same device', branch_name: 'CK @ ALMA' }));
  const notices = ['a', 'b', 'c'].map(id => ({ id: `notice-${id}`, entity_type: 'asset_maintenance', entity_id: id, action_url: '/asset-management?view=maintenance', title: 'Repair', is_company_wide: false, read_at: null }));
  const db = { from(name) {
    assert.equal(name, 'documents');
    const chain = { select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return Promise.resolve({ data: [], error: null }); } };
    return chain;
  }};
  const topbar = load('src/server/queries/topbar.ts', {
    '@/server/queries/repair-notification-identity': { getRepairNotificationIdentities: async () => { throw Error('Permission gate must prevent identity reads'); } },
    '@/lib/supabase/server': { createClient: async () => db },
    '@/lib/supabase/loose': { looseSupabase: x => x },
    '@/lib/document-routing': routes,
    '@/lib/mock-mode': { isMockMode: () => false, mockDocuments: [] },
    '@/server/auth/permissions': { hasPermission: async () => false },
    '@/server/queries/notifications': { getCurrentUserScope: async () => ({ roleCode: 'maintenance' }), getVisibleNotificationsForCurrentUser: async () => notices },
    '@/server/queries/pending-actions': { getCurrentUserPendingActionSnapshot: async () => ({ items: pending, attentionHrefs: pending.map(x => x.href), unavailable: false }) },
    '@/server/observability/logger': { logServerWarning() { throw Error('Unexpected warning'); } },
  });
  const result = await topbar.getTopBarActivity();
  assert.equal(result.pendingApprovals.length, 5);
  assert.ok(result.pendingApprovals.some(x => x.id === 'maintenance-a'));
  assert.ok(result.pendingApprovals.some(x => x.id === 'maintenance-b'));
  assert.equal(result.notifications.length, 1);
  assert.equal(result.notifications[0].id, 'notice-c');
  assert.equal(result.notifications[0].action_url, '/asset-management/maintenance/c');
  assert.ok(result.attentionHrefs.includes('/asset-management/maintenance/c'));
});
test('daily row hydration uses the actual submitter and never substitutes the creator/updater', async () => {
  const source = ts.createSourceFile('query.ts', fs.readFileSync('src/server/queries/outlet-daily-records.ts', 'utf8'), ts.ScriptTarget.Latest, true);
  const fn = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'hydrateRows');
  let requestedActors;
  const context = {
    resolveActorDisplayMap: async ids => { requestedActors = [...ids]; return new Map([['creator', 'CREATOR'], ['submitter', 'SUBMITTER'], ['editor', 'EDITOR']]); },
    actorDisplayName: (map, id) => map.get(id) ?? null,
    isPackagingCategory: () => false,
    totals: () => ({ total_received: null, total_wastage: 0 }),
  };
  vm.runInNewContext(ts.transpileModule(fn.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const db = { from(table) { return { select() { return this; }, async in() { return { data: table === 'branches' ? [{ id: 'alma', branch_name: 'CK @ ALMA' }] : [], error: null }; } }; } };
  const result = await context.hydrateRows(db, [
    { id: 'record-a', branch_id: 'alma', created_by: 'creator', submitted_by: 'submitter', updated_by: 'editor' },
    { id: 'record-b', branch_id: 'alma', created_by: 'creator', submitted_by: null, updated_by: 'editor' },
  ]);
  assert.equal(result[0].branch_name, 'CK @ ALMA');
  assert.equal(result[0].submitted_by_name, 'SUBMITTER');
  assert.equal(result[0].updated_by_name, 'EDITOR');
  assert.equal(result[1].submitted_by_name, null);
  assert.deepEqual(requestedActors.sort(), ['creator', 'editor', 'submitter']);
  assert.equal(result[0].total_received, null);
});
test('Today uses Kuala Lumpur midnight rather than the execution host calendar', () => {
  const dates = load('src/lib/business-date.ts');
  assert.equal(dates.todayInKualaLumpur(new Date('2026-10-22T15:59:59Z')), '2026-10-22');
  assert.equal(dates.todayInKualaLumpur(new Date('2026-10-22T16:00:00Z')), '2026-10-23');
});

test('visible repair notices gain identity and distinct references without changing IDs or destinations', async () => {
  const notices = ['11111111-aaaa','22222222-bbbb'].map(id => ({id:`notice-${id}`,entity_type:'asset_maintenance',entity_id:id,action_url:`/asset-management/maintenance/${id}`,title:'Repair needs attention',message:'Review the maintenance queue.',is_company_wide:false,read_at:null}));
  const db={from(name){assert.equal(name,'documents');const chain={select(){return this;},eq(){return this;},order(){return this;},limit(){return Promise.resolve({data:[],error:null});}};return chain;}};
  let enriched;
  const topbar=load('src/server/queries/topbar.ts',{
    '@/server/queries/repair-notification-identity':{getRepairNotificationIdentities:async(client,rows)=>{assert.equal(client,db);enriched=rows;return new Map(rows.map(row=>[row.entity_id,'Same chiller · AS-1 · CK @ ALMA']));}},
    '@/lib/supabase/server':{createClient:async()=>db},'@/lib/supabase/loose':{looseSupabase:x=>x},'@/lib/document-routing':load('src/lib/document-routing.ts'),
    '@/lib/mock-mode':{isMockMode:()=>false,mockDocuments:[]},'@/server/auth/permissions':{hasPermission:async permission=>['assets.maintenance','assets.view'].includes(permission)},
    '@/server/queries/notifications':{getCurrentUserScope:async()=>({roleCode:'maintenance'}),getVisibleNotificationsForCurrentUser:async()=>notices},
    '@/server/queries/pending-actions':{getCurrentUserPendingActionSnapshot:async()=>({items:[],attentionHrefs:[],unavailable:false})},
    '@/server/observability/logger':{logServerWarning(){throw Error('Unexpected warning');}},
  });
  const result=await topbar.getTopBarActivity();assert.equal(enriched.length,2);
  for(let i=0;i<2;i++){const row=result.notifications[i];assert.equal(row.id,notices[i].id);assert.equal(row.action_url,notices[i].action_url);assert.equal(row.title,'Repair request');assert.match(row.message,/Same chiller · AS-1 · CK @ ALMA/);assert.ok(row.message.endsWith(notices[i].entity_id.slice(0,8)));}
  assert.notEqual(result.notifications[0].message,result.notifications[1].message);
});
