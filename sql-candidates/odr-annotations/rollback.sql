-- Roll back the matching application FIRST. Old save RPCs were never replaced.
begin;
drop function public.save_outlet_daily_record_checked(uuid,uuid,date,text,jsonb,text,bigint,boolean,numeric,jsonb,text);
drop trigger touch_outlet_daily_line_revision on public.outlet_daily_record_lines;
drop function public.touch_outlet_daily_line_revision();
drop trigger bump_outlet_daily_edit_revision on public.outlet_daily_records;
drop function public.bump_outlet_daily_edit_revision();
alter table public.outlet_daily_records drop column edit_revision;
notify pgrst,'reload schema';
commit;
