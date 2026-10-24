-- REVIEW ONLY, NOT AN APPLIED MIGRATION. Original untracked375 SHA256 6628b525b853f6c556bdd0c698a092fc92e4c68ba3a3ec401c1712c39f47d29a.
-- Copied from named original workspace; no Git ancestry or deployed-state claim.
-- Correct null-array guard; actual PostgreSQL concurrency/rollback tests still required.
begin;
-- A transfer batch is one document with multiple asset lines. Existing single
-- transfers remain valid and continue to use their original workflow.
create table public.asset_transfer_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  from_location_id uuid not null,
  to_location_id uuid not null,
  reason text not null,
  request_date date not null default (now() at time zone 'Asia/Kuala_Lumpur')::date,
  status text not null default 'requested' check (status in ('requested','approved','rejected','dispatched','received')),
  requested_by uuid not null references public.staffs(id),
  client_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, client_key),
  unique (company_id, id),
  check (from_location_id <> to_location_id),
  foreign key (company_id, from_location_id) references public.asset_locations(company_id,id),
  foreign key (company_id, to_location_id) references public.asset_locations(company_id,id)
);
alter table public.asset_transfers add column batch_id uuid;
alter table public.asset_transfers add constraint asset_transfers_batch_fk foreign key (company_id,batch_id) references public.asset_transfer_batches(company_id,id);
create index asset_transfers_batch_idx on public.asset_transfers(batch_id) where batch_id is not null;
create function public.guard_asset_transfer_batch_line() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
begin
  if new.batch_id is distinct from old.batch_id and not
     (old.batch_id is null and new.batch_id is not null and
      current_setting('app.asset_batch_transition',true) = new.batch_id::text) then
    raise exception 'Transfer batch membership cannot be changed';
  end if;
  if new.batch_id is not null and new.status is distinct from old.status and
     current_setting('app.asset_batch_transition',true) is distinct from new.batch_id::text then
    raise exception 'Open the transfer batch to update all assets together';
  end if;
  return new;
end $$;
create trigger guard_asset_transfer_batch_line before update of status,batch_id on public.asset_transfers
  for each row execute function public.guard_asset_transfer_batch_line();
alter table public.asset_transfer_batches enable row level security;
revoke all on public.asset_transfer_batches from anon,authenticated;
grant select on public.asset_transfer_batches to authenticated;
grant all on public.asset_transfer_batches to service_role;
create policy asset_transfer_batches_read on public.asset_transfer_batches for select to authenticated
  using (company_id = public.current_staff_company_id() and
    (public.asset_location_access(from_location_id) or public.asset_location_access(to_location_id)));

create function public.request_asset_transfer_batch(p_from uuid,p_to uuid,p_reason text,p_lines jsonb,p_client_key uuid,p_other text default null,p_date date default (now() at time zone 'Asia/Kuala_Lumpur')::date) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); batch public.asset_transfer_batches; line jsonb; line_id uuid; asset_id uuid; amount integer; line_count integer; destination uuid;
begin
  if not public.has_permission('assets.transfer') or not public.asset_location_access(p_from) then raise exception 'Asset transfer permission denied'; end if;
  if p_client_key is null or p_date is null or length(trim(coalesce(p_reason,''))) not between 1 and 2000 then raise exception 'Invalid transfer request'; end if;
  if p_other is not null and length(trim(p_other))>0 then
    if p_to is not null then raise exception 'Choose one destination'; end if;
    destination:=public.register_asset_other_location(p_other);
  else
    destination:=p_to;
  end if;
  if p_from=destination or not exists(select 1 from public.asset_locations where id=destination and company_id=company) then raise exception 'Invalid destination'; end if;
  if jsonb_typeof(p_lines) is distinct from 'array' then raise exception 'Choose assets to transfer'; end if;
  line_count:=jsonb_array_length(p_lines);
  if line_count<1 or line_count>100 then raise exception 'Choose between 1 and 100 assets'; end if;
  if (select count(distinct (value->>'asset_id')::uuid) from jsonb_array_elements(p_lines))<>line_count then raise exception 'Each asset may appear only once'; end if;
  perform pg_advisory_xact_lock(hashtextextended(company::text||':transfer-batch:'||p_client_key::text,0));
  select * into batch from public.asset_transfer_batches where company_id=company and client_key=p_client_key for update;
  if found then
    if batch.from_location_id<>p_from or batch.to_location_id<>destination or batch.reason<>trim(p_reason) or batch.request_date<>p_date or batch.requested_by<>actor or
      (select coalesce(jsonb_agg(jsonb_build_object('asset_id',t.asset_id,'quantity',t.quantity) order by t.asset_id),'[]'::jsonb) from public.asset_transfers t where t.batch_id=batch.id)<>
      (select jsonb_agg(jsonb_build_object('asset_id',(value->>'asset_id')::uuid,'quantity',(value->>'quantity')::integer) order by (value->>'asset_id')::uuid) from jsonb_array_elements(p_lines))
    then raise exception 'Transfer request key was reused with different values'; end if;
    return batch.id;
  end if;
  insert into public.asset_transfer_batches(company_id,from_location_id,to_location_id,reason,request_date,requested_by,client_key)
    values(company,p_from,destination,trim(p_reason),p_date,actor,p_client_key) returning * into batch;
  perform set_config('app.asset_batch_transition',batch.id::text,true);
  -- Stable order matches the asset-wide advisory lock order across concurrent requests.
  for line in select value from jsonb_array_elements(p_lines) order by (value->>'asset_id')::uuid loop
    asset_id:=(line->>'asset_id')::uuid; amount:=(line->>'quantity')::integer;
    if amount is null or amount<=0 then raise exception 'Enter a positive whole quantity'; end if;
    line_id:=public.request_asset_transfer(asset_id,p_from,destination,amount,trim(p_reason),null);
    update public.asset_transfers set batch_id=batch.id where id=line_id and company_id=company;
  end loop;
  return batch.id;
end $$;

create function public.advance_asset_transfer_batch(p_batch uuid,p_action text,p_note text default '') returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare batch public.asset_transfer_batches; line record; expected text; next_status text;
begin
  select * into batch from public.asset_transfer_batches where id=p_batch and company_id=public.current_staff_company_id() for update;
  if not found then raise exception 'Asset transfer unavailable'; end if;
  expected:=case when p_action in ('approve','reject') then 'requested' when p_action='dispatch' then 'approved' when p_action='receive' then 'dispatched' end;
  next_status:=case p_action when 'approve' then 'approved' when 'reject' then 'rejected' when 'dispatch' then 'dispatched' when 'receive' then 'received' end;
  if expected is null or batch.status<>expected then raise exception 'Transfer action unavailable'; end if;
  if not exists(select 1 from public.asset_transfers where batch_id=batch.id) then raise exception 'Transfer batch has no assets'; end if;
  perform set_config('app.asset_batch_transition',batch.id::text,true);
  for line in select id from public.asset_transfers where batch_id=batch.id order by asset_id loop
    perform public.advance_asset_transfer(line.id,p_action,p_note);
  end loop;
  update public.asset_transfer_batches set status=next_status,updated_at=now() where id=batch.id;
  return batch.id;
end $$;
revoke all on function public.request_asset_transfer_batch(uuid,uuid,text,jsonb,uuid,text,date),public.advance_asset_transfer_batch(uuid,text,text) from public,anon;
grant execute on function public.request_asset_transfer_batch(uuid,uuid,text,jsonb,uuid,text,date),public.advance_asset_transfer_batch(uuid,text,text) to authenticated;

create view public.asset_transfer_register with (security_invoker=true) as
  select b.id,b.id as batch_id,b.company_id,null::uuid as asset_id,b.from_location_id,b.to_location_id,
    b.status,b.reason,sum(t.quantity)::bigint as quantity,count(t.id)::integer as line_count,
    coalesce(s.full_name,'OMS staff') as author_name,b.created_at,'{}'::jsonb as source_data
  from public.asset_transfer_batches b
  join public.asset_transfers t on t.batch_id=b.id
  left join public.staffs s on s.id=b.requested_by
  group by b.id,s.full_name
  union all
  select t.id,null::uuid as batch_id,t.company_id,t.asset_id,t.from_location_id,t.to_location_id,
    t.status,t.reason,t.quantity,1 as line_count,t.author_name,t.created_at,t.source_data
  from public.asset_transfers t where t.batch_id is null;
revoke all on public.asset_transfer_register from anon;
grant select on public.asset_transfer_register to authenticated;

-- Revision markers are installed last, atomically with the whole contract.
comment on function public.request_asset_transfer_batch(uuid,uuid,text,jsonb,uuid,text,date) is 'oms.asset-batch.v1';
comment on function public.advance_asset_transfer_batch(uuid,text,text) is 'oms.asset-batch.v1';
comment on view public.asset_transfer_register is 'oms.asset-batch.v1';
rollback; -- review wrapper, no persistence
