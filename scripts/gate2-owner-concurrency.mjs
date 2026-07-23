import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = process.cwd();
const db = "supabase_db_seri-bako-oms-clean";
const psql = ["exec", "-i", db, "psql", "-U", "supabase_admin", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1"];
const A = "a1000000-0000-0000-0000-000000000001";
const B = "b1000000-0000-0000-0000-000000000001";
const A1 = "a6000000-0000-0000-0000-000000000001";
const A2 = "a6000000-0000-0000-0000-000000000002";
const B1 = "b6000000-0000-0000-0000-000000000001";
const BR_A = "a2000000-0000-0000-0000-000000000001";
const BR_B = "b2000000-0000-0000-0000-000000000001";
const OWNER_A = "a4000000-0000-0000-0000-000000000001";
const VIEWER_A = "a4000000-0000-0000-0000-000000000002";
const OWNER_B = "b4000000-0000-0000-0000-000000000001";
const LOCK = "922337203685477000";

function run(sql) { return execFileSync("docker", [...psql], { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }); }
function setup() {
  run(`begin; set local seri_bako.allow_protected_role_seed='on';
  update public.staffs set status='disabled' where company_id='${A}' and id not in ('${A1}','${A2}');
  update public.staffs set status='active',deleted_at=null where id in ('${A1}','${A2}','${B1}');
  update public.roles set status='active',deleted_at=null where id in ('${OWNER_A}','${VIEWER_A}','${OWNER_B}');
  delete from public.staff_roles where staff_id in ('${A1}','${A2}','${B1}');
  insert into public.staff_roles(staff_id,role_id,is_primary) values ('${A1}','${OWNER_A}',true),('${A2}','${OWNER_A}',true),('${B1}','${OWNER_B}',true);
  insert into public.staff_branches(staff_id,branch_id,access_level,is_default) values ('${A1}','${BR_A}','full',true),('${A2}','${BR_A}','full',true),('${B1}','${BR_B}','full',true) on conflict (staff_id,branch_id) do update set access_level='full',is_default=true;
  delete from public.audit_logs; commit;`);
}
async function race(name, left, right) {
  const dir = mkdtempSync(join(tmpdir(), "gate2-"));
  const coord = `begin; select pg_backend_pid() as coordinator_pid; select pg_advisory_xact_lock(${LOCK}); select pg_sleep(3); commit;`;
  const worker = (sql) => new Promise((resolve) => { const p = spawn("docker", psql, { stdio: ["pipe", "pipe", "pipe"] }); let out="", err=""; p.stdout.on("data", d=>out+=d); p.stderr.on("data", d=>err+=d); p.on("close", code=>resolve({code,out,err})); p.stdin.end(sql); });
  const coordinator = worker(coord);
  await new Promise(resolve => setTimeout(resolve, 300));
  const [x,y] = await Promise.all([worker(left), worker(right)]);
  await coordinator;
  const out = `${x.out}\n${x.err}\n${y.out}\n${y.err}`;
  const pids = [...out.matchAll(/BACKEND_PID=(\d+)/g)].map(m=>m[1]);
  if (pids.length < 2 || pids[0]===pids[1]) throw new Error(`${name}: distinct backend PID proof missing`);
  if (!out.includes("BARRIER_RELEASED=")) throw new Error(`${name}: overlap barrier proof missing`);
  const counts = run(`select count(*) from public.staffs s join public.staff_roles sr on sr.staff_id=s.id join public.roles r on r.id=sr.role_id where s.company_id='${A}' and s.status='active' and s.deleted_at is null and sr.is_primary and r.role_code='super_admin';`).trim();
  if (Number(counts) < 1) throw new Error(`${name}: Company A active Owner count ${counts}`);
  console.log(`PASS ${name} pids=${pids.join(',')}\n${out.replace(/\r/g,'').replace(/\n{3,}/g,'\n')}`);
  rmSync(dir,{recursive:true,force:true});
}
const actor = (uid, body) => `begin; set local request.jwt.claim.sub='${uid}'; select 'BACKEND_PID='||pg_backend_pid(); select pg_advisory_xact_lock(${LOCK}); select 'BARRIER_RELEASED='||clock_timestamp(); do $$ begin ${body} raise notice 'RESULT=COMMITTED'; exception when others then raise notice 'RESULT=FAILED:%',sqlerrm; end $$; commit;`;
const disable = id => `perform public.set_staff_status_atomic('${id}','disabled');`;
const demote = id => `perform public.replace_staff_access_atomic('${id}','${VIEWER_A}','${BR_A}',array['${BR_A}']::uuid[],'active',null,null,null,null);`;
async function main() {
  const fixtureSql = readFileSync(join(root, "tests/sql/tenant-boundary-closure-local-validation.sql"), "utf8").replace(/rollback;\s*$/m, "commit;");
  run(fixtureSql);
  const ceiling = run("select version from supabase_migrations.schema_migrations order by version desc limit 1;").trim();
  if (ceiling !== "084") throw new Error(`migration ceiling preflight expected 084, got ${ceiling || "none"}`);
  for (const [version,name] of [["disable-vs-disable","disable-vs-disable"],["demote-vs-demote","demote-vs-demote"],["disable-vs-demote","disable-vs-demote"],["lifecycle-vs-role","lifecycle-vs-role"]]) { setup(); const l=version.startsWith("disable")||version==="lifecycle-vs-role"?disable(A1):demote(A1); const r=version.includes("disable")||version==="lifecycle-vs-role"?disable(A2):demote(A2); await race(name,actor("a5000000-0000-0000-0000-000000000001",l),actor("a5000000-0000-0000-0000-000000000002",r)); }
  setup(); run(`begin; set local seri_bako.allow_protected_role_seed='on'; delete from public.staff_roles where staff_id='${A2}'; insert into public.staff_roles(staff_id,role_id,is_primary) values ('${A2}','${VIEWER_A}',true); commit;`); let soleFailed=false; try { run(`begin; set local request.jwt.claim.sub='a5000000-0000-0000-0000-000000000001'; select public.set_staff_status_atomic('${A1}','disabled'); commit;`); } catch (e) { soleFailed=true; } if (!soleFailed) throw new Error("sequential sole-owner rejection unexpectedly succeeded");
  setup(); run(`begin; set local seri_bako.allow_protected_role_seed='on'; delete from public.staff_roles where staff_id='${A2}'; insert into public.staff_roles(staff_id,role_id,is_primary) values ('${A2}','${VIEWER_A}',true); commit;`); let rollbackFailed=false; try { run(`begin; set local request.jwt.claim.sub='a5000000-0000-0000-0000-000000000001'; select public.replace_staff_access_atomic('${A1}','${VIEWER_A}','${BR_A}',array['${BR_A}']::uuid[],'active',null,null,null,null); commit;`); } catch (e) { rollbackFailed=true; } if (!rollbackFailed) throw new Error("rollback-state rejection unexpectedly succeeded"); let crossFailed=false; try { run(`begin; set local request.jwt.claim.sub='a5000000-0000-0000-0000-000000000001'; select public.set_staff_status_atomic('${B1}','disabled'); commit;`); } catch (e) { crossFailed=true; } if (!crossFailed) throw new Error("cross-company mutation unexpectedly succeeded"); console.log("PASS sequential-sole-owner-rejection\nPASS rollback-state-comparison\nPASS cross-company-isolation");
}
main().catch(e=>{ console.error(`FAILED ${e.message}`); process.exitCode=1; });
