-- Sprint 6.11.1
-- Stabilize document numbering so operational flows stop relying on client-side timestamp fallbacks.

create or replace function public.next_document_number(p_company_id uuid, p_document_type text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sequence public.document_sequences%rowtype;
  v_prefix text;
  v_now timestamptz := now();
  v_reset boolean := false;
begin
  if p_company_id is null then
    raise exception 'Company is required for document numbering';
  end if;

  select *
  into v_sequence
  from public.document_sequences
  where company_id = p_company_id
    and document_type = p_document_type
  for update;

  if not found then
    v_prefix := case p_document_type
      when 'purchase_request' then 'PR'
      when 'purchase_order' then 'PO'
      when 'goods_receiving' then 'GRN'
      when 'stock_count' then 'SC'
      when 'stock_transfer' then 'TRF'
      when 'stock_wastage' then 'WST'
      when 'stock_transaction' then 'ST'
      when 'opening_balance' then 'OB'
      else upper(left(regexp_replace(coalesce(p_document_type, 'DOC'), '[^a-zA-Z0-9]+', '', 'g'), 6))
    end;

    insert into public.document_sequences (
      company_id,
      document_type,
      prefix,
      next_number,
      padding,
      reset_frequency,
      last_reset_at,
      status,
      deleted_at
    )
    values (
      p_company_id,
      p_document_type,
      coalesce(nullif(v_prefix, ''), 'DOC'),
      1,
      5,
      'yearly',
      v_now,
      'active',
      null
    )
    on conflict (company_id, document_type) do update
      set status = 'active',
          deleted_at = null
    returning *
    into v_sequence;
  end if;

  if v_sequence.reset_frequency = 'daily' then
    v_reset := v_sequence.last_reset_at is null or date_trunc('day', v_sequence.last_reset_at) <> date_trunc('day', v_now);
  elsif v_sequence.reset_frequency = 'monthly' then
    v_reset := v_sequence.last_reset_at is null or date_trunc('month', v_sequence.last_reset_at) <> date_trunc('month', v_now);
  elsif v_sequence.reset_frequency = 'yearly' then
    v_reset := v_sequence.last_reset_at is null or date_trunc('year', v_sequence.last_reset_at) <> date_trunc('year', v_now);
  end if;

  if v_reset then
    update public.document_sequences
    set next_number = 1,
        last_reset_at = v_now,
        status = 'active',
        deleted_at = null
    where id = v_sequence.id
    returning *
    into v_sequence;
  elsif v_sequence.last_reset_at is null or v_sequence.status <> 'active' or v_sequence.deleted_at is not null then
    update public.document_sequences
    set last_reset_at = coalesce(last_reset_at, v_now),
        status = 'active',
        deleted_at = null
    where id = v_sequence.id
    returning *
    into v_sequence;
  end if;

  update public.document_sequences
  set next_number = v_sequence.next_number + 1,
      updated_at = v_now,
      last_reset_at = coalesce(last_reset_at, v_now)
  where id = v_sequence.id
  returning *
  into v_sequence;

  return v_sequence.prefix || '-' || lpad((v_sequence.next_number - 1)::text, v_sequence.padding, '0');
end;
$$;

grant execute on function public.next_document_number(uuid, text) to authenticated;

