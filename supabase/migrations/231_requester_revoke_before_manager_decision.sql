-- v9.2.3 — A requester may revoke an accidental submission only before Manager acts.

create or replace function public.withdraw_purchase_request_for_correction(
  target_purchase_request_id uuid,
  correction_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  request_row public.purchase_requests%rowtype;
  document_row public.documents%rowtype;
  clean_reason text := nullif(btrim(correction_reason), '');
  actor_is_owner boolean := false;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;
  if actor.id is null then raise exception 'An active staff account is required.'; end if;
  if clean_reason is null or char_length(clean_reason) < 3 then
    raise exception 'Enter a short revoke reason.';
  end if;

  select * into request_row
  from public.purchase_requests
  where id = target_purchase_request_id
    and company_id = actor.company_id
    and deleted_at is null
  for update;
  if request_row.id is null then raise exception 'Purchase request not found in your company.'; end if;
  if request_row.status::text <> 'manager_review' then
    raise exception 'This submission can no longer be revoked because Manager Review has already moved on.';
  end if;
  if not public.has_any_permission(array['pr.cancel', 'purchase_request.cancel']) then
    raise exception 'You do not have permission to revoke this submission.';
  end if;

  actor_is_owner := public.current_staff_has_company_role(array['super_admin']);
  if request_row.requested_by <> actor.id and not actor_is_owner then
    raise exception 'Only the original requester can revoke this submission before Manager acts.';
  end if;

  update public.purchase_requests
  set status = 'draft', updated_by = actor.id, updated_at = now()
  where id = request_row.id;

  if request_row.document_id is not null then
    select * into document_row
    from public.documents
    where id = request_row.document_id and company_id = actor.company_id and deleted_at is null
    for update;

    if document_row.id is not null then
      update public.documents
      set status = 'draft',
          approval_status = 'draft',
          current_step = 'Draft',
          revision_no = document_row.revision_no + 1,
          updated_by = actor.id
      where id = document_row.id;

      insert into public.document_revisions(document_id, revision_no, change_summary, changed_by)
      values (
        document_row.id,
        document_row.revision_no + 1,
        'Submission revoked before Manager decision: ' || clean_reason,
        actor.id
      );
    end if;
  end if;

  insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values (
    actor.company_id,
    'purchase_request',
    request_row.id,
    'submission_revoked',
    'Purchase request submission revoked before Manager decision: ' || clean_reason,
    jsonb_build_object('from_status', request_row.status, 'to_status', 'draft', 'reason', clean_reason),
    actor.id
  );

  return jsonb_build_object('id', request_row.id, 'request_no', request_row.request_no, 'status', 'draft');
end
$$;

revoke all on function public.withdraw_purchase_request_for_correction(uuid, text) from public, anon;
grant execute on function public.withdraw_purchase_request_for_correction(uuid, text) to authenticated;

notify pgrst, 'reload schema';
