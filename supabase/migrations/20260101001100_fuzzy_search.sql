-- =====================================================================
-- Duleko MVP :: 0012 :: Fuzzy, skill-aware search + distance sort
-- =====================================================================
-- Fixes the real bug behind "searching plumber shows nothing useful":
-- search_workers never looked at skill names at all, only name/about/
-- locality. It also could not tolerate a typo ("plumbr"). pg_trgm gives
-- us typo-tolerant matching via similarity(), on top of a plain ILIKE
-- substring match (cheap and catches the common case).
create extension if not exists pg_trgm;

create index if not exists skills_name_en_trgm_idx on public.skills using gin (name_en gin_trgm_ops);
create index if not exists skills_name_ne_trgm_idx on public.skills using gin (name_ne gin_trgm_ops);
create index if not exists user_skills_custom_label_trgm_idx
  on public.user_skills using gin (custom_label gin_trgm_ops);

-- Return shape is changing (new distance_km column), so the old function
-- must be dropped before it can be recreated with a different signature.
drop function if exists public.search_workers(
  text, text, text, text, text, date, boolean, text, integer, integer);

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
  distance_km  numeric
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
    end as distance_km
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

grant execute on function public.search_workers(
  text, text, text, text, text, date, boolean, text, integer, integer, double precision, double precision
) to authenticated;
