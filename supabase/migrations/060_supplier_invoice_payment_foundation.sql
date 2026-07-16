-- Supplier Invoice and Payment Foundation MVP.

alter table public.supplier_invoices drop constraint if exists supplier_invoices_status_check;
update public.supplier_invoices set status = 'open' where status = 'unpaid';
update public.supplier_invoices set status = 'void' where status = 'cancelled';
update public.supplier_invoices si set company_id = gr.company_id
from public.goods_receivings gr where gr.id = si.goods_receiving_id and si.company_id is null;
update public.supplier_invoice_payments sip set company_id = si.company_id
from public.supplier_invoices si where si.id = sip.supplier_invoice_id and sip.company_id is null;
alter table public.supplier_invoices
  add column if not exists payment_terms_days integer not null default 30,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.staffs(id) on delete set null,
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.staffs(id) on delete set null,
  add column if not exists void_reason text,
  add constraint supplier_invoices_status_check check (status in ('draft','open','partially_paid','paid','void')),
  add constraint supplier_invoices_terms_nonnegative check (payment_terms_days >= 0);

drop index if exists public.supplier_invoices_supplier_external_no_idx;
create unique index supplier_invoices_company_supplier_reference_idx
  on public.supplier_invoices(company_id, supplier_id, lower(trim(supplier_invoice_no)))
  where deleted_at is null;

create table public.supplier_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  supplier_invoice_id uuid not null references public.supplier_invoices(id) on delete cascade,
  goods_receiving_id uuid not null references public.goods_receivings(id) on delete restrict,
  goods_receiving_line_id uuid not null references public.goods_receiving_lines(id) on delete restrict,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete restrict,
  purchase_order_line_id uuid not null references public.purchase_order_lines(id) on delete restrict,
  item_id uuid not null references public.items(id) on delete restrict,
  uom text not null,
  ordered_qty numeric(14,4) not null,
  received_qty numeric(14,4) not null,
  previously_invoiced_qty numeric(14,4) not null default 0,
  invoice_qty numeric(14,4) not null,
  po_unit_price numeric(14,4) not null,
  invoice_unit_price numeric(14,4) not null,
  line_total numeric(14,2) generated always as (round(invoice_qty * invoice_unit_price, 2)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplier_invoice_lines_quantities check (
    ordered_qty >= 0 and received_qty >= 0 and previously_invoiced_qty >= 0 and invoice_qty > 0
  ),
  constraint supplier_invoice_lines_prices check (po_unit_price >= 0 and invoice_unit_price >= 0),
  unique (supplier_invoice_id, goods_receiving_line_id)
);

create index supplier_invoice_lines_invoice_idx on public.supplier_invoice_lines(supplier_invoice_id);
create index supplier_invoice_lines_grn_line_idx on public.supplier_invoice_lines(goods_receiving_line_id);
create trigger set_supplier_invoice_lines_updated_at before update on public.supplier_invoice_lines
for each row execute function public.set_updated_at();

-- Preserve the pre-MVP header-only invoices as line snapshots.
insert into public.supplier_invoice_lines (
  supplier_invoice_id, goods_receiving_id, goods_receiving_line_id, purchase_order_id,
  purchase_order_line_id, item_id, uom, ordered_qty, received_qty,
  previously_invoiced_qty, invoice_qty, po_unit_price, invoice_unit_price
)
select si.id, gr.id, grl.id, po.id, pol.id, grl.item_id, grl.uom,
  pol.qty_ordered, grl.received_qty, 0, grl.received_qty, pol.unit_price, grl.unit_cost
from public.supplier_invoices si
join public.goods_receivings gr on gr.id = si.goods_receiving_id
join public.goods_receiving_lines grl on grl.goods_receiving_id = gr.id and grl.received_qty > 0
join public.purchase_orders po on po.id = gr.purchase_order_id
join public.purchase_order_lines pol on pol.id = grl.purchase_order_line_id
where not exists (
  select 1 from public.supplier_invoice_lines sil where sil.supplier_invoice_id = si.id
);

alter table public.supplier_invoice_payments add column if not exists idempotency_key uuid;
create unique index supplier_invoice_payments_idempotency_idx
  on public.supplier_invoice_payments(company_id, idempotency_key)
  where idempotency_key is not null;

insert into public.permissions (permission_code, module, action, description)
values
  ('supplier_invoice.approve','supplier_invoice','approve','Approve supplier invoices'),
  ('supplier_invoice.void','supplier_invoice','void','Void supplier invoices')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r
join public.permissions p on p.permission_code in (
  'supplier_invoice.view','supplier_invoice.create','supplier_invoice.pay',
  'supplier_invoice.approve','supplier_invoice.void'
)
where r.role_code in ('super_admin','admin','operations_admin','finance')
on conflict (role_id, permission_id) do nothing;

delete from public.role_permissions rp using public.roles r, public.permissions p
where rp.role_id=r.id and rp.permission_id=p.id and r.role_code in ('purchasing','manager')
  and p.permission_code in ('supplier_invoice.create','supplier_invoice.pay','supplier_invoice.approve','supplier_invoice.void');

create or replace function public.save_supplier_invoice_draft(
  p_invoice_id uuid,
  p_invoice_no text,
  p_supplier_invoice_no text,
  p_supplier_id uuid,
  p_invoice_date date,
  p_due_date date,
  p_payment_terms_days integer,
  p_tax_amount numeric,
  p_notes text,
  p_lines jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  invoice public.supplier_invoices%rowtype;
  source record;
  input_line record;
  first_source record;
  first_source_set boolean := false;
  prior_qty numeric;
  subtotal_value numeric(14,2) := 0;
  is_new boolean := p_invoice_id is null;
  new_document_id uuid;
begin
  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('supplier_invoice.create') then
    raise exception 'You do not have permission to create supplier invoices.';
  end if;
  if nullif(trim(p_supplier_invoice_no), '') is null then raise exception 'Supplier invoice reference is required.'; end if;
  if p_payment_terms_days < 0 or coalesce(p_tax_amount, 0) < 0 then raise exception 'Invoice terms and tax cannot be negative.'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'At least one invoice line is required.'; end if;
  if (select count(*) from jsonb_to_recordset(p_lines) as x(goods_receiving_line_id uuid, invoice_qty numeric, invoice_unit_price numeric))
     <> (select count(distinct goods_receiving_line_id) from jsonb_to_recordset(p_lines) as x(goods_receiving_line_id uuid, invoice_qty numeric, invoice_unit_price numeric)) then
    raise exception 'A receiving line can only appear once on an invoice.';
  end if;

  if p_invoice_id is not null then
    select * into invoice from public.supplier_invoices where id = p_invoice_id for update;
    if invoice.id is null or invoice.company_id is distinct from actor.company_id then raise exception 'Supplier invoice was not found.'; end if;
    if invoice.status <> 'draft' then raise exception 'Only draft invoices can be edited.'; end if;
    if invoice.supplier_id <> p_supplier_id then raise exception 'The supplier cannot be changed on an existing draft.'; end if;
  else
    invoice.id := gen_random_uuid();
  end if;

  if exists (
    select 1 from public.supplier_invoices si
    where si.company_id = actor.company_id and si.supplier_id = p_supplier_id
      and lower(trim(si.supplier_invoice_no)) = lower(trim(p_supplier_invoice_no))
      and si.deleted_at is null and si.id <> invoice.id
  ) then raise exception 'This supplier invoice reference already exists for this supplier.'; end if;

  -- Lock sources in a stable order so concurrent invoices cannot both claim the same quantity.
  for input_line in
    select * from jsonb_to_recordset(p_lines) as x(goods_receiving_line_id uuid, invoice_qty numeric, invoice_unit_price numeric)
    order by goods_receiving_line_id
  loop
    perform 1 from public.goods_receiving_lines where id = input_line.goods_receiving_line_id for update;
  end loop;

  for input_line in
    select * from jsonb_to_recordset(p_lines) as x(goods_receiving_line_id uuid, invoice_qty numeric, invoice_unit_price numeric)
  loop
    select gr.id as goods_receiving_id, gr.purchase_order_id, gr.supplier_id, gr.company_id, gr.status,
      gr.deleted_at, grl.id as goods_receiving_line_id, grl.item_id, grl.uom, grl.received_qty,
      pol.id as purchase_order_line_id, pol.qty_ordered, pol.unit_price
    into source
    from public.goods_receiving_lines grl
    join public.goods_receivings gr on gr.id = grl.goods_receiving_id
    join public.purchase_order_lines pol on pol.id = grl.purchase_order_line_id
    where grl.id = input_line.goods_receiving_line_id;
    if source.goods_receiving_line_id is null then raise exception 'A selected GRN line was not found.'; end if;
    if source.company_id is distinct from actor.company_id then raise exception 'Cross-company GRN selection is not allowed.'; end if;
    if source.supplier_id <> p_supplier_id then raise exception 'All selected GRNs must belong to the selected supplier.'; end if;
    if source.status <> 'posted' or source.deleted_at is not null then raise exception 'Only posted, active GRNs can be invoiced.'; end if;
    if input_line.invoice_qty <= 0 or input_line.invoice_unit_price < 0 then raise exception 'Invoice quantity must be positive and price cannot be negative.'; end if;
    select coalesce(sum(sil.invoice_qty), 0) into prior_qty
    from public.supplier_invoice_lines sil
    join public.supplier_invoices si on si.id = sil.supplier_invoice_id
    where sil.goods_receiving_line_id = source.goods_receiving_line_id
      and si.status <> 'void' and si.deleted_at is null and si.id <> invoice.id;
    if input_line.invoice_qty > source.received_qty - prior_qty then raise exception 'Invoice quantity exceeds the uninvoiced received quantity.'; end if;
    subtotal_value := subtotal_value + round(input_line.invoice_qty * input_line.invoice_unit_price, 2);
    if not first_source_set then first_source := source; first_source_set := true; end if;
  end loop;

  if p_invoice_id is null then
    insert into public.supplier_invoices (
      id, company_id, invoice_no, supplier_invoice_no, supplier_id, purchase_order_id,
      goods_receiving_id, invoice_date, due_date, payment_terms_days, subtotal,
      tax_amount, total_amount, amount_paid, status, notes, created_by, updated_by
    ) values (
      invoice.id, actor.company_id, p_invoice_no, trim(p_supplier_invoice_no), p_supplier_id,
      first_source.purchase_order_id, first_source.goods_receiving_id, p_invoice_date, p_due_date,
      p_payment_terms_days, subtotal_value, coalesce(p_tax_amount, 0), subtotal_value + coalesce(p_tax_amount, 0),
      0, 'draft', nullif(trim(coalesce(p_notes, '')), ''), actor.id, actor.id
    );
  else
    delete from public.supplier_invoice_lines where supplier_invoice_id = invoice.id;
    update public.supplier_invoices set
      supplier_invoice_no = trim(p_supplier_invoice_no), invoice_date = p_invoice_date,
      due_date = p_due_date, payment_terms_days = p_payment_terms_days,
      purchase_order_id = first_source.purchase_order_id, goods_receiving_id = first_source.goods_receiving_id,
      subtotal = subtotal_value, tax_amount = coalesce(p_tax_amount, 0),
      total_amount = subtotal_value + coalesce(p_tax_amount, 0), notes = nullif(trim(coalesce(p_notes, '')), ''),
      updated_by = actor.id
    where id = invoice.id;
  end if;

  insert into public.supplier_invoice_lines (
    supplier_invoice_id, goods_receiving_id, goods_receiving_line_id, purchase_order_id,
    purchase_order_line_id, item_id, uom, ordered_qty, received_qty,
    previously_invoiced_qty, invoice_qty, po_unit_price, invoice_unit_price
  )
  select invoice.id, gr.id, grl.id, gr.purchase_order_id, pol.id, grl.item_id, grl.uom,
    pol.qty_ordered, grl.received_qty,
    coalesce((select sum(sil.invoice_qty) from public.supplier_invoice_lines sil join public.supplier_invoices si on si.id = sil.supplier_invoice_id
      where sil.goods_receiving_line_id = grl.id and si.status <> 'void' and si.deleted_at is null and si.id <> invoice.id), 0),
    x.invoice_qty, pol.unit_price, x.invoice_unit_price
  from jsonb_to_recordset(p_lines) as x(goods_receiving_line_id uuid, invoice_qty numeric, invoice_unit_price numeric)
  join public.goods_receiving_lines grl on grl.id = x.goods_receiving_line_id
  join public.goods_receivings gr on gr.id = grl.goods_receiving_id
  join public.purchase_order_lines pol on pol.id = grl.purchase_order_line_id;
  if is_new then
    insert into public.documents(company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by)
    values(actor.company_id,p_invoice_no,'supplier_invoice','Supplier Invoice ' || p_invoice_no,'draft','draft','Finance approval','supplier_invoice',invoice.id,actor.id,actor.id)
    returning id into new_document_id;
    update public.supplier_invoices set document_id=new_document_id where id=invoice.id;
    insert into public.document_revisions(document_id,revision_no,change_summary,changed_by)
    values(new_document_id,1,'Initial supplier invoice draft created.',actor.id);
  end if;
  return invoice.id;
end;
$$;

create or replace function public.approve_supplier_invoice(p_invoice_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare actor public.staffs%rowtype; invoice public.supplier_invoices%rowtype; calculated numeric(14,2);
begin
  select * into actor from public.staffs where auth_user_id = auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('supplier_invoice.approve') then raise exception 'You do not have permission to approve supplier invoices.'; end if;
  select * into invoice from public.supplier_invoices where id=p_invoice_id for update;
  if invoice.id is null or invoice.company_id is distinct from actor.company_id then raise exception 'Supplier invoice was not found.'; end if;
  if invoice.status <> 'draft' then raise exception 'Only draft invoices can be approved.'; end if;
  select coalesce(sum(line_total),0) into calculated from public.supplier_invoice_lines where supplier_invoice_id=p_invoice_id;
  if calculated <= 0 then raise exception 'Invoice must have at least one positive line.'; end if;
  update public.supplier_invoices set subtotal=calculated, total_amount=calculated+tax_amount,
    status='open', approved_at=now(), approved_by=actor.id, updated_by=actor.id where id=p_invoice_id;
end; $$;

create or replace function public.record_supplier_invoice_payment(
  p_invoice_id uuid, p_payment_no text, p_payment_date date, p_amount numeric,
  p_payment_method text, p_reference_no text, p_notes text, p_idempotency_key uuid
) returns text
language plpgsql security definer set search_path = public as $$
declare actor public.staffs%rowtype; invoice public.supplier_invoices%rowtype; existing_no text; new_paid numeric;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('supplier_invoice.pay') then raise exception 'You do not have permission to record payments.'; end if;
  select payment_no into existing_no from public.supplier_invoice_payments where company_id=actor.company_id and idempotency_key=p_idempotency_key;
  if existing_no is not null then return existing_no; end if;
  select * into invoice from public.supplier_invoices where id=p_invoice_id for update;
  if invoice.id is null or invoice.company_id is distinct from actor.company_id then raise exception 'Supplier invoice was not found.'; end if;
  select payment_no into existing_no from public.supplier_invoice_payments where company_id=actor.company_id and idempotency_key=p_idempotency_key;
  if existing_no is not null then return existing_no; end if;
  if invoice.status not in ('open','partially_paid') then raise exception 'Payments can only be recorded against open invoices.'; end if;
  if p_amount <= 0 then raise exception 'Payment must be more than 0.'; end if;
  new_paid := invoice.amount_paid + p_amount;
  if new_paid > invoice.total_amount then raise exception 'Payment cannot exceed outstanding balance.'; end if;
  insert into public.supplier_invoice_payments(company_id,supplier_invoice_id,payment_no,payment_date,amount,payment_method,reference_no,notes,created_by,idempotency_key)
  values(actor.company_id,p_invoice_id,p_payment_no,p_payment_date,p_amount,nullif(trim(coalesce(p_payment_method,'')),''),nullif(trim(coalesce(p_reference_no,'')),''),nullif(trim(coalesce(p_notes,'')),''),actor.id,p_idempotency_key);
  update public.supplier_invoices set amount_paid=new_paid,
    status=case when new_paid=total_amount then 'paid' else 'partially_paid' end, updated_by=actor.id where id=p_invoice_id;
  return p_payment_no;
end; $$;

create or replace function public.void_supplier_invoice(p_invoice_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare actor public.staffs%rowtype; invoice public.supplier_invoices%rowtype;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('supplier_invoice.void') then raise exception 'You do not have permission to void supplier invoices.'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'A void reason is required.'; end if;
  select * into invoice from public.supplier_invoices where id=p_invoice_id for update;
  if invoice.id is null or invoice.company_id is distinct from actor.company_id then raise exception 'Supplier invoice was not found.'; end if;
  if invoice.status='paid' or invoice.amount_paid>0 then raise exception 'Paid invoices cannot be voided; reverse the payment first.'; end if;
  if invoice.status='void' then raise exception 'Invoice is already void.'; end if;
  update public.supplier_invoices set status='void',void_reason=trim(p_reason),voided_at=now(),voided_by=actor.id,updated_by=actor.id where id=p_invoice_id;
end; $$;

revoke all on function public.save_supplier_invoice_draft(uuid,text,text,uuid,date,date,integer,numeric,text,jsonb) from public;
revoke all on function public.approve_supplier_invoice(uuid) from public;
revoke all on function public.record_supplier_invoice_payment(uuid,text,date,numeric,text,text,text,uuid) from public;
revoke all on function public.void_supplier_invoice(uuid,text) from public;
grant execute on function public.save_supplier_invoice_draft(uuid,text,text,uuid,date,date,integer,numeric,text,jsonb) to authenticated;
grant execute on function public.approve_supplier_invoice(uuid) to authenticated;
grant execute on function public.record_supplier_invoice_payment(uuid,text,date,numeric,text,text,text,uuid) to authenticated;
grant execute on function public.void_supplier_invoice(uuid,text) to authenticated;

alter table public.supplier_invoice_lines enable row level security;
drop policy if exists "supplier invoices read" on public.supplier_invoices;
create policy "supplier invoices read" on public.supplier_invoices for select to authenticated using (
  company_id = (select company_id from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1)
  and public.has_permission('supplier_invoice.view')
);
drop policy if exists "supplier invoice payments read" on public.supplier_invoice_payments;
create policy "supplier invoice payments read" on public.supplier_invoice_payments for select to authenticated using (
  company_id = (select company_id from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1)
  and public.has_permission('supplier_invoice.view')
);
create policy "supplier invoice lines read" on public.supplier_invoice_lines for select to authenticated using (
  exists (select 1 from public.supplier_invoices si where si.id=supplier_invoice_id
    and si.company_id=(select company_id from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1))
  and public.has_permission('supplier_invoice.view')
);

grant select on public.supplier_invoice_lines to authenticated;
revoke insert, update on public.supplier_invoices from authenticated;
revoke insert on public.supplier_invoice_payments from authenticated;

notify pgrst, 'reload schema';
