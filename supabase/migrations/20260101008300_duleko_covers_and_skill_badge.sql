-- =====================================================================
-- Duleko MVP :: 8300 :: Duleko covers, staff titles, checked certificates
-- =====================================================================
-- Run after 8200.
--
-- 1. Covers are Duleko's own artwork now. Everyone's uploaded cover photo
--    is cleared, and a guard keeps cover_url empty from here on (old
--    Android builds that still upload one are quietly ignored). The files
--    already in the 'covers' bucket are left; empty the bucket from the
--    dashboard if wanted.
--
-- 2. Staff covers show the person's role - "Tech Lead", "Founder & Product
--    Lead", "Community Lead". staff_roles gets title_en / title_ne.
--
-- 3. Certificates are checked by staff, like ID checks. A certificate is
--    pending until a staff member approves it for one of the member's
--    skills (or rejects it, with a reason). An approved certificate gives
--    the "skill verified" half of the badge:
--
--      ID approved + certificate approved   green badge  (fully verified)
--      only one of the two                  orange badge (half verified)
--
--    skill_verifications holds the approved ones, one row per
--    certificate. Like profile_verifications, nobody can write it from
--    the app - only review_certificate() adds a row. Deleting the
--    certificate, or removing that skill, takes the row away.
--
--    Certificates already uploaded become pending and wait in the queue.
--    Rejected certificates are hidden from everyone but the owner and
--    staff.
--
-- Alerts reuse existing kinds, so the notifications check is untouched:
-- staff get 'kyc_review' (opens /staff/verify), the member gets
-- 'verified' when approved and 'kyc_result' (opens /verify) when not.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Covers
-- ---------------------------------------------------------------------
update public.profiles set cover_url = null where cover_url is not null;

create or replace function public.guard_cover_url()
returns trigger language plpgsql as $$
begin
  new.cover_url := null;
  return new;
end;
$$;

drop trigger if exists trg_profiles_cover_guard on public.profiles;
create trigger trg_profiles_cover_guard before insert or update of cover_url on public.profiles
  for each row execute function public.guard_cover_url();

drop policy if exists "users upload own cover" on storage.objects;
drop policy if exists "users update own cover" on storage.objects;

-- ---------------------------------------------------------------------
-- 2. Staff titles
-- ---------------------------------------------------------------------
alter table public.staff_roles
  add column if not exists title_en text check (title_en is null or char_length(title_en) <= 60),
  add column if not exists title_ne text check (title_ne is null or char_length(title_ne) <= 60);

update public.staff_roles sr
   set title_en = t.en, title_ne = t.ne
  from public.profiles p,
       (values ('sunil%',    'Founder & Product Lead', 'संस्थापक तथा उत्पादन प्रमुख'),
               ('sanjay%',   'Tech Lead',              'प्राविधिक प्रमुख'),
               ('dipendra%', 'Community Lead',         'समुदाय प्रमुख')) as t(pattern, en, ne)
 where p.id = sr.profile_id
   and lower(trim(p.full_name)) like t.pattern
   and sr.title_en is null;

-- ---------------------------------------------------------------------
-- 3. Certificates: status, skill, review
-- ---------------------------------------------------------------------
alter table public.certificates
  add column if not exists skill_id       text references public.skills(id) on delete set null,
  add column if not exists status         text not null default 'pending'
                                          check (status in ('pending', 'approved', 'rejected')),
  add column if not exists reviewed_by    uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at    timestamptz,
  add column if not exists rejection_code text
                                          check (rejection_code in ('unclear', 'name_mismatch', 'not_valid', 'other')),
  add column if not exists rejection_note text check (rejection_note is null or char_length(rejection_note) <= 300);

create index if not exists certificates_queue_idx
  on public.certificates (created_at) where status = 'pending';

create table if not exists public.skill_verifications (
  certificate_id uuid primary key references public.certificates(id) on delete cascade,
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  skill_id       text not null references public.skills(id) on delete cascade,
  verified_by    uuid references public.profiles(id) on delete set null,
  verified_at    timestamptz not null default now()
);

create index if not exists skill_verifications_profile_idx on public.skill_verifications (profile_id);

alter table public.skill_verifications enable row level security;
revoke insert, update, delete on public.skill_verifications from anon, authenticated;
grant select on public.skill_verifications to anon, authenticated;

drop policy if exists skill_verifications_read on public.skill_verifications;
create policy skill_verifications_read on public.skill_verifications
  for select to authenticated, anon using (true);

-- Read: everything except someone else's rejected certificate.
drop policy if exists certificates_read on public.certificates;
create policy certificates_read on public.certificates
  for select to authenticated
  using (status <> 'rejected' or profile_id = public.current_profile_id() or public.is_staff());

-- Write: the owner adds and removes; nobody edits one in place (a new
-- file is a new certificate, checked again).
drop policy if exists certificates_write_own on public.certificates;
drop policy if exists certificates_insert_own on public.certificates;
create policy certificates_insert_own on public.certificates
  for insert to authenticated
  with check (profile_id = public.current_profile_id());

drop policy if exists certificates_delete_own on public.certificates;
create policy certificates_delete_own on public.certificates
  for delete to authenticated
  using (profile_id = public.current_profile_id());

revoke update on public.certificates from anon, authenticated;

-- A new certificate always starts pending, for one of the owner's own
-- skills (or none - staff pick it then), and staff hear about it.
create or replace function public.prepare_certificate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.status := 'pending';
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.rejection_code := null;
  new.rejection_note := null;
  if new.skill_id is not null and not exists (
    select 1 from public.user_skills us where us.profile_id = new.profile_id and us.skill_id = new.skill_id
  ) then
    raise exception 'CERT_SKILL_NOT_LISTED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_certificates_prepare on public.certificates;
create trigger trg_certificates_prepare before insert on public.certificates
  for each row execute function public.prepare_certificate();

create or replace function public.notify_certificate_to_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  who text;
begin
  select full_name into who from public.profiles where id = new.profile_id;
  insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne, actor_name)
  select s.profile_id, 'kyc_review',
         'Certificate to check', 'जाँच्नुपर्ने प्रमाणपत्र',
         who || ' sent a certificate for their skill badge. Check it in ID checks.',
         who || 'ले सीप ब्याजका लागि प्रमाणपत्र पठाउनुभयो। परिचयपत्र जाँचमा हेर्नुहोस्।',
         who
    from public.staff_roles s
   where s.profile_id <> new.profile_id;
  return null;
end;
$$;

drop trigger if exists trg_certificates_notify on public.certificates;
create trigger trg_certificates_notify after insert on public.certificates
  for each row execute function public.notify_certificate_to_check();

-- A removed skill takes its certificate check with it.
create or replace function public.drop_skill_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.skill_verifications
   where profile_id = old.profile_id and skill_id = old.skill_id;
  return null;
end;
$$;

drop trigger if exists trg_user_skills_drop_verification on public.user_skills;
create trigger trg_user_skills_drop_verification after delete on public.user_skills
  for each row execute function public.drop_skill_verification();

-- A rejection reason as one sentence, in English or Nepali.
create or replace function public.cert_reason_text(code text, lang text)
returns text language sql immutable as $$
  select case code
    when 'unclear' then case when lang = 'ne' then 'फोटो धमिलो वा पढ्न गाह्रो छ।'
                             else 'The photo is blurry or hard to read.' end
    when 'name_mismatch' then case when lang = 'ne' then 'प्रमाणपत्रको नाम तपाईंको प्रोफाइलको नामसँग मिलेन।'
                                   else 'The name on the certificate does not match your profile name.' end
    when 'not_valid' then case when lang = 'ne' then 'यो तपाईंको सीपको मान्य प्रमाणपत्र होइन।'
                               else 'This is not a valid certificate for your skill.' end
    else null
  end;
$$;

-- ---------------------------------------------------------------------
-- review_certificate: staff approve (for a skill) or reject (with a reason)
-- ---------------------------------------------------------------------
create or replace function public.review_certificate(
  p_certificate uuid,
  p_approve     boolean,
  p_skill       text default null,
  p_reason      text default null,
  p_note        text default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  cert     public.certificates;
  reviewer uuid := public.current_profile_id();
  skill    text;
  skill_en text;
  skill_ne text;
  code     text;
  note     text := nullif(left(trim(coalesce(p_note, '')), 300), '');
begin
  if not public.is_staff() then
    raise exception 'Not authorized' using errcode = 'insufficient_privilege';
  end if;

  select * into cert from public.certificates where id = p_certificate for update;
  if cert.id is null then
    raise exception 'CERT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if cert.status <> 'pending' then
    raise exception 'CERT_ALREADY_REVIEWED' using errcode = 'P0001';
  end if;

  if p_approve then
    skill := coalesce(nullif(p_skill, ''), cert.skill_id);
    if skill is null then
      raise exception 'CERT_SKILL_REQUIRED' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.user_skills us where us.profile_id = cert.profile_id and us.skill_id = skill) then
      raise exception 'CERT_SKILL_NOT_LISTED' using errcode = 'P0001';
    end if;

    update public.certificates
       set status = 'approved', skill_id = skill, reviewed_by = reviewer, reviewed_at = now(),
           rejection_code = null, rejection_note = null
     where id = cert.id;
    insert into public.skill_verifications (certificate_id, profile_id, skill_id, verified_by)
    values (cert.id, cert.profile_id, skill, reviewer)
    on conflict (certificate_id) do nothing;

    select name_en, name_ne into skill_en, skill_ne from public.skills where id = skill;
    insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne)
    values (
      cert.profile_id, 'verified',
      'Your skill is verified', 'तपाईंको सीप प्रमाणित भयो',
      'Duleko checked your certificate "' || cert.title || '" and verified your ' || skill_en || ' skill.',
      'डुलेकोले तपाईंको प्रमाणपत्र "' || cert.title || '" जाँचेर तपाईंको ' || skill_ne || ' सीप प्रमाणित गर्‍यो।'
    );
    return;
  end if;

  code := coalesce(nullif(p_reason, ''), 'other');
  if code not in ('unclear', 'name_mismatch', 'not_valid', 'other') then
    raise exception 'CERT_BAD_REASON' using errcode = 'P0001';
  end if;
  if code = 'other' and note is null then
    raise exception 'CERT_REASON_REQUIRED' using errcode = 'P0001';
  end if;

  update public.certificates
     set status = 'rejected', reviewed_by = reviewer, reviewed_at = now(),
         rejection_code = code, rejection_note = note
   where id = cert.id;

  insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne)
  values (
    cert.profile_id, 'kyc_result',
    'Certificate not accepted', 'प्रमाणपत्र स्वीकृत भएन',
    concat_ws(' ', 'Duleko could not verify your certificate "' || cert.title || '".', public.cert_reason_text(code, 'en'),
              case when note is not null then rtrim(note, '.।') || '.' end,
              'Open Get verified to send another.'),
    concat_ws(' ', 'डुलेकोले तपाईंको प्रमाणपत्र "' || cert.title || '" प्रमाणित गर्न सकेन।', public.cert_reason_text(code, 'ne'),
              case when note is not null then rtrim(note, '.।') || '।' end,
              'अर्को पठाउन "प्रमाणित हुनुहोस्" खोल्नुहोस्।')
  );
end;
$$;

revoke execute on function public.review_certificate(uuid, boolean, text, text, text) from public, anon;
grant execute on function public.review_certificate(uuid, boolean, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Search and map cards learn about the skill badge
-- Same as 6500 / 6100 plus one column, skill_verified. The return type
-- changes, so each is dropped first; old app builds ignore the extra
-- column.
-- ---------------------------------------------------------------------
drop function if exists public.search_workers(
  text, text, text, text, text, date, boolean, text, integer, integer, double precision, double precision, text, text
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
  staff_role   text,
  skill_verified boolean
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
    case when b.km is null then null
         when b.km < 1 then 1::numeric
         else round(b.km::numeric) end,
    exists (select 1 from public.profile_verifications pv where pv.profile_id = b.id),
    (select sr.role from public.staff_roles sr where sr.profile_id = b.id),
    exists (select 1 from public.skill_verifications sv where sv.profile_id = b.id)
  from base b
  order by
    case when p_sort = 'rating'  then b.rating end desc nulls last,
    case when p_sort = 'newest'  then b.created_at end desc nulls last,
    case when p_sort = 'nearest' then b.km end asc nulls last,
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

drop function if exists public.map_people(double precision, double precision, double precision, double precision, text, integer);

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
  exact        boolean,
  skill_verified boolean
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
         pt.lat, pt.lng, pt.exact,
         exists (select 1 from public.skill_verifications sv where sv.profile_id = p.id)
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
