-- =====================================================================
-- Duleko MVP :: 6100 :: Map privacy - areas, not positions
-- =====================================================================
-- 5900 hid exact points but still left a lot findable: anyone with the
-- public key could list every worker's name, photo and ~300 m square, a
-- 300 m square in a village is close to a house, the point was the phone's
-- GPS at its last login (so it followed people), and "Show my exact spot"
-- put live GPS on the open internet. This changes all of that:
--
--   1. Signed in to see people. map_people() answers members only. Guests
--      get map_area_counts(): how many people are in each ~5 km square,
--      named after the place most of them are in - no names, no pins.
--      The search list stays public, but distances there are for members.
--
--   2. A work area, picked once. profile_locations now holds a place the
--      person chose on a map (the app stops re-sharing GPS on every
--      login), so the 60-day "it's old, hide it" rule goes too.
--
--   3. Coarser: public pins sit in the middle of a ~1 km square
--      (area_coord), and distances are whole kilometres.
--
--   4. Exact only for a shop or workshop (profile_locations.is_shop), a
--      business place the owner pinned on purpose. Otherwise the other
--      side of an accepted job can open your saved place while the job
--      is active (engagement_places()).
--
--   5. A job post's exact place is private. The "Place" text and the
--      exact pin move to job_post_places (the poster only); the post
--      shows its municipality and district, and a ~1 km pin. The chosen
--      worker gets the place on their work request, as before, and the
--      pin through engagement_places() while the request is live.
--
-- Run after 5900. Safe to run more than once.

-- ---------------------------------------------------------------------
-- The ~1 km square: the middle of a 0.01 degree cell (about 1.1 km north
-- to south, 1 km east to west in Nepal). Like snap_coord, the same point
-- always lands in the same cell, so asking again never narrows it down.
-- ---------------------------------------------------------------------
create or replace function public.area_coord(v double precision)
returns double precision language sql immutable as $$
  select (floor(v / 0.01) + 0.5) * 0.01;
$$;

-- ~5 km, for the counts guests see.
create or replace function public.wide_area_coord(v double precision)
returns double precision language sql immutable as $$
  select (floor(v / 0.05) + 0.5) * 0.05;
$$;

-- ---------------------------------------------------------------------
-- 4. Shops and workshops. show_exact (5900) followed live GPS; it is
-- retired - left in place only so the app version before this one keeps
-- loading, and ignored from now on.
-- ---------------------------------------------------------------------
alter table public.profile_locations
  add column if not exists is_shop boolean not null default false;

update public.profile_locations set show_exact = false where show_exact;

comment on column public.profile_locations.show_exact is
  'Retired by 6100 (it showed live GPS exactly). Ignored; is_shop replaced it.';
comment on column public.profile_locations.is_shop is
  'The point is a shop or workshop the owner pinned: shown exactly to signed-in members.';

-- ---------------------------------------------------------------------
-- 2. Older app builds still send the phone's GPS at every sign-in, into
-- profiles.lat/lng (see 5900). That now becomes someone's area only if
-- they have none yet - it never moves an area they already have.
-- ---------------------------------------------------------------------
create or replace function public.profiles_keep_location_private()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.lat is not null and new.lng is not null then
    insert into public.profile_locations (profile_id, lat, lng, shared_at)
    values (new.id, new.lat, new.lng, now())
    on conflict (profile_id) do nothing;
    if found then
      new.location_shared_at := now();
    elsif tg_op = 'UPDATE' then
      new.location_shared_at := old.location_shared_at;
    end if;
  elsif tg_op = 'UPDATE' and new.location_shared_at is null and old.location_shared_at is not null then
    -- "Stop sharing" from an older app.
    delete from public.profile_locations where profile_id = new.id;
  end if;
  new.lat := null;
  new.lng := null;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2 + 3 + 4. Where a person shows to others: a shop at its spot, anyone
-- else in their ~1 km square. No age limit: the point is a chosen place.
-- ---------------------------------------------------------------------
create or replace function public.public_point(target uuid)
returns table (lat double precision, lng double precision, exact boolean)
language sql stable security definer set search_path = public as $$
  select case when pl.is_shop then pl.lat else public.area_coord(pl.lat) end,
         case when pl.is_shop then pl.lng else public.area_coord(pl.lng) end,
         pl.is_shop
    from public.profile_locations pl
   where pl.profile_id = target;
$$;

revoke execute on function public.public_point(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 1. The map's people - members only. `exact` now means "a shop".
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
   where public.current_profile_id() is not null
     and p.id <> public.current_profile_id()
     and not public.is_profile_suspended(p.id)
     and exists (select 1 from public.user_skills us where us.profile_id = p.id)
     and (p_skill is null or exists (
           select 1 from public.user_skills us where us.profile_id = p.id and us.skill_id = p_skill))
     and pt.lat between p_south and p_north
     and pt.lng between p_west and p_east
   order by p.is_available desc, p.rating desc, p.rating_count desc
   limit greatest(1, least(coalesce(p_limit, 300), 500));
$$;

revoke execute on function public.map_people(double precision, double precision, double precision, double precision, text, integer)
  from public, anon;
grant execute on function public.map_people(double precision, double precision, double precision, double precision, text, integer)
  to authenticated;

-- ---------------------------------------------------------------------
-- 1. What guests see instead: a count per ~5 km square, at its middle,
-- named after the municipality (or district) most of those people are in.
-- ---------------------------------------------------------------------
create or replace function public.map_area_counts(
  p_south double precision,
  p_west  double precision,
  p_north double precision,
  p_east  double precision,
  p_skill text default null
)
returns table (
  lat          double precision,
  lng          double precision,
  people       integer,
  district     text,
  municipality text
)
language sql stable security definer set search_path = public as $$
  select public.wide_area_coord(public.area_coord(pl.lat)),
         public.wide_area_coord(public.area_coord(pl.lng)),
         count(*)::integer,
         mode() within group (order by p.district),
         mode() within group (order by p.municipality)
    from public.profiles p
    join public.profile_locations pl on pl.profile_id = p.id
   where not public.is_profile_suspended(p.id)
     and exists (select 1 from public.user_skills us where us.profile_id = p.id)
     and (p_skill is null or exists (
           select 1 from public.user_skills us where us.profile_id = p.id and us.skill_id = p_skill))
     and public.area_coord(pl.lat) between p_south - 0.05 and p_north + 0.05
     and public.area_coord(pl.lng) between p_west - 0.05 and p_east + 0.05
   group by 1, 2
   limit 500;
$$;

grant execute on function public.map_area_counts(double precision, double precision, double precision, double precision, text)
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- 1 + 3. search_workers: unchanged, except that distances (and "nearest")
-- are for signed-in members only - a guest could otherwise work out the
-- squares from a few distances - and come in whole kilometres.
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
           case when me.pid is not null and p_lat is not null and p_lng is not null and pt.lat is not null
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
    -- Whole kilometres: anything finer would give a square away again
    -- from a few different spots.
    case when b.km is null then null
         when b.km < 1 then 1::numeric
         else round(b.km::numeric) end,
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
-- 5. A job post's exact place: the poster's eyes only.
-- The key is deferrable because the row is written from job_posts' own
-- BEFORE INSERT trigger, a moment before the post itself exists.
-- ---------------------------------------------------------------------
create table if not exists public.job_post_places (
  job_post_id   uuid primary key
                references public.job_posts(id) on delete cascade
                deferrable initially deferred,
  location_text text check (location_text is null or char_length(location_text) <= 120),
  lat           double precision check (lat is null or lat between -90 and 90),
  lng           double precision check (lng is null or lng between -180 and 180)
);

alter table public.job_post_places enable row level security;

drop policy if exists job_post_places_poster on public.job_post_places;
create policy job_post_places_poster on public.job_post_places
  for select to authenticated
  using (exists (
    select 1 from public.job_posts jp
     where jp.id = job_post_places.job_post_id
       and jp.employer_profile_id = public.current_profile_id()
  ));
-- No write policies: only the trigger below writes here.

-- The public column now stays empty, so it may be null.
alter table public.job_posts drop constraint if exists job_posts_location_text_check;
alter table public.job_posts alter column location_text drop not null;

-- Whatever exact place a post arrives with goes to job_post_places; the
-- post keeps no text and a ~1 km pin. Replaces 5900's 300 m snapping.
-- (Named so it runs after trg_job_posts_before_insert, which trims.)
create or replace function public.job_posts_keep_place_private()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_point boolean := new.lat is not null and new.lng is not null
    and (tg_op = 'INSERT' or new.lat is distinct from old.lat or new.lng is distinct from old.lng);
begin
  if nullif(trim(coalesce(new.location_text, '')), '') is not null then
    insert into public.job_post_places (job_post_id, location_text)
    values (new.id, left(trim(new.location_text), 120))
    on conflict (job_post_id) do update set location_text = excluded.location_text;
  end if;

  if new_point then
    insert into public.job_post_places (job_post_id, lat, lng)
    values (new.id, new.lat, new.lng)
    on conflict (job_post_id) do update set lat = excluded.lat, lng = excluded.lng;
  end if;

  new.location_text := null;
  if new.lat is null or new.lng is null then
    new.lat := null;
    new.lng := null;
  elsif new_point then
    new.lat := public.area_coord(new.lat);
    new.lng := public.area_coord(new.lng);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_job_posts_snap_point on public.job_posts;
drop trigger if exists trg_job_posts_place_private on public.job_posts;

-- Posts already on the board: their place and pin move over, and the
-- public pin widens to its ~1 km square. (Their old pin was already a
-- ~300 m square; that becomes the private one.) Triggers are off for it,
-- so nothing is mistaken for a new place and updated_at stays as it was.
alter table public.job_posts disable trigger trg_job_posts_touch;

insert into public.job_post_places (job_post_id, location_text, lat, lng)
select id, left(trim(location_text), 120), lat, lng
  from public.job_posts
 where location_text is not null
on conflict (job_post_id) do nothing;

update public.job_posts
   set location_text = null,
       lat = public.area_coord(lat),
       lng = public.area_coord(lng)
 where location_text is not null
    or (lat is not null and lat <> public.area_coord(lat));

alter table public.job_posts enable trigger trg_job_posts_touch;

create trigger trg_job_posts_place_private
  before insert or update of lat, lng, location_text on public.job_posts
  for each row execute function public.job_posts_keep_place_private();

-- Choosing an offer: the work request still carries the place, now read
-- from the private table. Otherwise as in 5800.
create or replace function public.choose_job_offer(p_offer_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me    uuid := public.current_profile_id();
  offer public.job_offers;
  post  public.job_posts;
  place text;
  new_engagement uuid;
begin
  if me is null then
    raise exception 'You must be signed in' using errcode = 'insufficient_privilege';
  end if;

  select * into offer from public.job_offers where id = p_offer_id;
  if not found then
    raise exception 'JOB_OFFER_NOT_PENDING' using errcode = 'P0001';
  end if;

  select * into post from public.job_posts where id = offer.job_post_id for update;
  if post.employer_profile_id <> me then
    raise exception 'Only the person who posted this job can choose an offer' using errcode = 'insufficient_privilege';
  end if;
  if post.status <> 'open' then
    raise exception 'JOB_NOT_OPEN' using errcode = 'P0001';
  end if;

  -- Re-read under the post's lock: the worker may have just withdrawn.
  select * into offer from public.job_offers where id = p_offer_id;
  if offer.status <> 'pending' then
    raise exception 'JOB_OFFER_NOT_PENDING' using errcode = 'P0001';
  end if;
  if public.is_profile_suspended(offer.worker_profile_id) then
    raise exception 'JOB_OFFER_NOT_PENDING' using errcode = 'P0001';
  end if;

  select nullif(trim(coalesce(jpp.location_text, '')), '') into place
    from public.job_post_places jpp where jpp.job_post_id = post.id;

  insert into public.work_engagements
    (employer_profile_id, worker_profile_id, skill_id, title, details, work_date,
     location_text, payment_amount, status)
  values
    (post.employer_profile_id, offer.worker_profile_id, post.skill_id, post.title, post.details,
     greatest(post.work_date, public.nepal_today()),
     left(concat_ws(', ', place, nullif(post.municipality, post.district), post.district), 160),
     offer.amount, 'pending')
  returning id into new_engagement;

  update public.job_offers set status = 'accepted' where id = offer.id;
  update public.job_posts set status = 'assigned', engagement_id = new_engagement where id = post.id;
  perform public.decline_other_job_offers(post, offer.id, true);

  return new_engagement;
end;
$$;

revoke execute on function public.choose_job_offer(uuid) from public, anon;
grant execute on function public.choose_job_offer(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4 + 5. Exact places inside a job, for the two people in it:
--   'job'    the post's exact pin, if the request came from a post -
--            while it is waiting, accepted or confirmed
--   'person' the other person's saved place - once accepted, until done
-- ---------------------------------------------------------------------
create or replace function public.engagement_places(p_engagement_id uuid)
returns table (kind text, lat double precision, lng double precision, is_shop boolean)
language sql stable security definer set search_path = public as $$
  with e as (
    select we.*,
           case when we.employer_profile_id = public.current_profile_id()
                then we.worker_profile_id else we.employer_profile_id end as other_id
      from public.work_engagements we
     where we.id = p_engagement_id
       and public.current_profile_id() in (we.employer_profile_id, we.worker_profile_id)
  )
  select 'job', jpp.lat, jpp.lng, false
    from e
    join public.job_posts jp on jp.engagement_id = e.id
    join public.job_post_places jpp on jpp.job_post_id = jp.id
   where e.status in ('pending', 'accepted', 'confirmed')
     and jpp.lat is not null and jpp.lng is not null
  union all
  select 'person', pl.lat, pl.lng, pl.is_shop
    from e
    join public.profile_locations pl on pl.profile_id = e.other_id
   where e.status in ('accepted', 'confirmed');
$$;

revoke execute on function public.engagement_places(uuid) from public, anon;
grant execute on function public.engagement_places(uuid) to authenticated;
