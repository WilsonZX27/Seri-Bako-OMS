-- =========================================================
-- Seri Bako OMS Sprint 2.5 Universal Document Framework
-- Scope: reusable documents, approvals, comments, attachments,
-- revisions, audit support, notifications, and permissions.
-- =========================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'document_status') then
    create type public.document_status as enum ('draft','submitted','pending_approval','approved','rejected','posted','cancelled','closed');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'approval_status') then
    create type public.approval_status as enum ('not_required','draft','pending','approved','rejected','cancelled');
  end if;
end $$;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  document_no text not null,
  document_type text not null,
  title text not null,
  status public.document_status not null default 'draft',
  approval_status public.approval_status not null default 'draft',
  current_step text,
  related_entity_type text,
  related_entity_id uuid,
  revision_no integer not null default 1,
  submitted_at timestamptz,
  posted_at timestamptz,
  cancelled_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  constraint documents_no_not_empty check (length(trim(document_no)) > 0),
  constraint documents_type_not_empty check (length(trim(document_type)) > 0),
  constraint documents_title_not_empty check (length(trim(title)) > 0)
);

alter table public.documents
add column if not exists company_id uuid;

alter table public.documents
add column if not exists document_no text;

alter table public.documents
add column if not exists document_type text;

alter table public.documents
add column if not exists status public.document_status not null default 'draft';

alter table public.documents
add column if not exists related_entity_type text;

alter table public.documents
add column if not exists related_entity_id uuid;

alter table public.documents
add column if not exists deleted_at timestamptz;

create unique index if not exists documents_company_no_active_idx
  on public.documents(company_id, document_no)
  where deleted_at is null;
create index if not exists documents_type_status_idx on public.documents(document_type, status);
create index if not exists documents_related_entity_idx on public.documents(related_entity_type, related_entity_id);

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at before update on public.documents for each row execute function public.set_updated_at();

create table if not exists public.document_comments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  comment_text text not null,
  created_at timestamptz not null default now(),
  created_by uuid,
  deleted_at timestamptz,
  constraint document_comments_text_not_empty check (length(trim(comment_text)) > 0)
);

alter table public.document_comments
add column if not exists document_id uuid;

alter table public.document_comments
add column if not exists created_at timestamptz not null default now();

create index if not exists document_comments_document_idx on public.document_comments(document_id, created_at);

create table if not exists public.document_revisions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  revision_no integer not null,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  change_summary text not null,
  constraint document_revisions_revision_positive check (revision_no > 0),
  constraint document_revisions_summary_not_empty check (length(trim(change_summary)) > 0)
);

alter table public.document_revisions
add column if not exists document_id uuid;

alter table public.document_revisions
add column if not exists revision_no integer;

create unique index if not exists document_revisions_document_revision_idx on public.document_revisions(document_id, revision_no);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  entity_type text not null,
  entity_id uuid not null,
  file_name text not null,
  file_type text,
  file_size integer not null default 0,
  storage_path text,
  file_url text,
  status public.record_status not null default 'active',
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  constraint attachments_entity_type_not_empty check (length(trim(entity_type)) > 0),
  constraint attachments_file_name_not_empty check (length(trim(file_name)) > 0),
  constraint attachments_file_size_nonnegative check (file_size >= 0)
);

alter table public.attachments
add column if not exists entity_type text;

alter table public.attachments
add column if not exists entity_id uuid;

alter table public.attachments
add column if not exists status text not null default 'active';

create index if not exists attachments_entity_idx on public.attachments(entity_type, entity_id, status);

drop trigger if exists set_attachments_updated_at on public.attachments;
create trigger set_attachments_updated_at before update on public.attachments for each row execute function public.set_updated_at();

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  entity_type text not null,
  entity_id uuid not null,
  status public.approval_status not null default 'pending',
  current_step integer not null default 1,
  submitted_at timestamptz,
  submitted_by uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  constraint approvals_entity_type_not_empty check (length(trim(entity_type)) > 0)
);

alter table public.approvals
add column if not exists entity_type text;

alter table public.approvals
add column if not exists entity_id uuid;

alter table public.approvals
add column if not exists status public.approval_status not null default 'pending';

create index if not exists approvals_entity_idx on public.approvals(entity_type, entity_id, status);

drop trigger if exists set_approvals_updated_at on public.approvals;
create trigger set_approvals_updated_at before update on public.approvals for each row execute function public.set_updated_at();

create table if not exists public.approval_steps (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid not null references public.approvals(id) on delete cascade,
  step_no integer not null,
  approver_role text,
  approver_staff_id uuid references public.staffs(id),
  status public.approval_status not null default 'pending',
  remarks text,
  acted_at timestamptz,
  acted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approval_steps_step_positive check (step_no > 0)
);

alter table public.approval_steps
add column if not exists approval_id uuid;

alter table public.approval_steps
add column if not exists step_no integer;

create unique index if not exists approval_steps_approval_step_idx on public.approval_steps(approval_id, step_no);

drop trigger if exists set_approval_steps_updated_at on public.approval_steps;
create trigger set_approval_steps_updated_at before update on public.approval_steps for each row execute function public.set_updated_at();

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now(),
  created_by uuid,
  constraint audit_logs_entity_type_not_empty check (length(trim(entity_type)) > 0),
  constraint audit_logs_action_not_empty check (length(trim(action)) > 0)
);

alter table public.audit_logs
add column if not exists entity_type text;

alter table public.audit_logs
add column if not exists entity_id uuid;

alter table public.audit_logs
add column if not exists created_at timestamptz not null default now();
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  recipient_user_id uuid,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  constraint notifications_title_not_empty check (length(trim(title)) > 0),
  constraint notifications_message_not_empty check (length(trim(message)) > 0)
);

alter table public.notifications
add column if not exists recipient_user_id uuid;

alter table public.notifications
add column if not exists read_at timestamptz;

alter table public.notifications
add column if not exists created_at timestamptz not null default now();
create index if not exists notifications_recipient_idx on public.notifications(recipient_user_id, read_at, created_at);

alter table public.documents enable row level security;
alter table public.document_comments enable row level security;
alter table public.document_revisions enable row level security;
alter table public.attachments enable row level security;
alter table public.approvals enable row level security;
alter table public.approval_steps enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "documents read" on public.documents;
create policy "documents read" on public.documents for select to authenticated using (public.has_permission('documents.read'));
drop policy if exists "documents create" on public.documents;
create policy "documents create" on public.documents for insert to authenticated with check (public.has_permission('documents.create'));
drop policy if exists "documents update" on public.documents;
create policy "documents update" on public.documents for update to authenticated using (public.has_permission('documents.update')) with check (public.has_permission('documents.update'));

drop policy if exists "document comments read" on public.document_comments;
create policy "document comments read" on public.document_comments for select to authenticated using (public.has_permission('documents.read'));
drop policy if exists "document comments create" on public.document_comments;
create policy "document comments create" on public.document_comments for insert to authenticated with check (public.has_permission('documents.comment'));
drop policy if exists "document comments archive" on public.document_comments;
create policy "document comments archive" on public.document_comments for update to authenticated using (public.has_permission('documents.comment')) with check (public.has_permission('documents.comment'));

drop policy if exists "document revisions read" on public.document_revisions;
create policy "document revisions read" on public.document_revisions for select to authenticated using (public.has_permission('documents.read'));
drop policy if exists "document revisions create" on public.document_revisions;
create policy "document revisions create" on public.document_revisions for insert to authenticated with check (public.has_permission('documents.update'));

drop policy if exists "attachments read" on public.attachments;
create policy "attachments read" on public.attachments for select to authenticated using (public.has_permission('documents.read'));
drop policy if exists "attachments create" on public.attachments;
create policy "attachments create" on public.attachments for insert to authenticated with check (public.has_permission('documents.attach'));
drop policy if exists "attachments update" on public.attachments;
create policy "attachments update" on public.attachments for update to authenticated using (public.has_permission('documents.attach')) with check (public.has_permission('documents.attach'));

drop policy if exists "approvals read" on public.approvals;
create policy "approvals read" on public.approvals for select to authenticated using (public.has_permission('documents.read'));
drop policy if exists "approvals manage" on public.approvals;
create policy "approvals manage" on public.approvals for all to authenticated using (public.has_permission('documents.submit') or public.has_permission('documents.approve')) with check (public.has_permission('documents.submit') or public.has_permission('documents.approve'));

drop policy if exists "approval steps read" on public.approval_steps;
create policy "approval steps read" on public.approval_steps for select to authenticated using (public.has_permission('documents.read'));
drop policy if exists "approval steps manage" on public.approval_steps;
create policy "approval steps manage" on public.approval_steps for all to authenticated using (public.has_permission('documents.approve')) with check (public.has_permission('documents.approve'));

drop policy if exists "audit logs read" on public.audit_logs;
create policy "audit logs read" on public.audit_logs for select to authenticated using (public.has_permission('documents.read'));
drop policy if exists "audit logs create" on public.audit_logs;
create policy "audit logs create" on public.audit_logs for insert to authenticated with check (true);

drop policy if exists "notifications read" on public.notifications;
create policy "notifications read" on public.notifications for select to authenticated using (true);
drop policy if exists "notifications create" on public.notifications;
create policy "notifications create" on public.notifications for insert to authenticated with check (true);

insert into public.permissions (permission_code, module, action, description)
values
  ('documents.read','documents','read','Read universal document records'),
  ('documents.create','documents','create','Create universal document records'),
  ('documents.update','documents','update','Update universal document records'),
  ('documents.submit','documents','submit','Submit documents for approval'),
  ('documents.approve','documents','approve','Approve or reject documents'),
  ('documents.comment','documents','comment','Add document comments'),
  ('documents.attach','documents','attach','Manage document attachments'),
  ('documents.export','documents','export','Export document records')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.module = 'documents'
where r.role_code in ('admin','finance','purchasing','kitchen')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'documents.read'
where r.role_code = 'viewer'
on conflict (role_id, permission_id) do nothing;
