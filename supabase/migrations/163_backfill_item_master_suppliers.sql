-- Alma stock-take categories carry the supplier code/name for many imported
-- items. Fill only deterministic, unique matches; ambiguous categories stay
-- unconfigured for an explicit purchasing decision.

with candidates as (
  select
    i.id as item_id,
    s.id as supplier_id,
    count(*) over (partition by i.id) as candidate_count,
    row_number() over (
      partition by i.id
      order by case
        when regexp_replace(lower(trim(coalesce(s.supplier_code, ''))), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(trim(coalesce(i.category, ''))), '[^a-z0-9]+', '', 'g') then 0
        else 1
      end, s.id
    ) as candidate_rank
  from public.items i
  join public.suppliers s
    on s.status = 'active'
   and (
     regexp_replace(lower(trim(coalesce(s.supplier_code, ''))), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(trim(coalesce(i.category, ''))), '[^a-z0-9]+', '', 'g')
     or regexp_replace(lower(trim(coalesce(s.name, ''))), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(trim(coalesce(i.category, ''))), '[^a-z0-9]+', '', 'g')
   )
  where i.supplier_id is null
    and i.status = 'active'
    and i.deleted_at is null
    and nullif(regexp_replace(lower(trim(coalesce(i.category, ''))), '[^a-z0-9]+', '', 'g'), '') is not null
)
update public.items i
set supplier_id = candidates.supplier_id,
    updated_at = now()
from candidates
where i.id = candidates.item_id
  and candidates.candidate_rank = 1
  and candidates.candidate_count = 1;
