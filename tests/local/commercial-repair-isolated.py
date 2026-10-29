"""Offline synthetic PostgreSQL behaviour checks. Only the named disposable container.
No host, port, secret, Supabase URL, real assets or production SQL is accepted.
The authorization helpers below are test doubles, not evidence of live RLS policies.
"""
from pathlib import Path
import subprocess,json,uuid,re,concurrent.futures,hashlib
CONTAINER='oms-unified-repair-20261029'; DB='oms_commercial_repair_cases_'+uuid.uuid4().hex[:8]
def sql(text,ok=True):
 p=subprocess.run(['docker','exec','-i',CONTAINER,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',DB],input=text,text=True,capture_output=True)
 if ok and p.returncode:raise AssertionError(p.stderr)
 if not ok and p.returncode==0:raise AssertionError('Expected rejection, but SQL succeeded')
 return p.stdout.strip(),p.stderr
p=subprocess.run(['docker','exec',CONTAINER,'psql','-U','postgres','-d','postgres','-c',f'CREATE DATABASE {DB}'],capture_output=True,text=True)
if p.returncode:raise AssertionError(p.stderr)
C='10000000-0000-4000-8000-000000000001'; D='10000000-0000-4000-8000-000000000002'
U='20000000-0000-4000-8000-000000000001'; V='20000000-0000-4000-8000-000000000002'; W='20000000-0000-4000-8000-000000000003'
A='30000000-0000-4000-8000-000000000001'; B='30000000-0000-4000-8000-000000000002'; X='30000000-0000-4000-8000-000000000003'
assets=[f'40000000-0000-4000-8000-{i:012}' for i in range(1,7)]
def context(actor=U,scope='all',permissions='assets.report,assets.check,assets.maintenance'):
 return f"SET oms.actor='{actor}';SET oms.scope='{scope}';SET oms.permissions='{permissions}';"
def report(asset,loc,key,description='Synthetic fault',actor=U,scope='all',permissions='assets.report,assets.check,assets.maintenance',ok=True):
 return sql(context(actor,scope,permissions)+f"SELECT report_asset_maintenance_v2('{asset}','{loc}','{description}','Normal','{key}');",ok)[0]
setup=f"""
CREATE TABLE staffs(id uuid primary key,company_id uuid not null,full_name text,status text);
CREATE TABLE locations(id uuid primary key,company_id uuid not null);
CREATE TABLE asset_holdings(company_id uuid,asset_id uuid,location_id uuid,quantity numeric);
CREATE TABLE asset_maintenance(id uuid primary key default gen_random_uuid(),company_id uuid not null,asset_id uuid,location_id uuid,source_id text,status text,priority text,description text,author_name text,source_data jsonb,reported_by uuid,created_at timestamptz default now(),UNIQUE(company_id,source_id));
CREATE TABLE asset_maintenance_updates(id uuid primary key default gen_random_uuid(),company_id uuid,maintenance_id uuid REFERENCES asset_maintenance(id),source_id text,author_name text,source_data jsonb,created_at timestamptz default now(),UNIQUE(company_id,source_id));
CREATE TABLE asset_daily_checks(id uuid primary key default gen_random_uuid(),company_id uuid,asset_id uuid,location_id uuid,result text,author_name text,source_data jsonb);
INSERT INTO staffs VALUES('{U}','{C}','Example Owner','active'),('{V}','{C}','Example Staff','active'),('{W}','{D}','Other Owner','active');
INSERT INTO locations VALUES('{A}','{C}'),('{B}','{C}'),('{X}','{D}');
CREATE FUNCTION current_staff_id() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('oms.actor',true),'')::uuid $$;
CREATE FUNCTION current_staff_company_id() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT company_id FROM staffs WHERE id=current_staff_id() AND status='active' $$;
CREATE FUNCTION has_permission(p text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT current_staff_company_id() IS NOT NULL AND p=ANY(string_to_array(current_setting('oms.permissions',true),',')) $$;
CREATE FUNCTION asset_management_role() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT current_staff_id() IN ('{U}'::uuid,'{W}'::uuid) $$;
CREATE FUNCTION asset_location_access(p uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT EXISTS(SELECT 1 FROM locations WHERE id=p AND company_id=current_staff_company_id()) AND (current_setting('oms.scope',true)='all' OR p::text=current_setting('oms.scope',true)) $$;
"""
sql(setup)
for asset in assets[:5]:sql(f"INSERT INTO asset_holdings VALUES('{C}','{asset}','{A}',1),('{C}','{asset}','{B}',1);")
sql(f"INSERT INTO asset_holdings VALUES('{D}','{assets[5]}','{X}',1);")
# Use the locally preserved former endpoint definitions as the synthetic rollback baseline.
old=(Path(__file__).parent/'fixtures/repair-v1-functions.sql').read_text()
for name in ['asset_check_exception_request','report_asset_maintenance','get_asset_check_open_repairs']:
 match=re.search(r'create or replace function public\.'+name+r'\(.*?\$\$;',old,re.S|re.I)
 assert match,name
 sql(match.group(0))
sql("CREATE TRIGGER exception_request AFTER INSERT ON asset_daily_checks FOR EACH ROW EXECUTE FUNCTION asset_check_exception_request();")
sql("CREATE TABLE baseline_functions AS SELECT oid::regprocedure::text signature,pg_get_functiondef(oid) definition,proacl::text acl,proowner,proconfig FROM pg_proc WHERE oid IN ('asset_check_exception_request()'::regprocedure,'report_asset_maintenance(uuid,uuid,text,text,uuid)'::regprocedure,'get_asset_check_open_repairs(uuid,uuid[])'::regprocedure);")
# Two real rows in this synthetic baseline model historical duplicates. Neither is deleted.
for i in range(2):sql(f"INSERT INTO asset_maintenance(company_id,asset_id,location_id,source_id,status,priority,description,author_name,source_data,reported_by) VALUES('{C}','{assets[0]}','{A}','LEGACY-{i}','Open','Normal','Legacy synthetic fault','Example Owner','{{}}','{U}');")
sql(f"INSERT INTO asset_maintenance(company_id,asset_id,location_id,source_id,status,priority,description,author_name,source_data,reported_by) VALUES('{C}','{assets[3]}','{B}','RESTRICTED-LEGACY','Assigned','High','Restricted synthetic detail','Restricted reporter','{{}}','{U}');")
proposal=Path('supabase/maintenance/one_open_repair_per_asset.PROPOSED.sql').read_text()
guard="DO $review$ BEGIN RAISE EXCEPTION 'Review only: verify live drift and authorize activation before removing this guard'; END $review$;"
assert proposal.count(guard)==1
# The guarded artifact cannot install unmodified. Only this isolated runner removes
# its exact review guard; no production connection is available to this process.
sql(proposal.replace(guard,''))
checks=[]
def passed(label):checks.append(label);print('PASS:',label,flush=True)
key=str(uuid.uuid4());ticket=report(assets[1],A,key)
assert report(assets[1],A,key)==ticket
report(assets[1],A,key,'Changed payload',ok=False)
report(assets[1],A,key,actor=V,ok=False)
passed('same-key retry is idempotent; changed payload or actor rejected')
append_key=str(uuid.uuid4());assert report(assets[1],B,append_key,'Different fault')==ticket
assert report(assets[1],B,append_key,'Different fault')==ticket
assert sql(f"SELECT count(*) FROM asset_maintenance WHERE company_id='{C}' AND asset_id='{assets[1]}';")[0]=='1'
progress=json.loads(sql(f"SELECT source_data FROM asset_maintenance_updates WHERE source_id='OMS-PROGRESS-{append_key}';")[0])
assert progress['Comment']=='Different fault' and progress['Requested location']==B and progress['Actor ID']==U and progress['Status Before']==progress['Status After']=='Open'
passed('different fault and holding location append one audited update to same unchanged ticket')
report(assets[1],B,str(uuid.uuid4()),actor=V,scope=A,ok=False)
report(assets[5],A,str(uuid.uuid4()),ok=False)
report(assets[1],A,str(uuid.uuid4()),permissions='',ok=False)
sql(f"UPDATE asset_holdings SET quantity=0 WHERE asset_id='{assets[4]}' AND location_id='{A}';")
report(assets[4],A,str(uuid.uuid4()),ok=False)
assert report(assets[5],X,key,actor=W)!=ticket
assert report(assets[1],A,key)==ticket
passed('permission, company, selected branch and actual positive/unknown holding guards retained')
restricted=json.loads(sql(context(V,A)+f"SELECT get_asset_check_open_repairs_v2('{A}',ARRAY['{assets[3]}'::uuid]);")[0])
assert restricted==[{'asset_id':assets[3],'id':None,'status':'Open','description':None,'open_count':None,'restricted':True}]
assert 'Restricted synthetic detail' not in json.dumps(restricted)
report(assets[3],A,str(uuid.uuid4()),actor=V,scope=A,ok=False)
sql(context(V,A)+f"SELECT get_asset_check_open_repairs_v2('{B}',ARRAY['{assets[3]}'::uuid]);",ok=False)
sql(context(U)+f"SELECT get_asset_check_open_repairs_v2('{A}',ARRAY['{assets[5]}'::uuid]);",ok=False)
visible=json.loads(sql(context(U)+f"SELECT get_asset_check_open_repairs_v2('{A}',ARRAY['{assets[3]}'::uuid]);")[0])
assert visible[0]['description']=='Restricted synthetic detail' and visible[0]['status']=='Assigned'
passed('cross-location carry-forward exposes only an attention flag outside assigned scope; manager sees authorized details')
check_id=str(uuid.uuid4())
sql(context(V,A)+f"INSERT INTO asset_daily_checks(id,company_id,asset_id,location_id,result,author_name,source_data) VALUES('{check_id}','{C}','{assets[3]}','{A}','Damaged','Example Staff','{{\"remark\":\"Today observed vibration\"}}');")
assert sql(f"SELECT count(*) FROM asset_maintenance WHERE company_id='{C}' AND asset_id='{assets[3]}';")[0]=='1'
assert sql(f"SELECT source_data->>'Status After' FROM asset_maintenance_updates WHERE source_id='CHECK-{check_id}';")[0]=='Assigned'
sql(context()+f"INSERT INTO asset_daily_checks(company_id,asset_id,location_id,result,author_name,source_data) VALUES('{C}','{assets[3]}','{A}','Checked','Example Staff','{{}}');")
assert sql(f"SELECT status FROM asset_maintenance WHERE source_id='RESTRICTED-LEGACY';")[0]=='Assigned'
passed('daily exception appends to same global ticket; Checked never closes or resets its status')
# Deliberately race requests with different payloads and separate connections.
def race(i):return report(assets[2],A if i%2==0 else B,str(uuid.uuid4()),f'Synthetic parallel issue {i}')
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:ids=list(pool.map(race,range(8)))
assert len(set(ids))==1
assert sql(f"SELECT count(*) FROM asset_maintenance WHERE asset_id='{assets[2]}' AND company_id='{C}';")[0]=='1'
assert sql(f"SELECT count(*) FROM asset_maintenance_updates WHERE maintenance_id='{ids[0]}';")[0]=='7'
passed('eight concurrent different issues create exactly one ticket and seven progress rows')
same=str(uuid.uuid4())
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:retry_ids=list(pool.map(lambda _:report(assets[2],A,same,'Same parallel retry'),range(6)))
assert set(retry_ids)==set(ids)
assert sql(f"SELECT count(*) FROM asset_maintenance_updates WHERE source_id='OMS-PROGRESS-{same}';")[0]=='1'
passed('six concurrent identical retries append exactly once')
sql(f"UPDATE asset_maintenance SET status='Closed' WHERE id='{ticket}';")
fresh=report(assets[1],A,str(uuid.uuid4()),'New fault after closure');assert fresh!=ticket
sql(f"UPDATE asset_maintenance SET status='Open' WHERE id='{ticket}';",ok=False)
assert sql(f"SELECT count(*) FROM asset_maintenance WHERE asset_id='{assets[1]}' AND status='Open';")[0]=='1'
passed('new ticket after closure is allowed; competing reopen is blocked without deleting old history')
legacy_before=sql("SELECT string_agg(id::text||'/'||source_id||'/'||description,'|' ORDER BY source_id) FROM asset_maintenance WHERE source_id LIKE 'LEGACY-%';")[0]
report(assets[0],A,str(uuid.uuid4()),'Latest progress on legacy asset')
assert sql(f"SELECT count(*) FROM asset_maintenance WHERE asset_id='{assets[0]}';")[0]=='2'
assert sql("SELECT string_agg(id::text||'/'||source_id||'/'||description,'|' ORDER BY source_id) FROM asset_maintenance WHERE source_id LIKE 'LEGACY-%';")[0]==legacy_before
passed('legacy duplicate rows stay byte-for-byte unchanged; new reports append without a third ticket')
# Recovery restores synthetic original definitions/config/ACL exactly, retaining all rows.
counts=sql('SELECT (SELECT count(*) FROM asset_maintenance)||\'/\'||(SELECT count(*) FROM asset_maintenance_updates);')[0]
sql("""BEGIN;DROP TRIGGER one_open_asset_repair_guard ON asset_maintenance;DROP FUNCTION enforce_one_open_asset_repair();DROP FUNCTION report_asset_maintenance_v2(uuid,uuid,text,text,uuid);DROP FUNCTION get_asset_check_open_repairs_v2(uuid,uuid[]);DO $$DECLARE r record;BEGIN FOR r IN SELECT * FROM baseline_functions LOOP EXECUTE r.definition;END LOOP;END$$;COMMIT;""")
assert sql("SELECT count(*) FROM baseline_functions b JOIN pg_proc p ON p.oid=b.signature::regprocedure WHERE pg_get_functiondef(p.oid)<>b.definition OR p.proacl::text IS DISTINCT FROM b.acl OR p.proowner<>b.proowner OR p.proconfig IS DISTINCT FROM b.proconfig;")[0]=='0'
assert sql('SELECT (SELECT count(*) FROM asset_maintenance)||\'/\'||(SELECT count(*) FROM asset_maintenance_updates);')[0]==counts
passed('recovery restores original function definitions, owner, search_path and ACL without losing appended history')
Path('docs/qa/commercial-20261028/REPAIR-ISOLATED-RESULTS.json').write_text(json.dumps({'environment':'disposable Docker PostgreSQL; no network or host ports','authorization_helpers':'synthetic stand-ins; live RLS/ACL drift remains an activation gate','checks':checks,'proposal_sha256':hashlib.sha256(proposal.encode()).hexdigest(),'production_installed':False},indent=2))
print(f'{len(checks)} isolated behaviour groups passed; no production changes.',flush=True)
