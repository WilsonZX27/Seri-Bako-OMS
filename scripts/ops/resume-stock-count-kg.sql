-- Run only after approval and incident resolution, with psql --single-transaction.
-- Restore only the three authenticated RPC grants originally present in migration 361.
drop trigger if exists stock_count_kg_emergency_pause on public.stock_count_kg_measurements;
drop trigger if exists stock_count_kg_emergency_pause on public.stock_count_kg_reviews;
drop function if exists public.stock_count_kg_emergency_read_only();
grant execute on function public.save_stock_count_kg_draft(uuid,jsonb), public.post_stock_count_verified_lines(uuid,uuid[]), public.save_stock_count_weight_review(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
