-- Compliance and calendar are management-only. Revoke grants used by older roles.
delete from public.role_permissions rp using public.roles r, public.permissions p
where rp.role_id = r.id and rp.permission_id = p.id
  and r.role_code in ('outlet_staff', 'outlet_supervisor')
  and p.permission_code in ('outlet_compliance.read', 'outlet_compliance.upload',
                            'outlet_compliance.document.read', 'outlet_compliance.manage',
                            'outlet_compliance.review');
notify pgrst, 'reload schema';
