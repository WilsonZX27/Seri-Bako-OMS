-- =========================================================
-- Sprint 7.1 profile and backup support
-- Adds optional staff avatar fields and a public staff avatar bucket.
-- No historical data is deleted or reset.
-- =========================================================

alter table public.staffs
add column if not exists avatar_url text;

alter table public.staffs
add column if not exists avatar_path text;

insert into "storage"."buckets" (id, name, public, file_size_limit, allowed_mime_types)
values (
  'staff-avatars',
  'staff-avatars',
  true,
  2097152,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 2097152,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff avatars public read" on "storage"."objects";
create policy "staff avatars public read"
on "storage"."objects" for select
to public
using (bucket_id = 'staff-avatars');

drop policy if exists "staff avatars own insert" on "storage"."objects";
create policy "staff avatars own insert"
on "storage"."objects" for insert
to authenticated
with check (
  bucket_id = 'staff-avatars'
  and exists (
    select 1
    from public.staffs s
    where s.auth_user_id = auth.uid()
      and name like s.id::text || '/%'
  )
);

drop policy if exists "staff avatars own update" on "storage"."objects";
create policy "staff avatars own update"
on "storage"."objects" for update
to authenticated
using (
  bucket_id = 'staff-avatars'
  and exists (
    select 1
    from public.staffs s
    where s.auth_user_id = auth.uid()
      and name like s.id::text || '/%'
  )
)
with check (
  bucket_id = 'staff-avatars'
  and exists (
    select 1
    from public.staffs s
    where s.auth_user_id = auth.uid()
      and name like s.id::text || '/%'
  )
);

drop policy if exists "staff avatars own delete" on "storage"."objects";
create policy "staff avatars own delete"
on "storage"."objects" for delete
to authenticated
using (
  bucket_id = 'staff-avatars'
  and exists (
    select 1
    from public.staffs s
    where s.auth_user_id = auth.uid()
      and name like s.id::text || '/%'
  )
);
