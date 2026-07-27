-- v7.24.6 — Opening Stock numbers must be allocated in the same transaction
-- that posts the batch. The former HTTP-per-row allocation consumed 148 number
-- reservations for every failed import, even though the ledger write rolled
-- back. This allocator only advances when the opening-stock batch commits.

create or replace function public.allocate_opening_stock_number(p_company_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_prefix text;
  v_padding integer;
  v_period_start date := date_trunc('month', now() at time zone 'Asia/Kuala_Lumpur')::date;
  v_period_label text := upper(to_char(now() at time zone 'Asia/Kuala_Lumpur', 'MONYY'));
  v_issued_number integer;
  v_candidate text;
  v_attempt integer := 0;
begin
  if p_company_id is null then
    raise exception 'Company is required for opening-stock numbering.';
  end if;

  select prefix, padding into v_prefix, v_padding
  from public.document_sequences
  where company_id = p_company_id
    and document_type = 'opening_balance'
    and status = 'active'
    and deleted_at is null;

  if not found then
    raise exception 'No active document sequence exists for opening_balance.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'opening-stock-number:' || p_company_id::text || ':' || trim(v_prefix) || ':' || v_period_label,
    0
  ));

  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 10000 then
      raise exception 'Could not allocate an unused opening-stock number.';
    end if;

    insert into public.document_sequence_periods (company_id, document_type, period_start, next_number)
    values (p_company_id, 'opening_balance', v_period_start, 2)
    on conflict (company_id, document_type, period_start) do update
      set next_number = public.document_sequence_periods.next_number + 1
    returning next_number - 1 into v_issued_number;

    v_candidate := trim(v_prefix) || '/' || v_period_label || '/' || lpad(v_issued_number::text, greatest(v_padding, 3), '0');

    exit when not exists (
      select 1 from public.stock_transactions where transaction_no = v_candidate
    ) and not exists (
      select 1 from public.documents where company_id = p_company_id and document_no = v_candidate
    );
  end loop;

  update public.document_sequences
  set next_number = v_issued_number + 1,
      last_reset_at = now(),
      updated_at = now()
  where company_id = p_company_id and document_type = 'opening_balance';

  return v_candidate;
end;
$$;

create or replace function public.post_opening_stock_batch(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  row_value jsonb;
  posted_count integer := 0;
  branch_company_id uuid;
  transaction_number text;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 500 then
    raise exception 'Opening stock batch must contain between 1 and 500 rows.';
  end if;

  for row_value in select value from jsonb_array_elements(p_rows) loop
    select company_id into branch_company_id
    from public.branches
    where id = (row_value->>'branch_id')::uuid
      and status = 'active'
      and deleted_at is null;

    if branch_company_id is null then
      raise exception 'Opening stock branch is not active.';
    end if;

    transaction_number := public.allocate_opening_stock_number(branch_company_id);
    perform public.post_opening_stock(
      transaction_number,
      (row_value->>'branch_id')::uuid,
      (row_value->>'item_id')::uuid,
      (row_value->>'transaction_date')::date,
      (row_value->>'quantity')::numeric,
      (row_value->>'unit_cost')::numeric,
      row_value->>'remarks'
    );
    posted_count := posted_count + 1;
  end loop;

  return posted_count;
end;
$$;

-- Failed v7.24.5 attempts committed only sequence reservations. No ledger or
-- document owns those numbers, so rebase this month and let the allocator skip
-- every durable historic number rather than leaving an artificial 2,000+ gap.
update public.document_sequence_periods
set next_number = 1,
    updated_at = now()
where document_type = 'opening_balance'
  and period_start = date_trunc('month', now() at time zone 'Asia/Kuala_Lumpur')::date;

update public.document_sequences
set next_number = 1,
    updated_at = now()
where document_type = 'opening_balance';

revoke all on function public.allocate_opening_stock_number(uuid) from public, anon, authenticated;
revoke all on function public.post_opening_stock_batch(jsonb) from public, anon;
grant execute on function public.post_opening_stock_batch(jsonb) to authenticated;
