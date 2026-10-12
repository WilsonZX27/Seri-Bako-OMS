-- Existing production eligibility helpers, with the required legacy fixture column.
alter table public.staffs add column employment_end_date date;
CREATE OR REPLACE FUNCTION public.current_staff_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$ select s.id from public.staffs s where s.auth_user_id=auth.uid() and s.status='active' and s.deleted_at is null and (s.employment_end_date is null or s.employment_end_date>=(now() at time zone 'Asia/Kuala_Lumpur')::date) limit 1 $function$;

CREATE OR REPLACE FUNCTION public.current_staff_company_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$ select s.company_id from public.staffs s where s.auth_user_id=auth.uid() and s.status='active' and s.deleted_at is null and (s.employment_end_date is null or s.employment_end_date>=(now() at time zone 'Asia/Kuala_Lumpur')::date) limit 1 $function$;

revoke all on function public.current_staff_id(),public.current_staff_company_id() from public,anon;
grant execute on function public.current_staff_id(),public.current_staff_company_id() to authenticated,service_role;
