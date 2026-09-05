-- Renewal and its history entry must succeed or roll back together.
create or replace function public.renew_compliance_record_atomic(p_record_id uuid, p_expires_on date)
returns void language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  v_record public.compliance_records%rowtype;
  v_actor uuid := public.current_staff_id();
begin
  if v_actor is null or not public.has_permission('compliance.manage') then
    raise exception 'You do not have permission to renew compliance records.' using errcode = '42501';
  end if;
  if p_expires_on is null then
    raise exception 'Expiry date is required.' using errcode = '22023';
  end if;
  select * into v_record from public.compliance_records
    where id = p_record_id and company_id = public.current_staff_company_id() and deleted_at is null
    for update;
  if not found then
    raise exception 'Compliance record is not available in your scope.' using errcode = '42501';
  end if;
  update public.compliance_records set expires_on = p_expires_on,
    review_status = 'pending_review', reviewed_by = null, reviewed_at = null,
    review_note = null, updated_by = v_actor where id = p_record_id;
  if not found then
    raise exception 'Compliance record could not be renewed.' using errcode = '42501';
  end if;
  insert into public.compliance_record_history
    (company_id, compliance_record_id, event_type, safe_summary, previous_expires_on, new_expires_on, actor_staff_id)
  values (v_record.company_id, p_record_id, 'renewed', 'Expiry renewed and returned for review.', v_record.expires_on, p_expires_on, v_actor);
end;
$$;
revoke all on function public.renew_compliance_record_atomic(uuid, date) from public, anon;
grant execute on function public.renew_compliance_record_atomic(uuid, date) to authenticated;
