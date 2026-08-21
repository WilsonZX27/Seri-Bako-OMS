-- Forward-only repair: qualify approval_steps.approval_id so PL/pgSQL
-- variables cannot make document approval transitions ambiguous.
create or replace function public.transition_document_atomic(
  p_document_id uuid,
  p_action text,
  p_remarks text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  doc public.documents%rowtype;
  v_approval_id uuid;
  next_status public.document_status;
  next_approval public.approval_status;
  next_step text;
  activity text;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid()
    and status = 'active'
    and deleted_at is null
  limit 1;
  if actor.id is null then
    raise exception 'You must be signed in with an active staff profile.';
  end if;

  select * into doc
  from public.documents
  where id = p_document_id
    and company_id = actor.company_id
    and deleted_at is null
  for update;
  if doc.id is null then
    raise exception 'Document was not found in your company.';
  end if;

  if p_action = 'submit' then
    if not public.has_permission('documents.submit') or doc.status <> 'draft' then
      raise exception 'Only draft documents can be submitted.';
    end if;
    next_status := 'pending_approval';
    next_approval := 'pending';
    next_step := 'Manager approval';
    activity := 'submitted';
    select a.id into v_approval_id
    from public.approvals as a
    where a.entity_type = 'document'
      and a.entity_id = doc.id
      and a.deleted_at is null
    limit 1;
    if v_approval_id is null then
      insert into public.approvals(company_id, entity_type, entity_id, status, submitted_at, submitted_by, created_by, updated_by)
      values (actor.company_id, 'document', doc.id, 'pending', now(), actor.id, actor.id, actor.id)
      returning id into v_approval_id;
      insert into public.approval_steps(approval_id, step_no, approver_role, status)
      values (v_approval_id, 1, 'manager', 'pending');
    end if;
  elsif p_action = 'approve' then
    if not public.has_permission('documents.approve') or doc.status <> 'pending_approval' then
      raise exception 'Only pending documents can be approved.';
    end if;
    next_status := 'approved';
    next_approval := 'approved';
    next_step := 'Approved';
    activity := 'approved';
    update public.approvals as a
    set status = 'approved', completed_at = now(), updated_by = actor.id
    where a.entity_type = 'document'
      and a.entity_id = doc.id
      and a.deleted_at is null;
    update public.approval_steps as step
    set status = 'approved', remarks = coalesce(p_remarks, 'Approved'), acted_at = now()
    where step.approval_id in (
      select a.id from public.approvals as a
      where a.entity_type = 'document'
        and a.entity_id = doc.id
        and a.deleted_at is null
    )
      and step.step_no = 1;
  elsif p_action = 'reject' then
    if not public.has_permission('documents.approve') or doc.status <> 'pending_approval' or nullif(trim(p_remarks), '') is null then
      raise exception 'Only pending documents can be rejected with remarks.';
    end if;
    next_status := 'rejected';
    next_approval := 'rejected';
    next_step := 'Rejected';
    activity := 'rejected';
    update public.approvals as a
    set status = 'rejected', completed_at = now(), updated_by = actor.id
    where a.entity_type = 'document'
      and a.entity_id = doc.id
      and a.deleted_at is null;
    update public.approval_steps as step
    set status = 'rejected', remarks = p_remarks, acted_at = now()
    where step.approval_id in (
      select a.id from public.approvals as a
      where a.entity_type = 'document'
        and a.entity_id = doc.id
        and a.deleted_at is null
    )
      and step.step_no = 1;
  elsif p_action = 'post' then
    if not public.has_permission('documents.update') or doc.status <> 'approved' then
      raise exception 'Only approved documents can be posted.';
    end if;
    next_status := 'posted';
    next_approval := 'approved';
    next_step := 'Posted';
    activity := 'posted';
  elsif p_action = 'cancel' then
    if not public.has_permission('documents.update') or doc.status in ('posted', 'closed', 'cancelled') then
      raise exception 'This document cannot be cancelled from its current state.';
    end if;
    next_status := 'cancelled';
    next_approval := 'cancelled';
    next_step := 'Cancelled';
    activity := 'cancelled';
  else
    raise exception 'Unsupported document transition.';
  end if;

  update public.documents
  set status = next_status,
      approval_status = next_approval,
      current_step = next_step,
      revision_no = revision_no + 1,
      updated_by = actor.id,
      submitted_at = case when next_status = 'pending_approval' then now() else submitted_at end,
      posted_at = case when next_status = 'posted' then now() else posted_at end,
      cancelled_at = case when next_status = 'cancelled' then now() else cancelled_at end,
      closed_at = case when next_status = 'closed' then now() else closed_at end
  where id = doc.id;
  insert into public.document_revisions(document_id, revision_no, change_summary, changed_by)
  values (doc.id, doc.revision_no + 1, coalesce(p_remarks, initcap(activity) || '.'), actor.id);
  insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values (actor.company_id, 'document', doc.id, activity, 'Document ' || doc.document_no || ' ' || activity,
    jsonb_build_object('from_status', doc.status, 'to_status', next_status), actor.id);
  return jsonb_build_object('id', doc.id, 'status', next_status, 'approval_status', next_approval);
end;
$$;

grant execute on function public.transition_document_atomic(uuid, text, text) to authenticated;
