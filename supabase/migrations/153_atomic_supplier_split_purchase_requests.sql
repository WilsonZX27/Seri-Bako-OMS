-- A requisition may collect demand for several suppliers while it is being prepared.
-- Purchasing Review is the first point where every line has a verified supplier, so
-- split there, atomically, before Finance Review. Each resulting PR can then map to
-- exactly one independently keyed AutoCount PO.

alter table public.purchase_requests
  add column if not exists split_root_purchase_request_id uuid references public.purchase_requests(id) on delete restrict,
  add column if not exists assigned_supplier_id uuid references public.suppliers(id) on delete restrict;

create unique index if not exists purchase_requests_split_root_supplier_active_idx
  on public.purchase_requests(split_root_purchase_request_id, assigned_supplier_id)
  where split_root_purchase_request_id is not null
    and assigned_supplier_id is not null
    and deleted_at is null;

create index if not exists purchase_requests_split_root_idx
  on public.purchase_requests(split_root_purchase_request_id)
  where split_root_purchase_request_id is not null;

-- Internal allocator used only by the SECURITY DEFINER transition below. It
-- intentionally does not broaden the public next_document_number permission.
create or replace function public.allocate_supplier_split_pr_number(p_company_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_prefix text;
  v_padding integer;
  v_frequency text;
  v_local_now timestamp := now() at time zone 'Asia/Kuala_Lumpur';
  v_period_start date;
  v_period_label text;
  v_issued_number integer;
  v_candidate text;
  v_attempt integer := 0;
begin
  select prefix, padding, reset_frequency::text into v_prefix, v_padding, v_frequency
  from public.document_sequences
  where company_id = p_company_id and document_type = 'purchase_request'
    and status = 'active' and deleted_at is null;
  if not found then raise exception 'No active purchase request document sequence exists.'; end if;

  if v_frequency = 'never' then
    v_period_start := date '1970-01-01'; v_period_label := 'ALL';
  elsif v_frequency = 'yearly' then
    v_period_start := date_trunc('year', v_local_now)::date; v_period_label := to_char(v_local_now, 'YYYY');
  elsif v_frequency = 'quarterly' then
    v_period_start := date_trunc('quarter', v_local_now)::date; v_period_label := 'Q' || extract(quarter from v_local_now)::integer || to_char(v_local_now, 'YY');
  elsif v_frequency = 'daily' then
    v_period_start := v_local_now::date; v_period_label := to_char(v_local_now, 'MMDDYY');
  else
    v_period_start := date_trunc('month', v_local_now)::date; v_period_label := upper(to_char(v_local_now, 'MONYY'));
  end if;

  perform pg_advisory_xact_lock(hashtextextended('document-number:' || p_company_id::text || ':' || trim(v_prefix) || ':' || v_period_label, 0));
  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 10000 then raise exception 'Could not allocate an unused purchase request number.'; end if;
    insert into public.document_sequence_periods(company_id, document_type, period_start, next_number)
    values(p_company_id, 'purchase_request', v_period_start, 2)
    on conflict(company_id, document_type, period_start)
    do update set next_number = public.document_sequence_periods.next_number + 1
    returning next_number - 1 into v_issued_number;
    v_candidate := trim(v_prefix) || '/' || v_period_label || '/' || lpad(v_issued_number::text, greatest(v_padding, 3), '0');
    exit when not exists(select 1 from public.documents where company_id = p_company_id and document_no = v_candidate)
      and not exists(select 1 from public.stock_transactions where transaction_no = v_candidate);
  end loop;
  update public.document_sequences
  set next_number = v_issued_number + 1, last_reset_at = now(), updated_at = now()
  where company_id = p_company_id and document_type = 'purchase_request';
  return v_candidate;
end
$$;

revoke all on function public.allocate_supplier_split_pr_number(uuid) from public, anon, authenticated;

create or replace function public.transition_purchase_request(
  target_purchase_request_id uuid,
  transition_action text,
  transition_remarks text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
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
  primary_supplier_id uuid;
  supplier_record record;
  child_request_id uuid;
  child_document_id uuid;
  child_request_no text;
  split_requests jsonb := '[]'::jsonb;
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
      next_step := 'Finance Review'; activity_type := 'admin_review_completed'; activity_message := 'Purchasing Review completed';
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

  if transition_action = 'admin_approve' then
    if exists (
      select 1 from public.purchase_request_unresolved_lines
      where purchase_request_id = request_row.id and resolution_status = 'unresolved'
    ) then
      raise exception 'Resolve every non-catalog request line before completing Purchasing Review.';
    end if;
    perform public.validate_purchase_request_supplier_mappings(request_row.id, true);

    select line.suggested_supplier_id into primary_supplier_id
    from public.purchase_request_lines line
    join public.suppliers supplier on supplier.id = line.suggested_supplier_id
    where line.purchase_request_id = request_row.id
    order by supplier.supplier_code nulls last, supplier.name, line.created_at, line.id
    limit 1;
    if primary_supplier_id is null then
      raise exception 'Choose a supplier for every PR line before completing Purchasing Review.';
    end if;

    -- The original PR remains the first supplier group, preserving its approval trail.
    update public.purchase_requests
    set split_root_purchase_request_id = request_row.id,
        assigned_supplier_id = primary_supplier_id,
        updated_by = actor.id
    where id = request_row.id;

    split_requests := split_requests || jsonb_build_array(jsonb_build_object(
      'id', request_row.id,
      'request_no', request_row.request_no,
      'company_id', request_row.company_id,
      'branch_id', request_row.branch_id,
      'supplier_id', primary_supplier_id,
      'status', 'finance_review'
    ));

    for supplier_record in
      select distinct line.suggested_supplier_id as supplier_id
      from public.purchase_request_lines line
      join public.suppliers supplier on supplier.id = line.suggested_supplier_id
      where line.purchase_request_id = request_row.id
        and line.suggested_supplier_id is distinct from primary_supplier_id
      order by line.suggested_supplier_id
    loop
      child_request_id := gen_random_uuid();
      child_document_id := gen_random_uuid();
      child_request_no := public.allocate_supplier_split_pr_number(request_row.company_id);

      insert into public.documents(
        id, company_id, document_no, document_type, title, status, approval_status,
        current_step, related_entity_type, related_entity_id, created_by, updated_by
      ) values (
        child_document_id, request_row.company_id, child_request_no, 'purchase_request',
        'Purchase Request ' || child_request_no, 'pending_approval', 'pending',
        'Finance Review', 'purchase_request', child_request_id, actor.id, actor.id
      );
      insert into public.document_revisions(document_id, revision_no, change_summary, changed_by)
      values(child_document_id, 1, 'Created by supplier split from ' || request_row.request_no || ' after Purchasing Review.', actor.id);

      insert into public.purchase_requests(
        id, company_id, document_id, request_no, requested_by, request_date, required_date,
        priority, needed_by_date, urgency_reason, production_risk, branch_id, status, remarks,
        created_by, updated_by, split_root_purchase_request_id, assigned_supplier_id
      ) values (
        child_request_id, request_row.company_id, child_document_id, child_request_no,
        request_row.requested_by, request_row.request_date, request_row.required_date,
        request_row.priority, request_row.needed_by_date, request_row.urgency_reason,
        request_row.production_risk, request_row.branch_id, 'finance_review', request_row.remarks,
        request_row.created_by, actor.id, request_row.id, supplier_record.supplier_id
      );

      update public.purchase_request_lines
      set purchase_request_id = child_request_id
      where purchase_request_id = request_row.id
        and suggested_supplier_id = supplier_record.supplier_id;

      update public.purchase_request_unresolved_lines unresolved
      set purchase_request_id = child_request_id,
          updated_at = now()
      where unresolved.purchase_request_id = request_row.id
        and unresolved.resolution_status = 'matched'
        and exists (
          select 1 from public.purchase_request_lines moved
          where moved.purchase_request_id = child_request_id
            and moved.item_id = unresolved.resolved_item_id
        );

      insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
      values(
        actor.company_id, 'document', child_document_id, 'supplier_split',
        child_request_no || ' created for one supplier from ' || request_row.request_no,
        jsonb_build_object('split_root_purchase_request_id', request_row.id, 'supplier_id', supplier_record.supplier_id),
        actor.id
      );

      split_requests := split_requests || jsonb_build_array(jsonb_build_object(
        'id', child_request_id,
        'request_no', child_request_no,
        'company_id', request_row.company_id,
        'branch_id', request_row.branch_id,
        'supplier_id', supplier_record.supplier_id,
        'status', 'finance_review'
      ));
    end loop;
  end if;

  update public.purchase_requests set status = next_status, updated_by = actor.id where id = request_row.id;
  if request_row.document_id is not null then
    update public.documents
    set status = next_document_status, approval_status = next_approval_status, current_step = next_step, updated_by = actor.id
    where id = request_row.document_id;
    insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
    values(
      actor.company_id, 'document', request_row.document_id, activity_type, activity_message,
      jsonb_build_object(
        'workflow_step', request_row.status,
        'next_status', next_status,
        'action', transition_action,
        'split_requests', split_requests
      ), actor.id
    );
  end if;

  return jsonb_build_object(
    'id', request_row.id,
    'request_no', request_row.request_no,
    'company_id', request_row.company_id,
    'branch_id', request_row.branch_id,
    'status', next_status,
    'already_applied', false,
    'split_requests', split_requests
  );
end
$$;

revoke all on function public.transition_purchase_request(uuid, text, text) from public, anon;
grant execute on function public.transition_purchase_request(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
