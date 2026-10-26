-- Pending; operator must set only the explicitly approved tenant for this transaction.
-- No create/update/delete/import grants and no all-company permission update.
do $$ declare tenant uuid:=nullif(current_setting('oms.target_company_id',true),'')::uuid;
begin
 if tenant is null or not exists(select 1 from public.companies where id=tenant) then raise exception 'Set oms.target_company_id to the approved company before granting Manager Items access.';end if;
 insert into public.role_permissions(role_id,permission_id)
 select r.id,p.id from public.roles r join public.permissions p on p.permission_code='items.view'
 where r.company_id=tenant and r.role_code='manager' and r.status='active' and r.deleted_at is null
 on conflict(role_id,permission_id) do nothing;
end $$;
