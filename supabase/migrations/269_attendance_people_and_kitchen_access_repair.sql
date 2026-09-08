-- Repair canonical and legacy Kitchen GRN posting grants.
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r
join public.permissions p on p.permission_code in ('grn.post', 'goods_receiving.post')
where r.role_code in ('kitchen', 'kitchen_staff') and r.status='active' and r.deleted_at is null
on conflict(role_id, permission_id) do nothing;

-- Compliance status/calendar is supervisor-and-above. Sensitive originals
-- remain governed by the separate document permission.
delete from public.role_permissions rp using public.roles r, public.permissions p
where rp.role_id=r.id and rp.permission_id=p.id
and r.role_code in ('outlet_staff','kitchen','kitchen_staff')
and p.permission_code in ('outlet_compliance.read','outlet_compliance.upload','outlet_compliance.document.read');

insert into public.role_permissions(role_id, permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.permission_code='outlet_compliance.read'
where r.role_code='outlet_supervisor' and r.status='active' and r.deleted_at is null
on conflict(role_id,permission_id) do nothing;

delete from public.role_permissions rp using public.roles r, public.permissions p
where rp.role_id=r.id and rp.permission_id=p.id and r.role_code='outlet_supervisor'
and p.permission_code in ('outlet_compliance.upload','outlet_compliance.document.read');

-- Bound weekly review reads as the number of outlets and staff-day rows grows.
create index if not exists daily_attendance_review_scope_idx
on public.daily_attendance_results(company_id, work_date, branch_id, staff_id, created_at)
where is_current;

create index if not exists daily_attendance_review_statuses_idx
on public.daily_attendance_results using gin(statuses)
where is_current;

notify pgrst, 'reload schema';
