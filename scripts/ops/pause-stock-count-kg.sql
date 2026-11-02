-- Run only after approval: psql --single-transaction -v ON_ERROR_STOP=1 -f this_file
-- Keep the matching UI/read panel, all evidence, snapshots and original posting guards.
revoke execute on function public.save_stock_count_kg_draft(uuid,jsonb), public.post_stock_count_verified_lines(uuid,uuid[]), public.save_stock_count_weight_review(uuid,jsonb) from public,anon,authenticated,service_role;
create or replace function public.stock_count_kg_emergency_read_only() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
begin raise exception 'KG_WRITE_PAUSED: Weight evidence is temporarily read-only. Existing evidence is retained.'; end $$;
revoke all on function public.stock_count_kg_emergency_read_only() from public,anon,authenticated,service_role;
drop trigger if exists stock_count_kg_emergency_pause on public.stock_count_kg_measurements;
create trigger stock_count_kg_emergency_pause before insert or update or delete on public.stock_count_kg_measurements for each row execute function public.stock_count_kg_emergency_read_only();
drop trigger if exists stock_count_kg_emergency_pause on public.stock_count_kg_reviews;
create trigger stock_count_kg_emergency_pause before insert or update or delete on public.stock_count_kg_reviews for each row execute function public.stock_count_kg_emergency_read_only();
notify pgrst,'reload schema';
