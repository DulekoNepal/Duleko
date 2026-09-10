-- =====================================================================
-- Duleko MVP :: 3500 :: Staff roles, profile verification, suspension
-- =====================================================================
-- Three new small tables, kept separate from `profiles` on purpose:
--   staff_roles           - who is moderator/admin/technical_admin
--   profile_verifications  - who has the verified badge, and who granted it
--   profile_suspensions    - who is currently suspended, and by whom
-- Keeping these off the profiles row means a person can never grant
-- themselves a badge or a role through the ordinary "update my own
-- profile" path - the existing profiles_update_own policy still only
-- lets someone touch their own name/bio/location/etc, never these.
--
-- Role tiers (checked with public.is_staff() / is_admin_or_above() /
-- is_technical_admin(), same SECURITY DEFINER pattern as current_profile_id()):
--   moderator         - verify/unverify any profile, read + resolve reports
--   admin             - all of the above, plus suspend/unsuspend a user
--   technical_admin   - all of the above, plus grant/revoke staff roles
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table if not exists public.staff_roles (
  profile_id  uuid primary key references public.profiles(id) on delete cascade,
  role        text not null check (role in ('moderator','admin','technical_admin')),
  granted_by  uuid references public.profiles(id) on delete set null,
  granted_at  timestamptz not null default now()
);

create table if not exists public.profile_verifications (
  profile_id  uuid primary key references public.profiles(id) on delete cascade,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz not null default now()
);

create table if not exists public.profile_suspensions (
  profile_id   uuid primary key references public.profiles(id) on delete cascade,
  suspended_by uuid references public.profiles(id) on delete set null,
  suspended_at timestamptz not null default now(),
  reason       text check (reason is null or char_length(reason) <= 300)
);

-- Reports gain a resolution trail - who closed it out and when, on top
-- of the status the reports_insert_own policy already lets anyone set
-- implicitly via the default.
alter table public.reports add column if not exists resolved_by uuid references public.profiles(id) on delete set null;
alter table public.reports add column if not exists resolved_at timestamptz;

-- ---------------------------------------------------------------------
-- Identity helpers (SECURITY DEFINER so RLS policies never recurse) -
-- same pattern as current_profile_id()/is_blocked() in 0002.
-- ---------------------------------------------------------------------
create or replace function public.current_staff_role()
returns text
language sql stable security definer set search_path = public as $$
  select role from public.staff_roles where profile_id = public.current_profile_id();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_roles where profile_id = public.current_profile_id());
$$;

create or replace function public.is_admin_or_above()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff_roles
     where profile_id = public.current_profile_id()
       and role in ('admin','technical_admin')
  );
$$;

create or replace function public.is_technical_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff_roles
     where profile_id = public.current_profile_id()
       and role = 'technical_admin'
  );
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.staff_roles           enable row level security;
alter table public.profile_verifications enable row level security;
alter table public.profile_suspensions   enable row level security;

-- staff_roles: readable by everyone, guests included - same tier as
-- profiles/skills/reviews (see 2300_guest_browsing_and_presence.sql),
-- since it is what draws the staff badge and "this person is a Duleko
-- admin" is meant to be visible while browsing, not just signed in.
-- Only a technical_admin may grant or revoke.
drop policy if exists staff_roles_read on public.staff_roles;
create policy staff_roles_read on public.staff_roles
  for select to authenticated, anon using (true);

grant select on public.staff_roles to anon;

drop policy if exists staff_roles_write on public.staff_roles;
create policy staff_roles_write on public.staff_roles
  for all to authenticated
  using (public.is_technical_admin())
  with check (public.is_technical_admin());

-- profile_verifications: readable by everyone, guests included (drives
-- the verified badge on public profile browsing). Any staff tier can
-- insert (verify) or delete (unverify); the with check pins verified_by
-- to the acting staff member so the audit trail can't be spoofed.
drop policy if exists profile_verifications_read on public.profile_verifications;
create policy profile_verifications_read on public.profile_verifications
  for select to authenticated, anon using (true);

grant select on public.profile_verifications to anon;

drop policy if exists profile_verifications_write on public.profile_verifications;
create policy profile_verifications_write on public.profile_verifications
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff() and verified_by = public.current_profile_id());

-- profile_suspensions: readable by the person themselves (so a
-- suspended account can be told why) and by staff; writable by admin
-- tier and above only - moderators cannot suspend.
drop policy if exists profile_suspensions_read on public.profile_suspensions;
create policy profile_suspensions_read on public.profile_suspensions
  for select to authenticated
  using (profile_id = public.current_profile_id() or public.is_staff());

drop policy if exists profile_suspensions_write on public.profile_suspensions;
create policy profile_suspensions_write on public.profile_suspensions
  for all to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above() and suspended_by = public.current_profile_id());

-- profiles: guest browsing (2300_guest_browsing_and_presence.sql) made
-- this a blanket `to authenticated, anon using (true)` - anon must stay
-- in the `to` list or a guest can no longer browse the directory at all.
-- The only new restriction here is hiding a suspended profile from
-- everyone except themselves and staff.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated, anon
  using (
    user_id = auth.uid()
    or public.is_staff()
    or not exists (select 1 from public.profile_suspensions ps where ps.profile_id = profiles.id)
  );

-- reports: reporters already see their own (reports_read_own, 0003).
-- Staff can see and resolve every report.
drop policy if exists reports_read_staff on public.reports;
create policy reports_read_staff on public.reports
  for select to authenticated using (public.is_staff());

drop policy if exists reports_update_staff on public.reports;
create policy reports_update_staff on public.reports
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------
-- Suspend / unsuspend - the browser cannot ban a Supabase auth user with
-- the anon key, so (same reasoning, same pattern as delete_my_account in
-- 2800) this runs as the definer and reaches into auth.users directly.
-- banned_until in the future blocks sign-in and token refresh; null lifts
-- it. An existing access token already in hand keeps working until it
-- expires (up to ~1h) - Supabase re-checks the ban on refresh, not on
-- every request, so this is "very soon", not literally instant.
-- ---------------------------------------------------------------------
create or replace function public.suspend_profile(target_profile_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  target_user_id uuid;
begin
  if not public.is_admin_or_above() then
    raise exception 'Not authorized' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.staff_roles where profile_id = target_profile_id) then
    raise exception 'Cannot suspend a staff member - revoke their role first' using errcode = 'insufficient_privilege';
  end if;

  select user_id into target_user_id from public.profiles where id = target_profile_id;
  if target_user_id is null then
    raise exception 'Profile not found';
  end if;

  insert into public.profile_suspensions (profile_id, suspended_by, reason)
  values (target_profile_id, public.current_profile_id(), p_reason)
  on conflict (profile_id) do update
    set suspended_by = excluded.suspended_by,
        reason        = excluded.reason,
        suspended_at  = now();

  update auth.users set banned_until = '2999-01-01 00:00:00+00' where id = target_user_id;
end;
$$;

revoke execute on function public.suspend_profile(uuid, text) from public, anon;
grant execute on function public.suspend_profile(uuid, text) to authenticated;

create or replace function public.unsuspend_profile(target_profile_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  target_user_id uuid;
begin
  if not public.is_admin_or_above() then
    raise exception 'Not authorized' using errcode = 'insufficient_privilege';
  end if;

  select user_id into target_user_id from public.profiles where id = target_profile_id;
  if target_user_id is null then
    raise exception 'Profile not found';
  end if;

  delete from public.profile_suspensions where profile_id = target_profile_id;
  update auth.users set banned_until = null where id = target_user_id;
end;
$$;

revoke execute on function public.unsuspend_profile(uuid) from public, anon;
grant execute on function public.unsuspend_profile(uuid) to authenticated;

-- If either UPDATE above is refused with a permissions error, the
-- function owner needs the privilege once, as the postgres role - same
-- caveat delete_my_account (2800) already carries for DELETE:
--   grant update on auth.users to postgres;

-- ---------------------------------------------------------------------
-- notifications: the 'verified' kind
-- ---------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in
    ('request','accepted','declined','confirmed','completed','cancelled','review',
     'friend_request','friend_accepted','message','welcome','verified'));

create or replace function public.notify_on_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne)
  values (
    new.profile_id, 'verified',
    'Your profile is verified', 'तपाईंको प्रोफाइल प्रमाणित भयो',
    'A Duleko moderator reviewed and verified your profile. The verified badge now shows next to your name.',
    'डुलेको मोडेरेटरले तपाईंको प्रोफाइल जाँचेर प्रमाणित गर्नुभयो। अब तपाईंको नाउँ छेउ प्रमाणित ब्याज देखिन्छ।'
  );
  return null;
end;
$$;

drop trigger if exists trg_notify_on_verification on public.profile_verifications;
create trigger trg_notify_on_verification
  after insert on public.profile_verifications
  for each row execute function public.notify_on_verification();

-- ---------------------------------------------------------------------
-- search_workers: surface is_verified + staff_role so result cards can
-- show the same badges as everywhere else. Return shape is changing,
-- so the old function must be dropped first (same as 0012).
-- ---------------------------------------------------------------------
drop function if exists public.search_workers(
  text, text, text, text, text, date, boolean, text, integer, integer, double precision, double precision);

create or replace function public.search_workers(
  p_skill        text    default null,
  p_query        text    default null,
  p_province     text    default null,
  p_district     text    default null,
  p_municipality text    default null,
  p_day          date    default null,
  p_available_only boolean default false,
  p_sort         text    default 'relevance',   -- relevance | rating | newest | nearest
  p_limit        integer default 30,
  p_offset       integer default 0,
  p_lat          double precision default null,
  p_lng          double precision default null
)
returns table (
  id           uuid,
  full_name    text,
  about        text,
  avatar_url   text,
  province     text,
  district     text,
  municipality text,
  ward         integer,
  locality     text,
  is_available boolean,
  rating       numeric,
  rating_count integer,
  skills       jsonb,
  free_on_day  boolean,
  match_score  integer,
  distance_km  numeric,
  is_verified  boolean,
  staff_role   text
)
language sql stable as $$
  with me as (select public.current_profile_id() as pid)
  select
    p.id, p.full_name, p.about, p.avatar_url,
    p.province, p.district, p.municipality, p.ward, p.locality,
    p.is_available, p.rating, p.rating_count,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
                'id', s.id, 'name_en', s.name_en, 'name_ne', s.name_ne, 'emoji', s.emoji)
              order by s.sort_order)
         from public.user_skills us join public.skills s on s.id = us.skill_id
        where us.profile_id = p.id),
      '[]'::jsonb) as skills,
    (p_day is null or not exists (
       select 1 from public.availability a
        where a.profile_id = p.id and a.day = p_day and a.status = 'booked')) as free_on_day,
    ( (case when p_municipality is not null and p.municipality = p_municipality then 100 else 0 end)
    + (case when p_district     is not null and p.district     = p_district     then 50  else 0 end)
    + (case when p_province     is not null and p.province     = p_province     then 20  else 0 end)
    + (case when p.is_available then 10 else 0 end)
    + least(round(p.rating * 2)::int, 10)
    + (case when p_query is not null and trim(p_query) <> '' and exists (
          select 1 from public.user_skills us join public.skills s on s.id = us.skill_id
           where us.profile_id = p.id
             and (s.name_en ilike '%' || p_query || '%' or s.name_ne ilike '%' || p_query || '%'
                  or similarity(s.name_en, p_query) > 0.3 or similarity(s.name_ne, p_query) > 0.3)
        ) then 30 else 0 end)
    ) as match_score,
    case
      when p_lat is not null and p_lng is not null and p.lat is not null and p.lng is not null then
        round(
          (6371 * acos(least(1, greatest(-1,
            cos(radians(p_lat)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(p_lng))
            + sin(radians(p_lat)) * sin(radians(p.lat))
          ))))::numeric, 1)
      else null
    end as distance_km,
    exists (select 1 from public.profile_verifications pv where pv.profile_id = p.id) as is_verified,
    (select sr.role from public.staff_roles sr where sr.profile_id = p.id) as staff_role
  from public.profiles p, me
  where p.id is distinct from me.pid
    and (p_skill is null or exists (
          select 1 from public.user_skills us
           where us.profile_id = p.id and us.skill_id = p_skill))
    and (p_query is null or trim(p_query) = '' or
         p.full_name ilike '%' || p_query || '%' or
         coalesce(p.about,'') ilike '%' || p_query || '%' or
         coalesce(p.locality,'') ilike '%' || p_query || '%' or
         exists (
           select 1 from public.user_skills us join public.skills s on s.id = us.skill_id
            where us.profile_id = p.id
              and (s.name_en ilike '%' || p_query || '%' or s.name_ne ilike '%' || p_query || '%'
                   or similarity(s.name_en, p_query) > 0.3 or similarity(s.name_ne, p_query) > 0.3)
         ) or
         exists (
           select 1 from public.user_skills us
            where us.profile_id = p.id and us.custom_label is not null
              and (us.custom_label ilike '%' || p_query || '%'
                   or similarity(us.custom_label, p_query) > 0.3)
         ))
    and (p_province     is null or p.province     = p_province)
    and (p_district     is null or p.district     = p_district)
    and (p_municipality is null or p.municipality = p_municipality)
    and (not p_available_only or p.is_available)
    and (p_day is null or not exists (
          select 1 from public.availability a
           where a.profile_id = p.id and a.day = p_day and a.status = 'booked'))
    and exists (select 1 from public.user_skills us where us.profile_id = p.id)
  order by
    case when p_sort = 'rating'  then p.rating end desc nulls last,
    case when p_sort = 'newest'  then p.created_at end desc nulls last,
    case when p_sort = 'nearest' and p_lat is not null and p_lng is not null and p.lat is not null and p.lng is not null then
      (6371 * acos(least(1, greatest(-1,
        cos(radians(p_lat)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(p_lng))
        + sin(radians(p_lat)) * sin(radians(p.lat))
      ))))
    end asc nulls last,
    case when p_sort = 'relevance' then
      ( (case when p_municipality is not null and p.municipality = p_municipality then 100 else 0 end)
      + (case when p_district     is not null and p.district     = p_district     then 50  else 0 end)
      + (case when p_province     is not null and p.province     = p_province     then 20  else 0 end)
      + (case when p.is_available then 10 else 0 end)
      + least(round(p.rating * 2)::int, 10)
      + (case when p_query is not null and trim(p_query) <> '' and exists (
            select 1 from public.user_skills us join public.skills s on s.id = us.skill_id
             where us.profile_id = p.id
               and (s.name_en ilike '%' || p_query || '%' or s.name_ne ilike '%' || p_query || '%'
                    or similarity(s.name_en, p_query) > 0.3 or similarity(s.name_ne, p_query) > 0.3)
          ) then 30 else 0 end)
      )
    end desc nulls last,
    p.rating desc, p.rating_count desc, p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- Dropping the function above wipes every grant it had, including the
-- anon one guest browsing added in 2300 - both must be re-granted or
-- a signed-out visitor loses search entirely.
grant execute on function public.search_workers(
  text, text, text, text, text, date, boolean, text, integer, integer, double precision, double precision
) to authenticated, anon;

-- ---------------------------------------------------------------------
-- Seed the three founding staff members.
-- ---------------------------------------------------------------------
insert into public.staff_roles (profile_id, role, granted_by, granted_at)
values
  ('b7bc1f68-7f04-4eb4-addd-df5d71db8e98', 'technical_admin', 'b7bc1f68-7f04-4eb4-addd-df5d71db8e98', now()), -- Sanjay Gupta
  ('fc5757c4-cd73-4dc0-b3d6-441c4c1dad00', 'admin',           'b7bc1f68-7f04-4eb4-addd-df5d71db8e98', now()), -- Sunil Kumar
  ('541bf85d-3b39-465f-b14d-f0267ab09b10', 'moderator',       'b7bc1f68-7f04-4eb4-addd-df5d71db8e98', now())  -- Dipendra Chaudhary
on conflict (profile_id) do update set role = excluded.role;
