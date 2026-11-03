"""Isolated seeded oms_person63_expiry_20261103 only; two real PostgreSQL sessions."""
from pathlib import Path
import subprocess, time
DB = 'oms_person63_expiry_20261103'
CMD = ['docker','exec','-i','oms-role-acceptance-db','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',DB]
def sql(s, ok=True):
    p=subprocess.run(CMD,input=s,text=True,capture_output=True)
    if ok and p.returncode: raise RuntimeError(p.stderr)
    return p
AUTH="begin; set local statement_timeout='8s'; select set_config('request.jwt.claim.sub',(select auth_user_id::text from staffs where full_name='QA super_admin'),true); set local role authenticated; "
sql("update oms_person63_recovery.control set enabled=true,expires_at=clock_timestamp()+interval '10 minutes';")
sql(AUTH+"select public.recover_attendance_person63(public.recover_attendance_person63(null)->>'snapshot');commit;")
fixed=(Path(__file__).resolve().parents[2]/'sql-candidates/attendance-person63-recovery.sql').read_text().split('create function public.restore_attendance_person63',1)[1].split('revoke all on function public.restore_attendance_person63',1)[0]
fixed='create or replace function public.restore_attendance_person63'+fixed
fixed=fixed.replace('3b104582-f8cb-4a4d-867f-b99e5ffc6486','0d92a9e0-8e71-4769-9260-89cddc3dc78d').replace('3e248456-89e6-4849-a53d-cf344e6bd587','6bc2265b-4a61-474c-b70f-b46b2a3aab89')
check=" if gate.expires_at<=clock_timestamp() then raise exception 'Restoration is disabled.';end if;\n"
before=sql("select md5(oms_person63_recovery.snapshot()::text),md5(to_jsonb(r)::text) from oms_person63_recovery.receipt r;").stdout
for name,definition in [('v2',fixed.replace(check,'')),('v3',fixed)]:
    sql(definition)
    digest=sql('select md5(after_state::text) from oms_person63_recovery.receipt;').stdout.strip()
    holder=subprocess.Popen(CMD,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    holder.stdin.write("begin;select public.attestation_lock('6bc2265b-4a61-474c-b70f-b46b2a3aab89');\n\\echo HELD\nselect pg_sleep(2.4);rollback;\n");holder.stdin.close()
    while holder.stdout.readline().strip()!='HELD':
        if holder.poll() is not None: raise RuntimeError('holder failed')
    sql("update oms_person63_recovery.control set restore_enabled=true,expires_at=clock_timestamp()+interval '1.2 seconds';")
    caller=subprocess.Popen(CMD,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    caller.stdin.write(AUTH+"set local application_name='person63_expiry_probe'; select public.restore_attendance_person63('"+digest+"');rollback;\n");caller.stdin.close()
    time.sleep(.25)
    observed=sql("select exists(select 1 from pg_stat_activity where application_name='person63_expiry_probe' and wait_event='advisory') and (select expires_at>clock_timestamp() from oms_person63_recovery.control);").stdout.strip()
    assert observed=='t', 'did not observe authorized caller waiting before expiry'
    out=caller.stdout.read();err=caller.stderr.read();code=caller.wait();holder.wait()
    if name=='v2': assert code==0 and 'restored' in out,(out,err)
    else: assert code!=0 and 'Restoration is disabled.' in err,(out,err)
    after=sql("select md5(oms_person63_recovery.snapshot()::text),md5(to_jsonb(r)::text) from oms_person63_recovery.receipt r;").stdout
    assert before==after, 'state changed'
    print(name, 'wait before expiry observed; expired restore', 'INCORRECTLY accepted (rolled back)' if name=='v2' else 'rejected; snapshot and receipt unchanged',flush=True)
sql("update oms_person63_recovery.control set restore_enabled=true,expires_at=clock_timestamp()+interval '1 minute';")
p=sql(AUTH+"select public.restore_attendance_person63('"+digest+"');rollback;")
assert 'restored' in p.stdout
print('v3 unexpired restoration succeeds (rolled back); no persistent business changes from probes')
