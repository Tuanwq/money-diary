-- Photo Finance attaches private images to existing Account Ledger transaction IDs.
-- Account Ledger remains the only write path for money created from a photo.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('money-diary-financial-photos', 'money-diary-financial-photos', false,
  5242880, array['image/jpeg'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.money_diary_financial_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (length(source_type) between 1 and 60),
  source_id text not null check (length(source_id) between 1 and 200),
  storage_path text not null unique,
  thumbnail_path text not null unique,
  is_cover boolean not null default false,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (storage_path like owner_id::text || '/%'),
  check (thumbnail_path like owner_id::text || '/%')
);
create index if not exists financial_attachments_owner_source_idx
  on public.money_diary_financial_attachments(owner_id, source_type, source_id);
create index if not exists financial_attachments_owner_time_idx
  on public.money_diary_financial_attachments(owner_id, created_at desc);
create index if not exists financial_attachments_cleanup_idx
  on public.money_diary_financial_attachments(owner_id, deleted_at)
  where deleted_at is not null;

alter table public.money_diary_financial_attachments enable row level security;
drop policy if exists financial_attachments_select_own on public.money_diary_financial_attachments;
create policy financial_attachments_select_own on public.money_diary_financial_attachments
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists financial_attachments_insert_own on public.money_diary_financial_attachments;
create policy financial_attachments_insert_own on public.money_diary_financial_attachments
  for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists financial_attachments_update_own on public.money_diary_financial_attachments;
create policy financial_attachments_update_own on public.money_diary_financial_attachments
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
drop policy if exists financial_attachments_delete_own on public.money_diary_financial_attachments;
create policy financial_attachments_delete_own on public.money_diary_financial_attachments
  for delete to authenticated using (owner_id = (select auth.uid()));
grant select, insert, update, delete on public.money_diary_financial_attachments to authenticated;

-- storage.objects is already RLS-enabled by Supabase Storage.
drop policy if exists financial_photos_select_own on storage.objects;
create policy financial_photos_select_own on storage.objects
  for select to authenticated using (
    bucket_id = 'money-diary-financial-photos' and
    name like (select auth.uid())::text || '/%');
drop policy if exists financial_photos_insert_own on storage.objects;
create policy financial_photos_insert_own on storage.objects
  for insert to authenticated with check (
    bucket_id = 'money-diary-financial-photos' and
    name like (select auth.uid())::text || '/%');
drop policy if exists financial_photos_delete_own on storage.objects;
create policy financial_photos_delete_own on storage.objects
  for delete to authenticated using (
    bucket_id = 'money-diary-financial-photos' and
    name like (select auth.uid())::text || '/%');

commit;
