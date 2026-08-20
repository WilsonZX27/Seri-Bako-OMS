-- Preserve item identity when an AutoCount-ready item exactly matches a
-- soft-deleted master that is still referenced by an active supplier mapping.
-- Ambiguous or non-exact matches remain untouched and continue to fail closed.

with recoverable_items as (
  select distinct item.id
  from public.items item
  join public.supplier_items supplier_item
    on supplier_item.company_id = item.company_id
   and supplier_item.item_id = item.id
   and supplier_item.status = 'active'
   and supplier_item.deleted_at is null
  join public.autocount_import_jobs job
    on job.company_id = item.company_id
   and job.id = '620fbc6a-0ad1-4f26-aa43-d38987251d8b'::uuid
   and job.status = 'ready'
  join public.autocount_import_rows staged
    on staged.job_id = job.id
   and staged.company_id = item.company_id
   and staged.entity_type = 'item'
   and lower(trim(staged.normalized->>'item_code')) = lower(trim(item.item_code))
  where item.deleted_at is not null
    and coalesce((staged.normalized->>'active')::boolean, true)
    and lower(trim(staged.normalized->>'item_name')) = lower(trim(item.item_name))
    and lower(trim(staged.normalized->>'base_uom')) = lower(trim(item.base_unit))
    and not exists (
      select 1
      from public.items live_item
      where live_item.company_id = item.company_id
        and live_item.deleted_at is null
        and lower(trim(live_item.item_code)) = lower(trim(item.item_code))
    )
)
update public.items item
set deleted_at = null,
    status = 'active',
    updated_at = now()
where item.id in (select id from recoverable_items);

notify pgrst, 'reload schema';
