-- =====================================================================
-- Duleko MVP :: 5300 :: Phone alerts for the Android app (no Firebase)
-- =====================================================================
-- New chat messages, work requests, friend requests and notices show in
-- the phone's notification bar with the app closed, and the launcher icon
-- shows the unread total. Without a push service the phone asks instead
-- of being told: the app's background job (PhoneAlertsWorker.java) calls
-- device_alerts() every 15 minutes - Android's shortest interval - and a
-- few minutes after the app is left:
--
--   app signs in --register_alert_device(key)--> alert_devices
--   background job --device_alerts(key)--> unread alerts since last ask
--                                           + the unread total
--
-- The job has no sign-in session (the app's own would expire or clash),
-- so each phone gets its own random key, made on the phone and handed
-- over while signed in. Only its hash is stored; it can read nothing but
-- that member's unread alert titles. Safe to run more than once.

create table if not exists public.alert_devices (
  key_hash     text primary key,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  -- Alerts newer than this are still to be shown on the phone.
  checked_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists alert_devices_profile_idx on public.alert_devices (profile_id);

-- RLS on with no policies: only the functions below touch it.
alter table public.alert_devices enable row level security;

create or replace function public.alert_key_hash(p_key text)
returns text language sql immutable set search_path = public as $$
  select encode(sha256(convert_to(p_key, 'UTF8')), 'hex');
$$;

-- After sign-in. A phone belongs to whoever signed in on it last, and
-- starts from now - nothing from before it was set up.
create or replace function public.register_alert_device(p_key text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := public.current_profile_id();
begin
  if me is null then
    raise exception 'sign in first';
  end if;
  if char_length(coalesce(p_key, '')) < 32 then
    raise exception 'device key too short';
  end if;

  insert into public.alert_devices (key_hash, profile_id)
  values (public.alert_key_hash(p_key), me)
  on conflict (key_hash) do update
    set profile_id   = excluded.profile_id,
        checked_at   = case when alert_devices.profile_id = excluded.profile_id
                            then alert_devices.checked_at else now() end,
        last_seen_at = now();

  -- Phones that stopped asking months ago (app uninstalled).
  delete from public.alert_devices where last_seen_at < now() - interval '90 days';
end;
$$;

-- On sign-out. The key alone is enough, so it works even after the
-- session has already expired.
create or replace function public.unregister_alert_device(p_key text)
returns void language sql security definer set search_path = public as $$
  delete from public.alert_devices where key_hash = public.alert_key_hash(p_key);
$$;

-- ---------------------------------------------------------------------
-- The launcher icon's number: unread alerts plus unread chats - the same
-- two counts as the Alerts and Chats tab badges (lib/queries.ts:
-- countUnread, countUnreadMessages).
-- ---------------------------------------------------------------------
create index if not exists messages_profile_a_idx on public.messages (profile_a, created_at desc);
create index if not exists messages_profile_b_idx on public.messages (profile_b, created_at desc);

create or replace function public.unread_badge_count(p_profile uuid)
returns integer language sql stable security definer set search_path = public as $$
  select (
    (select count(*)
       from public.notifications n
      where n.profile_id = p_profile
        and not n.is_read
        and n.kind <> 'message')
    +
    -- A conversation counts once, when its newest message is theirs and
    -- unread; a suspended person's thread isn't listed in the app at all.
    (select count(*)
       from (select distinct on (other) other, sender_profile_id, read_at
               from (select case when m.profile_a = p_profile then m.profile_b else m.profile_a end as other,
                            m.sender_profile_id, m.read_at, m.created_at
                       from public.messages m
                      where m.profile_a = p_profile or m.profile_b = p_profile) mine
              order by other, created_at desc) newest
      where newest.sender_profile_id <> p_profile
        and newest.read_at is null
        and not exists (select 1 from public.profile_suspensions ps where ps.profile_id = newest.other))
  )::integer;
$$;

-- ---------------------------------------------------------------------
-- What the background job asks for
-- ---------------------------------------------------------------------
-- Unread alerts since the last ask, oldest first, in the member's own
-- language, plus the unread total. Returns null for an unknown key (the
-- phone was signed out elsewhere) so the job stays quiet.
--
-- Each ask looks 5 minutes further back than the last one, so an alert
-- committed a moment late isn't skipped; the phone remembers which ids it
-- has shown and drops repeats.
create or replace function public.device_alerts(p_key text)
returns json language plpgsql security definer set search_path = public as $$
declare
  device public.alert_devices;
  lang   text;
  result json;
begin
  update public.alert_devices
     set last_seen_at = now()
   where key_hash = public.alert_key_hash(p_key)
  returning * into device;

  if not found then
    return null;
  end if;

  select p.language into lang from public.profiles p where p.id = device.profile_id;

  select json_build_object(
           'badge', public.unread_badge_count(device.profile_id),
           'alerts', coalesce(json_agg(a order by a.at), '[]'::json))
    into result
    from (
      select n.id,
             n.kind,
             n.related_profile_id,
             (extract(epoch from n.created_at) * 1000)::bigint as at,
             -- A chat reads like Messenger: the sender as the title, their
             -- words below (the stored body is "Name: words").
             case when n.kind = 'message' and n.actor_name is not null
                  then n.actor_name
                  else case when lang = 'ne' then n.title_ne else n.title_en end
             end as title,
             case when n.kind = 'message' and n.actor_name is not null
                       and left(coalesce(n.body_en, ''), char_length(n.actor_name) + 2) = n.actor_name || ': '
                  then substr(n.body_en, char_length(n.actor_name) + 3)
                  else coalesce(case when lang = 'ne' then n.body_ne else n.body_en end, '')
             end as body
        from public.notifications n
       where n.profile_id = device.profile_id
         and not n.is_read
         and n.created_at > greatest(device.checked_at - interval '5 minutes', device.created_at)
       order by n.created_at
       limit 30
    ) a;

  update public.alert_devices set checked_at = now() where key_hash = device.key_hash;
  return result;
end;
$$;

revoke execute on function public.register_alert_device(text) from public, anon;
grant execute on function public.register_alert_device(text) to authenticated;
-- The background job calls these with only the anon key.
grant execute on function public.unregister_alert_device(text) to anon, authenticated;
grant execute on function public.device_alerts(text) to anon, authenticated;
revoke execute on function public.unread_badge_count(uuid) from public, anon, authenticated;
