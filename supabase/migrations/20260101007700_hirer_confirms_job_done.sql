-- =====================================================================
-- Duleko MVP :: 7700 :: The hirer confirms that a job is done
-- =====================================================================
-- Until now either side could close a confirmed job on their own. From
-- here a worker's "Mark as done" only REPORTS it: the job stays
-- confirmed, done_reported_at is stamped, and the hirer is asked "Is the
-- work finished?" (a pop-up in the app). Their answer:
--
--   Yes, it's done  -> completed, as before (fee, reviews, alerts)
--   Not yet         -> the report is cleared and the worker is told
--
-- A hirer who never answers doesn't hold the worker up: three days after
-- the report the job completes by itself (pg_cron, hourly). A hirer can
-- still mark a job done directly - there's nobody to ask.
--
-- Older Android builds still send status = 'completed' for the worker;
-- the guard turns that into a report, so they keep working.

alter table public.work_engagements
  add column if not exists done_reported_at timestamptz;

-- ---------------------------------------------------------------------
-- The transition guard (latest: 1000), plus the report and its answer.
-- ---------------------------------------------------------------------
create or replace function public.guard_engagement_transition()
returns trigger language plpgsql as $$
declare
  actor uuid := public.current_profile_id();
begin
  -- A worker closing the job only reports it done; the hirer confirms.
  if actor is not null
     and actor = old.worker_profile_id
     and old.status = 'confirmed'
     and new.status = 'completed' then
    new.status := 'confirmed';
    new.completed_at := null;
    new.done_reported_at := coalesce(old.done_reported_at, now());
  end if;

  -- The report: only the worker files it, only on a confirmed job; only
  -- the hirer turns it down. (Staff fixing data by hand have no actor.)
  if new.done_reported_at is distinct from old.done_reported_at and actor is not null then
    if new.done_reported_at is not null then
      if actor <> old.worker_profile_id or old.status <> 'confirmed' then
        raise exception 'Only the worker can report this job as done'
          using errcode = 'insufficient_privilege';
      end if;
      new.done_reported_at := now();
    elsif actor <> old.employer_profile_id then
      raise exception 'Only the hirer can answer that this job is not done'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

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

  if actor is not null then
    if new.status in ('accepted','declined') and actor <> old.worker_profile_id then
      raise exception 'Only the worker can accept or decline this request'
        using errcode = 'insufficient_privilege';
    end if;

    if new.status = 'confirmed' and actor <> old.employer_profile_id then
      raise exception 'Only the employer can confirm this job'
        using errcode = 'insufficient_privilege';
    end if;

    if actor not in (old.employer_profile_id, old.worker_profile_id) then
      raise exception 'Only the employer or worker can change this job'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- These fields are set by the flow, never rewritten by either party.
  new.employer_profile_id := old.employer_profile_id;
  new.worker_profile_id   := old.worker_profile_id;
  new.created_at          := old.created_at;

  -- The work finished when the worker said so, not when the hirer got
  -- round to answering (it decides whether the day frees up, 2000).
  if new.status = 'completed' then
    new.completed_at := coalesce(old.done_reported_at, new.completed_at, now());
  end if;

  if new.status = 'cancelled' then
    if new.cancelled_by is null then
      new.cancelled_by = actor;
    end if;
    if new.cancellation_reason is null then
      raise exception 'A reason is required to cancel this job'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Alerts for the report and for "not yet"
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
     'post_moderated',
     'done_check','done_not_yet')) not valid;

-- notify_on_engagement (latest: 7000), plus the two new alerts.
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
    b_ne := employer_name || 'ले तपाईंलाई कामको अनुरोध पठाउनुभयो: ' || new.title;

  elsif new.status is distinct from old.status then
    case new.status
      when 'accepted' then
        recipient := new.employer_profile_id; kind := 'accepted'; actor := worker_name;
        t_en := 'Request accepted';  t_ne := 'अनुरोध स्वीकार गरियो';
        b_en := worker_name || ' accepted your request. Confirm to lock the date.';
        b_ne := worker_name || 'ले तपाईंको अनुरोध स्वीकार गर्नुभयो। मिति बुक गर्न पक्का गर्नुहोस्।';
      when 'declined' then
        recipient := new.employer_profile_id; kind := 'declined'; actor := worker_name;
        t_en := 'Request declined';  t_ne := 'अनुरोध अस्वीकार गरियो';
        b_en := worker_name || ' cannot take this job.';
        b_ne := worker_name || 'ले यो काम लिन नसक्ने जनाउनुभयो।';
      when 'confirmed' then
        recipient := new.worker_profile_id; kind := 'confirmed'; actor := employer_name;
        t_en := 'Work confirmed';    t_ne := 'काम पक्का भयो';
        b_en := employer_name || ' confirmed the job. Phone numbers are now shared.';
        b_ne := employer_name || 'ले काम पक्का गर्नुभयो। अब दुवैको फोन नम्बर देखिन्छ।';
      when 'completed' then
        recipient := case when new.cancelled_by = new.worker_profile_id
                          then new.employer_profile_id else new.worker_profile_id end;
        kind := 'completed'; actor := employer_name;
        t_en := 'Work completed';    t_ne := 'काम सम्पन्न भयो';
        b_en := 'Leave a review for ' || new.title || '.';
        b_ne := new.title || 'का लागि समीक्षा दिनुहोस्।';
      when 'cancelled' then
        recipient := case when new.cancelled_by = new.worker_profile_id
                          then new.employer_profile_id else new.worker_profile_id end;
        kind := 'cancelled'; actor := coalesce(employer_name, worker_name);
        t_en := 'Work cancelled';    t_ne := 'काम रद्द भयो';
        b_en := new.title || ' was cancelled.';
        b_ne := new.title || ' रद्द भयो।';
      else
        return null;
    end case;

  elsif new.status = 'confirmed' and old.done_reported_at is null and new.done_reported_at is not null then
    recipient := new.employer_profile_id; kind := 'done_check'; actor := worker_name;
    t_en := 'Is the work finished?';  t_ne := 'काम सकियो?';
    b_en := worker_name || ' says ' || new.title || ' is done. Please confirm.';
    b_ne := worker_name || 'ले ' || new.title || ' सकियो भन्नुभएको छ। कृपया पक्का गर्नुहोस्।';

  elsif new.status = 'confirmed' and old.done_reported_at is not null and new.done_reported_at is null then
    recipient := new.worker_profile_id; kind := 'done_not_yet'; actor := employer_name;
    t_en := 'Work not finished yet';  t_ne := 'काम अझै सकिएको छैन';
    b_en := employer_name || ' says ' || new.title || ' isn''t finished yet. Talk to them, then mark it done again.';
    b_ne := employer_name || 'ले ' || new.title || ' अझै सकिएको छैन भन्नुभएको छ। उहाँसँग कुरा गरेर फेरि सम्पन्न चिन्ह लगाउनुहोस्।';

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

-- ---------------------------------------------------------------------
-- A report the hirer never answers completes the job after three days.
-- ---------------------------------------------------------------------
create or replace function public.auto_complete_reported_jobs()
returns integer language plpgsql security definer set search_path = public as $$
declare done_count integer;
begin
  update public.work_engagements
     set status = 'completed'
   where status = 'confirmed'
     and done_reported_at < now() - interval '3 days';
  get diagnostics done_count = row_count;
  return done_count;
end;
$$;

revoke all on function public.auto_complete_reported_jobs() from public, anon, authenticated;

-- pg_cron is already on for the alert outbox (2500).
create extension if not exists pg_cron;
select cron.unschedule('complete-reported-jobs')
 where exists (select 1 from cron.job where jobname = 'complete-reported-jobs');
select cron.schedule('complete-reported-jobs', '41 * * * *', $cron$ select public.auto_complete_reported_jobs(); $cron$);
