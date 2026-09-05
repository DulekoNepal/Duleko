-- =====================================================================
-- Duleko MVP :: 0002 :: Helper functions, triggers, automation
-- =====================================================================

-- ---------------------------------------------------------------------
-- Identity helpers (SECURITY DEFINER so RLS policies never recurse)
-- ---------------------------------------------------------------------
create or replace function public.current_profile_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.profiles where user_id = auth.uid();
$$;

create or replace function public.is_blocked(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocked_users
    where (blocker_profile_id = a and blocked_profile_id = b)
       or (blocker_profile_id = b and blocked_profile_id = a)
  );
$$;

-- Phone numbers are only visible once the worker has accepted the job.
create or replace function public.can_view_contact(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select target = public.current_profile_id()
      or exists (
        select 1 from public.work_engagements e
        where e.status in ('accepted','confirmed','completed')
          and (
            (e.worker_profile_id = target   and e.employer_profile_id = public.current_profile_id())
         or (e.employer_profile_id = target and e.worker_profile_id   = public.current_profile_id())
          )
      );
$$;

create or replace function public.is_engagement_party(e_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.work_engagements e
    where e.id = e_id
      and public.current_profile_id() in (e.employer_profile_id, e.worker_profile_id)
  );
$$;

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_engagements_touch on public.work_engagements;
create trigger trg_engagements_touch before update on public.work_engagements
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_contacts_touch on public.profile_contacts;
create trigger trg_contacts_touch before update on public.profile_contacts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Rating recalculation
-- ---------------------------------------------------------------------
create or replace function public.recalculate_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target uuid := coalesce(new.reviewee_profile_id, old.reviewee_profile_id);
begin
  update public.profiles p
     set rating = coalesce((select round(avg(r.rating)::numeric, 2)
                              from public.reviews r where r.reviewee_profile_id = target), 0),
         rating_count = (select count(*) from public.reviews r where r.reviewee_profile_id = target)
   where p.id = target;
  return null;
end;
$$;

drop trigger if exists trg_reviews_recalculate on public.reviews;
create trigger trg_reviews_recalculate
  after insert or update or delete on public.reviews
  for each row execute function public.recalculate_rating();

-- ---------------------------------------------------------------------
-- Status transition guard
--   pending  -> accepted | declined | cancelled
--   accepted -> confirmed | cancelled
--   confirmed-> completed | cancelled
-- ---------------------------------------------------------------------
create or replace function public.guard_engagement_transition()
returns trigger language plpgsql as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
       (old.status = 'pending'   and new.status in ('accepted','declined','cancelled'))
    or (old.status = 'accepted'  and new.status in ('confirmed','cancelled'))
    or (old.status = 'confirmed' and new.status in ('completed','cancelled'))
  ) then
    raise exception 'Invalid status change: % -> %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  if new.status = 'completed' and new.completed_at is null then
    new.completed_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_engagements_guard on public.work_engagements;
create trigger trg_engagements_guard before update on public.work_engagements
  for each row execute function public.guard_engagement_transition();

-- ---------------------------------------------------------------------
-- Availability bookkeeping: a confirmed job books the worker's day
-- ---------------------------------------------------------------------
create or replace function public.sync_availability()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'confirmed' then
    insert into public.availability (profile_id, day, status, engagement_id)
    values (new.worker_profile_id, new.work_date, 'booked', new.id)
    on conflict (profile_id, day)
      do update set status = 'booked', engagement_id = excluded.engagement_id;

  elsif new.status in ('declined','cancelled') then
    update public.availability
       set status = 'available', engagement_id = null
     where engagement_id = new.id;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_engagements_availability on public.work_engagements;
create trigger trg_engagements_availability
  after insert or update of status on public.work_engagements
  for each row execute function public.sync_availability();

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------
create or replace function public.notify_on_engagement()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  employer_name text;
  worker_name   text;
  recipient     uuid;
  kind          text;
  t_en text; t_ne text; b_en text; b_ne text; actor text;
begin
  select full_name into employer_name from public.profiles where id = new.employer_profile_id;
  select full_name into worker_name   from public.profiles where id = new.worker_profile_id;

  if tg_op = 'INSERT' then
    recipient := new.worker_profile_id;
    kind := 'request';
    actor := employer_name;
    t_en := 'New work request';
    t_ne := 'नयाँ कामको अनुरोध';
    b_en := employer_name || ' asked you for: ' || new.title;
    b_ne := employer_name || ' ले तपाईंलाई काम माग्नुभयो: ' || new.title;

  elsif new.status is distinct from old.status then
    case new.status
      when 'accepted' then
        recipient := new.employer_profile_id; kind := 'accepted'; actor := worker_name;
        t_en := 'Request accepted';  t_ne := 'अनुरोध स्वीकृत';
        b_en := worker_name || ' accepted your request. Confirm to lock the date.';
        b_ne := worker_name || ' ले तपाईंको अनुरोध स्वीकार गर्नुभयो। मिति पक्का गर्न पुष्टि गर्नुहोस्।';
      when 'declined' then
        recipient := new.employer_profile_id; kind := 'declined'; actor := worker_name;
        t_en := 'Request declined';  t_ne := 'अनुरोध अस्वीकृत';
        b_en := worker_name || ' cannot take this job.';
        b_ne := worker_name || ' ले यो काम लिन सक्नुहुन्न।';
      when 'confirmed' then
        recipient := new.worker_profile_id; kind := 'confirmed'; actor := employer_name;
        t_en := 'Work confirmed';    t_ne := 'काम पक्का भयो';
        b_en := employer_name || ' confirmed the job. Phone numbers are now shared.';
        b_ne := employer_name || ' ले काम पक्का गर्नुभयो। अब फोन नम्बर देखिन्छ।';
      when 'completed' then
        recipient := case when new.cancelled_by = new.worker_profile_id
                          then new.employer_profile_id else new.worker_profile_id end;
        kind := 'completed'; actor := employer_name;
        t_en := 'Work completed';    t_ne := 'काम सम्पन्न भयो';
        b_en := 'Leave a review for ' || new.title || '.';
        b_ne := new.title || ' को लागि समीक्षा दिनुहोस्।';
      when 'cancelled' then
        recipient := case when new.cancelled_by = new.worker_profile_id
                          then new.employer_profile_id else new.worker_profile_id end;
        kind := 'cancelled'; actor := coalesce(employer_name, worker_name);
        t_en := 'Work cancelled';    t_ne := 'काम रद्द भयो';
        b_en := new.title || ' was cancelled.';
        b_ne := new.title || ' रद्द गरिएको छ।';
      else
        return null;
    end case;
  else
    return null;
  end if;

  insert into public.notifications
    (profile_id, kind, title_en, title_ne, body_en, body_ne, engagement_id, actor_name)
  values (recipient, kind, t_en, t_ne, b_en, b_ne, new.id, actor);

  -- On completion notify both sides so each can review the other.
  if tg_op = 'UPDATE' and new.status = 'completed' then
    insert into public.notifications
      (profile_id, kind, title_en, title_ne, body_en, body_ne, engagement_id, actor_name)
    select case when recipient = new.worker_profile_id
                then new.employer_profile_id else new.worker_profile_id end,
           kind, t_en, t_ne, b_en, b_ne, new.id, actor;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_engagements_notify on public.work_engagements;
create trigger trg_engagements_notify
  after insert or update on public.work_engagements
  for each row execute function public.notify_on_engagement();

create or replace function public.notify_on_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare reviewer_name text;
begin
  select full_name into reviewer_name from public.profiles where id = new.reviewer_profile_id;

  insert into public.notifications
    (profile_id, kind, title_en, title_ne, body_en, body_ne, engagement_id, actor_name)
  values (new.reviewee_profile_id, 'review',
          'New review', 'नयाँ समीक्षा',
          reviewer_name || ' rated you ' || new.rating || ' out of 5.',
          reviewer_name || ' ले तपाईंलाई ५ मध्ये ' || new.rating || ' दिनुभयो।',
          new.engagement_id, reviewer_name);
  return null;
end;
$$;

drop trigger if exists trg_reviews_notify on public.reviews;
create trigger trg_reviews_notify after insert on public.reviews
  for each row execute function public.notify_on_review();
