-- Sprint 6.11.4
-- Older production databases created a body column before later app code used the message column.
-- Keep the app on the canonical message column without dropping body or existing notification data.

alter table public.notifications
add column if not exists message text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'body'
  ) then
    update public.notifications
    set message = coalesce(nullif(message, ''), nullif(body, ''), title)
    where message is null or length(trim(message)) = 0;
  else
    update public.notifications
    set message = coalesce(nullif(message, ''), title)
    where message is null or length(trim(message)) = 0;
  end if;
end $$;

alter table public.notifications
alter column message set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_message_not_empty'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_message_not_empty
      check (length(trim(message)) > 0);
  end if;
end $$;
