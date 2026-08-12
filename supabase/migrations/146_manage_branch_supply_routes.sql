-- Manage Central Kitchen -> outlet ownership from Branches / Outlets.
create or replace function public.replace_branch_supply_routes(p_branch_id uuid, p_related_branch_ids uuid[] default '{}'::uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare actor public.staffs%rowtype; target public.branches%rowtype; related_ids uuid[]; related_id uuid;
begin
  select * into actor from public.staffs where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null then raise exception 'Active staff access is required.'; end if;
  if not public.has_permission('branches.update') then raise exception 'Missing permission: branches.update'; end if;
  select * into target from public.branches where id = p_branch_id and company_id = actor.company_id and status = 'active' and deleted_at is null for update;
  if target.id is null then raise exception 'Active branch was not found in your company.'; end if;
  select coalesce(array_agg(distinct value), '{}'::uuid[]) into related_ids from unnest(coalesce(p_related_branch_ids, '{}'::uuid[])) selected(value);
  if cardinality(related_ids) > 200 then raise exception 'Select up to 200 outlets at a time.'; end if;

  if target.branch_type = 'outlet' then
    if cardinality(related_ids) <> 1 then raise exception 'An outlet must have exactly one Primary Central Kitchen.'; end if;
    related_id := related_ids[1];
    if not exists (select 1 from public.branches source where source.id = related_id and source.company_id = actor.company_id and source.branch_type = 'central_kitchen' and source.status = 'active' and source.deleted_at is null) then
      raise exception 'Select an active Central Kitchen from your company.';
    end if;
    update public.branch_supply_routes set status = 'inactive', effective_to = current_date, updated_by = actor.id, updated_at = now()
    where company_id = actor.company_id and destination_branch_id = target.id and status = 'active' and effective_to is null and source_branch_id <> related_id;
    insert into public.branch_supply_routes (company_id, source_branch_id, destination_branch_id, is_primary, status, effective_from, effective_to, created_by, updated_by)
    values (actor.company_id, related_id, target.id, true, 'active', current_date, null, actor.id, actor.id)
    on conflict (company_id, source_branch_id, destination_branch_id) do update set is_primary = true, status = 'active', effective_from = current_date, effective_to = null, updated_by = actor.id, updated_at = now();
  elsif target.branch_type = 'central_kitchen' then
    if exists (select 1 from unnest(related_ids) selected(id) left join public.branches outlet on outlet.id = selected.id and outlet.company_id = actor.company_id and outlet.branch_type = 'outlet' and outlet.status = 'active' and outlet.deleted_at is null where outlet.id is null) then
      raise exception 'Every selected destination must be an active outlet in your company.';
    end if;
    update public.branch_supply_routes set status = 'inactive', effective_to = current_date, updated_by = actor.id, updated_at = now()
    where company_id = actor.company_id and source_branch_id = target.id and status = 'active' and effective_to is null and not (destination_branch_id = any(related_ids));
    foreach related_id in array related_ids loop
      update public.branch_supply_routes set status = 'inactive', effective_to = current_date, updated_by = actor.id, updated_at = now()
      where company_id = actor.company_id and destination_branch_id = related_id and source_branch_id <> target.id and status = 'active' and effective_to is null;
      insert into public.branch_supply_routes (company_id, source_branch_id, destination_branch_id, is_primary, status, effective_from, effective_to, created_by, updated_by)
      values (actor.company_id, target.id, related_id, true, 'active', current_date, null, actor.id, actor.id)
      on conflict (company_id, source_branch_id, destination_branch_id) do update set is_primary = true, status = 'active', effective_from = current_date, effective_to = null, updated_by = actor.id, updated_at = now();
    end loop;
  else raise exception 'Supply routes can only be managed for outlets or Central Kitchens.';
  end if;
end $$;
revoke all on function public.replace_branch_supply_routes(uuid, uuid[]) from public, anon;
grant execute on function public.replace_branch_supply_routes(uuid, uuid[]) to authenticated;
notify pgrst, 'reload schema';
