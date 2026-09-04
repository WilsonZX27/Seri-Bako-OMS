-- Keep compliance type creation and outlet requirement rollout in one transaction.
-- The action intentionally calls this RPC instead of composing two client writes.

create or replace function public.create_compliance_type_atomic(
  p_type_name text,
  p_subject_kind text,
  p_is_sensitive boolean default false
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_company_id uuid := public.current_staff_company_id();
  v_actor_id uuid := public.current_staff_id();
  v_type_code text;
  v_module_scope text;
  v_type_id uuid;
begin
  if v_company_id is null or v_actor_id is null then
    raise exception 'Your active staff profile is not available.' using errcode = '42501';
  end if;
  if not public.has_permission('compliance.types.manage') then
    raise exception 'You do not have permission to manage compliance types.' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_type_name, '')), '') is null then
    raise exception 'Requirement name is required.' using errcode = '22023';
  end if;
  if char_length(btrim(p_type_name)) > 100 then
    raise exception 'Requirement name is too long.' using errcode = '22023';
  end if;
  if p_subject_kind not in ('outlet', 'staff', 'asset') then
    raise exception 'Unsupported compliance subject.' using errcode = '22023';
  end if;

  v_type_code := btrim(btrim(left(regexp_replace(upper(btrim(p_type_name)), '[^A-Z0-9]+', '_', 'g'), 60), '_'), '_');
  if v_type_code = '' then
    raise exception 'Requirement name must contain a letter or number.' using errcode = '22023';
  end if;
  v_module_scope := case p_subject_kind when 'staff' then 'people' when 'asset' then 'asset' else 'outlet' end;

  insert into public.compliance_types (
    company_id, type_code, type_name, subject_kind, module_scope,
    is_required, document_required, is_sensitive
  ) values (
    v_company_id, v_type_code, btrim(p_type_name), p_subject_kind, v_module_scope,
    p_subject_kind = 'outlet', true, coalesce(p_is_sensitive, false)
  ) returning id into v_type_id;

  if p_subject_kind = 'outlet' then
    insert into public.outlet_compliance_requirements (
      company_id, branch_id, compliance_type_id, is_required
    )
    select b.company_id, b.id, v_type_id, true
    from public.branches b
    where b.company_id = v_company_id
      and b.branch_type in ('outlet', 'central_kitchen')
      and b.status = 'active'
      and b.deleted_at is null;
  end if;

  return v_type_id;
end;
$$;

revoke all on function public.create_compliance_type_atomic(text, text, boolean) from public, anon;
grant execute on function public.create_compliance_type_atomic(text, text, boolean) to authenticated;
notify pgrst, 'reload schema';
