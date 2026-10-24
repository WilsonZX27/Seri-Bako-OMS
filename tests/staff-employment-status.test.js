const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const load=require('./helpers/load-source.cjs')({});
const {staffEmploymentStatus:status,employmentSignInBlockReason:reason}=load('src/lib/staff-employment-status.ts');
test('last working day is inclusive; ended employment overrides stale Active display',()=>{
 const staff={status:'active',employment_end_date:'2026-09-30'};
 assert.equal(status(staff,'2026-09-29'),'active');
 assert.equal(status(staff,'2026-09-30'),'active');
 assert.equal(status(staff,'2026-10-24'),'employment_ended');
 assert.match(reason(staff,'2026-10-24'),/last working date has passed/);
 assert.equal(staff.status,'active');
});
test('manual disable and archive remain authoritative; no auth-link assumption',()=>{
 assert.equal(status({status:'disabled',employment_end_date:'2026-09-30'},'2026-10-24'),'disabled');
 assert.equal(status({status:'active',deleted_at:'2026-09-30'},'2026-10-24'),'archived');
 assert.equal(status({},'2026-10-24'),'unknown');
 assert.equal(reason({status:'invited'},'2026-10-24'),null);
});
test('directory removes technical auth metadata and uses effective employment status',()=>{
 const source=fs.readFileSync('src/app/(app)/people/page.tsx','utf8');
 assert.doesNotMatch(source,/staffAuthStateLabels|statusMeta=/);
 assert.match(source,/staffEmploymentStatus/);
});
test('disable entry reuses permission/company/owner guards and existing audited action',()=>{
 const source=fs.readFileSync('src/components/staff-security-panel.tsx','utf8');
 assert.match(source,/hasPermission\("staffs.update"\)/);
 assert.match(source,/staff.company_id !== profile.company_id/);
 assert.match(source,/&& !isOwner/);
 assert.match(source,/action=\{disableStaff.bind\(null,id\)\}/);
 assert.match(source,/context.staff.status!=="disabled"/);
 assert.match(source,/Existing records are retained/);
 const action=fs.readFileSync('src/server/actions/foundation.ts','utf8');
 const disable=action.slice(action.indexOf('export async function disableStaff'),action.indexOf('export async function enableStaff'));
 assert.match(disable,/assertCanManageStaffAccount/);
 assert.match(disable,/set_staff_status_atomic/);
});
test('linked ended or disabled employees cannot fall back to a legacy profile',async()=>{
 const ts=require('typescript'),vm=require('vm');
 for(const staff of [{id:'s',status:'active',employment_end_date:'2026-09-30'},{id:'s',status:'disabled'},{id:'s',status:'active',deleted_at:'2026-09-30'}]){
  const calls=[],m={exports:{}};const db={from(table){calls.push(table);const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:staff})};return q}};
  const mocks={'react':{cache:fn=>fn},'@/lib/mock-mode':{isMockMode:()=>false},'@/lib/supabase/server':{createClient:async()=>db},'@/server/queries/auth-user':{getCurrentAuthUser:async()=>({data:{user:{id:'u'}}})},'@/lib/business-date':{todayInKualaLumpur:()=> '2026-10-24'}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/server/queries/common.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,require:n=>mocks[n]??{},process:{env:{}}});
  assert.equal(await m.exports.getCurrentProfile(),null);assert.deepEqual(calls,['staffs']);
 }
});
test('login and every middleware session check employment expiry separately from provider Auth',()=>{
 const login=fs.readFileSync('src/server/actions/auth.ts','utf8'),middleware=fs.readFileSync('src/lib/supabase/middleware.ts','utf8');
 assert.match(login,/employment_end_date < todayInKualaLumpur\(\)/);assert.match(login,/await supabase.auth.signOut\(\{ scope: "local" \}\);\s*return redirectToLoginError\("OMS access is inactive/);
 assert.match(middleware,/employment_end_date < todayInKualaLumpur\(\)/);assert.match(middleware,/\? "disabled" : staffRecord\?\.status/);
 assert.doesNotMatch(fs.readFileSync('src/lib/staff-employment-status.ts','utf8'),/Sign-in blocked|Auth.*ban/);
});
