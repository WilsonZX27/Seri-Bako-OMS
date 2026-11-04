"""Real independent PostgreSQL connections in the named, network-disabled fixture container."""
import json
import subprocess
import time

CONTAINER = 'oms-carryover-concurrency-20261104'
BASE = ['docker', 'exec', '-i', CONTAINER, 'psql', '-h', '/tmp', '-U', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
IDENTITY = "set test.actor='00000000-0000-0000-0000-000000000001'; set test.permissions='all';"
BRANCH = '00000000-0000-0000-0000-000000000020'
PRODUCT = '00000000-0000-0000-0000-000000000030'

def run(sql):
    result = subprocess.run(BASE, input=sql, text=True, capture_output=True, timeout=20)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()

def payload(new, waste):
    return json.dumps([dict(product_id=PRODUCT, daily_tracking='food_carryover', carryover_wastage_entry=new,
        qty_sent=10, morning_received_qty=10, morning_received_provided=True, wastage_qty=waste if new else 0,
        wastage_provided=True, wastage_reason='damaged' if new else None, notes='keep history' if new else '',
        saleable_next_day_qty=3, usage_qty=999 if new else 5)]).replace("'", "''")

def save(record, revision, new, waste, direct=False):
    rid = 'null' if record is None else "'" + record + "'"
    rev = 'null' if revision is None else str(revision)
    if direct:
        return f"select save_outlet_daily_record_v92({rid},'{BRANCH}','2026-11-02',null,'{payload(new,waste)}'::jsonb,'morning_recorded',null,'[]',null);"
    return f"select save_outlet_daily_record_with_sales_channels({rid},'{BRANCH}','2026-11-02',null,'{payload(new,waste)}'::jsonb,'morning_recorded',{rev},false,null,'[]',null,0);"

created = json.loads(run(IDENTITY + save(None, None, True, 2)))
record = created['record_id']
run(f"update outlet_daily_record_lines set usage_qty=5 where record_id='{record}';")
def snapshot():
    return json.loads(run(f"select json_build_object('revision',r.edit_revision,'usage',l.usage_qty,'waste',l.wastage_qty,'note',l.notes) from outlet_daily_records r join outlet_daily_record_lines l on l.record_id=r.id where r.id='{record}';"))

def observed(condition):
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        if run(condition) == 't':
            return
        time.sleep(.05)
    raise AssertionError('Expected database wait state was not observed')

for name, first_new, second_new, commit, direct_old in [('new_then_old',True,False,True,False),('old_then_new',False,True,True,False),('new_rollback_then_old',True,False,False,False),('new_then_direct_old',True,False,True,True),('direct_old_then_new',False,True,True,True)]:
    before = snapshot()
    first = subprocess.Popen(BASE, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    first.stdin.write("set application_name='carryover-A';begin;" + IDENTITY + 'set local role authenticated;' + save(record,before['revision'],first_new,before['waste']+1,direct_old and not first_new) + 'select pg_sleep(4);' + ('commit;' if commit else 'rollback;'))
    first.stdin.close();first.stdin=None
    observed("select exists(select 1 from pg_stat_activity where application_name='carryover-A' and wait_event='PgSleep');")
    second = subprocess.Popen(BASE, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    second.stdin.write("set application_name='carryover-B';begin;" + IDENTITY + 'set local role authenticated;' + save(record,before['revision'],second_new,before['waste']+2,direct_old and not second_new) + 'commit;')
    second.stdin.close();second.stdin=None
    observed("select exists(select 1 from pg_stat_activity where application_name='carryover-B' and wait_event_type='Lock' and cardinality(pg_blocking_pids(pid))>0);")
    out_a, err_a = first.communicate(timeout=10)
    out_b, err_b = second.communicate(timeout=10)
    assert first.returncode == 0, err_a
    rejected = commit and not (direct_old and not second_new)
    if rejected:
        assert second.returncode != 0 and 'ODR_CONFLICT' in err_b, (out_b,err_b)
    else:
        assert second.returncode == 0, err_b
    after = snapshot()
    assert after['usage'] == 5 and after['note'] == 'keep history', after
    assert after['waste'] == before['waste'] + (1 if commit and first_new else 0), after
    print(f'PASS {name}: real lock wait observed; ' + ('stale writer rejected' if rejected else 'waiting writer proceeds safely') + '; historical values preserved', flush=True)
print('5 real two-connection scenarios passed; fixture identity helpers, not production RLS acceptance.')
