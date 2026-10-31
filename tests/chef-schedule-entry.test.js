const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./helpers/load-source.cjs')();
const ia = load('src/lib/information-architecture.ts');
const routes = load('src/server/auth/route-permissions.ts');
const { compile } = require('./helpers/render-workspaces.cjs');

test('Chef reaches planner with schedule.read, without attendance or payroll grants', () => {
  assert.deepEqual(Array.from(routes.getRoutePermissionCodes('/attendance/schedule')), ['schedule.read']);
  assert.ok(routes.getRouteAllowedRoles('/attendance/schedule').includes('chef'));
  assert.ok(ia.getVisibleIaItems('chef', {'schedule.read':true}).some(x=>x.href==='/attendance/schedule'));
  assert.ok(!ia.getVisibleIaItems('chef', {'schedule.read':false}).some(x=>x.href==='/attendance/schedule'));
});
test('Kitchen and unrelated attendance routes retain their existing boundary', () => {
  assert.ok(!routes.getRouteAllowedRoles('/attendance/schedule').includes('kitchen'));
  for (const path of ['/attendance','/attendance/review','/attendance/imports','/attendance/settings']) {
    assert.ok(!routes.getRouteAllowedRoles(path).includes('chef'), path);
  }
  assert.ok(!ia.getVisibleIaItems('kitchen', {'schedule.read':true}).some(x=>x.href==='/attendance/schedule'));
  for(const role of ['super_admin','people_operations','manager','outlet_supervisor','outlet_staff']) assert.ok(routes.getRouteAllowedRoles('/attendance/schedule').includes(role));
});
async function tabs(role, permissions) {
 const {AttendanceWorkspaceNav}=compile('src/components/attendance/attendance-workspace-nav.tsx', {
  '@/server/auth/permissions':{getPermissionMap:async()=>permissions},
  '@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>({roleCode:role})},
  '@/components/ui/workspace-tabs':{WorkspaceTabs:()=>null},
 });
 return (await AttendanceWorkspaceNav({current:'schedule'})).props.items.map(x=>x.href);
}
test('Chef workspace shows only permitted schedule entry; denied read shows no tab', async()=>{
 assert.deepEqual(Array.from(await tabs('chef',{'schedule.read':true})),['/attendance/schedule']);
 assert.deepEqual(Array.from(await tabs('chef',{'schedule.read':false})),[]);
});
test('Manager workspace and settings visibility remain unchanged',async()=>{
 assert.deepEqual(Array.from(await tabs('manager',{})),['/attendance','/attendance/schedule','/attendance/review','/attendance/confirmations','/attendance/payslips']);
 assert.ok((await tabs('super_admin',{'shift_template.manage':true})).includes('/attendance/settings'));
});
