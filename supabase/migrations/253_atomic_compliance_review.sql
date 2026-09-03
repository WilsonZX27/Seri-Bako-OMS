create or replace function public.review_compliance_record_atomic(
  p_record_id uuid,
  p_decision text,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.compliance_records%rowtype;
  v_actor public.staffs%rowtype;
  v_permission text;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Choose approve or return.' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and nullif(btrim(coalesce(p_note, '')), '') is null then
    raise exception 'Add a corrective note before returning evidence.' using errcode = '22023';
  end if;

  select * into v_actor from public.staffs
  where user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;
  if v_actor.id is null then raise exception 'Your active staff profile is not available.' using errcode = '42501'; end if;

  select * into v_record from public.compliance_records
  where id = p_record_id and company_id = v_actor.company_id and deleted_at is null
  for update;
  if v_record.id is null then raise exception 'This evidence is no longer available.' using errcode = 'P0002'; end if;
  if v_record.review_status <> 'pending_review' then raise exception 'This evidence is no longer pending review.' using errcode = '55000'; end if;

  v_permission := case v_record.subject_kind
    when 'outlet' then 'outlet_compliance.review'
    when 'staff' then 'people.compliance.manage'
    else 'compliance.review'
  end;
  if not public.has_permission(v_permission) then raise exception 'You do not have permission to review this evidence.' using errcode = '42501'; end if;

  update public.compliance_records set
    review_status = p_decision,
    reviewed_by = v_actor.id,
    reviewed_at = now(),
    review_note = nullif(btrim(coalesce(p_note, '')), ''),
    updated_by = v_actor.id,
    updated_at = now()
  where id = v_record.id;

  insert into public.compliance_record_history
    (company_id, compliance_record_id, event_type, safe_summary, actor_staff_id)
  values
    (v_actor.company_id, v_record.id, p_decision,
     case when p_decision = 'approved' then 'Compliance record approved.' else 'Compliance record returned for correction.' end,
     v_actor.id);

  return jsonb_build_object('id', v_record.id, 'branch_id', v_record.branch_id, 'subject_kind', v_record.subject_kind, 'decision', p_decision);
end;
$$;

revoke all on function public.review_compliance_record_atomic(uuid, text, text) from public, anon;
grant execute on function public.review_compliance_record_atomic(uuid, text, text) to authenticated;
notify pgrst, 'reload schema';
