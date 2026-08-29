-- v9.1 Compliance & Staff Operations Preview
-- Reuses staff, branch, attachment, notification and audit authorities.
-- Applied to the linked Production schema on 2026-08-29 after explicit user authorization;
-- application deployment remains Preview-only until separately approved.

create table if not exists public.compliance_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  type_code text not null,
  type_name text not null,
  subject_kind text not null check (subject_kind in ('outlet','staff','asset')),
  is_sensitive boolean not null default false,
  default_reminder_days integer[] not null default array[90,60,30,7],
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(company_id, type_code)
);

create table if not exists public.compliance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  compliance_type_id uuid not null references public.compliance_types(id),
  subject_kind text not null check (subject_kind in ('outlet','staff','asset')),
  branch_id uuid references public.branches(id),
  staff_id uuid references public.staffs(id),
  asset_external_ref text,
  subject_label text not null,
  reference_no text,
  issued_on date,
  expires_on date,
  review_status text not null default 'draft' check (review_status in ('draft','pending_review','approved','rejected')),
  responsible_staff_id uuid references public.staffs(id),
  reminder_days integer[] not null default array[90,60,30,7],
  attachment_id uuid references public.attachments(id),
  notes text,
  reviewed_by uuid references public.staffs(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.staffs(id),
  updated_by uuid not null references public.staffs(id),
  deleted_at timestamptz,
  check (
    (subject_kind = 'outlet' and branch_id is not null and staff_id is null)
    or (subject_kind = 'staff' and staff_id is not null)
    or (subject_kind = 'asset' and asset_external_ref is not null)
  )
);

create table if not exists public.compliance_record_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  compliance_record_id uuid not null references public.compliance_records(id) on delete restrict,
  event_type text not null check (event_type in ('created','updated','submitted','approved','rejected','renewed','attachment_opened','attachment_downloaded')),
  safe_summary text not null,
  previous_expires_on date,
  new_expires_on date,
  actor_staff_id uuid not null references public.staffs(id),
  created_at timestamptz not null default now()
);

create index if not exists compliance_records_company_expiry_idx on public.compliance_records(company_id, expires_on) where deleted_at is null;
create index if not exists compliance_records_branch_idx on public.compliance_records(branch_id, review_status) where deleted_at is null;
create index if not exists compliance_records_staff_idx on public.compliance_records(staff_id) where deleted_at is null;
create index if not exists compliance_history_record_idx on public.compliance_record_history(compliance_record_id, created_at desc);

create or replace function public.redact_sensitive_compliance_metadata()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from public.compliance_types t where t.id=new.compliance_type_id and t.is_sensitive) then
    new.reference_no := null;
    new.notes := null;
  end if;
  return new;
end;
$$;

drop trigger if exists redact_sensitive_compliance_metadata on public.compliance_records;
create trigger redact_sensitive_compliance_metadata before insert or update on public.compliance_records
for each row execute function public.redact_sensitive_compliance_metadata();

drop trigger if exists set_compliance_types_updated_at on public.compliance_types;
create trigger set_compliance_types_updated_at before update on public.compliance_types for each row execute function public.set_updated_at();
drop trigger if exists set_compliance_records_updated_at on public.compliance_records;
create trigger set_compliance_records_updated_at before update on public.compliance_records for each row execute function public.set_updated_at();

insert into public.permissions(permission_code,module,action,description) values
  ('compliance.read','compliance','read','View compliance status in assigned scope'),
  ('compliance.manage','compliance','manage','Create and update compliance records'),
  ('compliance.review','compliance','review','Approve or reject compliance records'),
  ('compliance.sensitive.read','compliance','sensitive_read','Open sensitive staff compliance files'),
  ('compliance.types.manage','compliance','types_manage','Configure compliance types')
on conflict(permission_code) do update set description=excluded.description;

-- A distinct role inside the existing staff/account identity model. This is a
-- role addition, not a second authentication or employee system.
insert into public.roles(company_id,role_code,role_name,description,status)
select c.id,'people_operations','People Operations','Staff administration and restricted compliance records.','active'
from public.companies c
on conflict(company_id,role_code) do update set role_name=excluded.role_name,description=excluded.description,status='active';

-- Manager owns staff administration and outlet compliance status/review.
-- Only Owner and People Operations receive sensitive-file authority.
insert into public.role_permissions(role_id, permission_id)
select r.id,p.id from public.roles r join public.permissions p on
  (r.role_code='super_admin' and p.permission_code like 'compliance.%')
  or (r.role_code='manager' and p.permission_code in ('compliance.read','compliance.manage','compliance.review'))
  or (r.role_code='people_operations' and p.permission_code in ('compliance.read','compliance.manage','compliance.review','compliance.sensitive.read'))
  or (r.role_code in ('purchasing','kitchen','outlet_staff') and p.permission_code='compliance.read')
on conflict(role_id,permission_id) do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on
  (r.role_code in ('manager','people_operations') and p.permission_code in ('staffs.read','staffs.create','staffs.update','branches.read','documents.read','documents.attach'))
on conflict(role_id,permission_id) do nothing;

alter table public.compliance_types enable row level security;
alter table public.compliance_records enable row level security;
alter table public.compliance_record_history enable row level security;

grant select on public.compliance_types,public.compliance_records,public.compliance_record_history to authenticated;
grant insert,update on public.compliance_types,public.compliance_records to authenticated;
grant insert on public.compliance_record_history to authenticated;

create or replace function public.can_read_compliance_record(target public.compliance_records)
returns boolean language sql stable security definer set search_path=public as $$
  select target.company_id=public.current_staff_company_id()
    and public.has_permission('compliance.read')
    and (
      target.branch_id is null
      or public.can_access_company_branch(target.company_id,target.branch_id)
    );
$$;

create policy "compliance types scoped read" on public.compliance_types for select to authenticated
using(company_id=public.current_staff_company_id() and public.has_permission('compliance.read'));
create policy "compliance types owner manage" on public.compliance_types for all to authenticated
using(company_id=public.current_staff_company_id() and public.has_permission('compliance.types.manage'))
with check(company_id=public.current_staff_company_id() and public.has_permission('compliance.types.manage'));
create policy "compliance records scoped read" on public.compliance_records for select to authenticated
using(public.can_read_compliance_record(compliance_records));
create policy "compliance records scoped insert" on public.compliance_records for insert to authenticated
with check(company_id=public.current_staff_company_id() and public.has_permission('compliance.manage') and (branch_id is null or public.can_access_company_branch(company_id,branch_id)));
create policy "compliance records scoped update" on public.compliance_records for update to authenticated
using(company_id=public.current_staff_company_id() and public.has_permission('compliance.manage') and (branch_id is null or public.can_access_company_branch(company_id,branch_id)))
with check(company_id=public.current_staff_company_id() and public.has_permission('compliance.manage') and (branch_id is null or public.can_access_company_branch(company_id,branch_id)));
create policy "compliance history scoped read" on public.compliance_record_history for select to authenticated
using(company_id=public.current_staff_company_id() and exists(select 1 from public.compliance_records r where r.id=compliance_record_id and public.can_read_compliance_record(r)));
create policy "compliance history scoped insert" on public.compliance_record_history for insert to authenticated
with check(company_id=public.current_staff_company_id() and actor_staff_id=public.current_staff_id() and public.has_any_permission(array['compliance.manage','compliance.sensitive.read']));

insert into public.compliance_types(company_id,type_code,type_name,subject_kind,is_sensitive)
select c.id, seed.type_code,seed.type_name,seed.subject_kind,seed.is_sensitive
from public.companies c cross join (values
 ('BUSINESS_LICENSE','Business license','outlet',false),
 ('INSURANCE','Insurance','outlet',false),
 ('FIRE_EXTINGUISHER','Fire extinguisher inspection','outlet',false),
 ('POS_LICENSE','POS license','outlet',false),
 ('VACCINATION','Vaccination compliance','staff',true),
 ('WORKING_PERMIT','Working permit','staff',true)
) seed(type_code,type_name,subject_kind,is_sensitive)
on conflict(company_id,type_code) do nothing;

revoke all on function public.can_read_compliance_record(public.compliance_records) from public,anon;
grant execute on function public.can_read_compliance_record(public.compliance_records) to authenticated;
revoke all on function public.redact_sensitive_compliance_metadata() from public,anon,authenticated;
