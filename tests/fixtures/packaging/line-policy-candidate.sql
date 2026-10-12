-- Candidate only: not applied to production.
-- IN and the former correlated EXISTS both admit exactly the visible parent IDs.
alter policy visible_line on public.outlet_daily_record_lines
 using (record_id in (select r.id from public.outlet_daily_records r));
