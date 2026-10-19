const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const load = require('./helpers/load-source.cjs')();
const { signInSchema } = load('src/server/auth/auth-input.ts');
test('login accepts normalized email or username without accepting malformed identifiers', () => {
 for(const [input,expected] of [[' Alan ', 'alan'],['Aiden_2','aiden_2'],['Person@Example.com','person@example.com']]) {
  const result=signInSchema.safeParse({email:input,password:'test-password'});
  assert.equal(result.success,true); assert.equal(result.data.email,expected);
 }
 for(const email of ['ab','bad name','a@','a'.repeat(33),'admin%','']) assert.equal(signInSchema.safeParse({email,password:'password'}).success,false);
 assert.equal(signInSchema.safeParse({email:'alan',password:''}).success,false);
});
test('username uniqueness is global and profile updates keep existing atomic authorization',()=>{
 const sql=fs.readFileSync('supabase/migrations/366_staff_usernames.sql','utf8');
 assert.match(sql,/unique index.*on public.staffs\(lower\(username\)\)/);
 assert.match(sql,/result:=public.replace_staff_access_atomic/);
 assert.match(sql,/from public,anon/);
 assert.ok(sql.indexOf('public.replace_staff_access_atomic(')<sql.indexOf('update public.staffs set username'));
});
test('Chef copies Kitchen permissions without being added to schedule eligibility',()=>{
 const sql=fs.readFileSync('supabase/migrations/365_chef_role.sql','utf8');
 assert.match(sql,/join public.role_permissions rp on rp.role_id=kitchen.id/);
 assert.match(sql,/r\.role_code in \('kitchen','chef'\).*r\.status='active'/);
 assert.doesNotMatch(sql,/create or replace function public.is_staff_schedule_eligible/);
 const roles=load('src/lib/roles.ts');
 assert.equal(roles.isSystemRoleCode('chef'),true);
 assert.equal(roles.hasCompanyWideOperationalScope('chef'),false);
 assert.equal(roles.getRoleDisplayLabel('chef'),'Chef');
});
test('temporary password handoff follows the People security route',()=>{
 const handoff=fs.readFileSync('src/server/auth/temporary-password-handoff.ts','utf8');
 const actions=fs.readFileSync('src/server/actions/foundation.ts','utf8');
 assert.match(handoff,/path: `\/people\/\$\{staffId\}`/);
 assert.match(actions,/redirect\(`\/people\/\$\{id\}\?section=security&success=/);
 assert.match(actions,/redirect\(`\/people\/\$\{createdStaffId\}\?section=security`\)/);
});
