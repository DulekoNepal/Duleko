-- =====================================================================
-- Duleko MVP :: 5000 :: Duleko notice board
-- =====================================================================
-- Staff (Sanjay, Sunil, Dipendra - see 3500) publish a notice: a title,
-- and text, a JPEG/PNG image, or both. Publishing it
--
--   notices --trigger--> one 'notice' alert per member (Alerts tab)
--                              |
--                              '--> 2500 outbox --> email, carrying the
--                                   image and a link to the notice
--
-- and the board itself (/notices) is readable by everyone, guests too.
-- Safe to run more than once.

-- ---------------------------------------------------------------------
-- The board
-- ---------------------------------------------------------------------
create table if not exists public.notices (
  id                uuid primary key default gen_random_uuid(),
  author_profile_id uuid references public.profiles(id) on delete set null,
  title             text not null check (char_length(trim(title)) between 3 and 120),
  body              text check (body is null or char_length(body) <= 3000),
  -- Shown as an <img> and a link in the app and in every email: a web
  -- address only, never a javascript: or data: one.
  image_url         text check (image_url is null or image_url like 'https://%'),
  created_at        timestamptz not null default now()
);

create index if not exists notices_created_idx on public.notices (created_at desc);

alter table public.notices enable row level security;

drop policy if exists notices_read on public.notices;
create policy notices_read on public.notices
  for select to authenticated, anon using (true);

grant select on public.notices to anon;

-- Any staff tier may post; author_profile_id is pinned to the poster so
-- a notice can't be put out in someone else's name.
drop policy if exists notices_insert_staff on public.notices;
create policy notices_insert_staff on public.notices
  for insert to authenticated
  with check (public.is_staff() and author_profile_id = public.current_profile_id());

-- Any staff member may take a notice down (a mistake, an expired notice).
-- Its alerts go with it - see notifications.notice_id below. Emails
-- already sent stay sent. No UPDATE: everyone was alerted to what it
-- said, so a correction is a new notice.
drop policy if exists notices_delete_staff on public.notices;
create policy notices_delete_staff on public.notices
  for delete to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------
-- Images: notices/<auth.uid()>/<file>, public like avatars and covers
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notices', 'notices', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "notice images are publicly readable" on storage.objects;
create policy "notice images are publicly readable" on storage.objects
  for select using (bucket_id = 'notices');

drop policy if exists "staff upload notice images" on storage.objects;
create policy "staff upload notice images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'notices'
    and public.is_staff()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "staff delete notice images" on storage.objects;
create policy "staff delete notice images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'notices' and public.is_staff());

-- ---------------------------------------------------------------------
-- The 'notice' alert
-- ---------------------------------------------------------------------
alter table public.notifications
  add column if not exists notice_id uuid references public.notices(id) on delete cascade;

create index if not exists notifications_notice_idx
  on public.notifications (notice_id) where notice_id is not null;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in
    ('request','accepted','declined','confirmed','completed','cancelled','review',
     'friend_request','friend_accepted','message','welcome','verified','verify_reminder',
     'announcement','notice'));

-- One alert per member, except the poster and anyone suspended. Each
-- insert goes through the 2500 delivery trigger, so everyone with email
-- on gets the same notice in their inbox. The text is the staff
-- member's own words, in whichever language they wrote it, so it goes
-- out unchanged in both columns.
create or replace function public.fan_out_notice()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  text_body text := nullif(trim(coalesce(new.body, '')), '');
begin
  insert into public.notifications
    (profile_id, kind, title_en, title_ne, body_en, body_ne, notice_id)
  select
    p.id, 'notice',
    'Notice: ' || trim(new.title),
    'सूचना: ' || trim(new.title),
    coalesce(text_body, 'A new notice from the Duleko team. Open it to see the full notice.'),
    coalesce(text_body, 'डुलेको टोलीको नयाँ सूचना। पूरा सूचना हेर्न खोल्नुहोस्।'),
    new.id
  from public.profiles p
  where p.id is distinct from new.author_profile_id
    and not exists (select 1 from public.profile_suspensions s where s.profile_id = p.id);
  return null;
end;
$$;

drop trigger if exists trg_notices_fan_out on public.notices;
create trigger trg_notices_fan_out
  after insert on public.notices
  for each row execute function public.fan_out_notice();

-- ---------------------------------------------------------------------
-- The email carries the image and opens the notice itself
-- ---------------------------------------------------------------------
-- Filled in on the outbox row rather than in the 2500 enqueue function,
-- so that function stays as it is. send-notifications reads both
-- columns; an older deploy of it simply ignores them and still sends the
-- text.
alter table public.notification_deliveries add column if not exists image_url text;
alter table public.notification_deliveries add column if not exists link_path text;

create or replace function public.decorate_notice_delivery()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'notice' and new.notification_id is not null then
    select nt.image_url, '/notices/' || nt.id
      into new.image_url, new.link_path
      from public.notifications n
      join public.notices nt on nt.id = n.notice_id
     where n.id = new.notification_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notification_deliveries_notice on public.notification_deliveries;
create trigger trg_notification_deliveries_notice
  before insert on public.notification_deliveries
  for each row execute function public.decorate_notice_delivery();
