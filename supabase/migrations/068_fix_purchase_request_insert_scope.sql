-- Sprint 7.22.1: qualify the target PR row inside nested RLS subqueries.

insert into public.permissions (permission_code, module, action, description)
values
  ('pr.create', 'purchase_requests', 'create', 'Create purchase requests'),
  ('pr.submit', 'purchase_requests', 'submit', 'Submit purchase requests'),
  ('pr.admin_review', 'purchase_requests', 'admin_review', 'Complete Admin Review'),
  ('pr.finance_review', 'purchase_requests', 'finance_review', 'Complete Finance Review'),
  ('pr.cancel', 'purchase_requests', 'cancel', 'Cancel draft purchase requests'),
  ('pr.view_all', 'purchase_requests', 'view_all', 'View all company purchase requests'),
  ('pr.convert_to_po', 'purchase_requests', 'convert_to_po', 'Convert approved purchase requests to purchase orders')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on
  (r.role_code in ('admin', 'operations_admin') and p.permission_code in ('pr.create', 'pr.submit', 'pr.admin_review', 'pr.reject', 'pr.cancel', 'pr.view_all', 'pr.view_branch'))
  or (r.role_code = 'manager' and p.permission_code in ('pr.create', 'pr.submit'))
  or (r.role_code = 'finance' and p.permission_code in ('pr.view_all', 'pr.finance_review'))
  or (r.role_code = 'purchasing' and p.permission_code in ('pr.view_all', 'pr.convert_to_po'))
where r.status = 'active' and r.deleted_at is null
on conflict (role_id, permission_id) do nothing;

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
        and s.company_id is not distinct from purchase_requests.company_id
        and purchase_requests.requested_by = s.id
        and (
          public.has_permission('pr.view_all')
          or exists (
            select 1 from public.staff_branches sb
            where sb.staff_id = s.id
              and sb.branch_id = purchase_requests.branch_id
          )
        )
    )
  );

-- Repeated approval from a stale session is a conflict, not a second success.
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

  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null then raise exception 'An active staff account is required.'; end if;

  select * into request_row from public.purchase_requests
  where id = target_purchase_request_id and deleted_at is null for update;
  if request_row.id is null then raise exception 'Purchase request not found.'; end if;
  if actor.company_id is distinct from request_row.company_id
    or not public.can_access_purchase_request(request_row.company_id, request_row.branch_id, request_row.requested_by) then
    raise exception 'You do not have access to this purchase request.';
  end if;

  case transition_action
    when 'submit' then
      expected_statuses := array['draft', 'rejected', 'returned']; required_permissions := array['pr.submit'];
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
  if not (request_row.status::text = any(expected_statuses)) then
    raise exception 'This purchase request is currently at %. Refresh before trying %.', request_row.status, replace(transition_action, '_', ' ');
  end if;

  update public.purchase_requests set status = next_status, updated_by = actor.id where id = request_row.id;
  if request_row.document_id is not null then
    update public.documents
    set status = next_document_status, approval_status = next_approval_status, current_step = next_step, updated_by = actor.id
    where id = request_row.document_id;
    insert into public.activity_logs (company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
    values (actor.company_id, 'document', request_row.document_id, activity_type, activity_message,
      jsonb_build_object('workflow_step', request_row.status, 'next_status', next_status, 'action', transition_action), actor.id);
  end if;

  return jsonb_build_object(
    'id', request_row.id, 'request_no', request_row.request_no, 'company_id', request_row.company_id,
    'branch_id', request_row.branch_id, 'status', next_status, 'already_applied', false
  );
end
$$;
