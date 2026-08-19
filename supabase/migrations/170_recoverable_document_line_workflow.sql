-- Recoverable document-line editing for PR review and Stock Count correction.
-- Errors remain visible, but authorised operators can repair the affected line
-- without losing the original submitted evidence.

create table if not exists public.document_line_revisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_type text not null check (document_type in ('purchase_request','stock_count','purchase_order')),
  document_id uuid not null,
  line_id uuid,
  action text not null check (action in ('update','replace','remove')),
  before_snapshot jsonb not null default '{}'::jsonb,
  after_snapshot jsonb,
  reason text not null check (length(trim(reason)) between 3 and 1000),
  status text not null default 'applied' check (status in ('pending','applied','rejected')),
  idempotency_key uuid not null,
  requested_by uuid not null references public.staffs(id),
  reviewed_by uuid references public.staffs(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, idempotency_key)
);

create index if not exists document_line_revisions_document_idx
  on public.document_line_revisions(company_id, document_type, document_id, created_at desc);

alter table public.document_line_revisions enable row level security;

drop policy if exists "document line revisions read" on public.document_line_revisions;
create policy "document line revisions read" on public.document_line_revisions
for select to authenticated
using (company_id = public.current_staff_company_id());

revoke all on public.document_line_revisions from anon;
grant select on public.document_line_revisions to authenticated;

create or replace function public.revise_purchase_request_line(
  target_purchase_request_id uuid,
  target_line_id uuid,
  revision_action text,
  replacement_item_id uuid,
  replacement_qty numeric,
  replacement_uom text,
  replacement_supplier_id uuid,
  replacement_unit_cost numeric,
  revision_reason text,
  request_idempotency_key uuid,
  expected_line_updated_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  request_row public.purchase_requests%rowtype;
  line_row public.purchase_request_lines%rowtype;
  before_value jsonb;
  after_value jsonb;
  revision_id uuid;
  remaining_lines integer;
  can_edit boolean := false;
begin
  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null then raise exception 'An active staff account is required.'; end if;

  select * into request_row from public.purchase_requests
  where id = target_purchase_request_id and deleted_at is null for update;
  if request_row.id is null or request_row.company_id is distinct from actor.company_id then
    raise exception 'Purchase request not found.';
  end if;

  can_edit :=
    (request_row.status = 'manager_review' and public.has_permission('pr.manager_approve'))
    or (request_row.status = 'admin_review' and public.has_permission('pr.admin_review'));
  if not can_edit then raise exception 'This purchase request is not editable by your role at its current review step.'; end if;
  if revision_action not in ('update','replace','remove') then raise exception 'Choose update, replace, or remove.'; end if;
  if length(trim(coalesce(revision_reason,''))) < 3 then raise exception 'Explain why this line is changing.'; end if;
  if request_idempotency_key is null then raise exception 'A change request key is required.'; end if;

  select * into line_row from public.purchase_request_lines
  where id = target_line_id and purchase_request_id = request_row.id for update;
  if line_row.id is null then raise exception 'Purchase request line not found.'; end if;
  if expected_line_updated_at is null or line_row.updated_at is distinct from expected_line_updated_at then
    raise exception 'This line changed after you opened it. Refresh to review the latest values before applying your change.';
  end if;
  before_value := to_jsonb(line_row);

  select id into revision_id from public.document_line_revisions
  where company_id = actor.company_id and idempotency_key = request_idempotency_key;
  if revision_id is not null then
    return jsonb_build_object('revision_id', revision_id, 'already_applied', true);
  end if;

  if revision_action = 'remove' then
    select count(*) into remaining_lines from public.purchase_request_lines
    where purchase_request_id = request_row.id and id <> line_row.id;
    if remaining_lines = 0 and not exists (
      select 1 from public.purchase_request_unresolved_lines
      where purchase_request_id = request_row.id and resolution_status = 'unresolved'
    ) then raise exception 'A purchase request must keep at least one line.'; end if;
    delete from public.purchase_request_lines where id = line_row.id;
    after_value := null;
  else
    if replacement_item_id is null or replacement_qty is null or replacement_qty <= 0 or nullif(trim(replacement_uom),'') is null then
      raise exception 'Item, positive quantity, and UOM are required.';
    end if;
    if not exists (
      select 1 from public.items i
      where i.id = replacement_item_id and i.company_id = actor.company_id
        and i.status = 'active' and i.deleted_at is null
    ) then raise exception 'Select an active Item Master record from this company.'; end if;
    if replacement_supplier_id is not null and not exists (
      select 1
      from public.branch_supplier_items bsi
      join public.supplier_items si on si.id = bsi.supplier_item_id and si.item_id = bsi.item_id
      join public.suppliers s on s.id = si.supplier_id
      where bsi.branch_id = request_row.branch_id and bsi.item_id = replacement_item_id
        and si.supplier_id = replacement_supplier_id
        and upper(trim(si.purchase_uom)) = upper(trim(replacement_uom))
        and bsi.status = 'active' and bsi.deleted_at is null
        and si.status = 'active' and si.deleted_at is null
        and s.status = 'active' and s.deleted_at is null
    ) then raise exception 'The selected supplier is not mapped to this branch, item, and UOM. Create the mapping or choose another supplier.'; end if;

    update public.purchase_request_lines
    set item_id = replacement_item_id,
        qty = replacement_qty,
        uom = trim(replacement_uom),
        suggested_supplier_id = replacement_supplier_id,
        estimated_unit_cost = greatest(coalesce(replacement_unit_cost,0),0),
        remarks = concat_ws(E'\n', nullif(trim(remarks),''), 'Review change: ' || trim(revision_reason))
    where id = line_row.id;
    select to_jsonb(updated_line) into after_value
    from public.purchase_request_lines updated_line where updated_line.id = line_row.id;
  end if;

  insert into public.document_line_revisions(
    company_id, document_type, document_id, line_id, action,
    before_snapshot, after_snapshot, reason, status, idempotency_key,
    requested_by, reviewed_by, resolved_at
  ) values (
    actor.company_id, 'purchase_request', request_row.id, line_row.id, revision_action,
    before_value, after_value, trim(revision_reason), 'applied', request_idempotency_key,
    actor.id, actor.id, now()
  ) returning id into revision_id;

  update public.purchase_requests set updated_by = actor.id, updated_at = now() where id = request_row.id;
  if request_row.document_id is not null then
    insert into public.document_revisions(document_id, revision_no, change_summary, changed_by)
    select request_row.document_id, coalesce(max(revision_no),0) + 1,
      initcap(revision_action) || ' PR line: ' || trim(revision_reason), actor.id
    from public.document_revisions where document_id = request_row.document_id;
  end if;
  insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values(actor.company_id, 'purchase_request', request_row.id, 'line_' || revision_action,
    'Purchase request line ' || revision_action || 'd during review',
    jsonb_build_object('line_id',line_row.id,'revision_id',revision_id,'reason',trim(revision_reason)), actor.id);

  return jsonb_build_object('revision_id',revision_id,'already_applied',false,'action',revision_action);
end;
$$;

revoke all on function public.revise_purchase_request_line(uuid,uuid,text,uuid,numeric,text,uuid,numeric,text,uuid,timestamptz) from public, anon;
grant execute on function public.revise_purchase_request_line(uuid,uuid,text,uuid,numeric,text,uuid,numeric,text,uuid,timestamptz) to authenticated;

create or replace function public.revise_stock_count_line(
  target_stock_count_id uuid,
  target_line_id uuid,
  revision_action text,
  replacement_item_id uuid,
  replacement_physical_qty numeric,
  replacement_uom text,
  revision_reason text,
  request_idempotency_key uuid
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  count_row public.stock_counts%rowtype;
  line_row public.stock_count_lines%rowtype;
  before_value jsonb;
  after_value jsonb;
  revision_id uuid;
  apply_now boolean;
begin
  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null then raise exception 'An active staff account is required.'; end if;
  select * into count_row from public.stock_counts where id = target_stock_count_id for update;
  if count_row.id is null or count_row.company_id is distinct from actor.company_id then raise exception 'Stock count not found.'; end if;
  if count_row.status not in ('draft','submitted','reviewed') then raise exception 'This stock count is locked against line changes.'; end if;
  if count_row.status = 'draft' and not public.has_any_permission(array['stock_count.create','stock_count.update']) then raise exception 'You cannot edit this draft stock count.'; end if;
  if count_row.status in ('submitted','reviewed') and not public.has_permission('stock_count.post') then raise exception 'You cannot propose review changes for this stock count.'; end if;
  if revision_action not in ('update','replace','remove') then raise exception 'Choose update, replace, or remove.'; end if;
  if length(trim(coalesce(revision_reason,''))) < 3 then raise exception 'Explain why this count line is changing.'; end if;

  select * into line_row from public.stock_count_lines where id = target_line_id and stock_count_id = count_row.id for update;
  if line_row.id is null then raise exception 'Stock count line not found.'; end if;
  before_value := to_jsonb(line_row);
  apply_now := count_row.status = 'draft';

  select id into revision_id from public.document_line_revisions
  where company_id = actor.company_id and idempotency_key = request_idempotency_key;
  if revision_id is not null then return jsonb_build_object('revision_id',revision_id,'already_applied',true); end if;

  if revision_action <> 'remove' then
    if replacement_item_id is null or replacement_physical_qty is null or replacement_physical_qty < 0 or nullif(trim(replacement_uom),'') is null then
      raise exception 'Item, non-negative physical quantity, and UOM are required.';
    end if;
    if not exists (select 1 from public.items where id = replacement_item_id and company_id = actor.company_id and status = 'active' and deleted_at is null) then
      raise exception 'Select an active Item Master record from this company.';
    end if;
    if replacement_item_id <> line_row.item_id and exists (
      select 1 from public.stock_count_lines where stock_count_id = count_row.id and item_id = replacement_item_id and id <> line_row.id
    ) then raise exception 'That replacement Item already exists in this count. Update the existing line or remove this line instead.'; end if;
    after_value := jsonb_build_object('item_id',replacement_item_id,'physical_qty',replacement_physical_qty,'uom',trim(replacement_uom));
  end if;

  if apply_now then
    if revision_action = 'remove' then
      delete from public.stock_count_lines where id = line_row.id;
      after_value := null;
    else
      update public.stock_count_lines
      set item_id = replacement_item_id,
          physical_qty = replacement_physical_qty,
          uom = trim(replacement_uom),
          remarks = concat_ws(E'\n',nullif(trim(remarks),''),'Draft change: ' || trim(revision_reason))
      where id = line_row.id;
    end if;
  end if;

  insert into public.document_line_revisions(
    company_id, document_type, document_id, line_id, action, before_snapshot,
    after_snapshot, reason, status, idempotency_key, requested_by, reviewed_by, resolved_at
  ) values (
    actor.company_id, 'stock_count', count_row.id, line_row.id, revision_action, before_value,
    after_value, trim(revision_reason), case when apply_now then 'applied' else 'pending' end,
    request_idempotency_key, actor.id, case when apply_now then actor.id else null end,
    case when apply_now then now() else null end
  ) returning id into revision_id;

  insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values(actor.company_id,'stock_count',count_row.id,
    case when apply_now then 'line_' || revision_action else 'line_change_proposed' end,
    case when apply_now then 'Stock count line changed in draft' else 'Stock count line change proposed for review' end,
    jsonb_build_object('line_id',line_row.id,'revision_id',revision_id,'action',revision_action,'reason',trim(revision_reason)),actor.id);

  return jsonb_build_object('revision_id',revision_id,'already_applied',false,'status',case when apply_now then 'applied' else 'pending' end);
end;
$$;

revoke all on function public.revise_stock_count_line(uuid,uuid,text,uuid,numeric,text,text,uuid) from public, anon;
grant execute on function public.revise_stock_count_line(uuid,uuid,text,uuid,numeric,text,text,uuid) to authenticated;

create or replace function public.review_stock_count_line_revision(target_revision_id uuid, decision text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  revision_row public.document_line_revisions%rowtype;
begin
  select * into actor from public.staffs where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('stock_count.post') then raise exception 'You cannot review this proposed change.'; end if;
  if decision not in ('approve','reject') then raise exception 'Choose approve or reject.'; end if;
  select * into revision_row from public.document_line_revisions where id = target_revision_id and document_type = 'stock_count' for update;
  if revision_row.id is null or revision_row.company_id is distinct from actor.company_id or revision_row.status <> 'pending' then raise exception 'Pending stock count change not found.'; end if;
  if decision = 'approve' then
    if revision_row.action = 'remove' then
      delete from public.stock_count_lines where id = revision_row.line_id and stock_count_id = revision_row.document_id;
    else
      update public.stock_count_lines
      set item_id = (revision_row.after_snapshot->>'item_id')::uuid,
          physical_qty = (revision_row.after_snapshot->>'physical_qty')::numeric,
          uom = revision_row.after_snapshot->>'uom',
          remarks = concat_ws(E'\n',nullif(trim(remarks),''),'Approved review change: ' || revision_row.reason)
      where id = revision_row.line_id and stock_count_id = revision_row.document_id;
    end if;
  end if;
  update public.document_line_revisions
  set status = case when decision = 'approve' then 'applied' else 'rejected' end,
      reviewed_by = actor.id, resolved_at = now()
  where id = revision_row.id;
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
  values(actor.company_id,'stock_count',revision_row.document_id,'line_change_' || decision,
    'Stock count line change ' || case when decision = 'approve' then 'approved' else 'rejected' end,
    jsonb_build_object('revision_id',revision_row.id,'line_id',revision_row.line_id),actor.id);
  return jsonb_build_object('revision_id',revision_row.id,'status',case when decision = 'approve' then 'applied' else 'rejected' end);
end;
$$;

revoke all on function public.review_stock_count_line_revision(uuid,text) from public, anon;
grant execute on function public.review_stock_count_line_revision(uuid,text) to authenticated;

create or replace function public.prevent_stock_count_post_with_pending_changes()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.status = 'posted' and old.status is distinct from 'posted' and exists (
    select 1 from public.document_line_revisions
    where document_type = 'stock_count' and document_id = new.id and status = 'pending'
  ) then
    raise exception 'Review every pending stock count line change before posting.';
  end if;
  return new;
end;
$$;

drop trigger if exists block_stock_count_post_with_pending_changes on public.stock_counts;
create trigger block_stock_count_post_with_pending_changes
before update of status on public.stock_counts
for each row execute function public.prevent_stock_count_post_with_pending_changes();

-- Posted/externally committed PO lines are immutable. Draft PO editing remains
-- possible through its explicit form; every later change requires a revision.
create or replace function public.prevent_committed_purchase_order_line_mutation()
returns trigger language plpgsql set search_path = public as $$
declare order_status public.purchase_order_status;
begin
  select status into order_status from public.purchase_orders where id = coalesce(new.purchase_order_id,old.purchase_order_id);
  if order_status <> 'draft' then
    raise exception 'Purchase order lines are locked after the PO leaves draft. Create a revision or cancel and reissue.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists lock_committed_purchase_order_lines on public.purchase_order_lines;
create trigger lock_committed_purchase_order_lines
before update or delete on public.purchase_order_lines
for each row execute function public.prevent_committed_purchase_order_line_mutation();
