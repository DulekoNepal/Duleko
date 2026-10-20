-- =====================================================================
-- Duleko MVP :: 8000 :: What a price is for - per hour, per day, per km...
-- =====================================================================
-- Run after 7900.
--
-- A post's budget (hiring) or rate (offering) can now say what it's per:
-- the whole job (null - every post so far), or per hour, day, month, km,
-- litre, kg, piece or square foot. Still optional, like the amount. It
-- shows everywhere the price does: "Rs 500 / hr".
--
-- The new-post alert (fan_out_job_post, latest 7100) carries it too.
-- Safe to run more than once.
-- =====================================================================

alter table public.job_posts
  add column if not exists price_unit text
    check (price_unit is null or price_unit in ('hour', 'day', 'month', 'km', 'litre', 'kg', 'piece', 'sqft'));

-- " / hr", " / घण्टा" - appended to job_budget_text(); null for the whole job.
create or replace function public.job_price_unit_text(unit text, lang text)
returns text language sql immutable as $$
  select case when unit is null then null
    else ' / ' || case lang
      when 'ne' then case unit
        when 'hour' then 'घण्टा' when 'day' then 'दिन' when 'month' then 'महिना'
        when 'km' then 'कि.मि.' when 'litre' then 'लिटर' when 'kg' then 'के.जी.'
        when 'piece' then 'थान' when 'sqft' then 'वर्ग फिट' end
      else case unit
        when 'hour' then 'hr' when 'day' then 'day' when 'month' then 'month'
        when 'km' then 'km' when 'litre' then 'litre' when 'kg' then 'kg'
        when 'piece' then 'piece' when 'sqft' then 'sq ft' end
    end
  end;
$$;

-- ---------------------------------------------------------------------
-- fan_out_job_post (latest: 7100), with the unit in the price
-- ---------------------------------------------------------------------
create or replace function public.fan_out_job_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  poster_name text;
  skill_en    text;
  skill_ne    text;
  -- "Rs 500 / hr": the unit rides along with the amount (8000).
  budget_en   text := public.job_budget_text(new.budget_min, new.budget_max, 'en')
                      || coalesce(public.job_price_unit_text(new.price_unit, 'en'), '');
  budget_ne   text := public.job_budget_text(new.budget_min, new.budget_max, 'ne')
                      || coalesce(public.job_price_unit_text(new.price_unit, 'ne'), '');
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
         poster_name || 'लाई ' || public.district_label(new.district, 'ne') || 'मा ' || coalesce(skill_ne || ' ', '') || 'काम चाहिएको छ'
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
