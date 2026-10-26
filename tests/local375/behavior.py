"""Synthetic DB only. Actual repository helpers/resolver; no browser or production endpoint."""
import subprocess,json,time
from pathlib import Path
D=['docker','exec','-i','oms375-continuation-synthetic-20261027','psql','-U','supabase_admin','-d','oms375_synthetic','-v','ON_ERROR_STOP=1','-At']
def uid(n):return f'00000000-0000-4000-8000-{n:012d}'
def q(n):return "'"+uid(n)+"'"
def run(sql):return subprocess.run(D,input=sql,text=True,capture_output=True)
# Tables deliberately allow malformed role links so the new local guard is exercised.
def seed():
 return f"""truncate staffs,roles,staff_roles,permissions,role_permissions,staff_permission_overrides,staff_branches,purchase_requests,suppliers,items,supplier_items,branch_supplier_items,purchase_request_lines,purchase_request_unresolved_lines,activity_logs;
 insert into staffs values({q(1)},{q(11)},{q(100)},'active',null,null);
 insert into roles values({q(2)},{q(100)},'purchasing','active',null);
 insert into staff_roles values({q(1)},{q(2)},current_date-1,null);
 insert into permissions values({q(3)},'pr.admin_review'),({q(4)},'pr.view_branch');
 insert into role_permissions values({q(2)},{q(3)}),({q(2)},{q(4)});
 insert into staff_branches values({q(1)},{q(101)});
 insert into purchase_requests values({q(5)},{q(100)},{q(101)},{q(1)},null,'admin_review',null,'2026-10-26Z');
 insert into suppliers values({q(6)},{q(100)},'active',null),({q(7)},{q(100)},'active',null);
 insert into items values({q(8)},{q(100)},{q(6)},'active',null,'PCS','PCS',9),({q(9)},{q(100)},{q(7)},'active',null,'PCS','PCS',12);
 insert into purchase_request_unresolved_lines values({q(10)},{q(5)},'unresolved',3,'PCS','keep remarks',null,null,null,null);
 select set_config('request.jwt.claim.sub',{q(11)},false);
 """
def call(supplier=6,version="'2026-10-26Z'"):return f'public.select_unassigned_purchase_request_supplier({q(5)},{q(supplier)},{version})'
def success(extra=''):
 return f"set local role authenticated;select {call()};reset role;do $$begin assert (select assigned_supplier_id={q(6)} from purchase_requests);assert (select count(*)=1 from activity_logs where created_by={q(1)} and company_id={q(100)});{extra}end$$;"
def failure(expected,expr=None):
 expr=expr or call()
 return f"""set local role authenticated;do $$begin begin perform {expr};exception when others then if position('{expected}' in sqlerrm)>0 then return;end if;raise;end;raise exception 'EXPECTED REFUSAL MISSING';end$$;reset role;do $$begin assert (select count(*)=0 from activity_logs);end$$;"""
cases=[]
def add(name,mutation='',expected=None,body=None):cases.append((name,mutation,body or (failure(expected) if expected else success())))
add('purchasing active same-company succeeds')
add('owner role super_admin succeeds',"update roles set role_code='super_admin';delete from role_permissions;")
for name,mutation in [('manager',"update roles set role_code='manager';"),('no actor',"select set_config('request.jwt.claim.sub','',false);"),('inactive staff',"update staffs set status='inactive';"),('deleted staff',"update staffs set deleted_at=now();"),('employment ended',"update staffs set employment_end_date=(now() at time zone 'Asia/Kuala_Lumpur')::date-1;"),('foreign role',f'update roles set company_id={q(200)};'),('deleted role',"update roles set deleted_at=now();"),('future role',"update staff_roles set effective_from=current_date+1;"),('expired role',"update staff_roles set effective_to=current_date-1;"),('inactive role',"update roles set status='inactive';"),('denied permission',f"insert into staff_permission_overrides values({q(1)},{q(3)},'deny');"),('no permission',f'delete from role_permissions where permission_id={q(3)};')]:add(name,mutation,'Purchasing Review permission')
add('last working day inclusive',"update staffs set employment_end_date=(now() at time zone 'Asia/Kuala_Lumpur')::date;")
add('explicit permission allow',f"delete from role_permissions where permission_id={q(3)};insert into staff_permission_overrides values({q(1)},{q(3)},'allow');")
add('foreign permission grant does not contaminate local role',f"delete from role_permissions where permission_id={q(3)};insert into roles values({q(20)},{q(200)},'other','active',null);insert into staff_roles values({q(1)},{q(20)},current_date-1,null);insert into role_permissions values({q(20)},{q(3)});",'Purchasing Review permission')
for name,mutation,expected in [('branch access denied','delete from staff_branches;','unavailable'),('foreign PR',f'update purchase_requests set company_id={q(200)};','unavailable'),('manager review',"update purchase_requests set status='manager_review';",'only during Purchasing'),('other status',"update purchase_requests set status='approved';",'only during Purchasing'),('deleted PR',"update purchase_requests set deleted_at=now();",'unavailable'),('inactive supplier',"update suppliers set status='inactive';",'active supplier'),('deleted supplier',"update suppliers set deleted_at=now();",'active supplier'),('foreign supplier',f'update suppliers set company_id={q(200)};','active supplier'),('foreign item',f'update items set company_id={q(200)};','eligible item'),('inactive item',"update items set status='inactive';",'eligible item'),('deleted item',"update items set deleted_at=now();",'eligible item'),('existing supplier',f'update purchase_requests set assigned_supplier_id={q(7)};','already assigned'),('no unresolved','delete from purchase_request_unresolved_lines;','no catalog lines'),('catalog exists',f'insert into purchase_request_lines(purchase_request_id,item_id) values({q(5)},{q(9)});','no catalog lines')]:add(name,mutation,expected)
add('null expected version',body=failure('request changed',call(version='null')))
add('stale expected version',body=failure('request changed',call(version="'2026-10-25Z'")))
maprow=f"insert into supplier_items values({q(30)},{q(100)},{q(8)},{q(6)},'active',null,'PCS',17,now());insert into branch_supplier_items values({q(101)},{q(8)},{q(30)},'active',null,true);"
add('exact branch mapping',f'update items set supplier_id=null where id={q(8)};'+maprow)
add('other branch alone is not new recovery authority',f'update items set supplier_id=null where id={q(8)};'+maprow+f'update branch_supplier_items set branch_id={q(102)};','eligible item')
add('inactive mapping blocks fallback',maprow+"update supplier_items set status='inactive';",'eligible item')
add('malformed mapping item relationship refused',f'update items set supplier_id=null;'+maprow+f'update branch_supplier_items set item_id={q(9)};','eligible item')
add('foreign mapping company refused',f'update items set supplier_id=null;'+maprow+f'update supplier_items set company_id={q(200)};','eligible item')
resolve=f'public.resolve_purchase_request_unresolved_line({q(5)},{q(10)},{q(8)})'
for name,mutation,cost in [('fallback resolver preserves qty UOM', '',9),('mapping resolver',maprow,17),('different UOM zero provisional cost',maprow+"update purchase_request_unresolved_lines set requested_uom='BOX';",0),('other branch resolver preference',maprow+f'update branch_supplier_items set branch_id={q(102)};',17)]:
 add(name,mutation,body=f"set local role authenticated;select {call()};select {resolve};reset role;do $$begin assert (select count(*)=1 from purchase_request_lines where qty=3 and estimated_unit_cost={cost} and uom=(select requested_uom from purchase_request_unresolved_lines));assert (select resolution_status='matched' from purchase_request_unresolved_lines);assert (select count(*)=2 from activity_logs);end$$;")
add('resolver duplicate item refuses without merging',body=f"set local role authenticated;select {call()};reset role;insert into purchase_request_lines(purchase_request_id,item_id,qty,uom) values({q(5)},{q(8)},8,'PCS');set local role authenticated;do $$begin begin perform {resolve};exception when others then if position('already exists' in sqlerrm)>0 then return;end if;raise;end;raise exception 'duplicate unexpectedly merged';end$$;reset role;do $$begin assert (select count(*)=1 from purchase_request_lines where qty=8);assert (select resolution_status='unresolved' from purchase_request_unresolved_lines);assert (select count(*)=1 from activity_logs);end$$;")
add('resolver mapping revoked after selection refuses',body=f"set local role authenticated;select {call()};reset role;update items set supplier_id=null;set local role authenticated;do $$begin begin perform {resolve};exception when others then if position('not mapped' in sqlerrm)>0 then return;end if;raise;end;raise exception 'unmapped unexpectedly resolved';end$$;reset role;do $$begin assert (select count(*)=0 from purchase_request_lines);assert (select resolution_status='unresolved' from purchase_request_unresolved_lines);end$$;")
add('same supplier replay preserves single audit',body=f"set local role authenticated;select {call()};select {call(version='null')};reset role;do $$begin assert (select count(*)=1 from activity_logs);end$$;")
add('anon execute refused',body=f"set local role anon;do $$begin begin perform {call()};exception when insufficient_privilege then return;end;raise exception 'anon unexpectedly permitted';end$$;reset role;")
add('service role without staff refused',"select set_config('request.jwt.claim.sub','',false);",body="set local role service_role;do $$begin begin perform "+call()+";exception when others then if position('Purchasing Review permission' in sqlerrm)>0 then return;end if;raise;end;raise exception 'service bypass';end$$;reset role;")
add('audit failure rolls back supplier',"create function public.synthetic_audit_failure() returns trigger language plpgsql as $$begin raise exception 'synthetic audit fail';end$$;create trigger synthetic_fail before insert on activity_logs for each row execute function synthetic_audit_failure();",body=failure('synthetic audit fail')+"do $$begin assert (select assigned_supplier_id is null from purchase_requests);end$$;")
results=[]
for name,mutation,body in cases:
 p=run('begin;'+seed()+mutation+body+'rollback;')
 results.append({'case':name,'passed':p.returncode==0,'error':p.stderr if p.returncode else ''})
 if p.returncode:print(json.dumps(results[-1]));break
Path('/tmp/oms-continuation-evidence-20261027/375-behavior.json').write_text(json.dumps(results,indent=2))
assert len(results)==len(cases) and all(x['passed'] for x in results)
print(f'PASS {len(results)} actual-helper synthetic PostgreSQL behavior cases')
# Independent overlapping connections; committed state exists only in this new tmpfs database.
for mode in ['different','same','status_change','version_change']:
 p=run(seed());assert p.returncode==0,p.stderr
 first=("update purchase_requests set status='approved',updated_at=now() where id="+q(5)) if mode=='status_change' else ("update purchase_requests set updated_at=now() where id="+q(5) if mode=='version_change' else 'select '+call())
 a=subprocess.Popen(D,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 a.stdin.write("begin;select set_config('request.jwt.claim.sub',"+q(11)+",false);"+first+";select 'LOCK_HELD';select pg_sleep(1);commit;\n");a.stdin.close()
 while a.stdout.readline().strip()!='LOCK_HELD':
  assert a.poll() is None,'first session failed before lock marker'
 started=time.monotonic()
 b=run("begin;select set_config('request.jwt.claim.sub',"+q(11)+",false);set local role authenticated;select "+call(7 if mode=='different' else 6)+";commit;")
 elapsed=time.monotonic()-started
 assert elapsed>.65,(mode,'second session did not wait on row lock',elapsed)
 a.wait();assert a.returncode==0,a.stderr.read()
 assert (b.returncode==0)==(mode=='same'),(mode,b.returncode,b.stderr)
 check=run("select count(*) from activity_logs;");assert check.stdout.strip()==('0' if mode in ['status_change','version_change'] else '1'),check.stdout
 print('PASS overlapping sessions: '+mode+f' (blocked {elapsed:.3f}s)')
