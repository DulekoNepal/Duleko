-- =====================================================================
-- Duleko MVP :: 0019 :: Optional training-certificate uploads
-- Path convention: certificates/<auth.uid()>/<filename>
-- =====================================================================
create table if not exists public.certificates (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title      text not null check (char_length(trim(title)) between 1 and 100),
  file_url   text not null,
  file_type  text,
  created_at timestamptz not null default now()
);

create index if not exists certificates_profile_idx on public.certificates (profile_id, created_at desc);

alter table public.certificates enable row level security;

-- Shown on the public profile, same visibility as skills — anyone signed
-- in can see what training someone claims to have.
drop policy if exists certificates_read on public.certificates;
create policy certificates_read on public.certificates
  for select to authenticated using (true);

drop policy if exists certificates_write_own on public.certificates;
create policy certificates_write_own on public.certificates
  for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificates', 'certificates', true, 5242880,
        array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "certificates are publicly readable" on storage.objects;
create policy "certificates are publicly readable" on storage.objects
  for select using (bucket_id = 'certificates');

drop policy if exists "users upload own certificate" on storage.objects;
create policy "users upload own certificate" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users update own certificate" on storage.objects;
create policy "users update own certificate" on storage.objects
  for update to authenticated
  using (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own certificate" on storage.objects;
create policy "users delete own certificate" on storage.objects
  for delete to authenticated
  using (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);
