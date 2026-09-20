-- Storage upsert is used only to retry the same generated attachment path after
-- a transient timeout. Ownership remains restricted to auth.uid().
begin;

drop policy if exists financial_photos_update_own on storage.objects;
create policy financial_photos_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'money-diary-financial-photos' and
    name like (select auth.uid())::text || '/%')
  with check (
    bucket_id = 'money-diary-financial-photos' and
    name like (select auth.uid())::text || '/%');

commit;
