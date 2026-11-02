-- INSTALLATION CANDIDATE: proposed slot383, UNRESERVED. Separate approval required.
-- Atomic COMMIT; no activation, historical backfill or global allocator changes.
begin;
create table public.asset_transfer_numbers (
 company_id uuid not null references public.companies(id),
 document_id uuid not null,
 document_kind text not null check(document_kind in ('single','batch')),
 document_no text not null check(document_no ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,79}$'),
 created_at timestamptz not null default now(),
 primary key(company_id,document_id)
);
create unique index asset_transfer_numbers_company_no on public.asset_transfer_numbers(company_id,lower(document_no));
alter table public.asset_transfer_numbers enable row level security;
revoke all on public.asset_transfer_numbers from public,anon,authenticated,service_role;
grant select on public.asset_transfer_numbers to authenticated,service_role;
create policy asset_transfer_numbers_read on public.asset_transfer_numbers for select to authenticated using (
 company_id=public.current_staff_company_id() and public.has_permission('assets.view') and
 (exists(select 1 from public.asset_transfers t where t.company_id=asset_transfer_numbers.company_id and t.id=asset_transfer_numbers.document_id)
 or exists(select 1 from public.asset_transfer_batches b where b.company_id=asset_transfer_numbers.company_id and b.id=asset_transfer_numbers.document_id))
);

-- Separate empty activation gate: existing sequence settings can never implicitly enable installation.
create table public.asset_transfer_numbering_activation (
 company_id uuid primary key references public.companies(id),
 enabled boolean not null default false
);
alter table public.asset_transfer_numbering_activation enable row level security;
revoke all on public.asset_transfer_numbering_activation from public,anon,authenticated,service_role;
grant select on public.asset_transfer_numbering_activation to service_role;

create function public.assign_asset_transfer_number() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare config public.document_sequences; issued integer; candidate text; attempts integer:=0;
begin
 -- Installation inserts no activation rows; enablement is a separate approved operation.
 if not exists(select 1 from public.asset_transfer_numbering_activation where company_id=new.company_id and enabled) then return new; end if;
 -- No sequence configuration is created here. Only an explicitly activated company/type is numbered.
 select * into config from public.document_sequences where company_id=new.company_id and document_type='asset_transfer' and status='active' and deleted_at is null;
 if not found then return new; end if;
 if new.company_id is distinct from public.current_staff_company_id() or not public.has_permission('assets.transfer') then raise exception 'Transfer numbering permission denied'; end if;
 if config.reset_frequency::text<>'never' or config.prefix !~ '^[A-Za-z0-9][A-Za-z0-9-]{0,59}$' or config.padding not between 1 and 10 then raise exception 'Transfer numbering requires a valid prefix, padding and never reset'; end if;
 if tg_table_name='asset_transfers' then
  -- Deferred trigger reads final membership, never a caller's leftover batch context.
  if not exists(select 1 from public.asset_transfers where id=new.id and company_id=new.company_id and batch_id is null) then return new; end if;
 elsif not exists(select 1 from public.asset_transfer_batches where id=new.id and company_id=new.company_id) then return new;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(new.company_id::text||':asset-transfer-number',0));
 loop
  attempts:=attempts+1;
  if attempts>10000 then raise exception 'Transfer number continuation point requires review'; end if;
  insert into public.document_sequence_periods(company_id,document_type,period_start,next_number)
  values(new.company_id,'asset_transfer',date '1970-01-01',config.next_number+1)
  on conflict(company_id,document_type,period_start) do update set next_number=public.document_sequence_periods.next_number+1
  returning next_number-1 into issued;
  -- lpad must never truncate a growing sequence after 999.
  candidate:=config.prefix||'-'||lpad(issued::text,greatest(config.padding,length(issued::text)), '0');
  exit when not exists(select 1 from public.asset_transfer_numbers where company_id=new.company_id and lower(document_no)=lower(candidate))
   and not exists(select 1 from public.asset_transfers where company_id=new.company_id and lower(source_id)=lower(candidate));
 end loop;
 insert into public.asset_transfer_numbers(company_id,document_id,document_kind,document_no)
 values(new.company_id,new.id,case when tg_table_name='asset_transfer_batches' then 'batch' else 'single' end,candidate);
 update public.document_sequences set next_number=issued+1,updated_at=now() where id=config.id;
 return new;
end $$;
revoke all on function public.assign_asset_transfer_number() from public,anon,authenticated,service_role;
create constraint trigger assign_asset_transfer_number after insert on public.asset_transfers deferrable initially deferred for each row execute function public.assign_asset_transfer_number();
create constraint trigger assign_asset_transfer_batch_number after insert on public.asset_transfer_batches deferrable initially deferred for each row execute function public.assign_asset_transfer_number();

create function public.get_asset_transfer_numbers(p_ids uuid[]) returns table(document_id uuid,document_no text)
language plpgsql stable security invoker set search_path=pg_catalog,public as $$
begin
 if not public.has_permission('assets.view') then raise exception 'Asset view permission denied'; end if;
 if cardinality(p_ids)>100 or p_ids is null then raise exception 'Choose at most 100 transfers'; end if;
 return query select n.document_id,n.document_no from public.asset_transfer_numbers n where n.company_id=public.current_staff_company_id() and n.document_id=any(p_ids);
end $$;

create function public.get_numbered_asset_transfer_register(p_page integer default 1,p_query text default '',p_status text default '') returns jsonb
language plpgsql stable security invoker set search_path=pg_catalog,public as $$
declare result jsonb;
begin
 if not public.has_permission('assets.view') then raise exception 'Asset view permission denied'; end if;
 if p_page is null or p_page<1 or p_page>1000000 or p_query is null or length(p_query)>120 or p_status is null then raise exception 'Invalid transfer filters'; end if;
 with matched as materialized (
  select r as transfer_row,n.document_no,legacy.source_id,r.created_at,r.id
  from public.asset_transfer_register r left join public.asset_transfer_numbers n on n.company_id=r.company_id and n.document_id=r.id
  left join public.asset_transfers legacy on legacy.company_id=r.company_id and legacy.id=r.id and legacy.batch_id is null
  where r.company_id=public.current_staff_company_id() and (p_status='' or r.status=p_status)
  and (trim(p_query)='' or strpos(lower(coalesce(n.document_no,'')),lower(trim(p_query)))>0 or strpos(lower(coalesce(legacy.source_id,'')),lower(trim(p_query)))>0 or strpos(r.id::text,lower(trim(p_query)))>0)
 ), page_rows as (select * from matched order by created_at desc,id desc limit 50 offset (p_page-1)*50)
 select jsonb_build_object('records',coalesce((select jsonb_agg(to_jsonb(transfer_row)||jsonb_build_object('document_no',document_no,'source_id',source_id) order by created_at desc,id desc) from page_rows),'[]'::jsonb),'total',(select count(*) from matched)) into result;
 return result;
end $$;
revoke all on function public.get_asset_transfer_numbers(uuid[]),public.get_numbered_asset_transfer_register(integer,text,text) from public,anon,service_role;
grant execute on function public.get_asset_transfer_numbers(uuid[]),public.get_numbered_asset_transfer_register(integer,text,text) to authenticated;
commit; -- install schema only; activation table remains empty (default OFF)
