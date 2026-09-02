-- Ensure every Outlet Supervisor can enter the OMS and receives the complete
-- Outlet Staff baseline in addition to branch-scoped scheduling permissions.
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in (
  'dashboard.view',
  'outlet_daily_record.view', 'outlet_daily_record.create', 'outlet_daily_record.update',
  'outlet_compliance.read', 'outlet_compliance.upload',
  'schedule.read', 'schedule.draft', 'schedule.submit', 'schedule.request', 'schedule.swap_review',
  'attendance.read', 'attendance.review'
)
where r.role_code = 'outlet_supervisor'
  and r.status = 'active'
  and r.deleted_at is null
on conflict do nothing;

notify pgrst, 'reload schema';
