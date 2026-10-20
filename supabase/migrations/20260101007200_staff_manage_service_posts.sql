-- =====================================================================
-- Duleko MVP :: 7200 :: Staff manage service posts, with a reason
-- =====================================================================
-- Run after 7100 (and 6800, whose notification kinds this extends).
--
-- Staff - all three tiers, the same is_staff() the ID checks use - can
-- now act on any member's service post (kind 'offer', 6700):
--
--   staff_edit_job_post()    fix its title, details or rate
--   staff_close_job_post()   take it off the board; the poster still
--                            sees it, closed, under My posts
--   staff_delete_job_post()  delete it for good
--
-- Each one needs a reason (5-500 characters). The poster gets a
-- 'post_moderated' alert carrying that reason - in the app, on their
-- phone and by email, like every other alert - and every action is kept
-- in job_post_moderation, which only staff can read. Hiring posts are
-- left alone: they carry workers' price offers and work requests.
-- Posters still can't edit their own posts; that hasn't changed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- The record: who did what to which post, and why
-- ---------------------------------------------------------------------
create table if not exists public.job_post_moderation (
  id                uuid primary key default gen_random_uuid(),
  -- No foreign key: the record outlives a deleted post.
  job_post_id       uuid not null,
  poster_profile_id uuid references public.profiles(id) on delete set null,
  staff_profile_id  uuid references public.profiles(id) on delete set null,
  action            text not null check (action in ('edit', 'close', 'delete')),
  reason            text not null check (char_length(reason) between 5 and 500),
  -- The post as it was before, and (for an edit) as it became.
  before            jsonb not null,
  after             jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists job_post_moderation_post_idx on public.job_post_moderation (job_post_id, created_at desc);
create index if not exists job_post_moderation_recent_idx on public.job_post_moderation (created_at desc);

alter table public.job_post_moderation enable row level security;

drop policy if exists job_post_moderation_staff_read on public.job_post_moderation;
create policy job_post_moderation_staff_read on public.job_post_moderation
  for select to authenticated using (public.is_staff());
-- No write policies: only the functions below write here.

-- ---------------------------------------------------------------------
-- The alert
-- ---------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in
    ('request','accepted','declined','confirmed','completed','cancelled','review',
     'friend_request','friend_accepted','message','welcome','verified','verify_reminder',
     'announcement','notice','fee_payment','fee_review',
     'job_post','job_offer','job_closed',
     'kyc_review','kyc_result',
     'call_deal',
     'post_moderated'));

-- The alert email opens the post, or My posts once it's deleted (see
-- 5000 for link_path).
create or replace function public.decorate_moderation_delivery()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'post_moderated' and new.notification_id is not null then
    select coalesce('/jobs/' || n.job_post_id, '/work?role=employer&view=posts')
      into new.link_path
      from public.notifications n
     where n.id = new.notification_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notification_deliveries_moderation on public.notification_deliveries;
create trigger trg_notification_deliveries_moderation
  before insert on public.notification_deliveries
  for each row execute function public.decorate_moderation_delivery();

-- ---------------------------------------------------------------------
-- Shared steps
-- ---------------------------------------------------------------------

-- The reason, trimmed - or MOD_REASON_REQUIRED if it's too short to say anything.
create or replace function public.moderation_reason(p_reason text)
returns text language plpgsql immutable set search_path = public as $$
declare
  reason text := trim(coalesce(p_reason, ''));
begin
  if char_length(reason) < 5 then
    raise exception 'MOD_REASON_REQUIRED' using errcode = 'P0001';
  end if;
  return left(reason, 500);
end;
$$;

-- Staff only, service posts only; locks the post for the change.
create or replace function public.staff_lock_service_post(p_job_post_id uuid)
returns public.job_posts
language plpgsql security definer set search_path = public as $$
declare
  post public.job_posts;
begin
  if not public.is_staff() then
    raise exception 'Not authorized' using errcode = 'insufficient_privilege';
  end if;
  select * into post from public.job_posts where id = p_job_post_id for update;
  if not found then
    raise exception 'JOB_NOT_FOUND' using errcode = 'P0001';
  end if;
  if post.kind <> 'offer' then
    raise exception 'JOB_NOT_SERVICE' using errcode = 'P0001';
  end if;
  return post;
end;
$$;

-- What the record keeps of a post.
create or replace function public.job_post_snapshot(post public.job_posts)
returns jsonb language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'title', post.title, 'details', post.details,
    'budget_min', post.budget_min, 'budget_max', post.budget_max,
    'status', post.status, 'skill_id', post.skill_id,
    'district', post.district, 'municipality', post.municipality,
    'created_at', post.created_at);
$$;

-- Tells the poster, and keeps the record. p_link is false for a deleted
-- post: the alert can't point at a row that's about to go (job_post_id
-- cascades on delete).
create or replace function public.record_post_moderation(
  post public.job_posts, p_action text, p_reason text, p_after jsonb, p_link boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.job_post_moderation
    (job_post_id, poster_profile_id, staff_profile_id, action, reason, before, after)
  values
    (post.id, post.employer_profile_id, public.current_profile_id(), p_action, p_reason,
     public.job_post_snapshot(post), p_after);

  insert into public.notifications
    (profile_id, kind, title_en, title_ne, body_en, body_ne, job_post_id)
  values (
    post.employer_profile_id, 'post_moderated',
    case p_action
      when 'edit'  then 'Duleko staff edited your service post'
      when 'close' then 'Duleko staff took your service post off the board'
      else              'Duleko staff deleted your service post'
    end,
    case p_action
      when 'edit'  then 'डुलेकोको टोलीले तपाईंको सेवा पोस्ट सम्पादन गरेको छ'
      when 'close' then 'डुलेकोको टोलीले तपाईंको सेवा पोस्ट सूचीबाट हटाएको छ'
      else              'डुलेकोको टोलीले तपाईंको सेवा पोस्ट मेटाएको छ'
    end,
    case p_action
      when 'edit'  then '"' || post.title || '" was changed.'
      when 'close' then '"' || post.title || '" is no longer on the board. You can still see it under My posts.'
      else              '"' || post.title || '" was deleted.'
    end || ' Reason: ' || p_reason,
    case p_action
      when 'edit'  then '"' || post.title || '" परिवर्तन गरिएको छ।'
      when 'close' then '"' || post.title || '" अब सूचीमा छैन। मेरा पोस्टमा भने अझै हेर्न सक्नुहुन्छ।'
      else              '"' || post.title || '" मेटाइएको छ।'
    end || ' कारण: ' || p_reason,
    case when p_link then post.id end
  );
end;
$$;

-- ---------------------------------------------------------------------
-- The three actions
-- ---------------------------------------------------------------------
create or replace function public.staff_edit_job_post(
  p_job_post_id uuid,
  p_title       text,
  p_details     text,
  p_budget_min  numeric,
  p_budget_max  numeric,
  p_reason      text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  reason  text := public.moderation_reason(p_reason);
  post    public.job_posts := public.staff_lock_service_post(p_job_post_id);
  changed public.job_posts;
begin
  if post.status <> 'open' then
    raise exception 'JOB_NOT_OPEN' using errcode = 'P0001';
  end if;

  update public.job_posts
     set title      = trim(p_title),
         details    = nullif(trim(coalesce(p_details, '')), ''),
         budget_min = p_budget_min,
         budget_max = p_budget_max
   where id = post.id
  returning * into changed;

  if changed.title      is not distinct from post.title
     and changed.details    is not distinct from post.details
     and changed.budget_min is not distinct from post.budget_min
     and changed.budget_max is not distinct from post.budget_max then
    raise exception 'MOD_NO_CHANGE' using errcode = 'P0001';
  end if;

  perform public.record_post_moderation(post, 'edit', reason, public.job_post_snapshot(changed), true);
end;
$$;

create or replace function public.staff_close_job_post(p_job_post_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  reason text := public.moderation_reason(p_reason);
  post   public.job_posts := public.staff_lock_service_post(p_job_post_id);
begin
  if post.status <> 'open' then
    raise exception 'JOB_NOT_OPEN' using errcode = 'P0001';
  end if;
  -- A service post takes no price offers (6700), so there are none to decline.
  update public.job_posts set status = 'closed' where id = post.id;
  perform public.record_post_moderation(post, 'close', reason, null, true);
end;
$$;

create or replace function public.staff_delete_job_post(p_job_post_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  reason text := public.moderation_reason(p_reason);
  post   public.job_posts := public.staff_lock_service_post(p_job_post_id);
begin
  perform public.record_post_moderation(post, 'delete', reason, null, false);
  delete from public.job_posts where id = post.id;
end;
$$;

revoke execute on function public.staff_lock_service_post(uuid) from public, anon, authenticated;
revoke execute on function public.record_post_moderation(public.job_posts, text, text, jsonb, boolean) from public, anon, authenticated;
revoke execute on function public.staff_edit_job_post(uuid, text, text, numeric, numeric, text) from public, anon;
revoke execute on function public.staff_close_job_post(uuid, text) from public, anon;
revoke execute on function public.staff_delete_job_post(uuid, text) from public, anon;
grant execute on function public.staff_edit_job_post(uuid, text, text, numeric, numeric, text) to authenticated;
grant execute on function public.staff_close_job_post(uuid, text) to authenticated;
grant execute on function public.staff_delete_job_post(uuid, text) to authenticated;
