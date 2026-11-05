-- REVIEW ONLY. Not installed. User approved Manager assigned-outlet RO review 2026-11-05.
-- Verify live function baseline equals migration 353 before replacement; preserve existing ACL.
-- Grant is limited to Seri Bako Malaysia. Does not grant OT, submission, payroll or self-review.
BEGIN;
SET LOCAL lock_timeout='5s';
create or replace function public.decide_comp_time_transaction(p_transaction_id uuid,p_decision text,p_comment text default null)
returns public.comp_time_transactions language plpgsql security definer set search_path=public as $$
declare entry public.comp_time_transactions; claim public.attendance_ot_claims;
begin
 perform public.attestation_lock((select staff_id from public.comp_time_transactions where id=p_transaction_id and company_id=public.current_staff_company_id()));
 select * into entry from public.comp_time_transactions where id=p_transaction_id and company_id=public.current_staff_company_id() for update;
 -- Manager review is restricted to explicitly assigned branches; Owner/People retain their existing scope.
 if public.current_staff_has_company_role(array['manager'])
    and not public.current_staff_has_company_role(array['super_admin','people_operations']) then
  if entry.id is null or entry.branch_id is null or not exists (
   select 1 from public.staff_branches sb join public.branches b on b.id=sb.branch_id
   where sb.staff_id=public.current_staff_id() and sb.branch_id=entry.branch_id
     and b.company_id=public.current_staff_company_id()
  ) then raise exception 'RO review requires an assigned outlet.'; end if;
 end if;
 if entry.reverses_ot_claim_id is not null then
  if not public.has_permission('attendance.ot.approve') then raise exception 'People OT approval access is required.'; end if;
  select * into claim from public.attendance_ot_claims where id=entry.reverses_ot_claim_id and company_id=entry.company_id for update;
  if p_decision='approve' then
   if public.attendance_payroll_locked(claim.company_id,claim.staff_id,claim.work_date) then raise exception 'Released payroll is locked; use an explicitly approved correction process.'; end if;
   if claim.status<>'credited' or entry.minutes<>-claim.decided_minutes or entry.staff_id<>claim.staff_id then raise exception 'OT reconciliation no longer matches its credit.'; end if;
   if not public.can_access_company_branch(claim.company_id,claim.branch_id) then raise exception 'Outlet is not available.'; end if;
   if exists(select 1 from public.attendance_period_locks where company_id=claim.company_id and week_start=date_trunc('week',claim.work_date)::date and unlocked_at is null and (branch_id is null or branch_id=claim.branch_id)) then raise exception 'Attendance period is locked.'; end if;
   perform 1 from public.comp_time_transactions where id=claim.credited_transaction_id for update;
   if exists(select 1 from public.comp_time_allocations where earned_transaction_id=claim.credited_transaction_id) then raise exception 'This OT credit has already been used. Resolve its RO usage before reversing the credit.'; end if;
  end if;
 end if;
 select * into entry from public.decide_comp_time_transaction_before_ot_reconciliation(p_transaction_id,p_decision,p_comment);
 if entry.reverses_ot_claim_id is not null and p_decision='approve' then
  -- Allocate the exact credit to its reversing correction so it cannot be redeemed later.
  insert into public.comp_time_allocations(company_id,used_transaction_id,earned_transaction_id,allocated_minutes)
  values(claim.company_id,entry.id,claim.credited_transaction_id,claim.decided_minutes);
  update public.attendance_ot_claims set status='cancelled',updated_at=now() where id=claim.id;
  update public.daily_attendance_results set overtime_seconds=0,calculation=calculation||jsonb_build_object('overtime_approved_seconds',0,'ot_reconciliation_transaction_id',entry.id)
   where company_id=claim.company_id and staff_id=claim.staff_id and work_date=claim.work_date and is_current;
 end if;
 return entry;
end $$;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.company_id='3b104582-f8cb-4a4d-867f-b99e5ffc6486'::uuid
 and r.role_code='manager' and r.status='active' and r.deleted_at is null
 and p.permission_code='comp_time.approve'
on conflict do nothing;
COMMIT;
-- Rollback: restore captured preimage of function; remove only newly inserted grant IDs.
