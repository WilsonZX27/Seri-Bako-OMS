-- Local candidate only. No migration number is reserved. DO NOT INSTALL.
-- Destination is recorded through 382; reconcile current schema/history before release.
create table public.purchase_request_basket_receipts (
 company_id uuid not null references public.companies(id),
 actor_id uuid not null references public.staffs(id),
 request_key uuid not null,
 payload jsonb not null,
 result jsonb not null,
 created_at timestamptz not null default now(),
 primary key(company_id, actor_id, request_key)
);
alter table public.purchase_request_basket_receipts enable row level security;
revoke all on public.purchase_request_basket_receipts from public, anon, authenticated, service_role;
-- Existing admin-only company backup reads receipts; no service-role writes.
grant select on public.purchase_request_basket_receipts to service_role;

create function public.create_purchase_request_basket_atomic(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 actor public.staffs%rowtype;
 basket_branch uuid := (p_payload->>'branch_id')::uuid;
 basket_key uuid := (p_payload->>'idempotency_key')::uuid;
 groups jsonb := p_payload->'groups';
 receipt public.purchase_request_basket_receipts%rowtype;
 identity_payload jsonb;
 group_payload jsonb;
 created jsonb;
 result jsonb := '[]'::jsonb;
 total_lines integer;
begin
 select * into actor from public.staffs where id=public.current_staff_id() and auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
 if actor.id is null or actor.company_id is null or public.has_permission('purchase_request.create') is not true then raise exception 'Purchase request creation is not allowed.'; end if;
 if basket_key is null or basket_branch is null or public.can_access_company_branch(actor.company_id,basket_branch) is not true then raise exception 'Basket branch is outside your scope.'; end if;
 if jsonb_typeof(groups) is distinct from 'array' then raise exception 'Basket groups must be an array.'; end if;
 if jsonb_array_length(groups) not between 1 and 100 then raise exception 'Basket must have 1 to 100 supplier groups.'; end if;
 if exists(select 1 from jsonb_array_elements(groups) g where jsonb_typeof(g->'lines') is distinct from 'array' or g->>'branch_id' is distinct from basket_branch::text or coalesce(g->'unresolved_lines','[]'::jsonb)<>'[]'::jsonb) then raise exception 'Invalid basket group scope or lines.'; end if;
 select sum(jsonb_array_length(g->'lines')) into total_lines from jsonb_array_elements(groups) g;
 if total_lines not between 1 and 500 then raise exception 'Basket must have 1 to 500 lines.'; end if;
 identity_payload := jsonb_build_object('branch_id',basket_branch,'groups',groups);
 -- A durable actor-scoped receipt serializes retries, including simultaneous requests.
 perform pg_advisory_xact_lock(hashtextextended(actor.company_id::text||'/'||actor.id::text||'/basket/'||basket_key::text,0));
 select * into receipt from public.purchase_request_basket_receipts r where r.company_id=actor.company_id and r.actor_id=actor.id and r.request_key=basket_key;
 if found then
  if receipt.payload<>identity_payload then raise exception 'This basket was already created with different contents. Review the existing purchase requests before starting a new basket.'; end if;
  return receipt.result;
 end if;
 if p_payload->>'receipt_only'='true' then return null; end if;
 -- Recheck catalog/supplier scope inside the same transaction, not just in the action.
 if exists (
  select 1 from jsonb_array_elements(groups) g
  cross join lateral jsonb_to_recordset(g->'lines') l(item_id uuid, suggested_supplier_id uuid, uom text)
  left join public.items i on i.id=l.item_id and i.company_id=actor.company_id and i.status='active' and i.deleted_at is null
  where i.id is null or (l.suggested_supplier_id is not null and (
   not exists(select 1 from public.suppliers s where s.id=l.suggested_supplier_id and s.company_id=actor.company_id and s.status='active' and s.deleted_at is null)
   or not (
    exists(select 1 from public.branch_supplier_items b join public.supplier_items si on si.id=b.supplier_item_id
      where b.branch_id=basket_branch and b.item_id=i.id and b.status='active' and b.deleted_at is null
      and si.item_id=i.id and si.supplier_id=l.suggested_supplier_id and si.status='active' and si.deleted_at is null
      and (case upper(trim(si.purchase_uom)) when 'BTL' then 'BOTTLE' when 'PIECE' then 'PCS' when 'PIECES' then 'PCS' else upper(trim(si.purchase_uom)) end)=(case upper(trim(l.uom)) when 'BTL' then 'BOTTLE' when 'PIECE' then 'PCS' when 'PIECES' then 'PCS' else upper(trim(l.uom)) end))
    or (not exists(select 1 from public.branch_supplier_items b where b.branch_id=basket_branch and b.item_id=i.id and b.status='active' and b.deleted_at is null)
      and i.supplier_id=l.suggested_supplier_id and (case upper(trim(coalesce(i.purchase_unit,i.base_unit))) when 'BTL' then 'BOTTLE' when 'PIECE' then 'PCS' when 'PIECES' then 'PCS' else upper(trim(coalesce(i.purchase_unit,i.base_unit))) end)=(case upper(trim(l.uom)) when 'BTL' then 'BOTTLE' when 'PIECE' then 'PCS' when 'PIECES' then 'PCS' else upper(trim(l.uom)) end))
   )
  ))
 ) then raise exception 'Basket item, supplier, or unit is no longer available for this branch.'; end if;
 for group_payload in select value from jsonb_array_elements(groups) loop
  -- Number allocation and every PR/document/line/audit share this transaction.
  created := public.create_purchase_request_atomic(group_payload || jsonb_build_object('request_no',public.next_document_number(actor.company_id,'purchase_request'),'request_date',current_date,'idempotency_key',gen_random_uuid()));
  result := result || jsonb_build_array(created);
 end loop;
 insert into public.purchase_request_basket_receipts(company_id,actor_id,request_key,payload,result) values(actor.company_id,actor.id,basket_key,identity_payload,result);
 return result;
end $$;
revoke all on function public.create_purchase_request_basket_atomic(jsonb) from public, anon, service_role;
grant execute on function public.create_purchase_request_basket_atomic(jsonb) to authenticated;
