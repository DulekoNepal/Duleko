-- =====================================================================
-- Duleko MVP :: 0009 :: Friends (replaces Block) + notifications
-- =====================================================================

-- ---------------------------------------------------------------------
-- friendships
-- ---------------------------------------------------------------------
create table if not exists public.friendships (
  id                   uuid primary key default gen_random_uuid(),
  requester_profile_id uuid not null references public.profiles(id) on delete cascade,
  addressee_profile_id uuid not null references public.profiles(id) on delete cascade,
  status               text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (requester_profile_id, addressee_profile_id),
  constraint no_self_friend check (requester_profile_id <> addressee_profile_id)
);

create index if not exists friendships_addressee_idx on public.friendships (addressee_profile_id, status);
create index if not exists friendships_requester_idx on public.friendships (requester_profile_id, status);

drop trigger if exists trg_friendships_touch on public.friendships;
create trigger trg_friendships_touch before update on public.friendships
  for each row execute function public.touch_updated_at();

-- Only the addressee may accept/decline a pending request. Either side may
-- delete a row outright (cancel a pending request, or unfriend later).
create or replace function public.guard_friendship_transition()
returns trigger language plpgsql as $$
declare
  actor uuid := public.current_profile_id();
begin
  if new.status = old.status then
    return new;
  end if;

  if not (old.status = 'pending' and new.status in ('accepted','declined')) then
    raise exception 'Invalid friendship status change: % -> %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  if actor is not null and actor <> old.addressee_profile_id then
    raise exception 'Only the recipient can accept or decline a friend request'
      using errcode = 'insufficient_privilege';
  end if;

  new.requester_profile_id := old.requester_profile_id;
  new.addressee_profile_id := old.addressee_profile_id;
  new.created_at           := old.created_at;

  return new;
end;
$$;

drop trigger if exists trg_friendships_guard on public.friendships;
create trigger trg_friendships_guard before update on public.friendships
  for each row execute function public.guard_friendship_transition();

alter table public.friendships enable row level security;

drop policy if exists friendships_read on public.friendships;
create policy friendships_read on public.friendships
  for select to authenticated
  using (public.current_profile_id() in (requester_profile_id, addressee_profile_id));

drop policy if exists friendships_insert_requester on public.friendships;
create policy friendships_insert_requester on public.friendships
  for insert to authenticated
  with check (
    requester_profile_id = public.current_profile_id()
    and addressee_profile_id <> public.current_profile_id()
    and status = 'pending'
  );

drop policy if exists friendships_update_party on public.friendships;
create policy friendships_update_party on public.friendships
  for update to authenticated
  using (public.current_profile_id() in (requester_profile_id, addressee_profile_id))
  with check (public.current_profile_id() in (requester_profile_id, addressee_profile_id));

drop policy if exists friendships_delete_party on public.friendships;
create policy friendships_delete_party on public.friendships
  for delete to authenticated
  using (public.current_profile_id() in (requester_profile_id, addressee_profile_id));

-- ---------------------------------------------------------------------
-- notifications: two new kinds
-- ---------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in
    ('request','accepted','declined','confirmed','completed','cancelled','review',
     'friend_request','friend_accepted'));

create or replace function public.notify_on_friendship()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requester_name text;
  addressee_name text;
begin
  select full_name into requester_name from public.profiles where id = new.requester_profile_id;
  select full_name into addressee_name from public.profiles where id = new.addressee_profile_id;

  if tg_op = 'INSERT' then
    insert into public.notifications
      (profile_id, kind, title_en, title_ne, body_en, body_ne, actor_name)
    values (
      new.addressee_profile_id, 'friend_request',
      'New friend request', 'नयाँ मित्र अनुरोध',
      requester_name || ' wants to add you as a friend.',
      requester_name || ' ले तपाईंलाई मित्र थप्न चाहनुहुन्छ।',
      requester_name
    );
  elsif new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into public.notifications
      (profile_id, kind, title_en, title_ne, body_en, body_ne, actor_name)
    values (
      new.requester_profile_id, 'friend_accepted',
      'Friend request accepted', 'मित्र अनुरोध स्वीकृत',
      addressee_name || ' accepted your friend request.',
      addressee_name || ' ले तपाईंको मित्र अनुरोध स्वीकार गर्नुभयो।',
      addressee_name
    );
  end if;

  return null;
end;
$$;

drop trigger if exists trg_friendships_notify on public.friendships;
create trigger trg_friendships_notify
  after insert or update on public.friendships
  for each row execute function public.notify_on_friendship();

-- ---------------------------------------------------------------------
-- Remove blocking: recreate the policies that referenced is_blocked(),
-- then drop the helper and the table.
-- ---------------------------------------------------------------------
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

drop policy if exists user_skills_read on public.user_skills;
create policy user_skills_read on public.user_skills
  for select to authenticated using (true);

drop policy if exists availability_read on public.availability;
create policy availability_read on public.availability
  for select to authenticated using (true);

drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews
  for select to authenticated using (true);

drop policy if exists engagements_insert_employer on public.work_engagements;
create policy engagements_insert_employer on public.work_engagements
  for insert to authenticated
  with check (
    employer_profile_id = public.current_profile_id()
    and worker_profile_id <> public.current_profile_id()
    and status = 'pending'
  );

drop function if exists public.is_blocked(uuid, uuid);
drop table if exists public.blocked_users;
