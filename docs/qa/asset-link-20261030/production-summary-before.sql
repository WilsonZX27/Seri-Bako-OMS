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
