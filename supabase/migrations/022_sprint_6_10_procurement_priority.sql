-- Sprint 6.10: procurement priority clarity.
-- Adds urgency fields without changing existing purchase workflow behavior.

alter table public.purchase_requests
  add column if not exists priority text not null default 'normal',
  add column if not exists needed_by_date date,
  add column if not exists urgency_reason text,
  add column if not exists production_risk boolean not null default false;

alter table public.purchase_orders
  add column if not exists priority text not null default 'normal',
  add column if not exists needed_by_date date,
  add column if not exists urgency_reason text,
  add column if not exists production_risk boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'purchase_requests_priority_check'
      and conrelid = 'public.purchase_requests'::regclass
  ) then
    alter table public.purchase_requests
      add constraint purchase_requests_priority_check
      check (priority in ('low', 'normal', 'urgent', 'critical'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'purchase_orders_priority_check'
      and conrelid = 'public.purchase_orders'::regclass
  ) then
    alter table public.purchase_orders
      add constraint purchase_orders_priority_check
      check (priority in ('low', 'normal', 'urgent', 'critical'));
  end if;
end $$;

create index if not exists purchase_requests_priority_idx
  on public.purchase_requests(priority, needed_by_date)
  where deleted_at is null;

create index if not exists purchase_orders_priority_idx
  on public.purchase_orders(priority, needed_by_date)
  where deleted_at is null;

update public.purchase_orders po
set
  priority = coalesce(pr.priority, po.priority, 'normal'),
  needed_by_date = coalesce(po.needed_by_date, pr.needed_by_date, pr.required_date),
  urgency_reason = coalesce(po.urgency_reason, pr.urgency_reason),
  production_risk = coalesce(po.production_risk, pr.production_risk, false)
from public.purchase_requests pr
where po.purchase_request_id = pr.id
  and (
    po.priority is distinct from coalesce(pr.priority, po.priority, 'normal')
    or po.needed_by_date is null
    or po.urgency_reason is null
    or po.production_risk is distinct from coalesce(po.production_risk, pr.production_risk, false)
  );
