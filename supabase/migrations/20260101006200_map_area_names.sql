-- =====================================================================
-- Duleko MVP :: 6200 :: Name each guest map area after one real place
-- =====================================================================
-- map_area_counts (6100) named an area by its most common district and,
-- separately, its most common municipality. Where people from two places
-- share a ~5 km square the two could come from different people: the
-- square at Butwal came out as "Butwal Sub-Metropolitan City" in
-- Kapilvastu, and its "See the list" opened Kapilvastu's list.
--
-- Now the name is the most common district + municipality pair, as people
-- actually gave it. On a tie, a pair with a municipality wins (it makes a
-- better name), then alphabetical, so the same square always gets the
-- same name. Counts and squares are unchanged.
--
-- Run after 6100. Safe to run more than once.

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
  with here as (
    select public.wide_area_coord(public.area_coord(pl.lat)) as cell_lat,
           public.wide_area_coord(public.area_coord(pl.lng)) as cell_lng,
           p.district,
           p.municipality
      from public.profiles p
      join public.profile_locations pl on pl.profile_id = p.id
     where not public.is_profile_suspended(p.id)
       and exists (select 1 from public.user_skills us where us.profile_id = p.id)
       and (p_skill is null or exists (
             select 1 from public.user_skills us where us.profile_id = p.id and us.skill_id = p_skill))
       and public.area_coord(pl.lat) between p_south - 0.05 and p_north + 0.05
       and public.area_coord(pl.lng) between p_west - 0.05 and p_east + 0.05
  ),
  squares as (
    select cell_lat, cell_lng, count(*)::integer as people
      from here
     group by cell_lat, cell_lng
  ),
  names as (
    select distinct on (cell_lat, cell_lng) cell_lat, cell_lng, district, municipality
      from here
     group by cell_lat, cell_lng, district, municipality
     order by cell_lat, cell_lng, count(*) desc, (municipality is null), district, municipality
  )
  select s.cell_lat, s.cell_lng, s.people, n.district, n.municipality
    from squares s
    join names n using (cell_lat, cell_lng)
   limit 500;
$$;

grant execute on function public.map_area_counts(double precision, double precision, double precision, double precision, text)
  to anon, authenticated;
