-- Seri Bako OMS new-system reset preflight.
-- Read-only. Run before reset_new_system_data.sql and save the result.

with table_groups(table_name, reset_action, notes) as (
  values
    ('activity_logs','clear_business_rows','Keeps staff/company auth intact; removes operational/import activity history.'),
    ('approval_steps','clear_all','Document workflow child rows.'),
    ('approvals','clear_all','Document workflow rows.'),
    ('attachments','clear_all','Metadata only. Storage files require manual cleanup.'),
    ('audit_logs','clear_business_rows','Operational audit rows only; staff/company/role/security rows are preserved.'),
    ('document_comments','clear_all','Document comments.'),
    ('document_revisions','clear_all','Document revisions.'),
    ('document_sequences','preserve_reset_numbers','Sequence rows preserved; operational next_number values reset to 1.'),
    ('documents','clear_all','Operational document records.'),
    ('goods_receiving_lines','clear_all','Goods receiving lines.'),
    ('goods_receivings','clear_all','Goods receiving headers.'),
    ('items','clear_all','Item master business data.'),
    ('notification_recipients','clear_all','Operational notification recipients.'),
    ('notifications','clear_business_rows','Operational notifications only; staff setup notifications are preserved.'),
    ('product_packaging','clear_all','Product packaging child rows.'),
    ('products','clear_all','Product master business data.'),
    ('purchase_order_lines','clear_all','Purchase order lines.'),
    ('purchase_orders','clear_all','Purchase order headers.'),
    ('purchase_request_lines','clear_all','Purchase request lines.'),
    ('purchase_requests','clear_all','Purchase request headers.'),
    ('purchase_return_lines','clear_all','Purchase return lines.'),
    ('purchase_returns','clear_all','Purchase return headers.'),
    ('production_job_ingredient_lines','clear_all','Production job ingredient lines.'),
    ('production_job_output_lines','clear_all','Production job output lines.'),
    ('production_jobs','clear_all','Production job headers.'),
    ('recipe_cost_snapshots','clear_all','Recipe cost snapshots.'),
    ('recipe_lines','clear_all','Recipe ingredient lines.'),
    ('recipes','clear_all','Recipe master business data.'),
    ('stock_count_lines','clear_all','Stock count lines.'),
    ('stock_counts','clear_all','Stock count headers.'),
    ('stock_transaction_lines','clear_all','Stock ledger lines.'),
    ('stock_transactions','clear_all','Stock ledger headers including opening stock.'),
    ('stock_transfer_lines','clear_all','Stock transfer lines.'),
    ('stock_transfers','clear_all','Stock transfer headers.'),
    ('stock_wastage_lines','clear_all','Wastage/write-off lines.'),
    ('stock_wastage','clear_all','Wastage/write-off headers.'),
    ('supplier_invoice_payments','clear_all','Supplier invoice payments.'),
    ('supplier_invoices','clear_all','Supplier invoice headers.'),
    ('supplier_items','clear_all','Supplier-item mappings.'),
    ('suppliers','clear_all','Supplier master business data.')
)
select
  'tables_to_clear' as section,
  tg.table_name,
  tg.reset_action,
  tg.notes,
  case when c.table_name is null then null else (
    select count_sql.row_count
    from lateral (
      select (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', tg.table_name), false, true, '')))[1]::text::bigint as row_count
    ) count_sql
  ) end as row_count
from table_groups tg
left join information_schema.tables c
  on c.table_schema = 'public'
 and c.table_name = tg.table_name
order by tg.table_name;

select *
from (
  values
    ('auth.users', 'preserve', 'Supabase authentication accounts; never deleted by reset SQL.'),
    ('public.profiles', 'preserve', 'Legacy profile/access compatibility.'),
    ('public.staffs', 'preserve', 'Real staff accounts including Wilson.'),
    ('public.staff_roles', 'preserve', 'Role assignments including active Super Admin.'),
    ('public.staff_branches', 'preserve', 'Staff branch assignments.'),
    ('public.roles', 'preserve', 'Role catalogue.'),
    ('public.permissions', 'preserve', 'Permission catalogue.'),
    ('public.role_permissions', 'preserve', 'Role permission assignments.'),
    ('public.companies', 'preserve', 'Company profile/settings.'),
    ('public.branches', 'preserve', 'Real branches/outlets. QA rows require manual review before any later deletion.'),
    ('public.uom_conversions', 'preserve', 'System/reference UOM configuration.'),
    ('public.document_sequences', 'preserve_reset_numbers', 'Sequence rows preserved; operational next_number reset to 1.'),
    ('public.user_preferences', 'preserve', 'User workspace preferences.'),
    ('public.notification_recipients', 'clear_all', 'Operational notification recipients.'),
    ('public.notifications', 'clear_business_rows', 'Operational notifications only; setup/access notifications preserved where not business-linked.')
) as preserved(table_name, reset_action, notes)
order by table_name;

select
  'public_views_not_physical_tables' as section,
  table_name
from information_schema.views
where table_schema = 'public'
  and table_name in ('stock_ledger_view','inventory_valuation_view','stock_balances_view','low_stock_items')
order by table_name;

select *
from (
  values
    (10, 'notification_recipients'),
    (20, 'business notifications'),
    (30, 'approval_steps'),
    (40, 'approvals'),
    (50, 'document_comments'),
    (60, 'document_revisions'),
    (70, 'attachments metadata'),
    (80, 'business audit/activity logs'),
    (90, 'supplier_invoice_payments'),
    (100, 'supplier_invoices'),
    (110, 'purchase_return_lines'),
    (120, 'purchase_returns'),
    (130, 'production_job_ingredient_lines'),
    (140, 'production_job_output_lines'),
    (150, 'production_jobs'),
    (160, 'stock_wastage_lines'),
    (170, 'stock_wastage'),
    (180, 'stock_transfer_lines'),
    (190, 'stock_transfers'),
    (200, 'stock_count_lines'),
    (210, 'stock_counts'),
    (220, 'goods_receiving_lines'),
    (230, 'goods_receivings'),
    (240, 'purchase_order_lines'),
    (250, 'purchase_orders'),
    (260, 'purchase_request_lines'),
    (270, 'purchase_requests'),
    (280, 'stock_transaction_lines'),
    (290, 'stock_transactions'),
    (300, 'recipe_cost_snapshots'),
    (310, 'recipe_lines'),
    (320, 'recipes'),
    (330, 'product_packaging'),
    (350, 'supplier_items'),
    (360, 'products'),
    (370, 'items'),
    (380, 'suppliers'),
    (390, 'documents'),
    (400, 'document_sequences next_number reset')
) as deletion_order(step_no, operation)
order by step_no;

select 'preserved_auth_users' as section, to_jsonb(u) as auth_user
from auth.users u
where email is not null
order by email;

select 'preserved_staff' as section, to_jsonb(s) as staff_record
from public.staffs s
order by full_name;

select 'preserved_branches' as section, to_jsonb(b) as branch_record
from public.branches b
order by branch_name;


select
  'wilson_super_admin_linkage' as section,
  s.id as staff_id,
  s.staff_code,
  s.full_name,
  s.email,
  s.status as staff_status,
  s.auth_user_id,
  r.id as role_id,
  r.role_code,
  r.status as role_status,
  sr.effective_from,
  sr.effective_to
from public.staffs s
join public.staff_roles sr on sr.staff_id = s.id
join public.roles r on r.id = sr.role_id
where s.email ilike 'wilson@%'
   or s.full_name ilike '%wilson%'
   or r.role_code = 'super_admin'
order by s.email, r.role_code;

select 'qa_staff_manual_review' as section, to_jsonb(s) as staff_record
from public.staffs s
where staff_code ilike 'QA-%'
   or full_name ilike '%QA%'
   or email ilike '%qa%'
   or email ilike '%test%'
order by email;

select 'qa_branch_manual_review' as section, to_jsonb(b) as branch_record
from public.branches b
where branch_code ilike 'QA-%'
   or branch_name ilike '%QA%'
   or branch_name ilike '%test%'
order by branch_name;

select 'items_found' as section, to_jsonb(i) as item_record
from public.items i
order by created_at desc, item_code;

select 'suppliers_found' as section, to_jsonb(s) as supplier_record
from public.suppliers s
order by created_at desc, supplier_code;

select 'recipes_found' as section, to_jsonb(r) as recipe_record
from public.recipes r
order by r.created_at desc nulls last;

select 'stock_transactions_found' as section, to_jsonb(st) as stock_transaction_record
from public.stock_transactions st
order by created_at desc;

select 'operational_documents_found' as section, to_jsonb(d) as document_record
from public.documents d
order by created_at desc;

select 'attachment_storage_manual_cleanup' as section, to_jsonb(a) as attachment_record
from public.attachments a
where nullif(to_jsonb(a)->>'storage_path', '') is not null
   or nullif(to_jsonb(a)->>'file_url', '') is not null;

select 'document_sequences_current' as section, to_jsonb(ds) as document_sequence_record
from public.document_sequences ds
order by document_type;


select 'migration_ceiling' as section, version
from supabase_migrations.schema_migrations
order by version desc
limit 5;
