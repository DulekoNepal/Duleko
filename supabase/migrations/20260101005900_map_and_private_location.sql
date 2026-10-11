-- =====================================================================
-- Duleko MVP :: 5900 :: The map, and keeping exact locations private
-- =====================================================================
-- Members agreed to share their location on the promise that others see
-- "roughly how far away you are" and that a precise location "will not be
-- publicly displayed unless you choose to share it". Until now the exact
-- point sat on profiles.lat/lng, which anyone (guests too) could read.
--
--   profile_locations   the exact point, readable and writable only by
--                       its owner. show_exact is the member's own choice
--                       ("Show my exact spot on the map"), off by default.
--
--   profiles.lat/lng    no longer hold anything: a trigger moves whatever
--                       an older app writes there into profile_locations
--                       and blanks the columns, so the leak closes the
--                       moment this runs, even before the new app ships.
--
--   map_people()        workers on the map within a box: their point
--                       snapped to a ~300 m grid unless they chose exact.
--   search_workers()    distances now come from the same snapped point.
--   job_posts.lat/lng   a post's map pin, stored already snapped.
--
-- Run after 5800 (it uses is_profile_suspended()). Safe to run more than once.

-- ---------------------------------------------------------------------
-- Snapping: the middle of a ~330 m x ~300 m cell. The same point always
-- lands in the same cell, so asking again never narrows it down.
-- ---------------------------------------------------------------------
create or replace function public.snap_coord(v double precision)
returns double precision language sql immutable as $$
  select (floor(v / 0.003) + 0.5) * 0.003;
$$;

-- ---------------------------------------------------------------------
-- The private table
-- ---------------------------------------------------------------------
create table if not exists public.profile_locations (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  lat        double precision not null check (lat between -90 and 90),
  lng        double precision not null check (lng between -180 and 180),
  show_exact boolean not null default false,
  shared_at  timestamptz not null default now()
);

alter table public.profile_locations enable row level security;

drop policy if exists profile_locations_own on public.profile_locations;
create policy profile_locations_own on public.profile_locations
  for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

-- Everything already shared moves over, then the public columns empty.
insert into public.profile_locations (profile_id, lat, lng, shared_at)
select id, lat, lng, coalesce(location_shared_at, now())
  from public.profiles
 where lat is not null and lng is not null
on conflict (profile_id) do update
  set lat = excluded.lat, lng = excluded.lng, shared_at = excluded.shared_at;

-- Older apps still write profiles.lat/lng: catch it, keep it private.
create or replace function public.profiles_keep_location_private()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.lat is not null and new.lng is not null then
    insert into public.profile_locations (profile_id, lat, lng, shared_at)
    values (new.id, new.lat, new.lng, now())
    on conflict (profile_id) do update
      set lat = excluded.lat, lng = excluded.lng, shared_at = excluded.shared_at;
    new.location_shared_at := now();
  elsif tg_op = 'UPDATE' and new.location_shared_at is null and old.location_shared_at is not null then
    -- "Stop sharing" from an older app.
    delete from public.profile_locations where profile_id = new.id;
  end if;
  new.lat := null;
  new.lng := null;
  return new;
end;
$$;

drop trigger if exists trg_profiles_location_private on public.profiles;
create trigger trg_profiles_location_private
  before insert or update of lat, lng, location_shared_at on public.profiles
  for each row execute function public.profiles_keep_location_private();

-- Fires the trigger on every row that still holds a point: blanks them.
update public.profiles set lat = null, lng = null where lat is not null or lng is not null;

-- profiles.location_shared_at follows the private row, so "Location shared
-- 2 hr ago" keeps working on Profile.
create or replace function public.sync_location_shared_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Written from the profiles trigger above, which sets the time itself;
  -- touching that same row again from in here would fail.
  if pg_trigger_depth() > 1 then
    return null;
  end if;
  if tg_op = 'DELETE' then
    update public.profiles set location_shared_at = null where id = old.profile_id;
  else
    update public.profiles set location_shared_at = new.shared_at
     where id = new.profile_id and location_shared_at is distinct from new.shared_at;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_profile_locations_shared_at on public.profile_locations;
create trigger trg_profile_locations_shared_at
  after insert or update or delete on public.profile_locations
  for each row execute function public.sync_location_shared_at();

-- ---------------------------------------------------------------------
-- Where a worker shows to others: snapped, unless they chose exact.
-- Only points shared in the last 60 days count - an old one is no
-- longer where they are.
-- ---------------------------------------------------------------------
create or replace function public.public_point(target uuid)
returns table (lat double precision, lng double precision, exact boolean)
language sql stable security definer set search_path = public as $$
  select case when pl.show_exact then pl.lat else public.snap_coord(pl.lat) end,
         case when pl.show_exact then pl.lng else public.snap_coord(pl.lng) end,
         pl.show_exact
    from public.profile_locations pl
   where pl.profile_id = target
     and pl.shared_at > now() - interval '60 days';
$$;

revoke execute on function public.public_point(uuid) from public, anon, authenticated;

create or replace function public.km_between(lat1 double precision, lng1 double precision,
                                             lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 6371 * acos(least(1, greatest(-1,
           cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1))
           + sin(radians(lat1)) * sin(radians(lat2)))));
$$;

-- ---------------------------------------------------------------------
-- The map's people
-- ---------------------------------------------------------------------
create or replace function public.map_people(
  p_south double precision,
  p_west  double precision,
  p_north double precision,
  p_east  double precision,
  p_skill text    default null,
  p_limit integer default 300
)
returns table (
  id           uuid,
  full_name    text,
  avatar_url   text,
  rating       numeric,
  rating_count integer,
  is_available boolean,
  is_verified  boolean,
  staff_role   text,
  skills       jsonb,
  lat          double precision,
  lng          double precision,
  exact        boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.avatar_url, p.rating, p.rating_count, p.is_available,
         exists (select 1 from public.profile_verifications pv where pv.profile_id = p.id),
         (select sr.role from public.staff_roles sr where sr.profile_id = p.id),
         coalesce((select jsonb_agg(jsonb_build_object(
                     'id', s.id, 'name_en', s.name_en, 'name_ne', s.name_ne,
                     'emoji', s.emoji, 'category', s.category) order by s.sort_order)
                     from public.user_skills us join public.skills s on s.id = us.skill_id
                    where us.profile_id = p.id), '[]'::jsonb),
         pt.lat, pt.lng, pt.exact
    from public.profiles p
    cross join lateral public.public_point(p.id) pt
   where p.id is distinct from public.current_profile_id()
     and not public.is_profile_suspended(p.id)
     and exists (select 1 from public.user_skills us where us.profile_id = p.id)
     and (p_skill is null or exists (
           select 1 from public.user_skills us where us.profile_id = p.id and us.skill_id = p_skill))
     and pt.lat between p_south and p_north
     and pt.lng between p_west and p_east
   order by p.is_available desc, p.rating desc, p.rating_count desc
   limit greatest(1, least(coalesce(p_limit, 300), 500));
$$;

grant execute on function public.map_people(double precision, double precision, double precision, double precision, text, integer)
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- search_workers: same shape, distances from the public point. It now
-- runs as definer (it has to read profile_locations), so it hides
-- suspended members itself, as profiles' read policy did for it.
-- ---------------------------------------------------------------------
create or replace function public.search_workers(
  p_skill        text    default null,
  p_query        text    default null,
  p_province     text    default null,
  p_district     text    default null,
  p_municipality text    default null,
  p_day          date    default null,
  p_available_only boolean default false,
  p_sort         text    default 'relevance',
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
language sql stable security definer set search_path = public as $$
  with me as (select public.current_profile_id() as pid),
  base as (
    select p.*,
           pt.lat as pub_lat, pt.lng as pub_lng,
           case when p_lat is not null and p_lng is not null and pt.lat is not null
                then public.km_between(p_lat, p_lng, pt.lat, pt.lng) end as km,
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
           ) as score
      from public.profiles p
      cross join me
      left join lateral public.public_point(p.id) pt on true
     where p.id is distinct from me.pid
       and not public.is_profile_suspended(p.id)
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
  )
  select
    b.id, b.full_name, b.about, b.avatar_url,
    b.province, b.district, b.municipality, b.ward, b.locality,
    b.is_available, b.rating, b.rating_count,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
                'id', s.id, 'name_en', s.name_en, 'name_ne', s.name_ne, 'emoji', s.emoji,
                'category', s.category)
              order by s.sort_order)
         from public.user_skills us join public.skills s on s.id = us.skill_id
        where us.profile_id = b.id),
      '[]'::jsonb),
    (p_day is null or not exists (
       select 1 from public.availability a
        where a.profile_id = b.id and a.day = p_day and a.status = 'booked')),
    b.score,
    -- Whole half-kilometres at most: a finer number would give a snapped
    -- point away again from a few different spots.
    case when b.km is null then null
         when b.km < 1 then 1::numeric
         else round((b.km * 2)::numeric) / 2 end,
    exists (select 1 from public.profile_verifications pv where pv.profile_id = b.id),
    (select sr.role from public.staff_roles sr where sr.profile_id = b.id)
  from base b
  order by
    case when p_sort = 'rating'  then b.rating end desc nulls last,
    case when p_sort = 'newest'  then b.created_at end desc nulls last,
    case when p_sort = 'nearest' then b.km end asc nulls last,
    case when p_sort = 'relevance' then b.score end desc nulls last,
    b.rating desc, b.rating_count desc, b.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.search_workers(
  text, text, text, text, text, date, boolean, text, integer, integer, double precision, double precision
) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Job posts on the map: an optional pin, kept to its ~300 m cell.
-- (The street address, if any, is what the poster typed in location_text.)
-- ---------------------------------------------------------------------
alter table public.job_posts
  add column if not exists lat double precision check (lat is null or lat between -90 and 90),
  add column if not exists lng double precision check (lng is null or lng between -180 and 180);

create index if not exists job_posts_point_idx on public.job_posts (lat, lng) where lat is not null;

create or replace function public.job_posts_snap_point()
returns trigger language plpgsql as $$
begin
  if new.lat is null or new.lng is null then
    new.lat := null;
    new.lng := null;
  else
    new.lat := public.snap_coord(new.lat);
    new.lng := public.snap_coord(new.lng);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_job_posts_snap_point on public.job_posts;
create trigger trg_job_posts_snap_point
  before insert or update of lat, lng on public.job_posts
  for each row execute function public.job_posts_snap_point();
