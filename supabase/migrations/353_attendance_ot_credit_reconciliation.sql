-- Link a People-reviewed reversal to its exact OT earning. No automatic reversal.
alter table public.comp_time_transactions add column reverses_ot_claim_id uuid references public.attendance_ot_claims(id);
create unique index comp_time_one_active_ot_reversal on public.comp_time_transactions(reverses_ot_claim_id) where reverses_ot_claim_id is not null and status in ('pending','approved');

create function public.submit_attendance_ot_reconciliation(p_claim_id uuid,p_reason text,p_note text default null)
returns public.comp_time_transactions language plpgsql security definer set search_path=public as $$
declare claim public.attendance_ot_claims; entry public.comp_time_transactions;
begin
 if not public.has_permission('attendance.ot.approve') then raise exception 'People OT approval access is required.'; end if;
 perform public.attestation_lock((select staff_id from public.attendance_ot_claims where id=p_claim_id and company_id=public.current_staff_company_id()));
 select * into claim from public.attendance_ot_claims where id=p_claim_id and company_id=public.current_staff_company_id() for update;
 if claim.id is null or claim.status<>'credited' then raise exception 'A credited OT claim is required.'; end if;
 if exists(select 1 from public.comp_time_allocations where earned_transaction_id=claim.credited_transaction_id) then raise exception 'This OT credit has already been used. Resolve its RO usage before reversing the credit.'; end if;
 select * into entry from public.submit_comp_time_transaction(claim.staff_id,claim.branch_id,claim.work_date,'correction',-claim.decided_minutes,p_reason,p_note);
 update public.comp_time_transactions set reverses_ot_claim_id=claim.id,source_result_id=claim.result_id where id=entry.id returning * into entry;
 return entry;
end $$;

alter function public.decide_comp_time_transaction(uuid,text,text) rename to decide_comp_time_transaction_before_ot_reconciliation;
create function public.decide_comp_time_transaction(p_transaction_id uuid,p_decision text,p_comment text default null)
returns public.comp_time_transactions language plpgsql security definer set search_path=public as $$
declare entry public.comp_time_transactions; claim public.attendance_ot_claims;
begin
 perform public.attestation_lock((select staff_id from public.comp_time_transactions where id=p_transaction_id and company_id=public.current_staff_company_id()));
 select * into entry from public.comp_time_transactions where id=p_transaction_id and company_id=public.current_staff_company_id() for update;
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
revoke all on function public.decide_comp_time_transaction_before_ot_reconciliation(uuid,text,text) from public,anon,authenticated;
revoke all on function public.submit_attendance_ot_reconciliation(uuid,text,text),public.decide_comp_time_transaction(uuid,text,text) from public,anon;
grant execute on function public.submit_attendance_ot_reconciliation(uuid,text,text),public.decide_comp_time_transaction(uuid,text,text) to authenticated;
notify pgrst,'reload schema';

-- Close/reversal races must never allocate one earning twice.
create function public.guard_comp_time_allocation_capacity() returns trigger
language plpgsql security definer set search_path=public as $$
declare earning public.comp_time_transactions; consuming public.comp_time_transactions; allocated integer;
begin
 select * into earning from public.comp_time_transactions where id=new.earned_transaction_id for update;
 select * into consuming from public.comp_time_transactions where id=new.used_transaction_id;
 if earning.company_id is distinct from new.company_id or consuming.company_id is distinct from new.company_id or earning.staff_id is distinct from consuming.staff_id or earning.status<>'approved' or earning.minutes<=0 or consuming.status<>'approved' or consuming.minutes>=0 then raise exception 'RO allocation does not match approved employee transactions.'; end if;
 select coalesce(sum(allocated_minutes),0) into allocated from public.comp_time_allocations where earned_transaction_id=earning.id and id<>new.id;
 if allocated+new.allocated_minutes>earning.minutes then raise exception 'RO credit has already been allocated.'; end if;
 return new;
end $$;
create trigger comp_time_allocation_capacity before insert or update on public.comp_time_allocations for each row execute function public.guard_comp_time_allocation_capacity();
revoke all on function public.guard_comp_time_allocation_capacity() from public,anon,authenticated;
