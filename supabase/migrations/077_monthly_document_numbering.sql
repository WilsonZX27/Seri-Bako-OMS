-- Monthly, atomic document numbering.
-- Existing document numbers are deliberately not updated by this migration.

create table if not exists public.document_sequence_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  document_type text not null,
  period_start date not null,
  next_number integer not null default 1 check (next_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, document_type, period_start)
);

create index if not exists document_sequence_periods_lookup_idx
  on public.document_sequence_periods (company_id, document_type, period_start);

drop trigger if exists set_document_sequence_periods_updated_at on public.document_sequence_periods;
create trigger set_document_sequence_periods_updated_at
  before update on public.document_sequence_periods
  for each row execute function public.set_updated_at();

alter table public.document_sequence_periods enable row level security;

drop policy if exists "document sequence periods scoped read" on public.document_sequence_periods;
create policy "document sequence periods scoped read" on public.document_sequence_periods
  for select to authenticated
  using (
    company_id = public.current_staff_company_id()
    and public.has_permission('document_sequences.read')
  );

create or replace function public.next_document_number(p_company_id uuid, p_document_type text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_padding integer;
  v_period_start date := date_trunc('month', now() at time zone 'Asia/Kuala_Lumpur')::date;
  v_period_label text := upper(to_char(now() at time zone 'Asia/Kuala_Lumpur', 'MONYY'));
  v_issued_number integer;
begin
  if p_company_id is null or nullif(trim(p_document_type), '') is null then
    raise exception 'Company and document type are required for document numbering';
  end if;

  select prefix, padding
    into v_prefix, v_padding
  from public.document_sequences
  where company_id = p_company_id
    and document_type = p_document_type
    and status = 'active'
    and deleted_at is null;

  if not found then
    raise exception 'No active document sequence exists for document type %', p_document_type;
  end if;

  insert into public.document_sequence_periods (
    company_id, document_type, period_start, next_number
  ) values (
    p_company_id, p_document_type, v_period_start, 2
  )
  on conflict (company_id, document_type, period_start) do update
    set next_number = public.document_sequence_periods.next_number + 1
  returning next_number - 1 into v_issued_number;

  -- Kept as a backwards-compatible summary for existing settings and exports.
  update public.document_sequences
  set next_number = v_issued_number + 1,
      last_reset_at = now(),
      updated_at = now()
  where company_id = p_company_id
    and document_type = p_document_type;

  return trim(v_prefix) || '/' || v_period_label || '/' || lpad(v_issued_number::text, greatest(v_padding, 3), '0');
end;
$$;

grant select on public.document_sequence_periods to authenticated;
grant execute on function public.next_document_number(uuid, text) to authenticated;
