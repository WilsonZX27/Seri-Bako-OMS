-- Sprint 7.22: make database permissions authoritative and align PR workflow/RLS.
-- Forward-only. No business rows are modified.

create or replace function public.can_access_purchase_request(
  target_company_id uuid,
  target_branch_id uuid,
  target_requested_by uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid()
    and status = 'active'
    and deleted_at is null
  limit 1;

  if actor.id is null or actor.company_id is distinct from target_company_id then
    return false;
  end if;

  if not public.has_any_permission(array['purchase_request.read', 'pr.view_all', 'pr.view_branch']) then
    return false;
  end if;

  if public.has_permission('pr.view_all') then
    return true;
  end if;

  return target_requested_by = actor.id
    or exists (
      select 1 from public.staff_branches sb
      where sb.staff_id = actor.id and sb.branch_id = target_branch_id
    );
end
$$;

drop policy if exists "purchase requests read" on public.purchase_requests;
create policy "purchase requests read"
  on public.purchase_requests for select to authenticated
  using (public.can_access_purchase_request(company_id, branch_id, requested_by));

drop policy if exists "purchase requests create" on public.purchase_requests;
create policy "purchase requests create"
  on public.purchase_requests for insert to authenticated
  with check (
    public.has_any_permission(array['purchase_request.create', 'pr.create'])
    and exists (
      select 1 from public.staffs s
      where s.auth_user_id = auth.uid()
        and s.status = 'active'
        and s.deleted_at is null
        and s.company_id is not distinct from company_id
        and requested_by = s.id
        and (
          public.has_permission('pr.view_all')
          or exists (
            select 1 from public.staff_branches sb
            where sb.staff_id = s.id and sb.branch_id = branch_id
          )
        )
    )
  );

drop policy if exists "purchase requests update" on public.purchase_requests;
revoke update on public.purchase_requests from authenticated;

drop policy if exists "purchase request lines read" on public.purchase_request_lines;
create policy "purchase request lines read"
  on public.purchase_request_lines for select to authenticated
  using (
    exists (
      select 1 from public.purchase_requests pr
      where pr.id = purchase_request_id
        and public.can_access_purchase_request(pr.company_id, pr.branch_id, pr.requested_by)
    )
  );

drop policy if exists "purchase request lines manage" on public.purchase_request_lines;
create policy "purchase request lines manage"
  on public.purchase_request_lines for all to authenticated
  using (
    public.has_any_permission(array['purchase_request.update', 'purchase_request.create', 'pr.create'])
    and exists (
      select 1 from public.purchase_requests pr
      where pr.id = purchase_request_id
        and pr.status::text in ('draft', 'rejected', 'returned')
        and public.can_access_purchase_request(pr.company_id, pr.branch_id, pr.requested_by)
    )
  )
  with check (
    public.has_any_permission(array['purchase_request.update', 'purchase_request.create', 'pr.create'])
    and exists (
      select 1 from public.purchase_requests pr
      where pr.id = purchase_request_id
        and pr.status::text in ('draft', 'rejected', 'returned')
        and public.can_access_purchase_request(pr.company_id, pr.branch_id, pr.requested_by)
    )
  );

create or replace function public.link_purchase_request_document(target_purchase_request_id uuid, target_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  request_row public.purchase_requests%rowtype;
  document_row public.documents%rowtype;
begin
  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_any_permission(array['purchase_request.create', 'pr.create']) then
    raise exception 'You do not have permission to link a purchase request document.';
  end if;

  select * into request_row from public.purchase_requests
  where id = target_purchase_request_id and deleted_at is null for update;
  select * into document_row from public.documents
  where id = target_document_id and deleted_at is null;

  if request_row.id is null or document_row.id is null
    or request_row.company_id is distinct from actor.company_id
    or document_row.company_id is distinct from actor.company_id
    or request_row.requested_by is distinct from actor.id
    or request_row.status::text not in ('draft', 'rejected', 'returned')
    or request_row.document_id is not null
    or document_row.document_type <> 'purchase_request'
    or document_row.related_entity_type <> 'purchase_request'
    or document_row.related_entity_id is distinct from request_row.id then
    raise exception 'The purchase request document link is invalid.';
  end if;

  update public.purchase_requests set document_id = document_row.id, updated_by = actor.id
  where id = request_row.id;
end
$$;

create or replace function public.transition_purchase_request(
  target_purchase_request_id uuid,
  transition_action text,
  transition_remarks text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  request_row public.purchase_requests%rowtype;
  expected_statuses text[];
  required_permissions text[];
  next_status public.purchase_request_status;
  next_document_status public.document_status;
  next_approval_status public.approval_status;
  next_step text;
  activity_type text;
  activity_message text;
begin
  if transition_action not in ('submit', 'manager_approve', 'admin_approve', 'finance_approve', 'reject', 'cancel') then
    raise exception 'Unsupported purchase request action: %', transition_action;
  end if;

  select * into actor
  from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;
  if actor.id is null then raise exception 'An active staff account is required.'; end if;

  select * into request_row
  from public.purchase_requests
  where id = target_purchase_request_id and deleted_at is null
  for update;
  if request_row.id is null then raise exception 'Purchase request not found.'; end if;
  if actor.company_id is distinct from request_row.company_id
    or not public.can_access_purchase_request(request_row.company_id, request_row.branch_id, request_row.requested_by) then
    raise exception 'You do not have access to this purchase request.';
  end if;

  case transition_action
    when 'submit' then
      expected_statuses := array['draft', 'rejected', 'returned'];
      required_permissions := array['pr.submit'];
      next_status := 'manager_review'; next_document_status := 'pending_approval'; next_approval_status := 'pending';
      next_step := 'Manager Review'; activity_type := 'submitted'; activity_message := 'Purchase request submitted to Manager Review';
    when 'manager_approve' then
      expected_statuses := array['manager_review']; required_permissions := array['pr.manager_approve'];
      next_status := 'admin_review'; next_document_status := 'pending_approval'; next_approval_status := 'pending';
      next_step := 'Admin Review'; activity_type := 'manager_review_completed'; activity_message := 'Manager Review completed';
    when 'admin_approve' then
      expected_statuses := array['admin_review']; required_permissions := array['pr.admin_review'];
      next_status := 'finance_review'; next_document_status := 'pending_approval'; next_approval_status := 'pending';
      next_step := 'Finance Review'; activity_type := 'admin_review_completed'; activity_message := 'Admin Review completed';
    when 'finance_approve' then
      expected_statuses := array['finance_review']; required_permissions := array['pr.finance_review'];
      next_status := 'ready_to_convert'; next_document_status := 'approved'; next_approval_status := 'approved';
      next_step := 'Ready to Convert'; activity_type := 'finance_review_completed'; activity_message := 'Finance Review completed';
    when 'reject' then
      expected_statuses := array['manager_review', 'admin_review', 'finance_review'];
      required_permissions := case request_row.status::text
        when 'manager_review' then array['pr.reject', 'pr.manager_approve']
        when 'admin_review' then array['pr.reject', 'pr.admin_review']
        when 'finance_review' then array['pr.reject', 'pr.finance_review']
        else array['pr.reject'] end;
      next_status := 'rejected'; next_document_status := 'rejected'; next_approval_status := 'rejected';
      next_step := 'Rejected'; activity_type := 'rejected'; activity_message := 'Purchase request rejected: ' || trim(coalesce(transition_remarks, ''));
      if nullif(trim(coalesce(transition_remarks, '')), '') is null then raise exception 'Rejection remarks are required.'; end if;
    when 'cancel' then
      expected_statuses := array['draft']; required_permissions := array['pr.cancel'];
      next_status := 'cancelled'; next_document_status := 'cancelled'; next_approval_status := 'cancelled';
      next_step := 'Cancelled'; activity_type := 'cancelled'; activity_message := 'Purchase request cancelled';
  end case;

  if not public.has_any_permission(required_permissions) then
    raise exception 'You do not have permission to perform this purchase request action.';
  end if;

  if request_row.status = next_status then
    return jsonb_build_object(
      'id', request_row.id, 'request_no', request_row.request_no, 'company_id', request_row.company_id,
      'branch_id', request_row.branch_id, 'status', request_row.status, 'already_applied', true
    );
  end if;
  if not (request_row.status::text = any(expected_statuses)) then
    raise exception 'This purchase request is currently at %. Refresh before trying %.', request_row.status, replace(transition_action, '_', ' ');
  end if;

  update public.purchase_requests
  set status = next_status, updated_by = actor.id
  where id = request_row.id;

  if request_row.document_id is not null then
    update public.documents
    set status = next_document_status,
        approval_status = next_approval_status,
        current_step = next_step,
        updated_by = actor.id
    where id = request_row.document_id;

    insert into public.activity_logs (company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
    values (
      actor.company_id, 'document', request_row.document_id, activity_type, activity_message,
      jsonb_build_object('workflow_step', request_row.status, 'next_status', next_status, 'action', transition_action), actor.id
    );
  end if;

  return jsonb_build_object(
    'id', request_row.id, 'request_no', request_row.request_no, 'company_id', request_row.company_id,
    'branch_id', request_row.branch_id, 'status', next_status, 'already_applied', false
  );
end
$$;

create or replace function public.set_role_permissions(target_role_id uuid, permission_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  target_role public.roles%rowtype;
  is_owner boolean;
  requested_count integer;
  valid_count integer;
begin
  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('roles.update') then
    raise exception 'Missing permission: roles.update';
  end if;

  select exists (
    select 1 from public.staff_roles sr join public.roles r on r.id = sr.role_id
    where sr.staff_id = actor.id and r.role_code = 'super_admin' and r.status = 'active' and r.deleted_at is null
      and sr.effective_from <= current_date and (sr.effective_to is null or sr.effective_to >= current_date)
  ) into is_owner;

  select * into target_role from public.roles where id = target_role_id and deleted_at is null for update;
  if target_role.id is null then raise exception 'Role not found.'; end if;
  if target_role.role_code = 'super_admin' then raise exception 'Super Admin permissions cannot be changed here.'; end if;
  if target_role.company_id is null and not is_owner then raise exception 'Only Super Admin may change a system role.'; end if;
  if target_role.company_id is not null and target_role.company_id is distinct from actor.company_id then
    raise exception 'Role belongs to another company.';
  end if;

  select count(*) into requested_count from (select distinct unnest(coalesce(permission_ids, '{}'::uuid[]))) x;
  select count(*) into valid_count from public.permissions where id in (select distinct unnest(coalesce(permission_ids, '{}'::uuid[])));
  if requested_count <> valid_count then raise exception 'One or more permission identifiers are invalid.'; end if;
  if not is_owner and exists (
    select 1 from public.permissions p
    where p.id in (select distinct unnest(coalesce(permission_ids, '{}'::uuid[])))
      and not public.has_permission(p.permission_code)
  ) then
    raise exception 'You cannot grant a role permission you do not have.';
  end if;
  if not is_owner and exists (select 1 from public.staff_roles where staff_id = actor.id and role_id = target_role.id) then
    raise exception 'Only Super Admin may change a role assigned to the current editor.';
  end if;

  delete from public.role_permissions where role_id = target_role.id;
  insert into public.role_permissions (role_id, permission_id)
  select target_role.id, id from public.permissions
  where id in (select distinct unnest(coalesce(permission_ids, '{}'::uuid[])));

  insert into public.activity_logs (company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values (actor.company_id, 'role', target_role.id, 'permissions_updated', 'Role default permissions updated',
    jsonb_build_object('permission_count', requested_count), actor.id);
end
$$;

-- Permission and assignment mutations must use the guarded server actions/RPCs.
-- Keep SELECT available for the existing role/staff management screens.
revoke insert, update, delete on public.roles from authenticated;
revoke insert, update, delete on public.role_permissions from authenticated;
revoke insert, update, delete on public.staff_roles from authenticated;
revoke insert, update, delete on public.staff_branches from authenticated;
revoke insert, update, delete on public.staff_locations from authenticated;
revoke insert, update, delete on public.staff_permission_overrides from authenticated;

-- Office administration may prepare invoices but cannot approve, pay or void them.
delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id and rp.permission_id = p.id
  and r.role_code in ('admin', 'operations_admin')
  and p.permission_code in ('supplier_invoice.pay', 'supplier_invoice.approve', 'supplier_invoice.void', 'supplier_invoices.payment');

drop policy if exists "supplier invoice payments read" on public.supplier_invoice_payments;
create policy "supplier invoice payments read"
  on public.supplier_invoice_payments for select to authenticated
  using (
    company_id = (
      select company_id from public.staffs
      where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1
    )
    and public.has_permission('supplier_invoice.pay')
  );

-- Preserve the proven report implementation while tightening its finance boundary.
alter function public.get_ap_aging_report(text, uuid, text, text, date, date, boolean, integer, integer)
  rename to get_ap_aging_report_internal_067;
revoke all on function public.get_ap_aging_report_internal_067(text, uuid, text, text, date, date, boolean, integer, integer) from public, authenticated;

create function public.get_ap_aging_report(
  p_search text default null,
  p_supplier_id uuid default null,
  p_bucket text default null,
  p_status text default null,
  p_due_from date default null,
  p_due_to date default null,
  p_overdue_only boolean default false,
  p_page integer default 1,
  p_page_size integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('supplier_invoice.pay') then
    raise exception 'You do not have permission to view payables reports.';
  end if;
  return public.get_ap_aging_report_internal_067(
    p_search, p_supplier_id, p_bucket, p_status, p_due_from, p_due_to, p_overdue_only, p_page, p_page_size
  );
end
$$;

revoke all on function public.can_access_purchase_request(uuid, uuid, uuid) from public;
revoke all on function public.link_purchase_request_document(uuid, uuid) from public;
revoke all on function public.transition_purchase_request(uuid, text, text) from public;
revoke all on function public.set_role_permissions(uuid, uuid[]) from public;
revoke all on function public.get_ap_aging_report(text, uuid, text, text, date, date, boolean, integer, integer) from public;
grant execute on function public.can_access_purchase_request(uuid, uuid, uuid) to authenticated;
grant execute on function public.link_purchase_request_document(uuid, uuid) to authenticated;
grant execute on function public.transition_purchase_request(uuid, text, text) to authenticated;
grant execute on function public.set_role_permissions(uuid, uuid[]) to authenticated;
grant execute on function public.get_ap_aging_report(text, uuid, text, text, date, date, boolean, integer, integer) to authenticated;

notify pgrst, 'reload schema';
