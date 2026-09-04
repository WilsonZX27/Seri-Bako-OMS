-- Outlet Daily Records are posted operational records, not approval documents.
-- Preserve review actor/time and activity history while returning legacy rows
-- to the editable posted state.

update public.outlet_daily_records
set status = 'evening_completed',
    updated_at = now()
where status = 'reviewed';

create or replace function public.prevent_outlet_daily_review_status()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'reviewed' then
    raise exception 'Outlet Daily Records use Posted; review approval is not part of this workflow.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_outlet_daily_review_status on public.outlet_daily_records;
create trigger trg_prevent_outlet_daily_review_status
before insert or update of status on public.outlet_daily_records
for each row execute function public.prevent_outlet_daily_review_status();
