# LOCAL DISPOSABLE FIXTURE ONLY. See docs/qa/attendance-person63-recovery-20261103.md.
import base64,concurrent.futures,hashlib,hmac,json,subprocess,time,urllib.request,urllib.error
DB='oms_person63_v2_20261103'
def db(sql):
 p=subprocess.run(['docker','exec','-i','oms-role-acceptance-db','psql','-U','postgres','-d',DB,'-At','-v','ON_ERROR_STOP=1'],input=sql,text=True,capture_output=True)
 if p.returncode: raise RuntimeError(p.stderr)
 return p.stdout.strip()
sub=db("select auth_user_id from staffs where full_name='QA super_admin';")
def enc(x):return base64.urlsafe_b64encode(json.dumps(x,separators=(',',':')).encode()).decode().rstrip('=')
head=enc({'alg':'HS256','typ':'JWT'});body=enc({'role':'authenticated','sub':sub,'exp':int(time.time())+1800});part=head+'.'+body
token=part+'.'+base64.urlsafe_b64encode(hmac.new(b'person63-local-synthetic-only-key-20261103',part.encode(),hashlib.sha256).digest()).decode().rstrip('=')
def call(name='recover_attendance_person63',digest=None):
 req=urllib.request.Request('http://127.0.0.1:61463/rpc/'+name,data=json.dumps({'p_expected_snapshot':digest}).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=20) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
def pin():db("update oms_person63_recovery.control set approved_catalog=(select jsonb_build_object('functions',d->'functions','triggers',d->'triggers') from (select oms_person63_recovery.snapshot() d)x);")
# Catalog must fail closed when not explicitly reviewed.
status,ready=call();assert status==200,(status,ready);digest=ready['snapshot']
# A held control row must not block read-only preflight, but execution times out.
a=subprocess.Popen(['docker','exec','-i','oms-role-acceptance-db','psql','-U','postgres','-d',DB,'-At'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
a.stdin.write("begin; select id from oms_person63_recovery.control for update;\n\\echo LOCKED\nselect pg_sleep(5); rollback;\n");a.stdin.close()
while 'LOCKED' not in a.stdout.readline():pass
start=time.monotonic();assert call()[0]==200;assert time.monotonic()-start<2
start=time.monotonic();status,out=call(digest=digest);elapsed=time.monotonic()-start
assert out.get('code')=='55P03' and 2.5<elapsed<5,(status,out,elapsed)
a.wait(timeout=10);print('PASS actual HTTP: preview no write-lock; competing execution lock timeout',round(elapsed,2))
# Real hoisted8s statement timeout, not merely client abort or set_config inside function.
db("create function public.person63_local_delay() returns trigger language plpgsql as $$begin if new.work_date='2026-10-01' and new.calculation_revision>1 then perform pg_sleep(12);end if;return new;end$$;create trigger person63_local_delay before insert on daily_attendance_results for each row execute function public.person63_local_delay();")
pin();digest=call()[1]['snapshot'];start=time.monotonic();status,out=call(digest=digest);elapsed=time.monotonic()-start
assert out.get('code')=='57014' and 7<elapsed<11,(status,out,elapsed)
assert db("select count(*) from oms_person63_recovery.receipt;")=='0'
assert db("select count(*) from ngteco_person_mappings where person_id='63';")=='0'
print('PASS actual HTTP: statement_timeout8s rolls back mapping/results/receipt',round(elapsed,2))
# Two concurrent authenticated HTTP requests, identical reviewed snapshot.
db("create or replace function public.person63_local_delay() returns trigger language plpgsql as $$begin if new.work_date='2026-10-01' and new.calculation_revision>1 then perform pg_sleep(1);end if;return new;end$$;")
pin();digest=call()[1]['snapshot']
with concurrent.futures.ThreadPoolExecutor(2) as pool:
 a=pool.submit(call,digest=digest);b=pool.submit(call,digest=digest);out=[a.result(),b.result()]
assert sum(x[0]==200 and x[1].get('replayed') is False for x in out)==1,out
assert all((x[0]==200 and x[1].get('status')=='completed') or x[1].get('code')=='55P03' for x in out),out
print('Concurrent responses:',out)
assert db("select count(*) from daily_attendance_results where staff_id='6bc2265b-4a61-474c-b70f-b46b2a3aab89' and work_date between '2026-10-01' and '2026-11-01';")=='50'
assert call(digest=digest)[1]['replayed'] is True
print('PASS two simultaneous HTTP requests: exactly one25-day commit; replay OR lock-timeout then receipt retry adds no revisions')
# Compensation after actual COMMIT, not savepoint-only rollback.
after=db("select md5(after_state::text) from oms_person63_recovery.receipt;")
assert call('restore_attendance_person63',after)[1].get('message')=='Restoration is disabled.'
db("update oms_person63_recovery.control set restore_enabled=true,expires_at=now()+interval '30 minutes';insert into attendance_period_locks(company_id,branch_id,week_start,locked_by) select company_id,default_branch_id,'2026-09-28',id from staffs where full_name='QA super_admin';")
assert call('restore_attendance_person63',after)[1].get('message')=='Recovery has protected records.'
db("delete from attendance_period_locks where week_start='2026-09-28' and company_id='0d92a9e0-8e71-4769-9260-89cddc3dc78d';")
status,out=call('restore_attendance_person63',after);assert status==200 and out['status']=='restored',(status,out)
assert call('restore_attendance_person63',after)[1]['replayed'] is True
assert db("select count(*) from daily_attendance_results where staff_id='6bc2265b-4a61-474c-b70f-b46b2a3aab89' and work_date between '2026-10-01' and '2026-11-01' and is_current and actual_punch_count=0;")=='25'
assert db("select count(*) from daily_attendance_results where staff_id='6bc2265b-4a61-474c-b70f-b46b2a3aab89' and work_date between '2026-10-01' and '2026-11-01';")=='50'
print('PASS actual committed compensation: default off, new protection rejected,25 old rows restored,50 revisions retained, repeat idempotent')
