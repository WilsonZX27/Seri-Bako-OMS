-- Local candidate only. No historical backfill or external delivery.
begin;
create function public.notify_pending_attendance_review() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare required_permission text; target_url text;
begin
 if tg_table_name='attendance_ot_claims' then
  if new.status<>'submitted' then return new; end if;
  required_permission:='attendance.ot.approve'; target_url:='/attendance/review';
 else
  if new.status<>'pending' then return new; end if;
  -- OT reversals need the additional OT approval permission; leave these to
  -- the existing reconciliation workflow until its recipient contract is verified.
  if new.reverses_ot_claim_id is not null then return new; end if;
  required_permission:='comp_time.approve'; target_url:='/people/ro';
 end if;
 insert into public.notifications(company_id,recipient_staff_id,branch_id,title,message,action_url,entity_type,entity_id)
 select new.company_id,s.id,new.branch_id,'Attendance approval pending','A request needs your review.',target_url,tg_table_name,new.id
 from public.staffs s
 where s.company_id=new.company_id and s.id<>new.submitted_by and s.status='active' and s.deleted_at is null
 and (s.employment_end_date is null or s.employment_end_date>=(now() at time zone 'Asia/Kuala_Lumpur')::date)
 and exists(select 1 from public.staff_roles sr join public.roles r on r.id=sr.role_id
  where sr.staff_id=s.id and r.company_id=s.company_id and r.status='active' and r.deleted_at is null
  and (sr.effective_from is null or sr.effective_from<=current_date) and (sr.effective_to is null or sr.effective_to>=current_date)
  and (r.role_code='super_admin' or exists(select 1 from public.staff_permission_overrides o join public.permissions p on p.id=o.permission_id where o.staff_id=s.id and o.effect='allow' and p.permission_code=required_permission) or exists(select 1 from public.role_permissions rp join public.permissions p on p.id=rp.permission_id where rp.role_id=r.id and p.permission_code=required_permission))
  and (r.role_code in ('super_admin','manager','people_operations') or exists(select 1 from public.staff_branches sb where sb.staff_id=s.id and sb.branch_id=new.branch_id)))
 and not exists(select 1 from public.staff_permission_overrides o join public.permissions p on p.id=o.permission_id where o.staff_id=s.id and o.effect='deny' and p.permission_code=required_permission)
 and not exists(select 1 from public.notifications n where n.company_id=new.company_id and n.entity_type=tg_table_name and n.entity_id=new.id and n.recipient_staff_id=s.id);
 return new;
end $$;
revoke all on function public.notify_pending_attendance_review() from public,anon,authenticated,service_role;
create trigger attendance_ot_pending_notification after insert on public.attendance_ot_claims for each row execute function public.notify_pending_attendance_review();
create trigger comp_time_pending_notification after insert on public.comp_time_transactions for each row execute function public.notify_pending_attendance_review();
commit;
