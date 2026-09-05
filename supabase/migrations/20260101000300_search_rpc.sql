-- =====================================================================
-- Duleko MVP :: 0004 :: Discovery RPC
-- SECURITY INVOKER on purpose: RLS (including blocking) still applies.
-- =====================================================================
create or replace function public.search_workers(
  p_skill        text    default null,
  p_query        text    default null,
  p_province     text    default null,
  p_district     text    default null,
  p_municipality text    default null,
  p_day          date    default null,
  p_available_only boolean default false,
  p_sort         text    default 'relevance',   -- relevance | rating | newest
  p_limit        integer default 30,
  p_offset       integer default 0
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
  match_score  integer
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
    + least(round(p.rating * 2)::int, 10) ) as match_score
  from public.profiles p, me
  where p.id is distinct from me.pid
    and (p_skill is null or exists (
          select 1 from public.user_skills us
           where us.profile_id = p.id and us.skill_id = p_skill))
    and (p_query is null or trim(p_query) = '' or
         p.full_name ilike '%' || p_query || '%' or
         coalesce(p.about,'') ilike '%' || p_query || '%' or
         coalesce(p.locality,'') ilike '%' || p_query || '%')
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
    case when p_sort = 'relevance' then
      ( (case when p_municipality is not null and p.municipality = p_municipality then 100 else 0 end)
      + (case when p_district     is not null and p.district     = p_district     then 50  else 0 end)
      + (case when p_province     is not null and p.province     = p_province     then 20  else 0 end)
      + (case when p.is_available then 10 else 0 end)
      + least(round(p.rating * 2)::int, 10) )
    end desc nulls last,
    p.rating desc, p.rating_count desc, p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.search_workers(
  text, text, text, text, text, date, boolean, text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------
-- Counts for the home screen: how many workers per skill nearby
-- ---------------------------------------------------------------------
create or replace function public.skill_counts(
  p_district text default null
)
returns table (skill_id text, worker_count bigint)
language sql stable as $$
  select us.skill_id, count(distinct p.id)
    from public.user_skills us
    join public.profiles p on p.id = us.profile_id
   where p.id is distinct from public.current_profile_id()
     and (p_district is null or p.district = p_district)
   group by us.skill_id;
$$;

grant execute on function public.skill_counts(text) to authenticated;
