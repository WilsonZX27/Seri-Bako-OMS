-- REVIEW ONLY. NOT A MIGRATION. NOT EXECUTED. Requires isolated PostgreSQL concurrency/rollback validation.
-- No grants or sequence configuration inserted. Existing sequence type asset must be explicitly configured.
-- Application create path must send blank code only after this reviewed DB contract is deployed; edit/import code unchanged.
begin;
create or replace function public.next_document_number(p_company_id uuid, p_document_type text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  v_prefix text;
  v_padding integer;
  v_frequency text;
  v_local_now timestamp := now() at time zone 'Asia/Kuala_Lumpur';
  v_period_start date;
  v_period_label text;
  v_issued_number integer;
  v_candidate text;
  v_attempt integer := 0;
begin
  select * into actor from public.staffs where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null or p_company_id is null or actor.company_id is distinct from p_company_id then
    raise exception 'Document numbering is restricted to your active company.';
  end if;
  if not (p_document_type = 'asset' and public.has_permission('assets.manage')) and not public.has_any_permission(array['documents.create','purchase_request.create','pr.create','purchase_order.create','po.create','goods_receiving.create','purchase_return.create','stock_count.create','stock_transfer.create','stock_wastage.create','stock_transaction.create','production_job.create','supplier_invoice.create']) then
    raise exception 'You do not have permission to allocate document numbers.';
  end if;

  select prefix, padding, reset_frequency::text into v_prefix, v_padding, v_frequency
  from public.document_sequences
  where company_id = p_company_id and document_type = p_document_type and status = 'active' and deleted_at is null;
  if not found then raise exception 'No active document sequence exists for document type %', p_document_type; end if;

  if v_frequency = 'never' then
    v_period_start := date '1970-01-01'; v_period_label := 'ALL';
  elsif v_frequency = 'yearly' then
    v_period_start := date_trunc('year', v_local_now)::date; v_period_label := to_char(v_local_now, 'YYYY');
  elsif v_frequency = 'quarterly' then
    v_period_start := date_trunc('quarter', v_local_now)::date; v_period_label := 'Q' || extract(quarter from v_local_now)::integer || to_char(v_local_now, 'YY');
  elsif v_frequency = 'daily' then
    v_period_start := v_local_now::date; v_period_label := to_char(v_local_now, 'MMDDYY');
  else
    v_period_start := date_trunc('month', v_local_now)::date; v_period_label := upper(to_char(v_local_now, 'MONYY'));
  end if;

  perform pg_advisory_xact_lock(hashtextextended('document-number:' || p_company_id::text || ':' || trim(v_prefix) || ':' || v_period_label, 0));
  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 10000 then raise exception 'Could not allocate an unused document number for %.', p_document_type; end if;
    insert into public.document_sequence_periods(company_id, document_type, period_start, next_number)
    values(p_company_id, p_document_type, v_period_start, 2)
    on conflict(company_id, document_type, period_start) do update set next_number = public.document_sequence_periods.next_number + 1
    returning next_number - 1 into v_issued_number;
    v_candidate := trim(v_prefix) || '/' || v_period_label || '/' || lpad(v_issued_number::text, greatest(v_padding, 3), '0');
    exit when not exists(select 1 from public.documents where company_id = p_company_id and document_no = v_candidate)
      and not exists(select 1 from public.stock_transactions where transaction_no = v_candidate)
      and not (p_document_type = 'asset' and exists(select 1 from public.assets where company_id = p_company_id and lower(asset_code) = lower(v_candidate)));
  end loop;
  update public.document_sequences set next_number = v_issued_number + 1, last_reset_at = now(), updated_at = now()
  where company_id = p_company_id and document_type = p_document_type;
  return v_candidate;
end;
$$;


create or replace function public.create_asset_master(p_code text,p_name text,p_location uuid,p_quantity integer,p_details jsonb,p_reason text,p_client_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); result uuid; existing public.asset_master_updates; generated boolean:=nullif(trim(p_code),'') is null; code text;
begin
 if not public.has_permission('assets.manage') or not public.asset_location_access(p_location) then raise exception 'Asset master permission denied'; end if;
 if (not generated and trim(coalesce(p_code,''))!~'^[A-Za-z0-9][A-Za-z0-9._/-]{0,79}$') or length(trim(coalesce(p_name,''))) not between 1 and 200 or p_quantity<0 or not public.asset_master_details_valid(p_details) or length(trim(coalesce(p_reason,''))) not between 1 and 2000 or p_client_key is null then raise exception 'Invalid asset master details'; end if;
 perform pg_advisory_xact_lock(hashtextextended(company::text||':master:'||p_client_key::text,0));
 select * into existing from public.asset_master_updates where company_id=company and source_id='OMS-'||p_client_key;
 if found then
  if existing.source_data->>'Operation'<>'create' or (case when generated then coalesce(existing.source_data->>'Code Mode','manual')<>'sequence' else existing.source_data->>'Code'<>trim(p_code) or coalesce(existing.source_data->>'Code Mode','manual')='sequence' end) or existing.source_data->>'Name'<>trim(p_name) or existing.source_data->>'Location'<>p_location::text or existing.source_data->'Quantity' is distinct from coalesce(to_jsonb(p_quantity),'null'::jsonb) or existing.source_data->'Details' is distinct from p_details or existing.source_data->>'Reason'<>trim(p_reason) then raise exception 'Asset creation key reused with different details'; end if;
  return existing.asset_id;
 end if;
 code:=case when generated then public.next_document_number(company,'asset') else trim(p_code) end;
 if code!~'^[A-Za-z0-9][A-Za-z0-9._/-]{0,79}$' then raise exception 'Configured asset numbering produces an invalid asset ID'; end if;
 insert into public.assets(company_id,asset_code,item_name,current_details) values(company,code,trim(p_name),p_details) returning id into result;
 insert into public.asset_holdings(company_id,asset_id,location_id,quantity,status) values(company,result,p_location,p_quantity,'Active');
 insert into public.asset_master_updates(company_id,asset_id,source_id,author_name,source_data) values(company,result,'OMS-'||p_client_key,coalesce((select full_name from public.staffs where id=actor),'OMS staff'),jsonb_build_object('Operation','create','Code',code,'Code Mode',case when generated then 'sequence' else 'manual' end,'Name',trim(p_name),'Location',p_location,'Location Name',(select source_name from public.asset_locations where id=p_location and company_id=company),'Quantity',p_quantity,'Details',p_details,'Reason',trim(p_reason),'Actor ID',actor));
 return result;
end $$;

rollback; -- dry-run review wrapper: never persist this proposal by accident
