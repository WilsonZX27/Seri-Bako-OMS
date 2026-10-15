-- Forward correction of verified production drift in 343/344.
-- Keep migration 345 eligibility validation and historical migration records unchanged.
-- Validate the original editor version before any source or destination writes.
-- Preserve the existing function signature, permissions, row lock and workflow rules.
-- Any validation/submission failure rolls back destination projections as well.
create or replace function public.submit_schedule_week_atomic(
  p_branch_id uuid,
  p_week_start date,
  p_assignments jsonb,
  p_expected_updated_at timestamptz default null,
  p_comment text default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  current_week public.schedule_weeks;
  saved_week public.schedule_weeks;
  submitted_week public.schedule_weeks;
  validation jsonb;
begin
  if not public.has_permission('schedule.submit') or not public.has_permission('schedule.draft') then
    raise exception 'Schedule submission is not authorised.';
  end if;
  select * into current_week from public.schedule_weeks
   where company_id=public.current_staff_company_id() and branch_id=p_branch_id and week_start=p_week_start
   order by revision desc limit 1 for update;
  if current_week.id is not null and p_expected_updated_at is not null and current_week.updated_at<>p_expected_updated_at then
    raise exception 'Schedule changed since it was opened.';
  end if;
  saved_week := public.save_schedule_week_with_destinations(p_branch_id,p_week_start,p_assignments);
  validation:=public.validate_schedule_week(saved_week.id);
  if jsonb_array_length(coalesce(validation->'blockers','[]'::jsonb))>0 then
    raise exception '%',coalesce(validation->'blockers'->0->>'message','Schedule validation failed.');
  end if;
  submitted_week := public.submit_schedule_week(saved_week.id,p_comment);
  return jsonb_build_object('week',to_jsonb(submitted_week),'warnings',coalesce(validation->'warnings','[]'::jsonb));
end $$;

-- Explicit on-order products do not create recurring daily production demand.
alter table public.production_batch_rules drop constraint production_batch_rules_forecast_basis_check;
alter table public.production_batch_rules add constraint production_batch_rules_forecast_basis_check check(forecast_basis in ('same_day','manual','on_order'));
