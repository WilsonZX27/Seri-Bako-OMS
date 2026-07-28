-- Security remediation: enforce tenant/branch/item and workflow invariants at the database boundary.

create or replace function public.enforce_inventory_branch_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Service-role/maintenance jobs have no auth.uid(); authenticated mutations do.
  if auth.uid() is null then return new; end if;

  if tg_table_name = 'purchase_requests' then
    if new.branch_id is null or not public.can_access_inventory_branch(new.company_id, new.branch_id) then
      raise exception 'Purchase request branch is outside your access scope.';
    end if;
  elsif tg_table_name = 'stock_transfers' then
    if new.from_branch_id is null or new.to_branch_id is null
       or not public.can_access_inventory_branch(new.company_id, new.from_branch_id)
       or not public.can_access_inventory_branch(new.company_id, new.to_branch_id) then
      raise exception 'Both transfer branches must be within your access scope.';
    end if;
  elsif tg_table_name = 'stock_wastage' then
    if new.branch_id is null or not public.can_access_inventory_branch(new.company_id, new.branch_id) then
      raise exception 'Wastage branch is outside your access scope.';
    end if;
  elsif tg_table_name = 'production_jobs' then
    if new.branch_id is null or not public.can_access_inventory_branch(new.company_id, new.branch_id) then
      raise exception 'Production branch is outside your access scope.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_purchase_request_branch_scope on public.purchase_requests;
create trigger enforce_purchase_request_branch_scope before insert or update on public.purchase_requests
for each row execute function public.enforce_inventory_branch_scope();
drop trigger if exists enforce_stock_transfer_branch_scope on public.stock_transfers;
create trigger enforce_stock_transfer_branch_scope before insert or update on public.stock_transfers
for each row execute function public.enforce_inventory_branch_scope();
drop trigger if exists enforce_stock_wastage_branch_scope on public.stock_wastage;
create trigger enforce_stock_wastage_branch_scope before insert or update on public.stock_wastage
for each row execute function public.enforce_inventory_branch_scope();
drop trigger if exists enforce_production_job_branch_scope on public.production_jobs;
create trigger enforce_production_job_branch_scope before insert or update on public.production_jobs
for each row execute function public.enforce_inventory_branch_scope();

create or replace function public.enforce_inventory_item_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare expected_company uuid; expected_branch uuid; job_company uuid; job_branch uuid;
begin
  if auth.uid() is null or new.item_id is null then return new; end if;

  if tg_table_name = 'stock_transfer_lines' then
    select st.company_id, st.from_branch_id into expected_company, expected_branch
    from public.stock_transfers st where st.id = new.stock_transfer_id;
  elsif tg_table_name = 'stock_wastage_lines' then
    select sw.company_id, sw.branch_id into expected_company, expected_branch
    from public.stock_wastage sw where sw.id = new.stock_wastage_id;
  elsif tg_table_name = 'stock_count_lines' then
    select sc.company_id, sc.branch_id into expected_company, expected_branch
    from public.stock_counts sc where sc.id = new.stock_count_id;
  elsif tg_table_name = 'stock_transaction_lines' then
    select b.company_id, st.branch_id into expected_company, expected_branch
    from public.stock_transactions st
    join public.branches b on b.id = st.branch_id
    where st.id = new.stock_transaction_id;
  elsif tg_table_name = 'purchase_request_lines' then
    select pr.company_id, pr.branch_id into expected_company, expected_branch
    from public.purchase_requests pr where pr.id = new.purchase_request_id;
  elsif tg_table_name = 'purchase_order_lines' then
    select po.company_id, po.branch_id into expected_company, expected_branch
    from public.purchase_orders po where po.id = new.purchase_order_id;
  elsif tg_table_name = 'production_job_ingredient_lines' then
    select pj.company_id, pj.branch_id into job_company, job_branch
    from public.production_jobs pj where pj.id = new.production_job_id;
    expected_company := job_company;
    expected_branch := job_branch;
  elsif tg_table_name = 'production_job_output_lines' then
    select pj.company_id, pj.branch_id into expected_company, expected_branch
    from public.production_jobs pj where pj.id = new.production_job_id;
  end if;

  if expected_company is null then raise exception 'Parent document is outside the tenant scope.'; end if;
  if not exists (
    select 1 from public.items i
    where i.id = new.item_id and i.company_id = expected_company
      and i.status = 'active' and i.deleted_at is null
  ) then
    raise exception 'Item is outside the parent company or inactive.';
  end if;
  if expected_branch is not null and not public.can_access_inventory_branch(expected_company, expected_branch) then
    raise exception 'Item branch is outside your access scope.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_stock_transfer_line_item_scope on public.stock_transfer_lines;
create trigger enforce_stock_transfer_line_item_scope before insert or update on public.stock_transfer_lines
for each row execute function public.enforce_inventory_item_scope();
drop trigger if exists enforce_stock_wastage_line_item_scope on public.stock_wastage_lines;
create trigger enforce_stock_wastage_line_item_scope before insert or update on public.stock_wastage_lines
for each row execute function public.enforce_inventory_item_scope();
drop trigger if exists enforce_stock_count_line_item_scope on public.stock_count_lines;
create trigger enforce_stock_count_line_item_scope before insert or update on public.stock_count_lines
for each row execute function public.enforce_inventory_item_scope();
drop trigger if exists enforce_stock_transaction_line_item_scope on public.stock_transaction_lines;
create trigger enforce_stock_transaction_line_item_scope before insert or update on public.stock_transaction_lines
for each row execute function public.enforce_inventory_item_scope();
drop trigger if exists enforce_purchase_request_line_item_scope on public.purchase_request_lines;
create trigger enforce_purchase_request_line_item_scope before insert or update on public.purchase_request_lines
for each row execute function public.enforce_inventory_item_scope();
drop trigger if exists enforce_purchase_order_line_item_scope on public.purchase_order_lines;
create trigger enforce_purchase_order_line_item_scope before insert or update on public.purchase_order_lines
for each row execute function public.enforce_inventory_item_scope();
drop trigger if exists enforce_production_ingredient_item_scope on public.production_job_ingredient_lines;
create trigger enforce_production_ingredient_item_scope before insert or update on public.production_job_ingredient_lines
for each row execute function public.enforce_inventory_item_scope();
drop trigger if exists enforce_production_output_item_scope on public.production_job_output_lines;
create trigger enforce_production_output_item_scope before insert or update on public.production_job_output_lines
for each row execute function public.enforce_inventory_item_scope();

create or replace function public.recalculate_production_stock_available()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare job_branch uuid;
begin
  select branch_id into job_branch from public.production_jobs where id = new.production_job_id;
  if job_branch is not null then
    select coalesce(sum(st.quantity_in - st.quantity_out), 0)
      into new.stock_available_qty
    from public.stock_transactions st
    where st.item_id = new.item_id and st.branch_id = job_branch and st.status = 'posted';
  end if;
  return new;
end;
$$;

drop trigger if exists recalculate_production_stock_available on public.production_job_ingredient_lines;
create trigger recalculate_production_stock_available before insert or update on public.production_job_ingredient_lines
for each row execute function public.recalculate_production_stock_available();

create or replace function public.enforce_purchase_order_idempotency()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if auth.uid() is not null and new.idempotency_key is null then
    raise exception 'Purchase order idempotency key is required.';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_purchase_order_idempotency on public.purchase_orders;
create trigger enforce_purchase_order_idempotency before insert on public.purchase_orders
for each row execute function public.enforce_purchase_order_idempotency();

create or replace function public.enforce_supplier_invoice_approval_invariants()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if auth.uid() is not null and new.status = 'open' and old.status = 'draft' then
    if not exists (select 1 from public.supplier_invoice_lines where supplier_invoice_id = new.id) then
      raise exception 'Supplier invoice must contain lines before approval.';
    end if;
    if exists (
      select 1 from public.supplier_invoice_lines sil
      where sil.supplier_invoice_id = new.id
        and (sil.invoice_qty is distinct from sil.received_qty - sil.previously_invoiced_qty
             or abs(sil.invoice_unit_price - sil.po_unit_price) > 0.01)
    ) then
      raise exception 'Supplier invoice has an audit discrepancy.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_supplier_invoice_approval_invariants on public.supplier_invoices;
create trigger enforce_supplier_invoice_approval_invariants before update on public.supplier_invoices
for each row execute function public.enforce_supplier_invoice_approval_invariants();

create or replace function public.enforce_purchase_order_close_invariants()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if auth.uid() is not null and new.status = 'closed' and old.status <> 'closed' then
    if old.status not in ('received','partial_received') then
      raise exception 'Only a received or partially received purchase order can be closed.';
    end if;
    if not exists (select 1 from public.supplier_invoices where purchase_order_id = new.id and deleted_at is null) then
      raise exception 'All matched supplier invoices must be fully paid before closing this purchase order.';
    end if;
    if exists (select 1 from public.supplier_invoices si where si.purchase_order_id = new.id and si.deleted_at is null and si.status <> 'paid') then
      raise exception 'All matched supplier invoices must be fully paid before closing this purchase order.';
    end if;
    if exists (
      select 1 from public.supplier_invoices si
      left join public.documents d on d.id = si.document_id
      where si.purchase_order_id = new.id and si.deleted_at is null
        and (si.document_id is null or d.current_step <> 'Audit Passed')
    ) then
      raise exception 'Audit must pass before a purchase order can be closed.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_purchase_order_close_invariants on public.purchase_orders;
create trigger enforce_purchase_order_close_invariants before update on public.purchase_orders
for each row execute function public.enforce_purchase_order_close_invariants();

revoke all on function public.enforce_inventory_branch_scope() from public, anon, authenticated;
revoke all on function public.enforce_inventory_item_scope() from public, anon, authenticated;
revoke all on function public.recalculate_production_stock_available() from public, anon, authenticated;
revoke all on function public.enforce_purchase_order_idempotency() from public, anon, authenticated;
revoke all on function public.enforce_supplier_invoice_approval_invariants() from public, anon, authenticated;
revoke all on function public.enforce_purchase_order_close_invariants() from public, anon, authenticated;
