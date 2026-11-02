-- Roll back the matching app first. Retain/export snapshot and settings versions if historical labels must remain reproducible.
begin;
drop function public.save_outlet_daily_record_with_sales_channels(uuid,uuid,date,text,jsonb,text,bigint,boolean,numeric,jsonb,text,bigint);
drop function public.get_outlet_sales_channel_settings_revision(bigint);
drop trigger guard_outlet_sales_settings_snapshot on public.outlet_daily_records;
drop function public.guard_outlet_sales_settings_snapshot();
alter table public.outlet_daily_records drop column sales_channel_settings_revision;
alter table public.outlet_sales_channel_settings_versions drop column id;
notify pgrst,'reload schema';
commit;
