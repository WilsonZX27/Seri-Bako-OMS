-- Sprint 4: Inventory Core / Stock Ledger Engine
-- Keeps stock balance transaction-based and prepares stock transaction lines for future multi-line documents.

do $$
begin
  alter type public.stock_transaction_type add value if not exists 'production_usage';
  alter type public.stock_transaction_type add value if not exists 'production_output';
  alter type public.stock_transaction_type add value if not exists 'transfer_in';
  alter type public.stock_transaction_type add value if not exists 'transfer_out';
  alter type public.stock_transaction_type add value if not exists 'stock_adjustment';
  alter type public.stock_transaction_type add value if not exists 'stock_count_adjustment';
  alter type public.stock_transaction_type add value if not exists 'return_to_supplier';
  alter type public.stock_transaction_type add value if not exists 'customer_return';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'stock_transaction_status') then
    create type public.stock_transaction_status as enum ('draft', 'posted', 'cancelled');
  end if;
end $$;

alter table public.stock_transactions
  add column if not exists transaction_no text,
  add column if not exists document_id uuid references public.documents(id) on delete set null,
  add column if not exists branch_id uuid references public.branches(id) on delete restrict,
  add column if not exists status public.stock_transaction_status not null default 'posted',
  add column if not exists posted_at timestamptz,
  add column if not exists posted_by uuid references public.staffs(id) on delete set null,
  add column if not exists total_cost numeric(14,4);

alter table public.stock_transactions drop constraint if exists stock_transactions_type_direction_check;
alter table public.stock_transactions add constraint stock_transactions_type_direction_check check (
  (
    transaction_type::text in ('opening_balance','purchase','production_output','transfer_in','extra','customer_return')
    and quantity_in > 0 and quantity_out = 0
  )
  or (
    transaction_type::text in ('production_usage','transfer_out','wastage','damage','missing','return_supplier','return_to_supplier')
    and quantity_out > 0 and quantity_in = 0
  )
  or (
    transaction_type::text in ('correction','transfer','stock_adjustment','stock_count_adjustment')
    and ((quantity_in > 0 and quantity_out = 0) or (quantity_out > 0 and quantity_in = 0))
  )
);

update public.stock_transactions
set
  transaction_no = coalesce(transaction_no, 'ST-' || left(id::text, 8)),
  posted_at = coalesce(posted_at, created_at),
  total_cost = coalesce(total_cost, coalesce(unit_cost, 0) * greatest(quantity_in, quantity_out))
where transaction_no is null or posted_at is null or total_cost is null;

alter table public.stock_transactions
  alter column transaction_no set not null;

create unique index if not exists stock_transactions_transaction_no_idx on public.stock_transactions(transaction_no);
create index if not exists stock_transactions_document_idx on public.stock_transactions(document_id);
create index if not exists stock_transactions_branch_idx on public.stock_transactions(branch_id);
create index if not exists stock_transactions_status_idx on public.stock_transactions(status);
create index if not exists stock_transactions_posted_at_idx on public.stock_transactions(posted_at);

create table if not exists public.stock_transaction_lines (
  id uuid primary key default gen_random_uuid(),
  stock_transaction_id uuid not null references public.stock_transactions(id) on delete restrict,
  stock_entity_type public.stock_entity_type not null default 'item',
  item_id uuid references public.items(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  quantity_in numeric(14,4) not null default 0,
  quantity_out numeric(14,4) not null default 0,
  running_balance numeric(14,4),
  unit_cost numeric(14,4) not null default 0,
  total_cost numeric(14,4) generated always as ((quantity_in + quantity_out) * unit_cost) stored,
  reference_type text,
  reference_id uuid,
  remarks text,
  created_at timestamptz not null default now(),
  created_by uuid references public.staffs(id) on delete set null,
  constraint stock_transaction_lines_entity_check check (
    (stock_entity_type = 'item' and item_id is not null and product_id is null)
    or (stock_entity_type = 'product' and product_id is not null and item_id is null)
  ),
  constraint stock_transaction_lines_quantity_nonnegative check (quantity_in >= 0 and quantity_out >= 0),
  constraint stock_transaction_lines_one_direction check (not (quantity_in > 0 and quantity_out > 0)),
  constraint stock_transaction_lines_has_quantity check (quantity_in > 0 or quantity_out > 0),
  constraint stock_transaction_lines_cost_nonnegative check (unit_cost >= 0)
);

create index if not exists stock_transaction_lines_transaction_idx on public.stock_transaction_lines(stock_transaction_id);
create index if not exists stock_transaction_lines_item_idx on public.stock_transaction_lines(item_id);
create index if not exists stock_transaction_lines_product_idx on public.stock_transaction_lines(product_id);
create index if not exists stock_transaction_lines_location_idx on public.stock_transaction_lines(location_id);
create index if not exists stock_transaction_lines_branch_idx on public.stock_transaction_lines(branch_id);

alter table public.stock_transaction_lines enable row level security;

drop policy if exists "stock transaction lines read" on public.stock_transaction_lines;
create policy "stock transaction lines read" on public.stock_transaction_lines for select to authenticated using (public.has_permission('stock_transactions.read'));
drop policy if exists "stock transaction lines insert" on public.stock_transaction_lines;
create policy "stock transaction lines insert" on public.stock_transaction_lines for insert to authenticated with check (public.has_permission('stock_transactions.create'));

insert into public.permissions (permission_code, module, action, description)
values
  ('inventory.read','inventory','read','Read inventory dashboard and reports'),
  ('stock_transactions.read','stock_transactions','read','Read stock ledger transactions'),
  ('stock_transactions.create','stock_transactions','create','Create stock transactions'),
  ('stock_transactions.post','stock_transactions','post','Post stock transactions'),
  ('stock_card.read','stock_card','read','Read stock card'),
  ('stock_balance.read','stock_balance','read','Read stock balance')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.module in ('inventory','stock_transactions','stock_card','stock_balance')
where r.role_code in ('admin','kitchen','purchasing','finance')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in ('inventory.read','stock_transactions.read','stock_card.read','stock_balance.read')
where r.role_code = 'viewer'
on conflict do nothing;

create or replace view public.stock_ledger_view as
select
  st.id as stock_transaction_id,
  st.transaction_no,
  st.transaction_date,
  st.transaction_type,
  st.status,
  st.document_id,
  st.reference_type,
  st.reference_id,
  st.created_by,
  st.posted_at,
  stl.id as stock_transaction_line_id,
  coalesce(stl.item_id, st.item_id) as item_id,
  i.item_code,
  i.item_name,
  i.base_unit,
  coalesce(stl.branch_id, st.branch_id, l.branch_id) as branch_id,
  b.branch_name,
  coalesce(stl.location_id, st.location_id) as location_id,
  l.location_name,
  coalesce(stl.quantity_in, st.quantity_in) as quantity_in,
  coalesce(stl.quantity_out, st.quantity_out) as quantity_out,
  coalesce(stl.unit_cost, st.unit_cost, 0) as unit_cost,
  coalesce(stl.total_cost, st.total_cost, coalesce(st.unit_cost, 0) * greatest(st.quantity_in, st.quantity_out)) as total_cost,
  sum(coalesce(stl.quantity_in, st.quantity_in) - coalesce(stl.quantity_out, st.quantity_out))
    over (
      partition by coalesce(stl.item_id, st.item_id), coalesce(stl.location_id, st.location_id)
      order by st.transaction_date, st.created_at, st.id
      rows between unbounded preceding and current row
    ) as running_balance
from public.stock_transactions st
left join public.stock_transaction_lines stl on stl.stock_transaction_id = st.id
join public.items i on i.id = coalesce(stl.item_id, st.item_id)
join public.locations l on l.id = coalesce(stl.location_id, st.location_id)
left join public.branches b on b.id = coalesce(stl.branch_id, st.branch_id, l.branch_id)
where st.status = 'posted';

create or replace view public.inventory_valuation_view as
select
  item_id,
  item_code,
  item_name,
  base_unit,
  branch_id,
  branch_name,
  location_id,
  location_name,
  sum(quantity_in) as total_quantity_in,
  sum(quantity_out) as total_quantity_out,
  sum(quantity_in - quantity_out) as current_qty,
  case
    when sum(quantity_in) > 0 then sum(case when quantity_in > 0 then total_cost else 0 end) / sum(quantity_in)
    else 0
  end as average_cost,
  sum(quantity_in - quantity_out) *
    case
      when sum(quantity_in) > 0 then sum(case when quantity_in > 0 then total_cost else 0 end) / sum(quantity_in)
      else 0
    end as inventory_value,
  max(transaction_date) as last_movement
from public.stock_ledger_view
group by item_id, item_code, item_name, base_unit, branch_id, branch_name, location_id, location_name;

create or replace view public.stock_balances_view as
select
  ledger.item_id,
  ledger.item_code,
  i.autocount_code,
  ledger.item_name,
  i.category,
  i.purchase_unit,
  ledger.base_unit,
  i.conversion_to_base_unit,
  i.supplier_id,
  s.name as supplier_name,
  i.cost,
  i.safety_stock,
  i.lead_time_days,
  i.moq,
  i.status,
  ledger.branch_id,
  ledger.branch_name,
  ledger.location_id,
  ledger.location_name,
  sum(ledger.quantity_in) as total_quantity_in,
  sum(ledger.quantity_out) as total_quantity_out,
  sum(ledger.quantity_in - ledger.quantity_out) as current_stock,
  sum(ledger.quantity_in - ledger.quantity_out) as current_qty,
  case
    when sum(ledger.quantity_in) > 0 then sum(case when ledger.quantity_in > 0 then ledger.total_cost else 0 end) / sum(ledger.quantity_in)
    else 0
  end as average_cost,
  sum(ledger.quantity_in - ledger.quantity_out) *
    case
      when sum(ledger.quantity_in) > 0 then sum(case when ledger.quantity_in > 0 then ledger.total_cost else 0 end) / sum(ledger.quantity_in)
      else 0
    end as inventory_value,
  max(ledger.transaction_date) as last_movement,
  sum(ledger.quantity_in - ledger.quantity_out) < i.safety_stock as is_low_stock,
  greatest(i.safety_stock - sum(ledger.quantity_in - ledger.quantity_out), 0) as shortage_quantity
from public.stock_ledger_view ledger
join public.items i on i.id = ledger.item_id
left join public.suppliers s on s.id = i.supplier_id
group by
  ledger.item_id,
  ledger.item_code,
  i.autocount_code,
  ledger.item_name,
  i.category,
  i.purchase_unit,
  ledger.base_unit,
  i.conversion_to_base_unit,
  i.supplier_id,
  s.name,
  i.cost,
  i.safety_stock,
  i.lead_time_days,
  i.moq,
  i.status,
  ledger.branch_id,
  ledger.branch_name,
  ledger.location_id,
  ledger.location_name;

create or replace view public.low_stock_items as
select
  item_id,
  item_code,
  item_name,
  category,
  base_unit,
  supplier_id,
  supplier_name,
  current_stock,
  safety_stock,
  shortage_quantity,
  moq,
  lead_time_days,
  cost
from public.stock_balances_view
where is_low_stock = true and status = 'active'
order by shortage_quantity desc, item_name asc;
