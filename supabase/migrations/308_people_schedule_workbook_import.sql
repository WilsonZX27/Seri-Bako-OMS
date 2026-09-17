-- People Operations may validate and import company schedule workbooks into
-- drafts. Submission and publication remain separate permissions.
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in ('schedule.read', 'schedule.draft')
where r.role_code = 'people_operations'
  and r.status = 'active'
  and r.deleted_at is null
on conflict do nothing;
