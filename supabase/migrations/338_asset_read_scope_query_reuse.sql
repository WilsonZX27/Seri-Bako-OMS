-- Preserve the same live/company/location read scope, evaluating accessible
-- locations as a statement subquery instead of repeating staff/role lookups
-- for every historical row. Mutation functions retain asset_location_access.
alter policy asset_holdings_read on public.asset_holdings using (
 company_id=(select public.current_staff_company_id())
 and location_id in (select id from public.asset_locations)
);
alter policy asset_maintenance_read on public.asset_maintenance using (
 company_id=(select public.current_staff_company_id())
 and location_id in (select id from public.asset_locations)
);
alter policy asset_checks_read on public.asset_daily_checks using (
 company_id=(select public.current_staff_company_id())
 and location_id in (select id from public.asset_locations)
);
alter policy asset_calendar_read on public.asset_calendar_days using (
 company_id=(select public.current_staff_company_id())
 and location_id in (select id from public.asset_locations)
);
alter policy asset_transfers_read on public.asset_transfers using (
 company_id=(select public.current_staff_company_id())
 and (from_location_id in (select id from public.asset_locations)
      or to_location_id in (select id from public.asset_locations))
);
alter policy assets_read on public.assets using (
 company_id=(select public.current_staff_company_id())
 and (select public.asset_company_live(public.current_staff_company_id()))
 and (select public.has_permission('assets.view'))
 and ((select public.has_permission('assets.view_all'))
      or id in (select asset_id from public.asset_holdings)
      or id in (select asset_id from public.asset_transfers))
);
