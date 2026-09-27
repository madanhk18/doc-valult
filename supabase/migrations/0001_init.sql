-- supabase/migrations/0001_init.sql

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  doc_number text,
  holder_name text,
  issue_date date,
  expiry_date date,
  file_path text not null,
  notes text,
  tags text[] not null default '{}',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_user_id_idx on documents(user_id);
create index documents_expiry_date_idx on documents(expiry_date) where not archived;

create table notification_recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, email)
);

create table notification_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  recipient text not null,
  day_offset int not null,
  sent_at timestamptz not null default now(),
  status text not null default 'sent',
  unique (document_id, recipient, day_offset)
);

alter table documents enable row level security;
alter table notification_recipients enable row level security;
alter table notification_logs enable row level security;

create policy "documents_owner_all" on documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notification_recipients_owner_all" on notification_recipients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notification_logs_owner_select" on notification_logs
  for select using (
    exists (
      select 1 from documents
      where documents.id = notification_logs.document_id
      and documents.user_id = auth.uid()
    )
  );

-- updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger documents_set_updated_at
  before update on documents
  for each row execute function set_updated_at();

-- storage bucket
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_bucket_owner_select" on storage.objects
  for select using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_bucket_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_bucket_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
