-- One-time, idempotent cleanup for the exact disposable Production UAT record
-- documented in docs/PRODUCTION-UAT-TEST-DATA-2026-08-23.md. This deliberately
-- reuses the Owner-authorized hard-delete RPC so the tombstone and dependency
-- protections remain authoritative.
do $$
declare
  target_id constant uuid := '1e6ab4b0-9238-4735-b928-6054435335e0';
  target_no constant text := 'PR/AUG26/020';
  target public.purchase_requests%rowtype;
  owner_auth_user_id uuid;
begin
  select * into target
  from public.purchase_requests
  where id = target_id;

  -- Already cleaned, or an environment that never contained this UAT fixture.
  if target.id is null then
    return;
  end if;

  if target.request_no is distinct from target_no
    or position('PRODUCTION-UAT' in coalesce(target.remarks, '')) = 0 then
    raise exception 'Refusing UAT cleanup: exact manifested identity or marker does not match.';
  end if;

  if exists (
    select 1
    from public.purchase_orders po
    where po.purchase_request_id = target_id
      and po.deleted_at is null
  ) then
    raise exception 'Refusing UAT cleanup: an active linked Purchase Order remains.';
  end if;

  select s.auth_user_id into owner_auth_user_id
  from public.staffs s
  join public.staff_roles sr on sr.staff_id = s.id
  join public.roles r on r.id = sr.role_id
  where s.id = target.created_by
    and s.company_id = target.company_id
    and s.status = 'active'
    and s.deleted_at is null
    and r.role_code = 'super_admin'
    and r.status = 'active'
  limit 1;

  if owner_auth_user_id is null then
    raise exception 'Refusing UAT cleanup: the recorded creator is not an active Owner.';
  end if;

  perform set_config('request.jwt.claim.sub', owner_auth_user_id::text, true);
  perform public.hard_delete_phase_one('purchase_request', target_id, target_no);

  if exists (select 1 from public.purchase_requests where id = target_id) then
    raise exception 'Manifested Production UAT Purchase Request still exists after cleanup.';
  end if;
end $$;
