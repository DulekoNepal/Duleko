-- =====================================================================
-- Duleko MVP :: 6700 :: Two kinds of post - hiring and offering
-- =====================================================================
-- Run after 6100 (it keeps 6100's place trigger as it is).
--
-- First-release feedback, item 3: the board read as one kind of post, so
-- a member who wanted to advertise what they do (Sunil's video editing)
-- posted it as if hiring. Posts now say which they are:
--
--   kind 'hire'   "I need someone" - as before (5800): workers nearby
--                 with the skill are told, and send offers with a price.
--   kind 'offer'  "I offer a service" - an advert for the poster's own
--                 skill: what they do, where, and an optional rate.
--                 People who need it message or call the poster; there
--                 are no price offers on it and nobody is alerted.
--
-- An offer post's skill has to be one on the poster's profile, and it
-- stays on the board for 30 days (work_date is set to that last day, so
-- the board's "day not passed yet" filter takes it off by itself). The
-- same limits apply to both kinds: 5 open posts, 10 a day.
-- Every post already on the board is a 'hire' post.
-- =====================================================================

alter table public.job_posts
  add column if not exists kind text not null default 'hire'
  check (kind in ('hire', 'offer'));

create index if not exists job_posts_kind_board_idx on public.job_posts (kind, status, district, created_at desc);

-- 5800's checks, plus the offer rules above.
create or replace function public.job_posts_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.status        := 'open';
  new.engagement_id := null;
  new.offer_count   := 0;
  new.created_at    := now();
  new.updated_at    := now();
  new.kind          := coalesce(new.kind, 'hire');
  new.title         := trim(new.title);
  new.details       := nullif(trim(coalesce(new.details, '')), '');
  new.district      := trim(new.district);
  new.municipality  := nullif(trim(coalesce(new.municipality, '')), '');
  new.location_text := nullif(trim(coalesce(new.location_text, '')), '');

  if new.skill_id is null then
    raise exception 'JOB_SKILL_REQUIRED' using errcode = 'P0001';
  end if;

  if new.kind = 'offer' then
    -- An advert, not a job: no exact place, no pin, up for 30 days.
    new.location_text := null;
    new.lat           := null;
    new.lng           := null;
    new.work_date     := public.nepal_today() + 30;
    if not exists (select 1 from public.user_skills
                    where profile_id = new.employer_profile_id and skill_id = new.skill_id) then
      raise exception 'JOB_OFFER_NEEDS_SKILL' using errcode = 'P0001';
    end if;
  elsif new.work_date is null or new.work_date < public.nepal_today() then
    raise exception 'JOB_DATE_PAST' using errcode = 'P0001';
  end if;

  if public.current_profile_id() is not null then
    if public.is_profile_suspended(new.employer_profile_id) then
      raise exception 'ACCOUNT_SUSPENDED' using errcode = 'P0001';
    end if;
    if (select count(*) from public.job_posts
         where employer_profile_id = new.employer_profile_id and status = 'open') >= 5
       or (select count(*) from public.job_posts
         where employer_profile_id = new.employer_profile_id
           and created_at > now() - interval '24 hours') >= 10 then
      raise exception 'JOB_POST_LIMIT' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

-- Only a hiring post tells workers nearby (5800's fan-out, unchanged
-- otherwise - it's an AFTER trigger, so the early return is all it takes).
create or replace function public.fan_out_job_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  poster_name text;
  skill_en    text;
  skill_ne    text;
  budget_en   text := public.job_budget_text(new.budget_min, new.budget_max, 'en');
  budget_ne   text := public.job_budget_text(new.budget_min, new.budget_max, 'ne');
begin
  if new.kind = 'offer' then
    return null;
  end if;

  select full_name into poster_name from public.profiles where id = new.employer_profile_id;
  select name_en, name_ne into skill_en, skill_ne from public.skills where id = new.skill_id;

  insert into public.notifications
    (profile_id, kind, title_en, title_ne, body_en, body_ne, job_post_id, actor_name)
  select p.id, 'job_post',
         'New work near you: ' || new.title,
         'नजिकै नयाँ काम: ' || new.title,
         poster_name || ' needs ' || coalesce(skill_en, 'help') || ' work in ' || new.district
           || coalesce(' (' || budget_en || ')', '') || '. Send an offer if you can do it.',
         poster_name || 'लाई ' || new.district || 'मा ' || coalesce(skill_ne, '') || ' काम चाहिएको छ'
           || coalesce(' (' || budget_ne || ')', '') || '। गर्न सक्नुहुन्छ भने प्रस्ताव पठाउनुहोस्।',
         new.id, poster_name
    from public.profiles p
   where p.id <> new.employer_profile_id
     and p.district = new.district
     and p.is_available
     and exists (select 1 from public.user_skills us
                  where us.profile_id = p.id and us.skill_id = new.skill_id)
     and not public.is_profile_suspended(p.id)
   order by (p.municipality is not distinct from new.municipality) desc,
            p.rating desc, p.rating_count desc, p.created_at desc
   limit 30;

  return null;
end;
$$;

-- No price offers on an offer post. make_job_offer() inserts (or upserts)
-- into job_offers, so a guard on the table covers it without copying it.
create or replace function public.job_offers_only_on_hiring()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.job_posts where id = new.job_post_id and kind = 'offer') then
    raise exception 'JOB_NOT_HIRING' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_job_offers_only_on_hiring on public.job_offers;
create trigger trg_job_offers_only_on_hiring
  before insert on public.job_offers
  for each row execute function public.job_offers_only_on_hiring();
