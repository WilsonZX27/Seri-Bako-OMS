-- Retire salary/passport entry and exports without deleting historical records.
revoke execute on function public.save_staff_sensitive_employment(uuid,text,numeric) from authenticated;
delete from public.role_permissions rp using public.permissions p
where rp.permission_id = p.id and p.permission_code in ('people.sensitive.read', 'people.sensitive.manage');
notify pgrst, 'reload schema';
