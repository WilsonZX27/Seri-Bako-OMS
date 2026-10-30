-- Preserve all generated locations, holdings and history. Only stop automatic linking and restore summary.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.branches IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
IF md5(pg_get_functiondef('get_asset_checklist_summary(date)'::regprocedure))<>'0e4505f08eca14de6e93d24a605ffebe' OR md5(pg_get_functiondef('link_branch_asset_location()'::regprocedure))<>'bfa2cae6386c7ea1d9611c56f11e538d' OR (SELECT md5(pg_get_triggerdef(oid)) FROM pg_trigger WHERE tgname='link_branch_asset_location' AND tgrelid='public.branches'::regclass) IS DISTINCT FROM '58a6abbd8162e2860551d89da14090e0' THEN RAISE EXCEPTION 'Installed definition drift: recovery stopped'; END IF;
IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='asset_locations' AND column_name='checklist_enabled') THEN RAISE EXCEPTION 'Expected installed schema absent'; END IF;
END $$;
DROP TRIGGER link_branch_asset_location ON public.branches;
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
 'checked',(select count(*) from public.asset_holdings h where h.location_id=l.id and (h.quantity is null or h.quantity>0) and exists(select 1 from public.asset_daily_checks c where c.location_id=l.id and c.asset_id=h.asset_id and c.check_date=p_date))) order by l.source_name) from public.asset_locations l),'[]'::jsonb))
$function$
;
COMMIT;
