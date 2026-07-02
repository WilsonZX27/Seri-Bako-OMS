-- Sprint 6.10.2 / 6.11
-- Personal notification scope + onboarding support.

alter table public.notifications
  add column if not exists recipient_user_id uuid,
  add column if not exists recipient_staff_id uuid,
  add column if not exists recipient_role_id uuid,
  add column if not exists branch_id uuid,
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists action_url text,
  add column if not exists priority text not null default 'normal',
  add column if not exists is_company_wide boolean not null default false,
  add column if not exists read_at timestamptz,
  add column if not exists dismissed_at timestamptz,
  add column if not exists actor_user_id uuid;

do $$
begin
  if exists (select 1 from pg_type where typname = 'barcode_type')
    and not exists (
      select 1
      from pg_enum
      where enumtypid = 'public.barcode_type'::regtype
        and enumlabel = 'packaging'
    ) then
    alter type public.barcode_type add value 'packaging';
  end if;
end $$;

alter table public.uom_conversions
  add column if not exists item_id uuid references public.items(id) on delete cascade;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'notifications_priority_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_priority_check
      check (priority in ('low', 'normal', 'urgent', 'critical'));
  end if;
end $$;

create table if not exists public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  recipient_user_id uuid,
  recipient_staff_id uuid,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notification_recipients_notification_idx
  on public.notification_recipients(notification_id);

create index if not exists notification_recipients_user_idx
  on public.notification_recipients(recipient_user_id, read_at, dismissed_at);

create index if not exists notification_recipients_staff_idx
  on public.notification_recipients(recipient_staff_id, read_at, dismissed_at);

create index if not exists notifications_scope_idx
  on public.notifications(recipient_user_id, recipient_staff_id, recipient_role_id, branch_id, is_company_wide, read_at, dismissed_at, created_at desc);

create index if not exists uom_conversions_item_idx
  on public.uom_conversions(item_id)
  where item_id is not null;

create unique index if not exists uom_conversions_item_pair_active_idx
  on public.uom_conversions(item_id, lower(from_uom), lower(to_uom))
  where item_id is not null and deleted_at is null;

alter table public.notification_recipients enable row level security;

drop policy if exists "notification recipients read own" on public.notification_recipients;
create policy "notification recipients read own"
on public.notification_recipients
for select
to authenticated
using (
  recipient_user_id = auth.uid()
  or (
    recipient_staff_id is not null
    and exists (
      select 1
      from public.staffs
      where staffs.id = notification_recipients.recipient_staff_id
        and staffs.auth_user_id = auth.uid()
        and staffs.deleted_at is null
    )
  )
);

drop policy if exists "notification recipients manage own" on public.notification_recipients;
create policy "notification recipients manage own"
on public.notification_recipients
for all
to authenticated
using (
  recipient_user_id = auth.uid()
  or (
    recipient_staff_id is not null
    and exists (
      select 1
      from public.staffs
      where staffs.id = notification_recipients.recipient_staff_id
        and staffs.auth_user_id = auth.uid()
        and staffs.deleted_at is null
    )
  )
)
with check (
  recipient_user_id = auth.uid()
  or (
    recipient_staff_id is not null
    and exists (
      select 1
      from public.staffs
      where staffs.id = notification_recipients.recipient_staff_id
        and staffs.auth_user_id = auth.uid()
        and staffs.deleted_at is null
    )
  )
);

drop policy if exists "notifications read" on public.notifications;
create policy "notifications read"
on public.notifications
for select
to authenticated
using (
  recipient_user_id = auth.uid()
  or (
    recipient_staff_id is not null
    and exists (
      select 1
      from public.staffs
      where staffs.id = notifications.recipient_staff_id
        and staffs.auth_user_id = auth.uid()
        and staffs.deleted_at is null
    )
  )
  or (
    recipient_role_id is not null
    and exists (
      select 1
      from public.staffs
      join public.staff_roles on staff_roles.staff_id = staffs.id
      where staffs.auth_user_id = auth.uid()
        and staffs.deleted_at is null
        and staff_roles.role_id = notifications.recipient_role_id
        and (staff_roles.effective_from is null or staff_roles.effective_from <= current_date)
        and (staff_roles.effective_to is null or staff_roles.effective_to >= current_date)
    )
  )
  or (
    branch_id is not null
    and exists (
      select 1
      from public.staffs
      join public.staff_branches on staff_branches.staff_id = staffs.id
      where staffs.auth_user_id = auth.uid()
        and staffs.deleted_at is null
        and staff_branches.branch_id = notifications.branch_id
    )
  )
  or is_company_wide = true
);
