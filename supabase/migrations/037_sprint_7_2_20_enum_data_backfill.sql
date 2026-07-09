update public.purchase_requests set status = 'manager_review' where status in ('submitted', 'admin_review');
update public.purchase_requests set status = 'admin_review' where status = 'purchasing_review';
update public.purchase_requests set status = 'finance_review' where status = 'pending_approval';
update public.purchase_requests set status = 'ready_to_convert' where status = 'approved';
update public.purchase_requests set status = 'converted_to_po' where status = 'converted';

update public.stock_transfers set status = 'in_transit' where status in ('submitted', 'approved');
update public.stock_transfers set status = 'completed' where status = 'posted';
