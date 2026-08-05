-- v8.37.0 - Configurable document sequence reset cycles.

alter type public.reset_frequency add value if not exists 'quarterly' after 'monthly';

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
  if not public.has_any_permission(array['documents.create','purchase_request.create','pr.create','purchase_order.create','po.create','goods_receiving.create','purchase_return.create','stock_count.create','stock_transfer.create','stock_wastage.create','stock_transaction.create','production_job.create','supplier_invoice.create']) then
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
      and not exists(select 1 from public.stock_transactions where transaction_no = v_candidate);
  end loop;
  update public.document_sequences set next_number = v_issued_number + 1, last_reset_at = now(), updated_at = now()
  where company_id = p_company_id and document_type = p_document_type;
  return v_candidate;
end;
$$;

revoke all on function public.next_document_number(uuid, text) from public;
revoke all on function public.next_document_number(uuid, text) from anon;
grant execute on function public.next_document_number(uuid, text) to authenticated;
