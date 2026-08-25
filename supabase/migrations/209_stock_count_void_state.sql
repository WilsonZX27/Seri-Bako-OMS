-- Posted Stock Counts are never deleted. A void keeps the source evidence and
-- records the separate reversal operation.

alter type public.stock_count_status add value if not exists 'voided' after 'posted';

create table if not exists public.stock_count_voids (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  stock_count_id uuid not null references public.stock_counts(id),
  movement_fingerprint text not null,
  adjustment_line_count integer not null check (adjustment_line_count >= 0),
  reversed_quantity_in numeric(14,4) not null default 0,
  reversed_quantity_out numeric(14,4) not null default 0,
  reason text not null check (length(trim(reason)) between 3 and 1000),
  idempotency_key uuid not null,
  voided_by uuid not null references public.staffs(id),
  voided_at timestamptz not null default now(),
  unique(stock_count_id),
  unique(company_id,idempotency_key)
);

alter table public.stock_count_voids enable row level security;
create policy "stock count void scoped read" on public.stock_count_voids
  for select to authenticated using (
    company_id=public.current_staff_company_id()
    and exists (
      select 1 from public.stock_counts count_row
      where count_row.id=stock_count_id
        and public.can_access_inventory_branch(count_row.company_id,count_row.branch_id)
    )
  );

revoke all on public.stock_count_voids from public,anon;
grant select on public.stock_count_voids to authenticated;
