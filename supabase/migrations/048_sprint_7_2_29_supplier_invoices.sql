-- Sprint 7.2.29: minimal supplier invoice and AP payment tracking.

create table if not exists public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  invoice_no text not null,
  supplier_invoice_no text not null,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete restrict,
  goods_receiving_id uuid not null references public.goods_receivings(id) on delete restrict,
  invoice_date date not null default current_date,
  due_date date,
  subtotal numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null,
  amount_paid numeric(14,2) not null default 0,
  status text not null default 'unpaid',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.staffs(id) on delete set null,
  updated_by uuid references public.staffs(id) on delete set null,
  deleted_at timestamptz,
  constraint supplier_invoices_status_check check (status in ('unpaid','partially_paid','paid','cancelled')),
  constraint supplier_invoices_amount_positive check (total_amount > 0),
  constraint supplier_invoices_paid_cap check (amount_paid >= 0 and amount_paid <= total_amount)
);

create unique index if not exists supplier_invoices_company_no_idx
  on public.supplier_invoices(company_id, invoice_no)
  where deleted_at is null;

create unique index if not exists supplier_invoices_supplier_external_no_idx
  on public.supplier_invoices(supplier_id, supplier_invoice_no)
  where deleted_at is null;

create index if not exists supplier_invoices_grn_idx on public.supplier_invoices(goods_receiving_id);
create index if not exists supplier_invoices_po_idx on public.supplier_invoices(purchase_order_id);
create index if not exists supplier_invoices_status_idx on public.supplier_invoices(status);

create table if not exists public.supplier_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  supplier_invoice_id uuid not null references public.supplier_invoices(id) on delete cascade,
  payment_no text not null,
  payment_date date not null default current_date,
  amount numeric(14,2) not null,
  payment_method text,
  reference_no text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.staffs(id) on delete set null,
  constraint supplier_invoice_payments_amount_positive check (amount > 0)
);

create unique index if not exists supplier_invoice_payments_company_no_idx
  on public.supplier_invoice_payments(company_id, payment_no);
create index if not exists supplier_invoice_payments_invoice_idx on public.supplier_invoice_payments(supplier_invoice_id);

drop trigger if exists set_supplier_invoices_updated_at on public.supplier_invoices;
create trigger set_supplier_invoices_updated_at
before update on public.supplier_invoices
for each row execute function public.set_updated_at();

insert into public.permissions (permission_code, module, action, description)
values
  ('supplier_invoice.view','supplier_invoice','view','View supplier invoices'),
  ('supplier_invoice.create','supplier_invoice','create','Create supplier invoices'),
  ('supplier_invoice.pay','supplier_invoice','pay','Record supplier invoice payments')
on conflict (permission_code) do nothing;

insert into public.document_sequences (company_id, document_type, prefix, next_number, padding, reset_frequency, status)
select c.id, 'supplier_invoice', 'INV', 1, 5, 'yearly', 'active'
from public.companies c
where not exists (
  select 1 from public.document_sequences ds
  where ds.company_id = c.id and ds.document_type = 'supplier_invoice' and ds.deleted_at is null
);

insert into public.document_sequences (company_id, document_type, prefix, next_number, padding, reset_frequency, status)
select c.id, 'payment_schedule', 'PAY', 1, 5, 'yearly', 'active'
from public.companies c
where not exists (
  select 1 from public.document_sequences ds
  where ds.company_id = c.id and ds.document_type = 'payment_schedule' and ds.deleted_at is null
);

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in ('supplier_invoice.view','supplier_invoice.create','supplier_invoice.pay')
where r.role_code in ('super_admin','admin','operations_admin','finance')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'supplier_invoice.view'
where r.role_code in ('purchasing','manager')
on conflict (role_id, permission_id) do nothing;

alter table public.supplier_invoices enable row level security;
alter table public.supplier_invoice_payments enable row level security;

drop policy if exists "supplier invoices read" on public.supplier_invoices;
create policy "supplier invoices read" on public.supplier_invoices
for select to authenticated using (public.has_permission('supplier_invoice.view'));

drop policy if exists "supplier invoices insert" on public.supplier_invoices;
create policy "supplier invoices insert" on public.supplier_invoices
for insert to authenticated with check (public.has_permission('supplier_invoice.create'));

drop policy if exists "supplier invoices update" on public.supplier_invoices;
create policy "supplier invoices update" on public.supplier_invoices
for update to authenticated
using (public.has_permission('supplier_invoice.create') or public.has_permission('supplier_invoice.pay'))
with check (public.has_permission('supplier_invoice.create') or public.has_permission('supplier_invoice.pay'));

drop policy if exists "supplier invoice payments read" on public.supplier_invoice_payments;
create policy "supplier invoice payments read" on public.supplier_invoice_payments
for select to authenticated using (public.has_permission('supplier_invoice.view'));

drop policy if exists "supplier invoice payments insert" on public.supplier_invoice_payments;
create policy "supplier invoice payments insert" on public.supplier_invoice_payments
for insert to authenticated with check (public.has_permission('supplier_invoice.pay'));

grant select, insert, update on table public.supplier_invoices to authenticated;
grant select, insert on table public.supplier_invoice_payments to authenticated;
