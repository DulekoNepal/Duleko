-- =====================================================================
-- Duleko MVP :: 5800 :: Job board - "Need work done? Post a job"
-- =====================================================================
-- Until now work only started one way: a hirer found a worker and sent
-- them a request. This adds the other way round:
--
--   job_posts   a member posts what they need done - the skill, a title,
--               where (district + place), the day, an optional budget.
--               Open posts are public, guests included (Home's "Recent
--               work requests" and /jobs).
--      |
--      '--> up to 30 available workers with that skill in that district
--           get a 'job_post' alert (and its email, through the 2500 outbox)
--
--   job_offers  a worker answers with their price and a note - one offer
--               per worker per post, which they can change or withdraw
--               while the post is open. The poster gets a 'job_offer' alert.
--
--   choose      the poster picks one offer. That becomes an ordinary work
--               request (work_engagements, status 'pending') to that worker
--               at the offered price, so everything after - accept, confirm,
--               phone numbers, the fee, reviews - is the existing flow,
--               unchanged. The post is marked assigned; every other offer
--               is declined and its worker told ('job_closed').
--
-- If the chosen worker then declines the request (or cancels it), the post
-- opens again for new offers. If the poster cancels it, the post closes.
--
-- Every write except creating a post goes through the functions below,
-- so job_offers has no insert/update policies at all.
-- Run after 5600 (it uses nepal_today() and fee_summary_for()).
-- Safe to run more than once.

-- ---------------------------------------------------------------------
-- Helper: is a profile suspended? (profile_suspensions is only readable
-- by the person and staff, so policies can't just look.)
-- ---------------------------------------------------------------------
create or replace function public.is_profile_suspended(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profile_suspensions where profile_id = target);
$$;

grant execute on function public.is_profile_suspended(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------
create table if not exists public.job_posts (
  id                  uuid primary key default gen_random_uuid(),
  employer_profile_id uuid not null references public.profiles(id) on delete cascade,
  skill_id            text references public.skills(id) on delete set null,
  title               text not null check (char_length(trim(title)) between 3 and 120),
  details             text check (details is null or char_length(details) <= 800),
  -- English district name, as on profiles (src/lib/nepal.ts).
  district            text not null check (char_length(trim(district)) between 2 and 60),
  municipality        text check (municipality is null or char_length(municipality) <= 80),
  -- The place itself: tole, ward, landmark.
  location_text       text not null check (char_length(trim(location_text)) between 2 and 120),
  work_date           date not null,
  budget_min          numeric(10,2) check (budget_min is null or budget_min > 0),
  budget_max          numeric(10,2) check (budget_max is null or budget_max > 0),
  status              text not null default 'open' check (status in ('open', 'assigned', 'closed')),
  -- The work request made from the chosen offer.
  engagement_id       uuid references public.work_engagements(id) on delete set null,
  -- Live offers (pending + accepted), kept by a trigger so guests can see
  -- how many there are without seeing the offers themselves.
  offer_count         integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint job_posts_budget_order check (budget_min is null or budget_max is null or budget_min <= budget_max)
);

create index if not exists job_posts_board_idx    on public.job_posts (status, district, created_at desc);
create index if not exists job_posts_employer_idx on public.job_posts (employer_profile_id, created_at desc);
create index if not exists job_posts_engagement_idx on public.job_posts (engagement_id) where engagement_id is not null;

alter table public.job_posts enable row level security;

-- Everyone may read posts, guests too - except a suspended member's,
-- which only they themselves still see.
drop policy if exists job_posts_read on public.job_posts;
create policy job_posts_read on public.job_posts
  for select to authenticated, anon
  using (
    employer_profile_id = public.current_profile_id()
    or not public.is_profile_suspended(employer_profile_id)
  );

grant select on public.job_posts to anon;

drop policy if exists job_posts_insert_own on public.job_posts;
create policy job_posts_insert_own on public.job_posts
  for insert to authenticated
  with check (employer_profile_id = public.current_profile_id() and status = 'open');

-- No update or delete policies: closing a post is close_job_post().

drop trigger if exists trg_job_posts_touch on public.job_posts;
create trigger trg_job_posts_touch before update on public.job_posts
  for each row execute function public.touch_updated_at();

-- A new post starts clean, on a day still to come, and nobody keeps more
-- than 5 open posts or posts more than 10 a day.
create or replace function public.job_posts_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.status        := 'open';
  new.engagement_id := null;
  new.offer_count   := 0;
  new.created_at    := now();
  new.updated_at    := now();
  new.title         := trim(new.title);
  new.details       := nullif(trim(coalesce(new.details, '')), '');
  new.district      := trim(new.district);
  new.municipality  := nullif(trim(coalesce(new.municipality, '')), '');
  new.location_text := trim(new.location_text);

  if new.skill_id is null then
    raise exception 'JOB_SKILL_REQUIRED' using errcode = 'P0001';
  end if;

  if new.work_date < public.nepal_today() then
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

drop trigger if exists trg_job_posts_before_insert on public.job_posts;
create trigger trg_job_posts_before_insert
  before insert on public.job_posts
  for each row execute function public.job_posts_before_insert();

-- ---------------------------------------------------------------------
-- Offers
-- ---------------------------------------------------------------------
create table if not exists public.job_offers (
  id                uuid primary key default gen_random_uuid(),
  job_post_id       uuid not null references public.job_posts(id) on delete cascade,
  worker_profile_id uuid not null references public.profiles(id) on delete cascade,
  amount            numeric(10,2) not null check (amount > 0 and amount <= 10000000),
  note              text check (note is null or char_length(note) <= 300),
  status            text not null default 'pending'
                    check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (job_post_id, worker_profile_id)
);

create index if not exists job_offers_worker_idx on public.job_offers (worker_profile_id, updated_at desc);

alter table public.job_offers enable row level security;

-- The worker sees their own offer; the poster sees every offer on their post.
drop policy if exists job_offers_read on public.job_offers;
create policy job_offers_read on public.job_offers
  for select to authenticated
  using (
    worker_profile_id = public.current_profile_id()
    or exists (
      select 1 from public.job_posts jp
       where jp.id = job_offers.job_post_id
         and jp.employer_profile_id = public.current_profile_id()
    )
  );

drop trigger if exists trg_job_offers_touch on public.job_offers;
create trigger trg_job_offers_touch before update on public.job_offers
  for each row execute function public.touch_updated_at();

create or replace function public.sync_job_offer_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post uuid := coalesce(new.job_post_id, old.job_post_id);
begin
  update public.job_posts
     set offer_count = (select count(*) from public.job_offers
                         where job_post_id = post and status in ('pending', 'accepted'))
   where id = post;
  return null;
end;
$$;

drop trigger if exists trg_job_offers_count on public.job_offers;
create trigger trg_job_offers_count
  after insert or update of status or delete on public.job_offers
  for each row execute function public.sync_job_offer_count();

-- ---------------------------------------------------------------------
-- Alerts
-- ---------------------------------------------------------------------
alter table public.notifications
  add column if not exists job_post_id uuid references public.job_posts(id) on delete cascade;

create index if not exists notifications_job_post_idx
  on public.notifications (job_post_id) where job_post_id is not null;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in
    ('request','accepted','declined','confirmed','completed','cancelled','review',
     'friend_request','friend_accepted','message','welcome','verified','verify_reminder',
     'announcement','notice','fee_payment','fee_review',
     'job_post','job_offer','job_closed'));

-- "Rs 1,000-1,500", "Rs 1,000", or nothing - for alert text.
create or replace function public.job_budget_text(lo numeric, hi numeric, lang text)
returns text language sql immutable as $$
  select case
    when lo is null and hi is null then null
    else (case when lang = 'ne' then 'रु ' else 'Rs ' end)
      || case
           when lo is not null and hi is not null and lo <> hi then
             to_char(lo, 'FM99,99,99,999') || '-' || to_char(hi, 'FM99,99,99,999')
           else to_char(coalesce(lo, hi), 'FM99,99,99,999')
         end
  end;
$$;

-- A new post reaches up to 30 workers who list that skill, are taking
-- work and live in that district - same municipality first, then the
-- best rated. Never the poster, never anyone suspended.
create or replace function public.fan_out_job_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  poster_name text;
  skill_en    text;
  skill_ne    text;
  budget_en   text := public.job_budget_text(new.budget_min, new.budget_max, 'en');
  budget_ne   text := public.job_budget_text(new.budget_min, new.budget_max, 'ne');
begin
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

drop trigger if exists trg_job_posts_fan_out on public.job_posts;
create trigger trg_job_posts_fan_out
  after insert on public.job_posts
  for each row execute function public.fan_out_job_post();

-- The email for a job alert opens the post itself (see 5000 for link_path).
create or replace function public.decorate_job_delivery()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind in ('job_post', 'job_offer', 'job_closed') and new.notification_id is not null then
    select '/jobs/' || n.job_post_id
      into new.link_path
      from public.notifications n
     where n.id = new.notification_id and n.job_post_id is not null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notification_deliveries_job on public.notification_deliveries;
create trigger trg_notification_deliveries_job
  before insert on public.notification_deliveries
  for each row execute function public.decorate_job_delivery();

-- ---------------------------------------------------------------------
-- Making, changing and withdrawing an offer
-- ---------------------------------------------------------------------
-- One call both sends a first offer and changes it later (or sends it
-- again after withdrawing). The poster hears about a new offer and about
-- a changed price, not about a note-only edit.
create or replace function public.make_job_offer(p_job_post_id uuid, p_amount numeric, p_note text default null)
returns public.job_offers
language plpgsql security definer set search_path = public as $$
declare
  me     uuid := public.current_profile_id();
  post   public.job_posts;
  before public.job_offers;
  result public.job_offers;
  worker_name text;
  money_en text;
  money_ne text;
begin
  if me is null then
    raise exception 'You must be signed in' using errcode = 'insufficient_privilege';
  end if;

  select * into post from public.job_posts where id = p_job_post_id for update;
  if not found or (public.is_profile_suspended(post.employer_profile_id) and post.employer_profile_id <> me) then
    raise exception 'JOB_NOT_FOUND' using errcode = 'P0001';
  end if;
  if post.employer_profile_id = me then
    raise exception 'JOB_OWN_POST' using errcode = 'P0001';
  end if;
  if post.status <> 'open' then
    raise exception 'JOB_NOT_OPEN' using errcode = 'P0001';
  end if;
  if post.work_date < public.nepal_today() then
    raise exception 'JOB_EXPIRED' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 10000000 then
    raise exception 'JOB_BAD_AMOUNT' using errcode = 'P0001';
  end if;
  if public.is_profile_suspended(me) then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = 'P0001';
  end if;
  -- Offers come from workers: someone who has listed what they do.
  if not exists (select 1 from public.user_skills where profile_id = me) then
    raise exception 'JOB_NEEDS_SKILLS' using errcode = 'P0001';
  end if;
  -- Same rule as accepting a request (5600): fees past due pause new work.
  if (public.fee_summary_for(me)->>'blocked')::boolean then
    raise exception 'FEES_OVERDUE' using errcode = 'P0001';
  end if;

  select * into before from public.job_offers
   where job_post_id = p_job_post_id and worker_profile_id = me;

  insert into public.job_offers (job_post_id, worker_profile_id, amount, note, status)
  values (p_job_post_id, me, round(p_amount), nullif(trim(coalesce(p_note, '')), ''), 'pending')
  on conflict (job_post_id, worker_profile_id) do update
     set amount = excluded.amount,
         note   = excluded.note,
         status = 'pending'
   where public.job_offers.status <> 'accepted'
  returning * into result;

  if result.id is null then
    raise exception 'JOB_NOT_OPEN' using errcode = 'P0001';
  end if;

  if before.id is null or before.status <> 'pending' or before.amount <> result.amount then
    select full_name into worker_name from public.profiles where id = me;
    money_en := 'Rs ' || to_char(result.amount, 'FM99,99,99,999');
    money_ne := 'रु ' || translate(to_char(result.amount, 'FM99,99,99,999'), '0123456789', '०१२३४५६७८९');
    insert into public.notifications
      (profile_id, kind, title_en, title_ne, body_en, body_ne, job_post_id, related_profile_id, actor_name)
    values (post.employer_profile_id, 'job_offer',
            case when before.id is not null and before.status = 'pending'
                 then 'Offer changed: ' || post.title else 'New offer: ' || post.title end,
            case when before.id is not null and before.status = 'pending'
                 then 'प्रस्ताव बदलियो: ' || post.title else 'नयाँ प्रस्ताव: ' || post.title end,
            worker_name || ' can do it for ' || money_en || '. Open the post to see their offer.',
            worker_name || 'ले ' || money_ne || 'मा गर्न सक्नुहुन्छ। प्रस्ताव हेर्न पोस्ट खोल्नुहोस्।',
            post.id, me, worker_name);
  end if;

  return result;
end;
$$;

create or replace function public.withdraw_job_offer(p_offer_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.job_offers
     set status = 'withdrawn'
   where id = p_offer_id
     and worker_profile_id = public.current_profile_id()
     and status = 'pending';
  if not found then
    raise exception 'JOB_OFFER_NOT_PENDING' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- The poster chooses an offer, or closes the post
-- ---------------------------------------------------------------------
-- Tell everyone whose offer is still waiting that the post is settled.
create or replace function public.decline_other_job_offers(post public.job_posts, keep uuid, chosen boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  with declined as (
    update public.job_offers
       set status = 'declined'
     where job_post_id = post.id
       and status = 'pending'
       and id is distinct from keep
    returning worker_profile_id
  )
  insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne, job_post_id)
  select d.worker_profile_id, 'job_closed',
         case when chosen then 'Offer not chosen' else 'Job closed' end,
         case when chosen then 'प्रस्ताव छानिएन' else 'काम बन्द भयो' end,
         case when chosen
              then post.title || ' went to someone else this time. Thank you for your offer.'
              else post.title || ' is no longer taking offers.' end,
         case when chosen
              then post.title || ' यसपटक अरूलाई दिइयो। प्रस्तावका लागि धन्यवाद।'
              else post.title || ' मा अब प्रस्ताव लिइँदैन।' end,
         post.id
    from declined d;
end;
$$;

revoke execute on function public.decline_other_job_offers(public.job_posts, uuid, boolean) from public, anon, authenticated;

-- Returns the new work request's id. It is a normal request to the
-- worker at their offered price: they get the usual "New work request"
-- alert and accept it in My Work, where the fee block also applies.
create or replace function public.choose_job_offer(p_offer_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me    uuid := public.current_profile_id();
  offer public.job_offers;
  post  public.job_posts;
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

  insert into public.work_engagements
    (employer_profile_id, worker_profile_id, skill_id, title, details, work_date,
     location_text, payment_amount, status)
  values
    (post.employer_profile_id, offer.worker_profile_id, post.skill_id, post.title, post.details,
     greatest(post.work_date, public.nepal_today()),
     left(post.location_text || ', ' || post.district, 160),
     offer.amount, 'pending')
  returning id into new_engagement;

  update public.job_offers set status = 'accepted' where id = offer.id;
  update public.job_posts set status = 'assigned', engagement_id = new_engagement where id = post.id;
  perform public.decline_other_job_offers(post, offer.id, true);

  return new_engagement;
end;
$$;

create or replace function public.close_job_post(p_job_post_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  post public.job_posts;
begin
  select * into post from public.job_posts
   where id = p_job_post_id and employer_profile_id = public.current_profile_id()
   for update;
  if not found then
    raise exception 'JOB_NOT_FOUND' using errcode = 'P0001';
  end if;
  if post.status <> 'open' then
    raise exception 'JOB_NOT_OPEN' using errcode = 'P0001';
  end if;

  update public.job_posts set status = 'closed' where id = post.id;
  perform public.decline_other_job_offers(post, null, false);
end;
$$;

revoke execute on function public.make_job_offer(uuid, numeric, text) from public, anon;
revoke execute on function public.withdraw_job_offer(uuid) from public, anon;
revoke execute on function public.choose_job_offer(uuid) from public, anon;
revoke execute on function public.close_job_post(uuid) from public, anon;
grant execute on function public.make_job_offer(uuid, numeric, text) to authenticated;
grant execute on function public.withdraw_job_offer(uuid) to authenticated;
grant execute on function public.choose_job_offer(uuid) to authenticated;
grant execute on function public.close_job_post(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- When the chosen worker says no
-- ---------------------------------------------------------------------
-- The worker declining the request (or cancelling it later) opens the
-- post again, if its day hasn't passed, and lets them offer again. The
-- poster cancelling it closes the post: they no longer need it.
create or replace function public.sync_job_post_from_engagement()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post public.job_posts;
begin
  if new.status is not distinct from old.status or new.status not in ('declined', 'cancelled') then
    return null;
  end if;

  select * into post from public.job_posts
   where engagement_id = new.id and status = 'assigned'
   for update;
  if not found then
    return null;
  end if;

  update public.job_offers
     set status = 'withdrawn'
   where job_post_id = post.id and worker_profile_id = new.worker_profile_id and status = 'accepted';

  if (new.status = 'declined' or new.cancelled_by = new.worker_profile_id)
     and post.work_date >= public.nepal_today() then
    update public.job_posts set status = 'open', engagement_id = null where id = post.id;
  else
    update public.job_posts set status = 'closed' where id = post.id;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_engagements_job_post on public.work_engagements;
create trigger trg_engagements_job_post
  after update of status on public.work_engagements
  for each row execute function public.sync_job_post_from_engagement();
