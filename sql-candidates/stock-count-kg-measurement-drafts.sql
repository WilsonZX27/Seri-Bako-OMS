-- Local candidate only: independent KG evidence for the two confirmed mislabelled items.
-- No historical counts, inventory movements, items, purchasing units or costs are rewritten.
begin;
create table public.stock_count_kg_items (
 id uuid not null unique default gen_random_uuid(),
 created_at timestamptz not null default now(),
 company_id uuid not null references public.companies(id),
 item_id uuid primary key references public.items(id),
 count_uom text not null default 'KG' check(count_uom='KG'),
 historical_review_required boolean not null default true check(historical_review_required)
);
insert into public.stock_count_kg_items(company_id,item_id)
select company_id,id from public.items where company_id='3b104582-f8cb-4a4d-867f-b99e5ffc6486'
 and item_code in ('BWYHOLDI00026','BWYHOLDI00022') and deleted_at is null;
-- Stable source identity survives an explicitly confirmed separation from formal count lines.
create table public.stock_count_kg_reviews (
 id uuid not null unique default gen_random_uuid(),
 created_at timestamptz not null default now(),
 line_id uuid primary key,
 company_id uuid not null references public.companies(id),
 stock_count_id uuid not null references public.stock_counts(id),
 item_id uuid not null references public.items(id),
 original_line jsonb not null,
 review_status text not null default 'captured' check(review_status in ('captured','pending')),
 separated_at timestamptz,
 separated_by uuid references public.staffs(id),
 unique(stock_count_id,item_id),
 check((review_status='captured' and separated_at is null) or (review_status='pending' and separated_at is not null and separated_by is not null))
);
alter table public.stock_count_kg_reviews enable row level security;
revoke all on public.stock_count_kg_reviews from public,anon,authenticated,service_role;
grant select on public.stock_count_kg_reviews to authenticated,service_role;
create policy stock_count_kg_reviews_read on public.stock_count_kg_reviews for select to authenticated using(
 company_id=public.current_staff_company_id() and exists(select 1 from public.stock_counts c where c.id=stock_count_id and c.company_id=stock_count_kg_reviews.company_id and public.can_access_inventory_branch(c.company_id,c.branch_id))
 and public.has_any_permission(array['stock_count.read','stock_count.create','stock_count.update']));
create table public.stock_count_kg_measurements (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id),
 stock_count_id uuid not null references public.stock_counts(id),
 line_id uuid not null references public.stock_count_kg_reviews(line_id),
 item_id uuid not null references public.items(id),
 version integer not null check(version>0),
 counted_kg numeric not null check(counted_kg>=0 and counted_kg<=1000000 and counted_kg=round(counted_kg,4)),
 purchase_uom text not null,
 base_uom text not null,
 units_per_purchase numeric check(units_per_purchase>0 and units_per_purchase<=1000000 and units_per_purchase=trunc(units_per_purchase)),
 kg_per_unit numeric check(kg_per_unit>0 and kg_per_unit<=1000000 and kg_per_unit=round(kg_per_unit,4)),
 package_description text not null default '' check(length(package_description)<=200),
 evidence text not null default '' check(length(evidence)<=1000),
 recorded_by uuid not null references public.staffs(id),
 recorded_at timestamptz not null default now(),
 unique(line_id,version),
 check((units_per_purchase is null and kg_per_unit is null) or (units_per_purchase is not null and kg_per_unit is not null and length(trim(package_description))>=2 and length(trim(evidence))>=3))
);
alter table public.stock_count_kg_items enable row level security;
alter table public.stock_count_kg_measurements enable row level security;
revoke all on public.stock_count_kg_items,public.stock_count_kg_measurements from public,anon,authenticated,service_role;
grant select on public.stock_count_kg_items,public.stock_count_kg_measurements to authenticated,service_role;
create policy stock_count_kg_config_read on public.stock_count_kg_items for select to authenticated using(
 company_id=public.current_staff_company_id() and public.has_any_permission(array['stock_count.read','stock_count.create','stock_count.update']));
create policy stock_count_kg_measurement_read on public.stock_count_kg_measurements for select to authenticated using(
 company_id=public.current_staff_company_id() and exists(select 1 from public.stock_counts c where c.id=stock_count_id and c.company_id=stock_count_kg_measurements.company_id and public.can_access_inventory_branch(c.company_id,c.branch_id))
 and public.has_any_permission(array['stock_count.read','stock_count.create','stock_count.update']));

create view public.stock_count_kg_latest with (security_invoker=true) as
 select distinct on (line_id) * from public.stock_count_kg_measurements order by line_id,version desc;
grant select on public.stock_count_kg_latest to authenticated;

-- Wrap existing atomic draft aggregates; their permission, branch, membership and idempotency rules remain authoritative.
create function public.save_stock_count_kg_draft(p_stock_count_id uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor uuid; company uuid:=public.current_staff_company_id();
 c public.stock_counts; l public.stock_count_lines; i public.items; previous public.stock_count_kg_measurements;
 was_existing boolean:=false; clear_base_lines uuid[]:='{}'; entry jsonb; normalized jsonb:='[]'; result jsonb; weight numeric; units numeric; net numeric; description text; evidence text;
begin
 select id into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
 if actor is null or not public.has_permission(case when p_stock_count_id is null then 'stock_count.create' else 'stock_count.update' end) then raise exception 'Stock count permission denied'; end if;
 if jsonb_typeof(p_payload->'lines') is distinct from 'array' or jsonb_array_length(p_payload->'lines') not between 1 and 500 then raise exception 'Invalid stock count lines'; end if;
 if p_stock_count_id is null then
  perform pg_advisory_xact_lock(hashtextextended(company::text || ':' || (p_payload->>'idempotency_key'),0));
  select * into c from public.stock_counts where company_id=company and idempotency_key=(p_payload->>'idempotency_key')::uuid and deleted_at is null for update;
  was_existing:=found;
 end if;
 if p_stock_count_id is not null then
  select * into c from public.stock_counts where id=p_stock_count_id and company_id=company and deleted_at is null for update;
  if c.id is null or c.status<>'draft' or not public.can_access_inventory_branch(c.company_id,c.branch_id) then raise exception 'Stock count is not an editable branch draft'; end if;
 end if;
 for entry in select value from jsonb_array_elements(p_payload->'lines') loop
  select item.* into i from public.items item join public.stock_count_kg_items cfg on cfg.item_id=item.id and cfg.company_id=item.company_id
   where item.id=(entry->>'item_id')::uuid and item.company_id=company;
  if found then
   if entry->>'uom' is distinct from 'KG' then raise exception 'Enter the physical weight in KG'; end if;
   weight:=(entry->>'physical_qty')::numeric;
   if weight is null or weight<0 or weight>1000000 or weight<>round(weight,4) then raise exception 'Invalid measured KG'; end if;
   if p_stock_count_id is null then
    -- This is an unposted legacy-format placeholder, never a counted quantity. UI/export read the separate KG evidence.
    if was_existing then
     select * into l from public.stock_count_lines where stock_count_id=c.id and item_id=i.id;
     if not found then raise exception 'Existing draft must be opened before adding KG evidence'; end if;
     entry:=entry||jsonb_build_object('physical_qty',l.physical_qty,'uom',l.uom);
    else
     entry:=entry||jsonb_build_object('physical_qty',0,'uom',i.base_unit);
    end if;
   else
    select * into l from public.stock_count_lines where stock_count_id=c.id and item_id=i.id and id=(entry->>'line_id')::uuid;
    if not found then raise exception 'Count line changed'; end if;
    if l.physical_qty is null then clear_base_lines:=array_append(clear_base_lines,l.id); end if;
    entry:=entry||jsonb_build_object('physical_qty',coalesce(l.physical_qty,0),'uom',l.uom);
   end if;
  elsif entry ? 'weight_setup' and entry->'weight_setup'<>'null'::jsonb then
   raise exception 'KG setup is not enabled for this item';
  end if;
  normalized:=normalized||jsonb_build_array(entry);
 end loop;
 if p_stock_count_id is null then
  result:=public.create_stock_count_with_added_items_atomic(p_payload||jsonb_build_object('lines',normalized));
  select * into c from public.stock_counts where id=(result->>'id')::uuid for update;
 else
  result:=public.update_stock_count_draft_atomic(c.id,p_payload||jsonb_build_object('lines',normalized));
 end if;
 if c.status<>'draft' or c.company_id<>company or not public.can_access_inventory_branch(c.company_id,c.branch_id) then raise exception 'Stock count is not an editable branch draft'; end if;
 for entry in select value from jsonb_array_elements(p_payload->'lines') loop
  select item.* into i from public.items item join public.stock_count_kg_items cfg on cfg.item_id=item.id and cfg.company_id=item.company_id where item.id=(entry->>'item_id')::uuid and item.company_id=company;
  if not found then continue; end if;
  select * into l from public.stock_count_lines where stock_count_id=c.id and item_id=i.id;
  if (p_stock_count_id is null and not was_existing) or l.id=any(clear_base_lines) then
   update public.stock_count_lines set physical_qty=null where id=l.id;
  end if;
  weight:=(entry->>'physical_qty')::numeric;
  units:=nullif(entry->'weight_setup'->>'units_per_purchase','')::numeric;
  net:=nullif(entry->'weight_setup'->>'kg_per_unit','')::numeric;
  description:=trim(coalesce(entry->'weight_setup'->>'package_description',''));
  evidence:=trim(coalesce(entry->'weight_setup'->>'evidence',''));
  select * into previous from public.stock_count_kg_measurements where line_id=l.id order by version desc limit 1;
  if p_stock_count_id is null and was_existing and previous.id is null then raise exception 'Existing draft must be opened before adding KG evidence'; end if;
  if previous.id is not null and (previous.counted_kg,previous.units_per_purchase,previous.kg_per_unit,previous.package_description,previous.evidence,previous.purchase_uom,previous.base_uom)
     is not distinct from (weight,units,net,description,evidence,i.purchase_unit,i.base_unit) then continue; end if;
  if p_stock_count_id is null and previous.id is not null then raise exception 'Create request already saved with different KG evidence'; end if;
  insert into public.stock_count_kg_reviews(line_id,company_id,stock_count_id,item_id,original_line)
  values(l.id,company,c.id,i.id,to_jsonb(l)) on conflict(line_id) do nothing;
  insert into public.stock_count_kg_measurements(company_id,stock_count_id,line_id,item_id,version,counted_kg,purchase_uom,base_uom,units_per_purchase,kg_per_unit,package_description,evidence,recorded_by)
  values(company,c.id,l.id,i.id,coalesce(previous.version,0)+1,weight,i.purchase_unit,i.base_unit,units,net,description,evidence,actor);
 end loop;
 return result;
end $$;
revoke all on function public.save_stock_count_kg_draft(uuid,jsonb) from public,anon,service_role;
grant execute on function public.save_stock_count_kg_draft(uuid,jsonb) to authenticated;

-- Block the existing posting path too: no client, older UI or service caller can mix measured KG with the known mislabelled CTN ledger.
create function public.guard_stock_count_kg_posting() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.status='posted' and (tg_op='INSERT' or old.status is distinct from new.status)
 and exists(select 1 from public.stock_count_lines l join public.stock_count_kg_items cfg on cfg.item_id=l.item_id and cfg.company_id=new.company_id where l.stock_count_id=new.id) then
  raise exception 'KG_COUNT_REVIEW_REQUIRED: KG measurements are saved separately. Complete packaging conversion and an audited historical balance review before posting this count.';
 end if;
 return new;
end $$;
revoke all on function public.guard_stock_count_kg_posting() from public,anon,authenticated,service_role;
create trigger stock_count_kg_posting_guard before insert or update of status on public.stock_counts for each row execute function public.guard_stock_count_kg_posting();
alter function public.post_stock_count_atomic(uuid) rename to post_stock_count_before_kg_drafts;
revoke all on function public.post_stock_count_before_kg_drafts(uuid) from public,anon,authenticated,service_role;
create function public.post_stock_count_atomic(p_stock_count_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.stock_counts;
begin
 select * into c from public.stock_counts where id=p_stock_count_id and company_id=public.current_staff_company_id() and deleted_at is null for update;
 if c.id is null or not public.has_permission('stock_count.post') or not public.can_access_inventory_branch(c.company_id,c.branch_id) then raise exception 'Stock count permission denied'; end if;
 if exists(select 1 from public.stock_count_lines l join public.stock_count_kg_items cfg on cfg.item_id=l.item_id and cfg.company_id=c.company_id where l.stock_count_id=c.id) then
  raise exception 'KG_COUNT_REVIEW_REQUIRED: Save measured KG and packaging evidence; historical balance review is required before posting.';
 end if;
 return public.post_stock_count_before_kg_drafts(c.id);
end $$;
revoke all on function public.post_stock_count_atomic(uuid) from public,anon,service_role;
grant execute on function public.post_stock_count_atomic(uuid) to authenticated;
-- An explicit confirmation separates the displayed review set; the original posting engine sees only verified lines.
create function public.post_stock_count_verified_lines(p_stock_count_id uuid,p_review_item_ids uuid[]) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.stock_counts; actor uuid; actual uuid[]; result jsonb; review_count integer;
begin
 select id into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
 if actor is null or not public.has_permission('stock_count.post') then raise exception 'Stock count permission denied'; end if;
 select * into c from public.stock_counts where id=p_stock_count_id and company_id=public.current_staff_company_id() and deleted_at is null for update;
 if c.id is null or not public.can_access_inventory_branch(c.company_id,c.branch_id) then raise exception 'Stock count unavailable'; end if;
 if c.status='posted' then
  select array_agg(item_id order by item_id) into actual from public.stock_count_kg_reviews where stock_count_id=c.id and review_status='pending';
  if actual is distinct from (select array_agg(x order by x) from unnest(p_review_item_ids) x) then raise exception 'Review set changed'; end if;
  return jsonb_build_object('id',c.id,'already_posted',true,'pending_weight_reviews',cardinality(actual));
 end if;
 if c.status<>'draft' then raise exception 'Open an editable draft before separating weight reviews'; end if;
 perform 1 from public.stock_count_lines where stock_count_id=c.id for update;
 select array_agg(l.item_id order by l.item_id) into actual from public.stock_count_lines l join public.stock_count_kg_items cfg on cfg.item_id=l.item_id and cfg.company_id=c.company_id where l.stock_count_id=c.id;
 if actual is null or actual is distinct from (select array_agg(x order by x) from unnest(p_review_item_ids) x) then raise exception 'Review set changed; refresh the confirmation'; end if;
 if not exists(select 1 from public.stock_count_lines where stock_count_id=c.id and not(item_id=any(actual))) then raise exception 'Only weight reviews remain. Save the draft; there are no verified inventory lines to post.'; end if;
 if exists(select 1 from public.document_line_revisions where document_type='stock_count' and document_id=c.id and status='pending') then raise exception 'Resolve pending line changes first'; end if;
 if exists(select 1 from public.stock_count_item_retirements where stock_count_id=c.id and item_id=any(actual)) then raise exception 'Resolve the weight item retirement before separating it'; end if;
 if exists(select 1 from public.stock_count_lines l where l.stock_count_id=c.id and l.item_id=any(actual) and not exists(select 1 from public.stock_count_kg_latest m where m.line_id=l.id and m.stock_count_id=c.id and m.item_id=l.item_id)) then raise exception 'Record measured KG for each weight review before confirming'; end if;
 update public.stock_count_kg_reviews r set review_status='pending',original_line=to_jsonb(l),separated_at=now(),separated_by=actor
 from public.stock_count_lines l where l.id=r.line_id and l.stock_count_id=c.id and l.item_id=any(actual);
 get diagnostics review_count=row_count;
 if review_count<>cardinality(actual) then raise exception 'Incomplete weight review snapshot'; end if;
 delete from public.stock_count_lines where stock_count_id=c.id and item_id=any(actual);
 result:=public.post_stock_count_before_kg_drafts(c.id);
 if c.document_id is not null then update public.documents set current_step='Verified items posted; weight reviews pending' where id=c.document_id; end if;
 insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
 values(c.company_id,'stock_count',c.id,'verified_lines_posted','Confirmed verified inventory lines posted; measured KG retained in separate pending reviews.',jsonb_build_object('review_item_ids',actual,'pending_weight_reviews',review_count,'weight_inventory_movements',0),actor);
 return result||jsonb_build_object('pending_weight_reviews',review_count);
end $$;
revoke all on function public.post_stock_count_verified_lines(uuid,uuid[]) from public,anon,service_role;
grant execute on function public.post_stock_count_verified_lines(uuid,uuid[]) to authenticated;

-- Supplement a separated review without reopening or rewriting a posted count.
create function public.save_stock_count_weight_review(p_line_id uuid,p_payload jsonb) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.stock_count_kg_reviews; c public.stock_counts; previous public.stock_count_kg_measurements; actor uuid;
 weight numeric; units numeric; net numeric; description text; evidence text;
begin
 select id into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
 if actor is null or not public.has_permission('stock_count.update') then raise exception 'Stock count permission denied'; end if;
 select * into r from public.stock_count_kg_reviews where line_id=p_line_id and company_id=public.current_staff_company_id() and review_status='pending' for update;
 select * into c from public.stock_counts where id=r.stock_count_id and deleted_at is null;
 if r.line_id is null or c.id is null or not public.can_access_inventory_branch(c.company_id,c.branch_id) then raise exception 'Weight review unavailable'; end if;
 select * into previous from public.stock_count_kg_measurements where line_id=r.line_id order by version desc limit 1;
 weight:=(p_payload->>'counted_kg')::numeric;
 units:=nullif(p_payload->>'units_per_purchase','')::numeric; net:=nullif(p_payload->>'kg_per_unit','')::numeric;
 description:=trim(coalesce(p_payload->>'package_description','')); evidence:=trim(coalesce(p_payload->>'evidence',''));
 if (weight,units,net,description,evidence) is not distinct from (previous.counted_kg,previous.units_per_purchase,previous.kg_per_unit,previous.package_description,previous.evidence) then return; end if;
 insert into public.stock_count_kg_measurements(company_id,stock_count_id,line_id,item_id,version,counted_kg,purchase_uom,base_uom,units_per_purchase,kg_per_unit,package_description,evidence,recorded_by)
 values(r.company_id,r.stock_count_id,r.line_id,r.item_id,previous.version+1,weight,previous.purchase_uom,previous.base_uom,units,net,description,evidence,actor);
end $$;
revoke all on function public.save_stock_count_weight_review(uuid,jsonb) from public,anon,service_role;
grant execute on function public.save_stock_count_weight_review(uuid,jsonb) to authenticated;
-- A measured line cannot disappear through an older remove-line workflow without the explicit separation snapshot.
create function public.guard_stock_count_weight_line_delete() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if exists(select 1 from public.stock_count_kg_reviews where line_id=old.id and review_status<>'pending') then raise exception 'Use the verified-items confirmation to retain this weight review before posting.'; end if;
 return old;
end $$;
revoke all on function public.guard_stock_count_weight_line_delete() from public,anon,authenticated,service_role;
create trigger stock_count_weight_line_delete_guard before delete on public.stock_count_lines for each row execute function public.guard_stock_count_weight_line_delete();
notify pgrst,'reload schema';
commit;
