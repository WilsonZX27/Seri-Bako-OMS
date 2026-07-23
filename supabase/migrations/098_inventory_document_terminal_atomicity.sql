-- Sprint 7.23.8.6: remaining inventory document terminal transitions are atomic.

create or replace function public.cancel_goods_receiving_atomic(p_goods_receiving_id uuid)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  grn public.goods_receivings%rowtype;
  revision_number integer;
begin
  select * into actor from public.staffs where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('goods_receiving.cancel') then raise exception 'Missing permission: goods_receiving.cancel'; end if;
  select * into grn from public.goods_receivings where id = p_goods_receiving_id and company_id = actor.company_id and deleted_at is null for update;
  if grn.id is null then raise exception 'Goods receiving was not found in your company.'; end if;
  if grn.status = 'cancelled' then return jsonb_build_object('id', grn.id, 'status', grn.status, 'already_cancelled', true); end if;
  if grn.status = 'posted' or grn.status <> 'draft' then raise exception 'Only a draft, unposted GRN can be cancelled.'; end if;
  if not public.can_access_inventory_branch(grn.company_id, grn.branch_id) then raise exception 'You do not have access to this inventory branch.'; end if;
  update public.goods_receivings set status = 'cancelled', cancelled_at = now(), updated_by = actor.id, updated_at = now() where id = grn.id;
  if grn.document_id is not null then
    update public.documents set status = 'cancelled', approval_status = 'cancelled', current_step = 'Cancelled', cancelled_at = now(), revision_no = revision_no + 1, updated_by = actor.id
    where id = grn.document_id and company_id = actor.company_id
    returning revision_no into revision_number;
    insert into public.document_revisions(document_id, revision_no, change_summary, changed_by)
    values (grn.document_id, revision_number, 'Goods receiving cancelled.', actor.id);
    insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
    values (actor.company_id, 'document', grn.document_id, 'cancelled', 'Goods receiving ' || grn.grn_no || ' cancelled', jsonb_build_object('goods_receiving_id', grn.id), actor.id);
  end if;
  return jsonb_build_object('id', grn.id, 'status', 'cancelled', 'document_id', grn.document_id, 'already_cancelled', false);
end $$;

create or replace function public.cancel_purchase_return_atomic(p_purchase_return_id uuid)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  ret public.purchase_returns%rowtype;
  revision_number integer;
begin
  select * into actor from public.staffs where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('purchase_return.cancel') then raise exception 'Missing permission: purchase_return.cancel'; end if;
  select * into ret from public.purchase_returns where id = p_purchase_return_id and company_id = actor.company_id and deleted_at is null for update;
  if ret.id is null then raise exception 'Purchase return was not found in your company.'; end if;
  if ret.status = 'cancelled' then return jsonb_build_object('id', ret.id, 'status', ret.status, 'already_cancelled', true); end if;
  if ret.status <> 'draft' then raise exception 'Only a draft purchase return can be cancelled.'; end if;
  if not public.can_access_inventory_branch(ret.company_id, ret.branch_id) then raise exception 'You do not have access to this inventory branch.'; end if;
  update public.purchase_returns set status = 'cancelled', cancelled_at = now(), updated_by = actor.id, updated_at = now() where id = ret.id;
  if ret.document_id is not null then
    update public.documents set status = 'cancelled', approval_status = 'cancelled', current_step = 'Cancelled', cancelled_at = now(), revision_no = revision_no + 1, updated_by = actor.id
    where id = ret.document_id and company_id = actor.company_id
    returning revision_no into revision_number;
    insert into public.document_revisions(document_id, revision_no, change_summary, changed_by)
    values (ret.document_id, revision_number, 'Purchase return cancelled.', actor.id);
    insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
    values (actor.company_id, 'document', ret.document_id, 'cancelled', 'Purchase return ' || ret.purchase_return_no || ' cancelled', jsonb_build_object('purchase_return_id', ret.id), actor.id);
  end if;
  return jsonb_build_object('id', ret.id, 'status', 'cancelled', 'document_id', ret.document_id, 'already_cancelled', false);
end $$;

create or replace function public.transition_production_job_atomic(p_job_id uuid, p_action text, p_remarks text default null)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  job public.production_jobs%rowtype;
  next_status text;
  next_document_status public.document_status;
  next_approval_status public.approval_status;
  next_step text;
  activity_type text;
  required_permission text;
  revision_number integer;
begin
  select * into actor from public.staffs where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null then raise exception 'An active staff profile is required.'; end if;
  select * into job from public.production_jobs where id = p_job_id and company_id = actor.company_id and deleted_at is null for update;
  if job.id is null then raise exception 'Production job was not found in your company.'; end if;
  if not public.can_access_inventory_branch(job.company_id, job.branch_id) then raise exception 'You do not have access to this production branch.'; end if;
  if p_action = 'submit' then
    required_permission := 'production.submit'; next_status := 'submitted'; next_document_status := 'submitted'; next_approval_status := 'pending'; next_step := 'Submitted for production approval'; activity_type := 'submitted';
    if job.status <> 'draft' then raise exception 'Only a draft production job can be submitted.'; end if;
  elsif p_action = 'approve' then
    required_permission := 'production.approve'; next_status := 'approved'; next_document_status := 'approved'; next_approval_status := 'approved'; next_step := 'Approved for posting'; activity_type := 'approved';
    if job.status <> 'submitted' then raise exception 'Only a submitted production job can be approved.'; end if;
  elsif p_action = 'reject' then
    required_permission := 'production.reject'; next_status := 'rejected'; next_document_status := 'rejected'; next_approval_status := 'rejected'; next_step := 'Rejected'; activity_type := 'rejected';
    if job.status not in ('submitted', 'approved') or nullif(trim(p_remarks), '') is null then raise exception 'Only a submitted or approved production job can be rejected with remarks.'; end if;
  elsif p_action = 'cancel' then
    required_permission := 'production.cancel'; next_status := 'cancelled'; next_document_status := 'cancelled'; next_approval_status := 'cancelled'; next_step := 'Cancelled'; activity_type := 'cancelled';
    if job.status not in ('draft', 'submitted', 'approved') then raise exception 'Only an unposted production job can be cancelled.'; end if;
  else
    raise exception 'Unsupported production job transition.';
  end if;
  if not public.has_permission(required_permission) then raise exception 'Missing permission: %', required_permission; end if;
  update public.production_jobs set status = next_status, updated_by = actor.id, updated_at = now(),
    cancelled_by = case when next_status = 'cancelled' then actor.id else cancelled_by end,
    cancelled_at = case when next_status = 'cancelled' then now() else cancelled_at end,
    rejected_by = case when next_status = 'rejected' then actor.id else rejected_by end,
    rejected_at = case when next_status = 'rejected' then now() else rejected_at end
  where id = job.id;
  if job.document_id is not null then
    update public.documents set status = next_document_status, approval_status = next_approval_status, current_step = next_step,
      revision_no = revision_no + 1, updated_by = actor.id,
      cancelled_at = case when next_status = 'cancelled' then now() else cancelled_at end
    where id = job.document_id and company_id = actor.company_id
    returning revision_no into revision_number;
    insert into public.document_revisions(document_id, revision_no, change_summary, changed_by)
    values (job.document_id, revision_number, coalesce(nullif(trim(p_remarks), ''), 'Production job ' || lower(activity_type) || '.'), actor.id);
    insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
    values (actor.company_id, 'production_job', job.id, activity_type, 'Production Job ' || job.production_job_no || ' ' || activity_type,
      jsonb_build_object('document_id', job.document_id, 'from_status', job.status, 'to_status', next_status), actor.id);
  end if;
  return jsonb_build_object('id', job.id, 'production_job_no', job.production_job_no, 'status', next_status, 'branch_id', job.branch_id, 'priority', job.priority, 'document_id', job.document_id);
end $$;

revoke all on function public.cancel_goods_receiving_atomic(uuid), public.cancel_purchase_return_atomic(uuid), public.transition_production_job_atomic(uuid, text, text) from public, anon;
grant execute on function public.cancel_goods_receiving_atomic(uuid) to authenticated;
grant execute on function public.cancel_purchase_return_atomic(uuid) to authenticated;
grant execute on function public.transition_production_job_atomic(uuid, text, text) to authenticated;
