from pathlib import Path
import subprocess
D=['docker','exec','-i','oms375-continuation-synthetic-20261027','psql','-U','supabase_admin','-d','oms375_synthetic','-v','ON_ERROR_STOP=1','-At']
def run(sql):return subprocess.run(D,input=sql,text=True,capture_output=True)
import subprocess
p=Path('supabase/maintenance/375_supplier_recovery.PROPOSED.sql')
query="select md5(pg_get_functiondef('public.select_unassigned_purchase_request_supplier(uuid,uuid,timestamptz)'::regprocedure));"
before=run(query);assert before.returncode==0
collision=run(p.read_text());assert collision.returncode!=0 and 'already exists' in collision.stderr,collision.stderr
after=run(query);assert after.returncode==0 and before.stdout==after.stdout
Path('/tmp/oms-continuation-evidence-20261027/375-install-collision.log').write_text(collision.stderr+'PASS: existing function unchanged after collision.\n')
preflight=run(Path('supabase/maintenance/375_read_only_preflight.PROPOSED.sql').read_text());assert preflight.returncode==0,preflight.stderr
Path('/tmp/oms-continuation-evidence-20261027/375-synthetic-catalog.json').write_text(preflight.stdout)
print('PASS: collision stops install without changing existing function; metadata SELECT executes on synthetic schema only')
