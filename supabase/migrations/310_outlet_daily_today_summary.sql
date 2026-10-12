-- Keep the Outlet Daily list's today rail independent of page hydration.
-- Security invoker preserves the existing record, line and product RLS scope.

create or replace function public.get_outlet_daily_today_summary(p_record_date date)
returns table(
  today_records bigint,
  today_sent numeric,
  today_received numeric,
  today_received_unavailable bigint,
  today_received_zero_with_sent bigint,
  missing_evening bigint,
  ready_to_post bigint,
  posted_today bigint
)
language sql
stable
set search_path = public
as $$
  with visible_records as (
    select r.id, r.status
    from public.outlet_daily_records r
    where r.record_date = p_record_date
      and r.status <> 'void'
  ),
  sent_by_record as (
    select
      r.id,
      count(l.id) as line_count,
      bool_and(
        l.id is not null
        and (l.qty_sent_source = 'authorized_confirmed' or l.qty_sent_confirmed)
      ) as sent_verified,
      coalesce(sum(l.qty_sent), 0) as sent
    from visible_records r
    left join public.outlet_daily_record_lines l on l.record_id = r.id
    group by r.id
  ),
  received_by_record as (
    select
      r.id,
      count(l.id) as line_count,
      bool_and(coalesce(l.morning_received_provided, false)) as received_verified,
      coalesce(sum(l.morning_received_qty), 0) as received
    from visible_records r
    left join public.outlet_daily_record_lines l on l.record_id = r.id
    join public.products p on p.id = l.product_id
      and lower(trim(coalesce(p.category, ''))) <> 'packaging'
    group by r.id
  ),
  per_record as (
    select
      r.id,
      r.status,
      case when s.line_count > 0 and s.sent_verified then s.sent else null end as total_sent,
      case when coalesce(v.line_count, 0) > 0 and v.received_verified then v.received else null end as total_received
    from visible_records r
    left join sent_by_record s on s.id = r.id
    left join received_by_record v on v.id = r.id
  )
  select
    count(*)::bigint as today_records,
    case
      when count(*) = 0 then 0::numeric
      when bool_and(total_sent is not null) then coalesce(sum(total_sent), 0)
      else null
    end as today_sent,
    case
      when count(*) > 0 and bool_and(total_received is not null) then coalesce(sum(total_received), 0)
      else null
    end as today_received,
    count(*) filter (where total_received is null)::bigint as today_received_unavailable,
    count(*) filter (where total_received = 0 and total_sent > 0)::bigint as today_received_zero_with_sent,
    count(*) filter (where status in ('draft', 'morning_recorded'))::bigint as missing_evening,
    count(*) filter (where status = 'evening_completed')::bigint as ready_to_post,
    count(*) filter (where status = 'reviewed')::bigint as posted_today
  from per_record;
$$;

revoke all on function public.get_outlet_daily_today_summary(date) from public, anon;
grant execute on function public.get_outlet_daily_today_summary(date) to authenticated;

notify pgrst, 'reload schema';
