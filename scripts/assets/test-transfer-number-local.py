"""Isolated PostgreSQL trigger/RLS/concurrency checks; synthetic schema/auth boundary only."""
import concurrent.futures,json,pathlib,subprocess,uuid
container='oms-asset-link-local-20261030'; db='at_number_'+uuid.uuid4().hex[:10]
out=pathlib.Path('handoff/transfer-number');out.mkdir(parents=True,exist_ok=True)
def sql(s,ok=True):
 p=subprocess.run(['docker','exec','-i',container,'psql','-XqAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',db],input=s,text=True,capture_output=True)
 if ok and p.returncode:raise Exception(p.stderr)
 if not ok and not p.returncode:raise Exception('Expected rejection')
 return p.stdout.strip()
subprocess.run(['docker','exec',container,'createdb','-U','postgres',db],check=True)
a='10000000-0000-4000-8000-000000000001';b='10000000-0000-4000-8000-000000000002'
sql("""create table companies(id uuid primary key);
create function current_staff_company_id() returns uuid language sql stable as $$select nullif(current_setting('test.company',true),'')::uuid$$;
create function has_permission(text) returns boolean language sql stable as $$select coalesce(current_setting('test.permission',true),'yes')<>'no'$$;
create table document_sequences(id uuid primary key default gen_random_uuid(),company_id uuid,document_type text,prefix text,padding integer,reset_frequency text,status text,deleted_at timestamptz,next_number integer,updated_at timestamptz,unique(company_id,document_type));
create table document_sequence_periods(company_id uuid,document_type text,period_start date,next_number integer,unique(company_id,document_type,period_start));
create table asset_transfer_batches(id uuid primary key default gen_random_uuid(),company_id uuid,created_at timestamptz default now(),status text default 'requested',visible boolean default true);
create table asset_transfers(id uuid primary key default gen_random_uuid(),company_id uuid,batch_id uuid references asset_transfer_batches(id),source_id text,created_at timestamptz default now(),status text default 'requested',visible boolean default true);
alter table asset_transfer_batches enable row level security;alter table asset_transfers enable row level security;
create policy fixture_read on asset_transfers for select to authenticated using(company_id=current_staff_company_id() and visible);
create policy fixture_read on asset_transfer_batches for select to authenticated using(company_id=current_staff_company_id() and visible);
create view asset_transfer_register with(security_invoker=true) as select id,company_id,created_at,status,source_id from asset_transfers where batch_id is null union all select id,company_id,created_at,status,null::text as source_id from asset_transfer_batches;
grant usage on schema public to authenticated;grant select on asset_transfers,asset_transfer_batches,asset_transfer_register to authenticated;
""")
sql(f"insert into companies values('{a}'),('{b}');insert into asset_transfers(company_id,source_id) values('{a}','LEGACY-42'),('{a}','AT-001');")
proposal=pathlib.Path('docs/v10/proposals/asset-transfer-number-review-only.sql').read_text();sql(proposal.replace('rollback; -- installation','commit; -- installation'))
assert sql('select count(*) from asset_transfer_numbers')=='0'
sql(f"insert into document_sequences(company_id,document_type,prefix,padding,reset_frequency,status,next_number) values('{a}','asset_transfer','AT',3,'never','active',1),('{b}','asset_transfer','AT',3,'never','active',1);")
sql(f"insert into asset_transfer_numbering_activation(company_id,enabled) values('{a}',true),('{b}',true)")
def create(company=a):return sql(f"set test.company='{company}';insert into asset_transfers(company_id) values('{company}') returning id;")
first=create();assert sql(f"select document_no from asset_transfer_numbers where document_id='{first}'")=='AT-002'
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: ids=list(pool.map(lambda _:create(),range(24)))
numbers=sql(f"select document_no from asset_transfer_numbers where company_id='{a}' order by document_no").splitlines();assert len(numbers)==25 and len(set(numbers))==25
other=create(b);assert sql(f"select document_no from asset_transfer_numbers where document_id='{other}'")=='AT-001'
batch=str(uuid.uuid4());line1=str(uuid.uuid4());line2=str(uuid.uuid4())
sql(f"begin;set test.company='{a}';insert into asset_transfer_batches(id,company_id) values('{batch}','{a}');select set_config('app.asset_batch_transition','{batch}',true);insert into asset_transfers(id,company_id,batch_id) values('{line1}','{a}','{batch}'),('{line2}','{a}','{batch}');commit;")
assert sql(f"select count(*) from asset_transfer_numbers where document_id in ('{batch}','{line1}','{line2}')")=='1'
count=sql('select count(*) from asset_transfer_numbers');counter=sql(f"select next_number from document_sequence_periods where company_id='{a}'")
sql(f"begin;set test.company='{a}';insert into asset_transfers(company_id) values('{a}');select 1/0;commit;",False)
assert sql('select count(*) from asset_transfer_numbers')==count and sql(f"select next_number from document_sequence_periods where company_id='{a}'")==counter
sql(f"set test.company='{b}';insert into asset_transfers(company_id) values('{a}');",False)
sql(f"set test.company='{a}';set test.permission='no';insert into asset_transfers(company_id) values('{a}');",False)
# Read as authenticated exercises the real candidate RLS/RPC, with synthetic actor helpers.
def read(query='',company=a):return json.loads(sql(f"set test.company='{company}';set role authenticated;select get_numbered_asset_transfer_register(1,'{query}','');"))
r=read('AT-002');assert r['total']==1 and r['records'][0]['id']==first and r['records'][0]['document_no']=='AT-002';assert read('AT-002',b)['total']==0
assert read('LEGACY-42')['total']==1
assert read(first)['total']==1 # UUID lookup remains supported alongside the business number
before=read('AT-002');assert read('AT-002')==before
sql(f"update asset_transfers set visible=false where id='{first}';")
assert read('AT-002')['total']==0
assert sql(f"set test.company='{a}';set role authenticated;select count(*) from get_asset_transfer_numbers(array['{first}'::uuid]);")=='0'
sql(f"set test.company='{a}';set role authenticated;insert into asset_transfer_numbers values('{a}',gen_random_uuid(),'single','AT-999',now());",False)
sql(f"update document_sequence_periods set next_number=1000 where company_id='{a}';")
large=create();assert sql(f"select document_no from asset_transfer_numbers where document_id='{large}'")=='AT-1000'
sql(f"update document_sequences set status='inactive' where company_id='{a}';")
disabled=create();assert sql(f"select count(*) from asset_transfer_numbers where document_id='{disabled}'")=='0'
result={'passed':True,'database':db,'concurrent_requests':24,'checks':['no backfill','legacy code collision skipped','company-scoped uniqueness','24 concurrent requests','single number for two-line batch','failed transaction counter rollback','foreign-company creation denied','permission denied','number search/count','legacy source search','stable refresh','RLS hidden transfer excluded','direct number write denied','AT-1000 not truncated','inactive company unchanged'],'limits':['Synthetic schema and actor helpers; full installed request RPC/session acceptance not exercised. No production access.']}
(out/'database-results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
