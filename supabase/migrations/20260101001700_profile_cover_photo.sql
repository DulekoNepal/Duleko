-- =====================================================================
-- Duleko MVP :: 0018 :: Profile cover photo
-- Lets a worker show a work-site / professional photo behind their
-- avatar, the same way a cover photo sits behind a profile picture on
-- other social apps.
-- Path convention: covers/<auth.uid()>/<filename>
-- =====================================================================
alter table public.profiles add column if not exists cover_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 4194304,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "covers are publicly readable" on storage.objects;
create policy "covers are publicly readable" on storage.objects
  for select using (bucket_id = 'covers');

drop policy if exists "users upload own cover" on storage.objects;
create policy "users upload own cover" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users update own cover" on storage.objects;
create policy "users update own cover" on storage.objects
  for update to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own cover" on storage.objects;
create policy "users delete own cover" on storage.objects
  for delete to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
