alter type public.purchase_request_status add value if not exists 'manager_review';
alter type public.purchase_request_status add value if not exists 'finance_review';
alter type public.purchase_request_status add value if not exists 'ready_to_convert';
alter type public.purchase_request_status add value if not exists 'converted_to_po';
alter type public.purchase_request_status add value if not exists 'returned';

alter type public.stock_operation_status add value if not exists 'in_transit';
alter type public.stock_operation_status add value if not exists 'completed';
