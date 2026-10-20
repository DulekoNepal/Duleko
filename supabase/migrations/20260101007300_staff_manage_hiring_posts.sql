-- =====================================================================
-- Duleko MVP :: 7300 :: Staff manage hiring posts too
-- =====================================================================
-- Run after 7200 (this replaces its three staff actions and its alert).
--
-- 7200 let staff edit, take down or delete service posts only. Hiring
-- posts ("I need someone") now get the same three actions, same reason,
-- same alert to the poster and the same job_post_moderation record. What
-- a hiring post adds is the workers who sent it a price offer:
--
--   take down   their waiting offers are declined and they get the usual
--               "Job closed" alert - what close_job_post() does (5800)
--   delete      the same, except the alert can't link to the post
--               (job_post_id cascades on delete), so it says why instead
--   edit        offers stay as they are; workers see the new text
--
-- A post already given to a worker (status 'assigned') can still be
-- deleted; the work request made from it carries on by itself.
-- =====================================================================

-- Staff only, either kind of post; locks the post for the change.
create or replace function public.staff_lock_post(p_job_post_id uuid)
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
  return post;
end;
$$;

revoke execute on function public.staff_lock_post(uuid) from public, anon, authenticated;

-- 7200's alert, now naming the right kind of post.
create or replace function public.record_post_moderation(
  post public.job_posts, p_action text, p_reason text, p_after jsonb, p_link boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  what_en text := case when post.kind = 'offer' then 'service post' else 'work request' end;
  what_ne text := case when post.kind = 'offer' then 'सेवा पोस्ट' else 'कामको अनुरोध' end;
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
      when 'edit'  then 'Duleko staff edited your ' || what_en
      when 'close' then 'Duleko staff took your ' || what_en || ' off the board'
      else              'Duleko staff deleted your ' || what_en
    end,
    case p_action
      when 'edit'  then 'डुलेकोको टोलीले तपाईंको ' || what_ne || ' सम्पादन गरेको छ'
      when 'close' then 'डुलेकोको टोलीले तपाईंको ' || what_ne || ' सूचीबाट हटाएको छ'
      else              'डुलेकोको टोलीले तपाईंको ' || what_ne || ' मेटाएको छ'
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
  post    public.job_posts := public.staff_lock_post(p_job_post_id);
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
  post   public.job_posts := public.staff_lock_post(p_job_post_id);
begin
  if post.status <> 'open' then
    raise exception 'JOB_NOT_OPEN' using errcode = 'P0001';
  end if;
  update public.job_posts set status = 'closed' where id = post.id;
  -- Workers waiting on a hiring post hear it closed, as when its poster closes it.
  perform public.decline_other_job_offers(post, null, false);
  perform public.record_post_moderation(post, 'close', reason, null, true);
end;
$$;

create or replace function public.staff_delete_job_post(p_job_post_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  reason text := public.moderation_reason(p_reason);
  post   public.job_posts := public.staff_lock_post(p_job_post_id);
begin
  -- Workers still waiting on an offer: told here, not linked to the post,
  -- since the post (and every alert pointing at it) is about to go.
  insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne)
  select o.worker_profile_id, 'job_closed', 'Job closed', 'काम बन्द भयो',
         post.title || ' was removed from the board, so it is no longer taking offers.',
         post.title || ' सूचीबाट हटाइएकाले अब यसमा प्रस्ताव लिइँदैन।'
    from public.job_offers o
   where o.job_post_id = post.id and o.status = 'pending';

  perform public.record_post_moderation(post, 'delete', reason, null, false);
  delete from public.job_posts where id = post.id;
end;
$$;

-- Nothing calls 7200's service-only lock any more.
drop function if exists public.staff_lock_service_post(uuid);
