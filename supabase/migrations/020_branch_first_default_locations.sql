-- =========================================================
-- Branch-first operations support
-- Keep location-level ledger accuracy while giving each branch
-- a default receiving/counting/wastage/transfer location.
-- =========================================================

alter table public.branches
add column if not exists default_location_id uuid references public.locations(id);

do $$
declare
  branch_row record;
  location_row record;
  default_code text;
begin
  for branch_row in
    select branches.id, branches.company_id, branches.branch_code, branches.default_location_id
    from public.branches as branches
    where branches.deleted_at is null
  loop
    select locations.*
    into location_row
    from public.locations as locations
    where locations.id = branch_row.default_location_id
      and locations.deleted_at is null
    limit 1;

    if location_row.id is null then
      select locations.*
      into location_row
      from public.locations as locations
      where locations.branch_id = branch_row.id
        and locations.status = 'active'
        and locations.deleted_at is null
      order by locations.location_name
      limit 1;
    end if;

    if location_row.id is null then
      default_code := 'DEF-' || upper(regexp_replace(coalesce(branch_row.branch_code, left(branch_row.id::text, 8)), '[^A-Z0-9]+', '-', 'g'));

      insert into public.locations (
        company_id,
        branch_id,
        location_code,
        location_name,
        location_type,
        status
      )
      values (
        branch_row.company_id,
        branch_row.id,
        default_code,
        'Default Store',
        'dry_store',
        'active'
      )
      on conflict (location_code) do update
      set branch_id = excluded.branch_id,
          company_id = excluded.company_id,
          status = 'active'
      returning * into location_row;
    end if;

    update public.branches as branches
    set default_location_id = location_row.id
    where branches.id = branch_row.id
      and branches.default_location_id is distinct from location_row.id;
  end loop;
end $$;
