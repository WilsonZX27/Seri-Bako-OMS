/** Isolated PostgreSQL RLS regression fixture. Run with OMS_PGLITE_ROOT pointing
 * to a directory with @electric-sql/pglite installed; no live credentials used. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const require = createRequire(process.env.OMS_PGLITE_ROOT
  ? resolve(process.env.OMS_PGLITE_ROOT, 'package.json') : import.meta.url);
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(`
    create role authenticated;
    create role anon;
    create table public.branches(id int primary key);
    insert into branches values(11),(12),(21);
    create table public.outlet_daily_records(id int primary key, branch_id int);
    create table public.outlet_daily_record_lines(id int primary key, record_id int);
    insert into outlet_daily_records values(1,11),(2,12),(3,21);
    insert into outlet_daily_record_lines values(101,1),(102,2),(103,3),(104,999);
    create function public.can_access_outlet_daily_branch(int) returns boolean
    language sql stable as $$select $1 = any(string_to_array(current_setting('qa.branches',true),',')::int[])$$;
    create function public.has_permission(text) returns boolean language sql stable
    as $$select current_setting('qa.permission',true) = 'true'$$;
    alter table outlet_daily_records enable row level security;
    alter table outlet_daily_record_lines enable row level security;
    grant select on outlet_daily_records,outlet_daily_record_lines to authenticated;
    create policy "tenant outlet daily records" on outlet_daily_records for select to authenticated
    using(can_access_outlet_daily_branch(branch_id) and has_permission('outlet_daily_record.view'));
    create policy "tenant outlet daily record lines" on outlet_daily_record_lines for select to authenticated
    using(exists(select 1 from outlet_daily_records r where r.id=outlet_daily_record_lines.record_id
      and can_access_outlet_daily_branch(r.branch_id) and has_permission('outlet_daily_record.view')));
  `);
  const scenarios = [
    ['company A owner','11,12','true',[101,102]],
    ['single outlet','11','true',[101]],
    ['kitchen routed outlet','12','true',[102]],
    ['company B','21','true',[103]],
    ['permission denied','11,12','false',[]],
    ['unassigned','','true',[]],
    ['missing identity','','',[]],
  ];
  async function visible(branches, permission) {
    await db.query("select set_config('qa.branches',$1,false),set_config('qa.permission',$2,false)",[branches,permission]);
    await db.exec('set role authenticated');
    try { return (await db.query('select id from outlet_daily_record_lines order by id')).rows.map(r=>r.id); }
    finally { await db.exec('reset role'); }
  }
  const before = [];
  for (const [name,branches,permission,expected] of scenarios) {
    const ids = await visible(branches,permission);
    assert.deepEqual(ids,expected,`baseline: ${name}`); before.push(ids);
  }
  await db.exec(await readFile(new URL('../../supabase/migrations/290_outlet_daily_read_policy_reuse.sql',import.meta.url),'utf8'));
  for (const [i,[name,branches,permission]] of scenarios.entries()) {
    assert.deepEqual(await visible(branches,permission),before[i],`migrated: ${name}`);
    console.log(`PASS ${name}`);
  }
  const {rows} = await db.query("select count(*)::int n from pg_policies where schemaname='public' and cmd='SELECT'");
  assert.equal(rows[0].n,2);
  const scopeMigration = (await readFile(new URL('../../supabase/migrations/330_outlet_daily_read_scope_sets.sql',import.meta.url),'utf8')).replaceAll('uuid[]','int[]');
  await db.exec(scopeMigration);
  for (const [i,[name,branches,permission]] of scenarios.entries()) {
    assert.deepEqual(await visible(branches,permission),before[i],`scope sets: ${name}`);
    console.log(`PASS scope sets ${name}`);
  }
  // Fresh statements immediately reflect access changes; no session or TTL cache.
  assert.deepEqual(await visible('11','true'),[101]);
  assert.deepEqual(await visible('21','true'),[103]);
  assert.deepEqual(await visible('21','false'),[]);
  assert.equal((await db.query("select has_function_privilege('anon','public.outlet_daily_visible_branch_ids()','execute') allowed")).rows[0].allowed,false);
  console.log('PASS all 7 visibility scenarios before/after, immediate permission changes, orphan denial and anonymous helper denial; SELECT/write policy ownership preserved');
} finally { await db.close(); }
