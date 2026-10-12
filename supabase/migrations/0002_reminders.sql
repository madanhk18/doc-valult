-- supabase/migrations/0002_reminders.sql
-- Lets each user choose which days before expiry they are reminded on.
-- Safe to run more than once.

create table if not exists reminder_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Days before expiry to send a reminder on; 0 is the expiry day itself.
  -- An empty array turns reminders off.
  days int[] not null default '{30,7,1,0}',
  updated_at timestamptz not null default now()
);

alter table reminder_settings enable row level security;

drop policy if exists "reminder_settings_owner_all" on reminder_settings;
create policy "reminder_settings_owner_all" on reminder_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists reminder_settings_set_updated_at on reminder_settings;
create trigger reminder_settings_set_updated_at
  before update on reminder_settings
  for each row execute function set_updated_at();

-- A renewed document (new expiry date) starts its reminders afresh; otherwise
-- the old cycle's "sent" rows would block the new cycle's reminders.
-- security definer: users can't delete notification_logs rows themselves.
create or replace function reset_reminder_logs_on_expiry_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.expiry_date is distinct from old.expiry_date then
    delete from notification_logs where document_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists documents_reset_reminder_logs on documents;
create trigger documents_reset_reminder_logs
  after update of expiry_date on documents
  for each row execute function reset_reminder_logs_on_expiry_change();
