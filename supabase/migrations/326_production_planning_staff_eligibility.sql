-- Align planning RPC and RLS helpers with the existing Malaysia-date staff eligibility gate.
-- End dates are inclusive. Existing permissions, role dates, company and route guards remain.
-- CREATE OR REPLACE preserves ACLs; no grant, policy or operational quantity changes.
CREATE OR REPLACE FUNCTION public.planning_manager()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select exists(select 1 from public.staffs s join public.staff_roles sr on sr.staff_id=s.id
 join public.roles r on r.id=sr.role_id and r.company_id=s.company_id
 where s.auth_user_id=auth.uid() and s.id=public.current_staff_id() and s.status='active' and s.deleted_at is null
 and sr.is_primary and sr.effective_from<=current_date and (sr.effective_to is null or sr.effective_to>=current_date)
 and (select count(*) from public.staff_roles active_role where active_role.staff_id=s.id and active_role.is_primary and active_role.effective_from<=current_date and (active_role.effective_to is null or active_role.effective_to>=current_date))=1
 and r.status='active' and r.deleted_at is null and r.role_code in ('super_admin','manager'))
$function$;

CREATE OR REPLACE FUNCTION public.planning_branch_access(p_company uuid, p_branch uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select exists(select 1 from public.staffs s join public.branches b on b.id=p_branch and b.company_id=s.company_id
 where s.company_id=p_company and s.auth_user_id=auth.uid() and s.id=public.current_staff_id() and s.status='active' and s.deleted_at is null
 and public.has_permission('production_planning.view') and
 (public.planning_manager() or s.default_branch_id=p_branch or exists(select 1 from public.staff_branches sb where sb.staff_id=s.id and sb.branch_id=p_branch)))
$function$;

CREATE OR REPLACE FUNCTION public.planning_require_manager(p_permission text)
 RETURNS public.staffs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare a public.staffs%rowtype; begin
 select * into a from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null;
 if a.id is null or a.id is distinct from public.current_staff_id() or not public.planning_manager() or not public.has_permission(p_permission) then raise exception 'Manager or Owner permission required: %',p_permission; end if;
 return a;
end $function$;

notify pgrst,'reload schema';
