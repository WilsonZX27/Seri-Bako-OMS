-- Sprint 6.11.2 compatibility hotfix.
-- Production drift has left some active app tables without deleted_at even though
-- existing list/archive queries already use deleted_at for soft archive filters.
-- Add the missing columns idempotently instead of hard deleting or resetting data.

alter table if exists public.companies add column if not exists deleted_at timestamptz;
alter table if exists public.branches add column if not exists deleted_at timestamptz;
alter table if exists public.locations add column if not exists deleted_at timestamptz;
alter table if exists public.staffs add column if not exists deleted_at timestamptz;
alter table if exists public.roles add column if not exists deleted_at timestamptz;
alter table if exists public.permissions add column if not exists deleted_at timestamptz;
alter table if exists public.document_sequences add column if not exists deleted_at timestamptz;

alter table if exists public.items add column if not exists deleted_at timestamptz;
alter table if exists public.suppliers add column if not exists deleted_at timestamptz;
alter table if exists public.supplier_items add column if not exists deleted_at timestamptz;
alter table if exists public.uom_conversions add column if not exists deleted_at timestamptz;
alter table if exists public.barcode_mappings add column if not exists deleted_at timestamptz;

alter table if exists public.documents add column if not exists deleted_at timestamptz;
alter table if exists public.document_comments add column if not exists deleted_at timestamptz;
alter table if exists public.attachments add column if not exists deleted_at timestamptz;
alter table if exists public.approvals add column if not exists deleted_at timestamptz;

alter table if exists public.purchase_requests add column if not exists deleted_at timestamptz;
alter table if exists public.purchase_orders add column if not exists deleted_at timestamptz;
alter table if exists public.goods_receivings add column if not exists deleted_at timestamptz;

alter table if exists public.stock_counts add column if not exists deleted_at timestamptz;
alter table if exists public.stock_transfers add column if not exists deleted_at timestamptz;
alter table if exists public.stock_wastage add column if not exists deleted_at timestamptz;

alter table if exists public.products add column if not exists deleted_at timestamptz;
alter table if exists public.product_packaging add column if not exists deleted_at timestamptz;
alter table if exists public.recipes add column if not exists deleted_at timestamptz;
