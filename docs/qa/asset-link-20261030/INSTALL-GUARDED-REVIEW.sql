-- PROPOSAL ONLY: fresh production definition/ACL and ambiguity review required.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.branches IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.asset_locations IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
IF pg_get_functiondef('asset_company_live(uuid)'::regprocedure) IS DISTINCT FROM 'CREATE OR REPLACE FUNCTION public.asset_company_live(p_company uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $function$ select p_company=public.current_staff_company_id() and exists(select 1 from public.asset_import_batches b where b.company_id=p_company and b.state=''live'') $function$
' OR (SELECT proacl::text FROM pg_proc WHERE oid='asset_company_live(uuid)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' THEN RAISE EXCEPTION 'Function/ACL drift'; END IF;
IF pg_get_functiondef('asset_location_access(uuid)'::regprocedure) IS DISTINCT FROM 'CREATE OR REPLACE FUNCTION public.asset_location_access(p_location uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $function$
 select exists(select 1 from public.asset_locations l
 where l.id=p_location and l.company_id=public.current_staff_company_id()
 and public.asset_company_live(l.company_id) and public.has_permission(''assets.view'')
 and (public.current_staff_has_company_role(array[''super_admin'']) or
 (l.kind=''branch'' and exists(select 1 from public.staffs s
 where s.id=public.current_staff_id() and s.company_id=l.company_id
 and (s.default_branch_id=l.branch_id or exists(select 1 from public.staff_branches sb where sb.staff_id=s.id and sb.branch_id=l.branch_id))))))
$function$
' OR (SELECT proacl::text FROM pg_proc WHERE oid='asset_location_access(uuid)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' THEN RAISE EXCEPTION 'Function/ACL drift'; END IF;
IF pg_get_functiondef('asset_location_company_guard()'::regprocedure) IS DISTINCT FROM 'CREATE OR REPLACE FUNCTION public.asset_location_company_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''pg_catalog'', ''public''
AS $function$ begin
 if new.branch_id is not null and not exists(select 1 from public.branches b where b.id=new.branch_id and b.company_id=new.company_id) then raise exception ''Asset branch company mismatch''; end if;
 return new; end $function$
' OR (SELECT proacl::text FROM pg_proc WHERE oid='asset_location_company_guard()'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' THEN RAISE EXCEPTION 'Function/ACL drift'; END IF;
IF pg_get_functiondef('get_asset_checklist_summary(date)'::regprocedure) IS DISTINCT FROM 'CREATE OR REPLACE FUNCTION public.get_asset_checklist_summary(p_date date DEFAULT ((now() AT TIME ZONE ''Asia/Kuala_Lumpur''::text))::date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''pg_catalog'', ''public''
AS $function$
 select jsonb_build_object(''checkDate'',p_date,''checklist'',coalesce((select jsonb_agg(jsonb_build_object(
 ''id'',l.id,''name'',l.source_name,''kind'',l.kind,
 ''open'',coalesce((select d.is_open from public.asset_calendar_days d where d.location_id=l.id and d.business_date=p_date),l.kind=''branch''),
 ''reason'',(select d.reason from public.asset_calendar_days d where d.location_id=l.id and d.business_date=p_date),
 ''expected'',(select count(*) from public.asset_holdings h where h.location_id=l.id and (h.quantity is null or h.quantity>0)),
 ''checked'',(select count(*) from public.asset_holdings h where h.location_id=l.id and (h.quantity is null or h.quantity>0) and exists(select 1 from public.asset_daily_checks c where c.location_id=l.id and c.asset_id=h.asset_id and c.check_date=p_date))) order by l.source_name) from public.asset_locations l),''[]''::jsonb))
$function$
' OR (SELECT proacl::text FROM pg_proc WHERE oid='get_asset_checklist_summary(date)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' THEN RAISE EXCEPTION 'Function/ACL drift'; END IF;
IF (SELECT count(*) FROM pg_trigger WHERE tgrelid IN ('public.branches'::regclass,'public.asset_locations'::regclass) AND NOT tgisinternal)<>3 OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid IN ('public.branches'::regclass,'public.asset_locations'::regclass) AND NOT tgisinternal AND pg_get_triggerdef(oid) NOT IN ('CREATE TRIGGER branches_refresh_stock_balances_summary AFTER UPDATE OF branch_name, company_id ON public.branches FOR EACH ROW EXECUTE FUNCTION refresh_stock_balances_summary_from_branch()','CREATE TRIGGER set_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION set_updated_at()','CREATE TRIGGER asset_location_company BEFORE INSERT OR UPDATE ON public.asset_locations FOR EACH ROW EXECUTE FUNCTION asset_location_company_guard()')) THEN RAISE EXCEPTION 'Trigger drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_policies p WHERE to_jsonb(p)='{"cmd": "SELECT", "qual": "((company_id = ( SELECT current_staff_company_id() AS current_staff_company_id)) AND (location_id IN ( SELECT asset_locations.id\n   FROM asset_locations)))", "roles": ["authenticated"], "tablename": "asset_calendar_days", "permissive": "PERMISSIVE", "policyname": "asset_calendar_read", "schemaname": "public", "with_check": null}'::jsonb) THEN RAISE EXCEPTION 'RLS policy drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_policies p WHERE to_jsonb(p)='{"cmd": "SELECT", "qual": "((company_id = ( SELECT current_staff_company_id() AS current_staff_company_id)) AND (location_id IN ( SELECT asset_locations.id\n   FROM asset_locations)))", "roles": ["authenticated"], "tablename": "asset_daily_checks", "permissive": "PERMISSIVE", "policyname": "asset_checks_read", "schemaname": "public", "with_check": null}'::jsonb) THEN RAISE EXCEPTION 'RLS policy drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_policies p WHERE to_jsonb(p)='{"cmd": "SELECT", "qual": "((company_id = ( SELECT current_staff_company_id() AS current_staff_company_id)) AND (location_id IN ( SELECT asset_locations.id\n   FROM asset_locations)))", "roles": ["authenticated"], "tablename": "asset_holdings", "permissive": "PERMISSIVE", "policyname": "asset_holdings_read", "schemaname": "public", "with_check": null}'::jsonb) THEN RAISE EXCEPTION 'RLS policy drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_policies p WHERE to_jsonb(p)='{"cmd": "SELECT", "qual": "asset_location_access(id)", "roles": ["authenticated"], "tablename": "asset_locations", "permissive": "PERMISSIVE", "policyname": "asset_locations_read", "schemaname": "public", "with_check": null}'::jsonb) THEN RAISE EXCEPTION 'RLS policy drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_policies p WHERE to_jsonb(p)='{"cmd": "INSERT", "qual": null, "roles": ["authenticated"], "tablename": "branches", "permissive": "PERMISSIVE", "policyname": "tenant branches insert", "schemaname": "public", "with_check": "((company_id = current_staff_company_id()) AND has_permission(''branches.create''::text))"}'::jsonb) THEN RAISE EXCEPTION 'RLS policy drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_policies p WHERE to_jsonb(p)='{"cmd": "SELECT", "qual": "(can_access_company_branch(company_id, id) AND has_any_permission(ARRAY[''branches.read''::text, ''branches.create''::text, ''branches.update''::text]))", "roles": ["authenticated"], "tablename": "branches", "permissive": "PERMISSIVE", "policyname": "tenant branches read", "schemaname": "public", "with_check": null}'::jsonb) THEN RAISE EXCEPTION 'RLS policy drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_policies p WHERE to_jsonb(p)='{"cmd": "UPDATE", "qual": "((company_id = current_staff_company_id()) AND has_permission(''branches.update''::text))", "roles": ["authenticated"], "tablename": "branches", "permissive": "PERMISSIVE", "policyname": "tenant branches update", "schemaname": "public", "with_check": "((company_id = current_staff_company_id()) AND has_permission(''branches.update''::text))"}'::jsonb) THEN RAISE EXCEPTION 'RLS policy drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_policies p WHERE to_jsonb(p)='{"cmd": "SELECT", "qual": "((company_id = current_staff_company_id()) AND (branch_type = ''outlet''::branch_type) AND has_permission(''outlet_daily_record.view_all''::text))", "roles": ["authenticated"], "tablename": "branches", "permissive": "PERMISSIVE", "policyname": "tenant kitchen outlet branches read", "schemaname": "public", "with_check": null}'::jsonb) THEN RAISE EXCEPTION 'RLS policy drift'; END IF;
IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename IN ('branches','asset_locations','asset_calendar_days','asset_holdings','asset_daily_checks'))<>8 THEN RAISE EXCEPTION 'RLS policy count drift'; END IF;
IF (SELECT array_agg(b.id ORDER BY b.id) FROM public.branches b WHERE b.status='active' AND b.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM public.asset_locations l WHERE l.company_id=b.company_id AND l.branch_id=b.id)) IS DISTINCT FROM ARRAY['3c27501e-df41-416f-8984-bca8c9d8f98d'::uuid,'f78628b7-4b4f-4f75-b1e9-a777d7b61b87'::uuid] THEN RAISE EXCEPTION 'Missing-link manifest drift'; END IF;
 IF EXISTS(SELECT 1 FROM public.asset_locations WHERE branch_id IS NOT NULL GROUP BY company_id,branch_id HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Duplicate branch mappings: review without merging or deleting'; END IF;
 IF EXISTS(SELECT 1 FROM public.asset_locations l JOIN public.branches b ON b.id=l.branch_id WHERE l.company_id<>b.company_id) THEN
  RAISE EXCEPTION 'Cross-company mapping'; END IF;
 IF EXISTS(SELECT 1 FROM public.branches b JOIN public.asset_locations l ON l.company_id=b.company_id AND lower(trim(l.source_name))=lower(trim(b.branch_name))
 WHERE b.status='active' AND b.deleted_at IS NULL AND l.branch_id IS DISTINCT FROM b.id
 AND NOT EXISTS(SELECT 1 FROM public.asset_locations x WHERE x.company_id=b.company_id AND x.branch_id=b.id)) THEN
  RAISE EXCEPTION 'Unmapped branch has ambiguous existing name: explicit ID review required'; END IF;
END $$;
ALTER TABLE public.asset_locations ADD COLUMN branch_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.asset_locations ADD COLUMN checklist_enabled boolean NOT NULL DEFAULT true;
UPDATE public.asset_locations l SET branch_active=(b.status='active' AND b.deleted_at IS NULL) FROM public.branches b WHERE b.id=l.branch_id AND b.company_id=l.company_id;
-- Preserve existing eligibility. Newly linked office/other locations require explicit scheduling.
CREATE UNIQUE INDEX asset_locations_company_branch_unique ON public.asset_locations(company_id,branch_id) WHERE branch_id IS NOT NULL;

-- Trigger only: no callable RPC and no new grants. Original branch write RLS remains.
CREATE FUNCTION public.link_branch_asset_location() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.branch_type='office' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.company_id IS DISTINCT FROM OLD.company_id AND EXISTS(
  SELECT 1 FROM public.asset_locations WHERE branch_id=OLD.id) THEN
  RAISE EXCEPTION 'A linked branch cannot move company'; END IF;
 UPDATE public.asset_locations SET branch_active=(NEW.status='active' AND NEW.deleted_at IS NULL) WHERE company_id=NEW.company_id AND branch_id=NEW.id;
 IF NEW.status<>'active' OR NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
 IF EXISTS(SELECT 1 FROM public.asset_locations WHERE company_id=NEW.company_id AND branch_id=NEW.id) THEN RETURN NEW; END IF;
 -- Match only by stable ID. Never claim or merge a similarly named location.
 IF EXISTS(SELECT 1 FROM public.asset_locations WHERE company_id=NEW.company_id AND lower(trim(source_name))=lower(trim(NEW.branch_name))) THEN
  RAISE EXCEPTION 'Asset location name requires explicit branch ID reconciliation'; END IF;
 INSERT INTO public.asset_locations(company_id,branch_id,kind,source_name,checklist_enabled)
 VALUES(NEW.company_id,NEW.id,'branch',NEW.branch_name,NEW.branch_type IN ('outlet','central_kitchen','event_booth'))
 ON CONFLICT(company_id,branch_id) WHERE branch_id IS NOT NULL DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.link_branch_asset_location() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER link_branch_asset_location AFTER INSERT OR UPDATE OF company_id,branch_name,status,deleted_at ON public.branches
 FOR EACH ROW EXECUTE FUNCTION public.link_branch_asset_location();
-- Retain existing IDs, aliases, holdings and all history. Seed only missing links.
INSERT INTO public.asset_locations(company_id,branch_id,kind,source_name,checklist_enabled)
SELECT b.company_id,b.id,'branch',b.branch_name,b.branch_type IN ('outlet','central_kitchen','event_booth') FROM public.branches b
WHERE b.status='active' AND b.deleted_at IS NULL AND b.branch_type<>'office'
AND NOT EXISTS(SELECT 1 FROM public.asset_locations l WHERE l.company_id=b.company_id AND l.branch_id=b.id)
ON CONFLICT(company_id,branch_id) WHERE branch_id IS NOT NULL DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_asset_checklist_summary(p_date date DEFAULT ((now() AT TIME ZONE 'Asia/Kuala_Lumpur'::text))::date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 select jsonb_build_object('checkDate',p_date,'checklist',coalesce((select jsonb_agg(jsonb_build_object(
 'id',l.id,'name',l.source_name,'kind',l.kind,
 'open',coalesce((select d.is_open from public.asset_calendar_days d where d.location_id=l.id and d.business_date=p_date),l.kind='branch'),
 'reason',(select d.reason from public.asset_calendar_days d where d.location_id=l.id and d.business_date=p_date),
 'expected',(select count(*) from public.asset_holdings h where h.location_id=l.id and (h.quantity is null or h.quantity>0)),
 'checked',(select count(*) from public.asset_holdings h where h.location_id=l.id and (h.quantity is null or h.quantity>0) and exists(select 1 from public.asset_daily_checks c where c.location_id=l.id and c.asset_id=h.asset_id and c.check_date=p_date))) order by l.source_name) from public.asset_locations l where ((l.kind='branch' and l.branch_active and l.checklist_enabled) or (l.kind in ('event','other') and exists(select 1 from public.asset_calendar_days d where d.location_id=l.id and d.business_date=p_date and d.is_open)))),'[]'::jsonb))
$function$
;
COMMIT;
