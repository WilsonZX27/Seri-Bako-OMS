-- PROPOSAL ONLY. Not part of approved371–374 package. Requires separate review/approval.
-- Select a supplier for a legacy PR containing only unresolved descriptions.
begin;
create function public.select_unassigned_purchase_request_supplier(target_request uuid,target_supplier uuid,expected_updated_at timestamptz)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs; request_row public.purchase_requests; actor_roles text[];
begin
 select * into actor from public.staffs where auth_user_id=auth.uid() and company_id=public.current_staff_company_id() and status='active' and deleted_at is null and (employment_end_date is null or employment_end_date >= (now() at time zone 'Asia/Kuala_Lumpur')::date);
 -- Scope role identity and permission evidence to this actor's own company.
 select coalesce(array_agg(r.role_code),array[]::text[]) into actor_roles
 from public.staff_roles sr join public.roles r on r.id=sr.role_id
 where sr.staff_id=actor.id and r.company_id=actor.company_id and r.status='active' and r.deleted_at is null
   and (sr.effective_from is null or sr.effective_from<=current_date) and (sr.effective_to is null or sr.effective_to>=current_date);
 if actor.id is null or not public.has_permission('pr.admin_review') or not (actor_roles && array['super_admin','purchasing']) then raise exception 'Purchasing Review permission required.';end if;
 if not ('super_admin'=any(actor_roles)) and (
   exists(select 1 from public.staff_permission_overrides o join public.permissions p on p.id=o.permission_id where o.staff_id=actor.id and p.permission_code='pr.admin_review' and o.effect='deny')
   or not (
     exists(select 1 from public.staff_permission_overrides o join public.permissions p on p.id=o.permission_id where o.staff_id=actor.id and p.permission_code='pr.admin_review' and o.effect='allow')
     or exists(select 1 from public.staff_roles sr join public.roles r on r.id=sr.role_id join public.role_permissions rp on rp.role_id=r.id join public.permissions p on p.id=rp.permission_id
       where sr.staff_id=actor.id and r.company_id=actor.company_id and r.status='active' and r.deleted_at is null and p.permission_code='pr.admin_review'
         and (sr.effective_from is null or sr.effective_from<=current_date) and (sr.effective_to is null or sr.effective_to>=current_date))
   )
 ) then raise exception 'Purchasing Review permission required.';end if;
 select * into request_row from public.purchase_requests where id=target_request and company_id=actor.company_id and deleted_at is null for update;
 if request_row.id is null or not public.can_access_purchase_request(request_row.company_id,request_row.branch_id,request_row.requested_by) then raise exception 'Purchase request unavailable.';end if;
 if request_row.status::text<>'admin_review' then raise exception 'Select a supplier only during Purchasing Review.';end if;
 if not exists(select 1 from public.suppliers where id=target_supplier and company_id=actor.company_id and status='active' and deleted_at is null) then raise exception 'Select an active supplier in this company.';end if;
 if request_row.assigned_supplier_id=target_supplier then return request_row.id;end if;
 if request_row.assigned_supplier_id is not null then raise exception 'A supplier is already assigned. Reload this request.';end if;
 if expected_updated_at is null or request_row.updated_at is distinct from expected_updated_at then raise exception 'The request changed. Reload before selecting a supplier.';end if;
 if exists(select 1 from public.purchase_request_lines where purchase_request_id=request_row.id) or not exists(select 1 from public.purchase_request_unresolved_lines where purchase_request_id=request_row.id and resolution_status='unresolved') then raise exception 'Supplier recovery is only available for requests with unmatched descriptions and no catalog lines.';end if;
 if not exists(select 1 from public.branch_supplier_items b join public.supplier_items si on si.id=b.supplier_item_id join public.items i on i.id=si.item_id and i.company_id=actor.company_id and i.status='active' and i.deleted_at is null where b.branch_id=request_row.branch_id and b.status='active' and b.deleted_at is null and si.supplier_id=target_supplier and si.company_id=actor.company_id and b.item_id=si.item_id and si.status='active' and si.deleted_at is null)
 and not exists(select 1 from public.items i where i.company_id=actor.company_id and i.supplier_id=target_supplier and i.status='active' and i.deleted_at is null and not exists(select 1 from public.branch_supplier_items b where b.item_id=i.id and b.status='active' and b.deleted_at is null)) then raise exception 'This supplier needs an eligible item relationship for this branch before selection.';end if;
 update public.purchase_requests set assigned_supplier_id=target_supplier,updated_at=now() where id=request_row.id;
 insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by) values(actor.company_id,'purchase_request',request_row.id,'supplier_selected','Supplier selected for unmatched purchase request',jsonb_build_object('supplier_id',target_supplier),actor.id);
 return request_row.id;
end $$;
revoke all on function public.select_unassigned_purchase_request_supplier(uuid,uuid,timestamptz) from public,anon;
grant execute on function public.select_unassigned_purchase_request_supplier(uuid,uuid,timestamptz) to authenticated;
commit;
