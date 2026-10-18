-- =====================================================================
-- Duleko MVP :: 6500 :: "Nearest" that never filters anyone out
-- =====================================================================
-- Run after 6100 (this replaces its search_workers).
--
-- Tapping a skill on Home now shows everyone with that skill, anywhere
-- in Nepal, closest first (first-release feedback, item 6). Home used to
-- pass the Home area as a district filter, which hid everyone else.
--
-- search_workers takes two new, optional arguments: the searcher's
-- district and province. They only order "nearest": people with a
-- distance come first by distance (signed-in members only, as in 6100),
-- then everyone else from the same district, then the same province,
-- then the rest. A guest has no distances, so a guest gets just the
-- district/province order - nothing about anyone's square is given away.
--
-- The old 12-argument version is dropped first: two versions side by
-- side would make every call ambiguous. Old app builds keep working -
-- they simply don't send the two new arguments.
-- =====================================================================

drop function if exists public.search_workers(
  text, text, text, text, text, date, boolean, text, integer, integer, double precision, double precision
);

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
  p_lng          double precision default null,
  p_near_province text   default null,
  p_near_district text   default null
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
    -- Without a distance (a guest, no location yet, or a person with no
    -- point on the map): their district first, then their province.
    case when p_sort = 'nearest' then (p_near_district is not null and b.district = p_near_district) end desc nulls last,
    case when p_sort = 'nearest' then (p_near_province is not null and b.province = p_near_province) end desc nulls last,
    case when p_sort = 'nearest' then b.score end desc nulls last,
    case when p_sort = 'relevance' then b.score end desc nulls last,
    b.rating desc, b.rating_count desc, b.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.search_workers(
  text, text, text, text, text, date, boolean, text, integer, integer, double precision, double precision, text, text
) to anon, authenticated;
