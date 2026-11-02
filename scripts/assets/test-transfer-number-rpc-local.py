"""Execute repository asset migrations/full transfer RPCs in a new synthetic local DB."""
import concurrent.futures,hashlib,json,pathlib,subprocess,time,uuid
container='oms-asset-link-local-20261030';db='at_full_'+uuid.uuid4().hex[:10];out=pathlib.Path('handoff/transfer-number');out.mkdir(exist_ok=True,parents=True)
base=['docker','exec','-i',container,'psql','-XqAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',db]
def run(s,ok=True):
 p=subprocess.run(base,input=s,text=True,capture_output=True)
 if ok and p.returncode:raise Exception(p.stderr)
 if not ok and not p.returncode:raise Exception('Expected rejection')
 return p.stdout.strip()
def id(n):return '00000000-0000-4000-8000-'+str(n).zfill(12)
def session(actor=20,permissions='assets.view,assets.view_all,assets.transfer,assets.approve,assets.manage',role='super_admin'):
 return f"set statement_timeout='15s';set test.actor='{id(actor)}';set test.permissions='{permissions}';set test.role='{role}';set role authenticated;"
subprocess.run(['docker','exec',container,'createdb','-U','postgres',db],check=True)
fixture=pathlib.Path('scripts/assets/test-asset-db.mjs').read_text().split('await db.exec(`',1)[1].split('`);',1)[0]
fixture=fixture.replace('create role anon;create role authenticated;create role service_role;','')
# The full asset objects/RLS/actions below are repository SQL. Only outer identity/catalog tables are fixtures.
run(fixture)
run("alter table branches add column branch_name text;create function current_staff_has_company_role(p text[]) returns boolean language sql stable as $$select coalesce(nullif(current_setting('test.role',true),''),'super_admin')=any(p)$$;")
hashes={}
for file in ['supabase/migrations/337_asset_management_foundation.sql','supabase/migrations/339_asset_assigned_location_management_roles.sql','supabase/migrations/357_asset_other_locations.sql','docs/v10/proposals/asset-transfer-batch-review-only.sql','supabase/migrations/376_asset_transfer_display.sql']:
 text=pathlib.Path(file).read_text();hashes[file]=hashlib.sha256(text.encode()).hexdigest()
 if 'batch-review' in file:text=text.replace('rollback; -- review wrapper, no persistence','commit; -- isolated test only')
 run(text)
# Reuse exact repository sequence table DDL instead of a hand-written numbering substitute.
seq=pathlib.Path('supabase/migrations/005_sprint_1_5_staff_access_document_sequences.sql').read_text();start=seq.index('create table if not exists public.document_sequences');end=seq.index('\n);',start)+3
period=pathlib.Path('supabase/migrations/077_monthly_document_numbering.sql').read_text();pstart=period.index('create table if not exists public.document_sequence_periods');pend=period.index('\n);',pstart)+3
run("create type record_status as enum('active','inactive');create type reset_frequency as enum('never','yearly','monthly','daily');"+seq[start:end]+period[pstart:pend])
for co,actor,branch,loc1,loc2,asset1,asset2 in [(1,20,11,31,32,40,41),(2,21,12,33,34,42,43)]:
 run(f"insert into companies values('{id(co)}');insert into branches(id,company_id,branch_name) values('{id(branch)}','{id(co)}','Synthetic');insert into staffs values('{id(actor)}','{id(co)}','{id(branch)}','Synthetic operator');insert into asset_import_batches(company_id,source_sha256,reconciliation,state) values('{id(co)}','synthetic','{{}}','live');insert into asset_locations(id,company_id,source_name,branch_id,kind) values('{id(loc1)}','{id(co)}','Source','{id(branch)}','branch'),('{id(loc2)}','{id(co)}','Destination','{id(branch)}','branch');insert into assets(id,company_id,asset_code,item_name) values('{id(asset1)}','{id(co)}','QA-A','Asset A'),('{id(asset2)}','{id(co)}','QA-B','Asset B');insert into asset_holdings(company_id,asset_id,location_id,quantity) values('{id(co)}','{id(asset1)}','{id(loc1)}',1000),('{id(co)}','{id(asset2)}','{id(loc1)}',1000);")
def single(key=None,asset=40,actor=20,source=31,dest=32,reason='Full RPC single',qty=1):
 key=key or str(uuid.uuid4());return f"select request_asset_transfer('{id(asset)}','{id(source)}','{id(dest)}',{qty},'{reason}','{key}');"
def batch(key=None,actor=20,source=31,dest=32,assets=(40,41),qty=1):
 key=key or str(uuid.uuid4());lines=json.dumps([{'asset_id':id(a),'quantity':qty} for a in assets]);return f"select request_asset_transfer_batch('{id(source)}','{id(dest)}','Full RPC batch','{lines}'::jsonb,'{key}',null,date '2026-11-02');"
# Baseline legacy transfer exists before number schema and stays unchanged.
legacy=run(session()+single());run(f"update asset_transfers set source_id='LEGACY-42' where id='{legacy}'");before_history=run('select count(*) from asset_transfer_updates');
proposal=pathlib.Path('sql-candidates/383_asset_transfer_numbers.INSTALL-CANDIDATE.sql').read_text();hashes['number_sql']=hashlib.sha256(proposal.encode()).hexdigest();run(proposal)
assert run("select to_regclass('public.asset_transfer_numbers') is not null")=='t'
assert run('select count(*) from asset_transfer_numbering_activation')=='0'
assert run('select count(*) from asset_transfer_numbers')=='0'
run(f"insert into document_sequences(company_id,document_type,prefix,padding,reset_frequency,status) values('{id(1)}','asset_transfer','AT',3,'never','inactive'),('{id(2)}','asset_transfer','AT',3,'never','active');")
disabled=run(session()+single());assert run(f"select count(*) from asset_transfer_numbers where document_id='{disabled}'")=='0'
run(f"update document_sequences set status='active' where company_id='{id(1)}'")
not_activated=run(session()+single(reason='Active sequence but no activation'))
assert run(f"select count(*) from asset_transfer_numbers where document_id='{not_activated}'")=='0'
run(f"insert into asset_transfer_numbering_activation(company_id,enabled) values('{id(1)}',true),('{id(2)}',true)")
# Complete single idempotence: same request key returns same UUID and number; changed payload denied.
key=str(uuid.uuid4());s=run(session()+single(key));n=run(f"select document_no from asset_transfer_numbers where document_id='{s}'");assert n=='AT-001';assert run(session()+single(key))==s;assert run(f"select document_no from asset_transfer_numbers where document_id='{s}'")==n
run(session()+single(key,qty=2),False)
# Complete batch idempotence and parent/line number cardinality.
bkey=str(uuid.uuid4());b=run(session()+batch(bkey));assert run(session()+batch(bkey))==b;assert run(f"select count(*) from asset_transfers where batch_id='{b}'")=='2';assert run(f"select count(*) from asset_transfer_numbers where document_id='{b}' or document_id in(select id from asset_transfers where batch_id='{b}')")=='1'
run(session()+batch(bkey,qty=2),False)
# Existing API has rejection, not a cancel/delete action. Rejection preserves ID, number and history.
number_b=run(f"select document_no from asset_transfer_numbers where document_id='{b}'")
run(session()+f"select advance_asset_transfer_batch('{b}','reject','Synthetic rejected request');")
assert run(f"select status from asset_transfer_batches where id='{b}'")=='rejected';assert run(f"select document_no from asset_transfer_numbers where document_id='{b}'")==number_b;assert run(f"select count(*) from asset_transfer_updates where transfer_id in(select id from asset_transfers where batch_id='{b}')")=='2'
run(session()+f"select advance_asset_transfer_batch('{b}','cancel','Not supported');",False)
# Regression: stale context from batch request or advance must not suppress a subsequent standalone number.
combined=run('begin;'+session()+batch()+single(reason='After batch in same transaction')+'commit;').splitlines();assert len(combined)==2
for d in combined:assert run(f"select count(*) from asset_transfer_numbers where document_id='{d}'")=='1'
active_batch=combined[0]
combo=run('begin;'+session()+f"select advance_asset_transfer_batch('{active_batch}','reject','Combined reject');"+single(reason='After batch advance in same transaction')+'commit;').splitlines();assert run(f"select count(*) from asset_transfer_numbers where document_id='{combo[-1]}'")=='1'
# Full lifecycle moves holdings and retains stable number/history.
b2=run(session()+batch());stable=run(f"select document_no from asset_transfer_numbers where document_id='{b2}'")
for action in ['approve','dispatch','receive']:run(session()+f"select advance_asset_transfer_batch('{b2}','{action}','Synthetic lifecycle');")
assert run(f"select sum(quantity) from asset_holdings where company_id='{id(1)}'")=='2000';assert run(f"select document_no from asset_transfer_numbers where document_id='{b2}'")==stable;assert run(f"select count(*) from asset_transfer_updates where transfer_id in(select id from asset_transfers where batch_id='{b2}')")=='6'
run(session()+f"select advance_asset_transfer_batch('{b2}','receive','Duplicate');",False)
# Foreign-company and source access/permission denials use real repository RPC validation.
run(session(actor=21)+single(),False);run(session(permissions='assets.view,assets.view_all')+single(),False)
run("insert into staffs values('"+id(22)+"','"+id(1)+"',null,'Unassigned');")
run(session(actor=22,permissions='assets.view,assets.transfer',role='manager')+single(),False)
# Atomic failure of a later batch line rolls back header, earlier line and numbering counter.
count=run('select count(*) from asset_transfer_numbers');counter=run(f"select next_number from document_sequence_periods where company_id='{id(1)}'")
run(session()+batch(qty=2000),False);assert run('select count(*) from asset_transfer_numbers')==count;assert run(f"select next_number from document_sequence_periods where company_id='{id(1)}'")==counter
# Explicit outer rollback models an abandoned/cancelled transaction without erasing history.
pre_cancel_count=run('select count(*) from asset_transfers');pre_cancel_ledger=run('select count(*) from asset_transfer_numbers');pre_cancel_counter=run(f"select next_number from document_sequence_periods where company_id='{id(1)}'")
run('begin;'+session()+batch()+single(reason='Rolled back draft transaction')+'rollback;')
assert run('select count(*) from asset_transfers')==pre_cancel_count and run('select count(*) from asset_transfer_numbers')==pre_cancel_ledger
assert run(f"select next_number from document_sequence_periods where company_id='{id(1)}'")==pre_cancel_counter
# Concurrent complete RPCs, including retry races.
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 singles=list(pool.map(lambda _:run(session()+single()),range(12)))
 same_key=str(uuid.uuid4());same=list(pool.map(lambda _:run(session()+batch(same_key)),range(6)))
assert len(set(singles))==12 and len(set(same))==1
# Deterministic single/batch lock regression: first backend holds the same asset lock as the real single RPC.
left_sql='begin;'+session()+f"select pg_advisory_xact_lock(hashtextextended('{id(1)}:{id(40)}',0));select pg_sleep(0.7);"+single(reason='Lock ordering regression')+'commit;'
left=subprocess.Popen(base,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True);left.stdin.write(left_sql);left.stdin.close();time.sleep(0.15)
right=subprocess.run(base,input=session()+batch(),text=True,capture_output=True);left.wait(timeout=20);err=left.stderr.read();assert left.returncode==0 and right.returncode==0,(err,right.stderr)
# Read/search under authenticated RLS, stable page and UUID routes.
read=lambda actor=20,q='',status='':json.loads(run(session(actor=actor)+f"select get_numbered_asset_transfer_register(1,'{q}','{status}');"))
r=read(q=n);assert r['total']==1 and r['records'][0]['id']==s and r['records'][0]['document_no']==n;assert read(actor=21,q=n)['total']==0
assert read(q=s)['total']==1 and read(q=legacy)['total']==1
legacy_read=read(q='LEGACY-42');assert legacy_read['total']==1 and legacy_read['records'][0]['source_id']=='LEGACY-42'
assert read(q=n)==r
assert run(f"select count(*) from asset_transfers where id='{legacy}'")=='1';assert run(f"select count(*) from asset_transfer_numbers where document_id='{legacy}'")=='0'
# Explicit final ACL and deferral checks, independent of default database ACLs.
assert run("select has_table_privilege('authenticated','asset_transfer_numbers','SELECT') and not has_table_privilege('authenticated','asset_transfer_numbers','INSERT,UPDATE,DELETE')")=='t'
assert run("select has_table_privilege('service_role','asset_transfer_numbers','SELECT') and not has_table_privilege('service_role','asset_transfer_numbers','INSERT,UPDATE,DELETE')")=='t'
assert run("select has_function_privilege('authenticated','get_asset_transfer_numbers(uuid[])','EXECUTE') and not has_function_privilege('anon','get_asset_transfer_numbers(uuid[])','EXECUTE') and not has_function_privilege('service_role','get_asset_transfer_numbers(uuid[])','EXECUTE')")=='t'
assert run("select count(*) from pg_trigger where tgname in ('assign_asset_transfer_number','assign_asset_transfer_batch_number') and tgdeferrable and tginitdeferred")=='2'
# Rollback is deactivation, retains history/numbers/counters and old RPC callers keep working.
ledger=run('select count(*) from asset_transfer_numbers');history=run('select count(*) from asset_transfer_updates');run(f"update asset_transfer_numbering_activation set enabled=false where company_id='{id(1)}'")
oldapp=run(session()+single(reason='Old app after deactivation'));assert run('select count(*) from asset_transfer_numbers')==ledger;assert run('select count(*) from asset_transfer_updates')==history;assert run(f"select count(*) from asset_transfers where id='{oldapp}'")=='1'
checks=['default gate disabled even with active sequence','no historical backfill','single idempotency/payload mismatch','batch idempotency/payload mismatch','one number per multi-line batch','reject preserves history/number; cancel unsupported','batch then single same transaction','advance batch then single same transaction','approve/dispatch/receive quantity conservation','duplicate receipt denied','company/permission/unassigned source denied','failed batch atomic rollback','explicit outer rollback leaves no transfer/number/counter change','12 concurrent full single RPCs','6 concurrent same-key batch RPCs','single+batch lock ordering','RLS number/source/UUID search stable','deactivation keeps ledger/history and legacy RPC usable','explicit read-only auth/service ACL and auth-only read RPC','two initially-deferred constraint triggers']
result={'passed':True,'database':db,'checks':checks,'source_hashes':hashes,'limits':['Repository337/339/357/376 plus reviewed batch proposal loaded verbatim; outer identity/catalog/permission helper fixtures, not real auth or production schema. No production connection.','No authenticated app browser, physical iPad or production-volume query-plan verification.']}
(out/'full-rpc-results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
