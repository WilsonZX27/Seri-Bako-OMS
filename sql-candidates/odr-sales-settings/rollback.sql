-- Revert matching app integration first. Export immutable preference history before removal.
-- Financial rows and existing save functions are unchanged by either direction.
begin;
drop function public.configure_outlet_sales_channel_settings(bigint,jsonb);
drop function public.get_outlet_sales_channel_settings();
drop table public.outlet_sales_channel_settings_versions;
notify pgrst,'reload schema';
commit;
