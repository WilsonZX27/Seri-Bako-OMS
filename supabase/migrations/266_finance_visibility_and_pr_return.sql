-- Align Finance navigation with database grants and return Finance corrections
-- to Purchasing without erasing the earlier Manager approval trail.

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id
from public.roles r
join public.permissions p on p.permission_code in (
  'purchase_order.read','goods_receiving.read','purchase_return.view',
  'items.view','suppliers.view','uom_conversions.read','production.view','recipes.view',
  'stock_balance.read','stock_transactions.read','stock_transfer.read','stock_count.read',
  'stock_wastage.read','low_stock.view'
)
where r.role_code='finance' and r.status='active' and r.deleted_at is null
on conflict(role_id,permission_id) do nothing;

create or replace function public.return_finance_purchase_request_to_purchasing(target_purchase_request_id uuid,correction_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor public.staffs%rowtype; request_row public.purchase_requests%rowtype;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('pr.finance_review') or not public.has_permission('pr.reject') then raise exception 'Finance return is not authorised.'; end if;
  if nullif(trim(correction_reason),'') is null then raise exception 'Correction reason is required.'; end if;
  select * into request_row from public.purchase_requests where id=target_purchase_request_id and company_id=actor.company_id and deleted_at is null for update;
  if request_row.id is null or request_row.status::text<>'finance_review' then raise exception 'A Finance Review purchase request is required.'; end if;
  if not public.can_access_purchase_request(request_row.company_id,request_row.branch_id,request_row.requested_by) then raise exception 'Purchase request is outside your scope.'; end if;
  update public.purchase_requests set status='admin_review',updated_by=actor.id where id=request_row.id;
  if request_row.document_id is not null then
    update public.documents set status='pending_approval',approval_status='pending',current_step='Purchasing Review',updated_by=actor.id where id=request_row.document_id;
    insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
    values(actor.company_id,'document',request_row.document_id,'returned','Finance returned the purchase request to Purchasing: '||trim(correction_reason),jsonb_build_object('workflow_step','finance_review','next_status','admin_review','action','return_to_purchasing','reason',trim(correction_reason)),actor.id);
  end if;
  return jsonb_build_object('id',request_row.id,'request_no',request_row.request_no,'company_id',request_row.company_id,'branch_id',request_row.branch_id,'status','admin_review');
end $$;

revoke all on function public.return_finance_purchase_request_to_purchasing(uuid,text) from public,anon;
grant execute on function public.return_finance_purchase_request_to_purchasing(uuid,text) to authenticated;
notify pgrst,'reload schema';
