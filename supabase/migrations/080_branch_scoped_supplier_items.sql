-- Branch-scoped supplier-item assignments without rewriting historical commercial relationships.

alter table public.supplier_items
  add constraint supplier_items_id_item_unique unique (id, item_id);

create table public.branch_supplier_items (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  supplier_item_id uuid not null,
  item_id uuid not null references public.items(id) on delete restrict,
  is_preferred boolean not null default false,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.staffs(id) on delete set null,
  updated_by uuid references public.staffs(id) on delete set null,
  deleted_at timestamptz,
  constraint branch_supplier_items_relationship_fk
    foreign key (supplier_item_id, item_id) references public.supplier_items(id, item_id) on delete restrict,
  constraint branch_supplier_items_branch_relationship_unique unique (branch_id, supplier_item_id)
);

create unique index branch_supplier_items_one_preferred_idx
  on public.branch_supplier_items(branch_id, item_id)
  where is_preferred and status = 'active' and deleted_at is null;
create index branch_supplier_items_branch_item_idx
  on public.branch_supplier_items(branch_id, item_id, status) where deleted_at is null;
create index branch_supplier_items_relationship_idx
  on public.branch_supplier_items(supplier_item_id);

create trigger set_branch_supplier_items_updated_at
before update on public.branch_supplier_items
for each row execute function public.set_updated_at();

alter table public.branch_supplier_items enable row level security;

create policy "branch supplier mappings scoped read" on public.branch_supplier_items
for select to authenticated using (
  public.has_any_permission(array['supplier_items.read', 'supplier_items.view', 'purchase_request.create', 'pr.create', 'purchase_order.create', 'po.create'])
  and exists (
    select 1 from public.branches b
    where b.id = branch_supplier_items.branch_id
      and public.can_access_inventory_branch(b.company_id, b.id)
  )
);

revoke insert, update, delete on public.branch_supplier_items from authenticated;
grant select on public.branch_supplier_items to authenticated;

create or replace function public.save_branch_supplier_item_mappings(p_rows jsonb, p_mode text default 'upsert')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  mapping jsonb;
  target_branch public.branches%rowtype;
  relationship public.supplier_items%rowtype;
  current_mapping public.branch_supplier_items%rowtype;
  imported_count integer := 0;
  updated_count integer := 0;
begin
  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_any_permission(array['supplier_items.create', 'supplier_items.update']) then
    raise exception 'You do not have permission to manage branch supplier mappings.';
  end if;
  if p_mode not in ('create', 'update', 'upsert') then raise exception 'Invalid mapping import mode.'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 500 then
    raise exception 'Branch supplier mapping import must contain between 1 and 500 rows.';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_rows) as r(branch_id uuid, supplier_item_id uuid)
    group by r.branch_id, r.supplier_item_id having count(*) > 1
  ) then raise exception 'The import contains duplicate branch and supplier-item mappings.'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_rows) as r(branch_id uuid, item_id uuid, is_preferred boolean, status text)
    where coalesce(r.is_preferred, false) and coalesce(r.status, 'active') = 'active'
    group by r.branch_id, r.item_id having count(*) > 1
  ) then raise exception 'Only one preferred supplier is allowed for each branch and item.'; end if;

  for mapping in select value from jsonb_array_elements(p_rows) loop
    select * into target_branch from public.branches
    where id = (mapping->>'branch_id')::uuid and status = 'active' and deleted_at is null;
    if target_branch.id is null or target_branch.company_id is distinct from actor.company_id
      or not public.can_access_inventory_branch(target_branch.company_id, target_branch.id) then
      raise exception 'Invalid or unauthorized branch mapping.';
    end if;
    select * into relationship from public.supplier_items
    where id = (mapping->>'supplier_item_id')::uuid
      and item_id = (mapping->>'item_id')::uuid
      and status = 'active' and deleted_at is null;
    if relationship.id is null then raise exception 'Invalid or inactive supplier-item relationship.'; end if;
    if not exists (select 1 from public.suppliers where id = relationship.supplier_id and status = 'active' and deleted_at is null) then
      raise exception 'The mapped supplier is inactive.';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(target_branch.id::text || ':' || relationship.item_id::text, 0));
    select * into current_mapping from public.branch_supplier_items
    where branch_id = target_branch.id and supplier_item_id = relationship.id for update;
    if p_mode = 'create' and current_mapping.id is not null then raise exception 'This branch supplier mapping already exists.'; end if;
    if p_mode = 'update' and current_mapping.id is null then raise exception 'No branch supplier mapping exists for update mode.'; end if;

    if coalesce((mapping->>'is_preferred')::boolean, false) and coalesce(mapping->>'status', 'active') = 'active' then
      update public.branch_supplier_items
      set is_preferred = false, updated_by = actor.id
      where branch_id = target_branch.id and item_id = relationship.item_id
        and is_preferred and deleted_at is null
        and (current_mapping.id is null or id <> current_mapping.id);
    end if;

    if current_mapping.id is null then
      insert into public.branch_supplier_items (
        branch_id, supplier_item_id, item_id, is_preferred, status, created_by, updated_by
      ) values (
        target_branch.id, relationship.id, relationship.item_id,
        coalesce((mapping->>'is_preferred')::boolean, false),
        coalesce(mapping->>'status', 'active')::public.record_status, actor.id, actor.id
      );
      imported_count := imported_count + 1;
    else
      update public.branch_supplier_items set
        item_id = relationship.item_id,
        is_preferred = coalesce((mapping->>'is_preferred')::boolean, false),
        status = coalesce(mapping->>'status', 'active')::public.record_status,
        deleted_at = null,
        updated_by = actor.id
      where id = current_mapping.id;
      updated_count := updated_count + 1;
    end if;
  end loop;
  return jsonb_build_object('imported', imported_count, 'updated', updated_count);
end
$$;

revoke all on function public.save_branch_supplier_item_mappings(jsonb, text) from public, anon;
grant execute on function public.save_branch_supplier_item_mappings(jsonb, text) to authenticated;

create or replace function public.validate_purchase_request_supplier_mappings(p_purchase_request_id uuid, p_require_all boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare request_row public.purchase_requests%rowtype;
begin
  select * into request_row from public.purchase_requests where id = p_purchase_request_id and deleted_at is null;
  if request_row.id is null or request_row.branch_id is null then raise exception 'Purchase request branch is required.'; end if;
  if p_require_all and exists (
    select 1 from public.purchase_request_lines where purchase_request_id = request_row.id and suggested_supplier_id is null
  ) then raise exception 'Every item needs a supplier mapped to this branch before the request can continue.'; end if;
  if exists (
    select 1 from public.purchase_request_lines prl
    where prl.purchase_request_id = request_row.id and prl.suggested_supplier_id is not null
      and not exists (
        select 1 from public.branch_supplier_items bsi
        join public.supplier_items si on si.id = bsi.supplier_item_id and si.item_id = bsi.item_id
        join public.suppliers s on s.id = si.supplier_id
        where bsi.branch_id = request_row.branch_id and bsi.item_id = prl.item_id
          and si.supplier_id = prl.suggested_supplier_id
          and bsi.status = 'active' and bsi.deleted_at is null
          and si.status = 'active' and si.deleted_at is null
          and s.status = 'active' and s.deleted_at is null
      )
  ) then raise exception 'A selected supplier is not mapped to this purchase request branch and item.'; end if;
end
$$;

revoke all on function public.validate_purchase_request_supplier_mappings(uuid, boolean) from public, anon, authenticated;

create or replace function public.guard_purchase_request_line_supplier()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_branch_id uuid;
begin
  if new.suggested_supplier_id is null then return new; end if;
  select branch_id into target_branch_id from public.purchase_requests where id = new.purchase_request_id;
  if not exists (
    select 1 from public.branch_supplier_items bsi
    join public.supplier_items si on si.id = bsi.supplier_item_id and si.item_id = bsi.item_id
    join public.suppliers s on s.id = si.supplier_id
    where bsi.branch_id = target_branch_id and bsi.item_id = new.item_id
      and si.supplier_id = new.suggested_supplier_id
      and bsi.status = 'active' and bsi.deleted_at is null
      and si.status = 'active' and si.deleted_at is null
      and s.status = 'active' and s.deleted_at is null
  ) then raise exception 'Selected supplier is not mapped to this purchase request branch and item.'; end if;
  return new;
end $$;

create trigger purchase_request_line_supplier_guard
before insert or update of purchase_request_id, item_id, suggested_supplier_id on public.purchase_request_lines
for each row execute function public.guard_purchase_request_line_supplier();

create or replace function public.guard_purchase_request_supplier_transition()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status::text = 'draft' and new.status::text <> 'draft' then
    perform public.validate_purchase_request_supplier_mappings(new.id, true);
  end if;
  return new;
end $$;

create trigger purchase_request_supplier_transition_guard
before update of status on public.purchase_requests
for each row execute function public.guard_purchase_request_supplier_transition();

create or replace function public.guard_purchase_request_mapping_scope_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.branch_id is distinct from old.branch_id then
    perform public.validate_purchase_request_supplier_mappings(new.id, false);
  end if;
  return new;
end $$;

create trigger purchase_request_mapping_scope_change_guard
after update of branch_id on public.purchase_requests
for each row execute function public.guard_purchase_request_mapping_scope_change();

create or replace function public.guard_purchase_order_supplier_mapping()
returns trigger language plpgsql security definer set search_path = public as $$
declare order_row public.purchase_orders%rowtype;
begin
  select * into order_row from public.purchase_orders where id = new.purchase_order_id;
  if order_row.branch_id is null then raise exception 'Purchase order branch is required.'; end if;
  if not exists (
    select 1 from public.branch_supplier_items bsi
    join public.supplier_items si on si.id = bsi.supplier_item_id and si.item_id = bsi.item_id
    where bsi.branch_id = order_row.branch_id and bsi.item_id = new.item_id
      and si.supplier_id = order_row.supplier_id
      and bsi.status = 'active' and bsi.deleted_at is null
      and si.status = 'active' and si.deleted_at is null
  ) then raise exception 'Purchase order supplier is not mapped to its branch and item.'; end if;
  return new;
end $$;

create trigger purchase_order_line_supplier_guard
before insert or update of purchase_order_id, item_id on public.purchase_order_lines
for each row execute function public.guard_purchase_order_supplier_mapping();

create or replace function public.guard_purchase_order_mapping_scope_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.purchase_order_lines pol
    where pol.purchase_order_id = new.id
      and not exists (
        select 1 from public.branch_supplier_items bsi
        join public.supplier_items si on si.id = bsi.supplier_item_id and si.item_id = bsi.item_id
        join public.suppliers s on s.id = si.supplier_id
        where bsi.branch_id = new.branch_id and bsi.item_id = pol.item_id
          and si.supplier_id = new.supplier_id
          and bsi.status = 'active' and bsi.deleted_at is null
          and si.status = 'active' and si.deleted_at is null
          and s.status = 'active' and s.deleted_at is null
      )
  ) then raise exception 'Purchase order supplier is not mapped to its branch and every item.'; end if;
  return new;
end $$;

create trigger purchase_order_mapping_scope_change_guard
before update of branch_id, supplier_id on public.purchase_orders
for each row execute function public.guard_purchase_order_mapping_scope_change();
