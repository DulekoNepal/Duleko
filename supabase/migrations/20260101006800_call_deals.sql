-- =====================================================================
-- Duleko MVP :: 6800 :: Work agreed over a phone call
-- =====================================================================
-- Run after 6400 (it adds an alert kind to 6300's list) and 5600.
--
-- First-release feedback, item 4. Many people would rather just call
-- than send a work request. Duleko keeps both ways open, and now also
-- learns what happens after a call:
--
--   contact_calls  one row per tap on Call (a profile's Call button).
--                  It measures interest, not work done. Only someone
--                  who may call that person (can_call, 4400) can log one.
--      |
--      '--> back in the app, the caller is asked about their newest
--           call: "Did you have a deal with <name>?"
--             deal        -> a call_deals row (below)
--             discussing  -> asked again in 2 days
--             no          -> done
--           (A return within a few seconds - a mis-tap - is 'short'
--           and never asked about.)
--
--   call_deals     a deal the caller reported: who, which skill, the
--                  agreed amount (optional, at most Rs 5,00,000 so one
--                  silly number can't skew the totals) and the day. The
--                  worker is asked to confirm it; if they don't answer in
--                  7 days it counts anyway. If they say it didn't happen,
--                  it's 'disputed' and doesn't count. Staff can remove one
--                  ('removed').
--
--   reviews        a deal's rating and comment wait on the deal, and are
--                  posted as an ordinary review (call_deal_id instead of
--                  engagement_id) once it counts - so nobody can rate a
--                  stranger just by tapping Call.
--
-- No Duleko fee is ever charged on a call deal: fees stay on work done
-- through Duleko's own requests (5600), which this doesn't touch.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Calls
-- ---------------------------------------------------------------------
create table if not exists public.contact_calls (
  id                uuid primary key default gen_random_uuid(),
  caller_profile_id uuid not null references public.profiles(id) on delete cascade,
  callee_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at        timestamptz not null default now(),
  outcome           text check (outcome in ('deal', 'discussing', 'no', 'short')),
  answered_at       timestamptz,
  -- 'discussing': when to ask again.
  ask_again_at      timestamptz,
  constraint contact_calls_not_self check (caller_profile_id <> callee_profile_id)
);

create index if not exists contact_calls_caller_idx on public.contact_calls (caller_profile_id, created_at desc);
create index if not exists contact_calls_callee_idx on public.contact_calls (callee_profile_id, created_at desc);
create index if not exists contact_calls_created_idx on public.contact_calls (created_at);

alter table public.contact_calls enable row level security;
revoke all on public.contact_calls from anon;
revoke insert, update, delete on public.contact_calls from authenticated;

drop policy if exists contact_calls_read on public.contact_calls;
create policy contact_calls_read on public.contact_calls
  for select to authenticated
  using (caller_profile_id = public.current_profile_id() or public.is_staff());

-- ---------------------------------------------------------------------
-- Deals
-- ---------------------------------------------------------------------
create table if not exists public.call_deals (
  id                 uuid primary key default gen_random_uuid(),
  call_id            uuid unique references public.contact_calls(id) on delete set null,
  hirer_profile_id   uuid not null references public.profiles(id) on delete cascade,
  worker_profile_id  uuid not null references public.profiles(id) on delete cascade,
  skill_id           text references public.skills(id) on delete set null,
  amount             numeric(10,2) check (amount is null or (amount > 0 and amount <= 500000)),
  deal_date          date not null,
  status             text not null default 'reported'
                     check (status in ('reported', 'confirmed', 'disputed', 'removed')),
  confirm_by         timestamptz not null default now() + interval '7 days',
  worker_answered_at timestamptz,
  -- The hirer's rating, held until the deal counts.
  rating             integer check (rating is null or rating between 1 and 5),
  comment            text check (comment is null or char_length(comment) <= 500),
  removed_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint call_deals_not_self check (hirer_profile_id <> worker_profile_id)
);

create index if not exists call_deals_worker_idx on public.call_deals (worker_profile_id, status, created_at desc);
create index if not exists call_deals_hirer_idx  on public.call_deals (hirer_profile_id, created_at desc);
create index if not exists call_deals_due_idx    on public.call_deals (confirm_by) where status = 'reported';

alter table public.call_deals enable row level security;
revoke all on public.call_deals from anon;
revoke insert, update, delete on public.call_deals from authenticated;

drop policy if exists call_deals_read on public.call_deals;
create policy call_deals_read on public.call_deals
  for select to authenticated
  using (public.current_profile_id() in (hirer_profile_id, worker_profile_id) or public.is_staff());

drop trigger if exists trg_call_deals_touch on public.call_deals;
create trigger trg_call_deals_touch before update on public.call_deals
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Reviews: from a job, or from a call deal
-- ---------------------------------------------------------------------
alter table public.reviews alter column engagement_id drop not null;
alter table public.reviews
  add column if not exists call_deal_id uuid references public.call_deals(id) on delete cascade;
alter table public.reviews drop constraint if exists reviews_one_source;
alter table public.reviews
  add constraint reviews_one_source check (num_nonnulls(engagement_id, call_deal_id) = 1);
create unique index if not exists reviews_call_deal_reviewer_key
  on public.reviews (call_deal_id, reviewer_profile_id) where call_deal_id is not null;
-- reviews_insert_party (0200) still only allows reviews of completed
-- jobs; call deal reviews are written by post_call_deal_review() alone.

-- A deal that counts posts its waiting rating as a review (once).
create or replace function public.post_call_deal_review(deal public.call_deals)
returns void language plpgsql security definer set search_path = public as $$
begin
  if deal.rating is null then
    return;
  end if;
  insert into public.reviews (call_deal_id, reviewer_profile_id, reviewee_profile_id, rating, comment)
  values (deal.id, deal.hirer_profile_id, deal.worker_profile_id, deal.rating, deal.comment)
  on conflict do nothing;
end;
$$;

revoke execute on function public.post_call_deal_review(public.call_deals) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Alerts: the worker is asked to confirm a deal
-- ---------------------------------------------------------------------
alter table public.notifications add column if not exists call_deal_id uuid
  references public.call_deals(id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in
    ('request','accepted','declined','confirmed','completed','cancelled','review',
     'friend_request','friend_accepted','message','welcome','verified','verify_reminder',
     'announcement','notice','fee_payment','fee_review',
     'job_post','job_offer','job_closed',
     'kyc_review','kyc_result',
     'call_deal'));

-- ---------------------------------------------------------------------
-- log_call: a tap on Call. Returns the call's id.
-- ---------------------------------------------------------------------
create or replace function public.log_call(p_target uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me     uuid := public.current_profile_id();
  recent uuid;
  new_id uuid;
begin
  if me is null then
    raise exception 'You must be signed in' using errcode = 'insufficient_privilege';
  end if;
  if p_target is null or p_target = me or not public.can_call(p_target) then
    raise exception 'CALL_NOT_ALLOWED' using errcode = 'P0001';
  end if;

  -- Tapping Call again a minute later is the same call.
  select id into recent from public.contact_calls
   where caller_profile_id = me and callee_profile_id = p_target
     and outcome is null and created_at > now() - interval '10 minutes'
   order by created_at desc limit 1;
  if recent is not null then
    return recent;
  end if;

  insert into public.contact_calls (caller_profile_id, callee_profile_id)
  values (me, p_target) returning id into new_id;
  return new_id;
end;
$$;

revoke execute on function public.log_call(uuid) from public, anon;
grant execute on function public.log_call(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- call_to_ask_about: the one call to ask "did you have a deal?" about -
-- my newest call, if it's still unanswered (or "still discussing" and
-- due again), at least 30 seconds old and at most 14 days.
-- ---------------------------------------------------------------------
create or replace function public.call_to_ask_about()
returns table (
  call_id      uuid,
  called_at    timestamptz,
  person_id    uuid,
  full_name    text,
  avatar_url   text,
  skills       jsonb
)
language sql stable security definer set search_path = public as $$
  with newest as (
    select c.* from public.contact_calls c
     where c.caller_profile_id = public.current_profile_id()
       and c.outcome is distinct from 'short'
     order by c.created_at desc
     limit 1
  )
  select n.id, n.created_at, p.id, p.full_name, p.avatar_url,
         coalesce((select jsonb_agg(jsonb_build_object(
                     'id', s.id, 'name_en', s.name_en, 'name_ne', s.name_ne, 'emoji', s.emoji,
                     'category', s.category, 'custom_label', us.custom_label)
                   order by s.sort_order)
                     from public.user_skills us join public.skills s on s.id = us.skill_id
                    where us.profile_id = p.id), '[]'::jsonb)
    from newest n
    join public.profiles p on p.id = n.callee_profile_id
   where n.created_at < now() - interval '30 seconds'
     and n.created_at > now() - interval '14 days'
     and (n.outcome is null or (n.outcome = 'discussing' and n.ask_again_at <= now()));
$$;

revoke execute on function public.call_to_ask_about() from public, anon;
grant execute on function public.call_to_ask_about() to authenticated;

-- ---------------------------------------------------------------------
-- answer_call: the caller's answer. For a deal, the details too; the
-- worker is then asked to confirm. Returns the deal's id (or null).
-- ---------------------------------------------------------------------
create or replace function public.answer_call(
  p_call    uuid,
  p_outcome text,
  p_skill   text    default null,
  p_amount  numeric default null,
  p_rating  integer default null,
  p_comment text    default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me        uuid := public.current_profile_id();
  call_row  public.contact_calls;
  deal      public.call_deals;
  hirer     text;
  skill_en  text;
  skill_ne  text;
  money_en  text;
  money_ne  text;
begin
  select * into call_row from public.contact_calls where id = p_call for update;
  if not found or call_row.caller_profile_id is distinct from me then
    raise exception 'CALL_NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_outcome not in ('deal', 'discussing', 'no', 'short') then
    raise exception 'CALL_BAD_ANSWER' using errcode = 'P0001';
  end if;
  if call_row.outcome in ('deal', 'no') then
    raise exception 'CALL_ALREADY_ANSWERED' using errcode = 'P0001';
  end if;

  if p_outcome <> 'deal' then
    update public.contact_calls
       set outcome = p_outcome,
           answered_at = now(),
           ask_again_at = case when p_outcome = 'discussing' then now() + interval '2 days' end
     where id = p_call;
    return null;
  end if;

  if p_amount is not null and (p_amount <= 0 or p_amount > 500000) then
    raise exception 'CALL_BAD_AMOUNT' using errcode = 'P0001';
  end if;
  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    raise exception 'CALL_BAD_ANSWER' using errcode = 'P0001';
  end if;
  if p_skill is not null and not exists (select 1 from public.skills where id = p_skill) then
    p_skill := null;
  end if;

  update public.contact_calls set outcome = 'deal', answered_at = now(), ask_again_at = null where id = p_call;

  insert into public.call_deals
    (call_id, hirer_profile_id, worker_profile_id, skill_id, amount, deal_date, rating, comment)
  values
    (p_call, me, call_row.callee_profile_id, p_skill, round(p_amount), public.nepal_today(),
     p_rating, nullif(left(trim(coalesce(p_comment, '')), 500), ''))
  returning * into deal;

  select full_name into hirer from public.profiles where id = me;
  select name_en, name_ne into skill_en, skill_ne from public.skills where id = deal.skill_id;
  if deal.amount is not null then
    money_en := ' for Rs ' || to_char(deal.amount, 'FM99,99,99,999');
    money_ne := ' रु ' || translate(to_char(deal.amount, 'FM99,99,99,999'), '0123456789', '०१२३४५६७८९') || 'मा';
  end if;

  insert into public.notifications
    (profile_id, kind, title_en, title_ne, body_en, body_ne, related_profile_id, actor_name, call_deal_id)
  values (deal.worker_profile_id, 'call_deal',
          'Did you make a deal with ' || hirer || '?',
          hirer || 'सँग सम्झौता भयो?',
          hirer || ' says you agreed ' || coalesce(skill_en || ' work', 'work') || coalesce(money_en, '')
            || ' after a call. Open Duleko to say if that''s right.',
          hirer || 'ले फोनपछि तपाईंसँग' || coalesce(money_ne, '') || ' ' || coalesce(skill_ne || ' ', '')
            || 'काम मिलेको बताउनुभयो। सही हो कि होइन डुलेकोमा भन्नुहोस्।',
          me, hirer, deal.id);

  return deal.id;
end;
$$;

revoke execute on function public.answer_call(uuid, text, text, numeric, integer, text) from public, anon;
grant execute on function public.answer_call(uuid, text, text, numeric, integer, text) to authenticated;

-- ---------------------------------------------------------------------
-- respond_call_deal: the worker says yes (it counts now, and the rating
-- is posted) or no (disputed: it never counts).
-- ---------------------------------------------------------------------
create or replace function public.respond_call_deal(p_deal uuid, p_agree boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  deal public.call_deals;
begin
  select * into deal from public.call_deals where id = p_deal for update;
  if not found or deal.worker_profile_id is distinct from public.current_profile_id() then
    raise exception 'CALL_DEAL_NOT_FOUND' using errcode = 'P0001';
  end if;
  if deal.status <> 'reported' then
    raise exception 'CALL_DEAL_ANSWERED' using errcode = 'P0001';
  end if;

  update public.call_deals
     set status = case when p_agree then 'confirmed' else 'disputed' end,
         worker_answered_at = now()
   where id = p_deal
  returning * into deal;

  if p_agree then
    perform public.post_call_deal_review(deal);
  end if;
end;
$$;

revoke execute on function public.respond_call_deal(uuid, boolean) from public, anon;
grant execute on function public.respond_call_deal(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- After 7 days without an answer from the worker, a deal counts. Run
-- hourly by pg_cron (below); safe to run any time.
-- ---------------------------------------------------------------------
create or replace function public.auto_confirm_call_deals()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  deal public.call_deals;
  n    integer := 0;
begin
  for deal in
    update public.call_deals set status = 'confirmed'
     where status = 'reported' and confirm_by <= now()
    returning *
  loop
    perform public.post_call_deal_review(deal);
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke execute on function public.auto_confirm_call_deals() from public, anon, authenticated;

-- pg_cron is already on for the alert outbox (2500).
create extension if not exists pg_cron;
select cron.schedule('confirm-call-deals', '17 * * * *', $cron$ select public.auto_confirm_call_deals(); $cron$);

-- ---------------------------------------------------------------------
-- my_call_deals_to_confirm: deals waiting on me, as the worker.
-- ---------------------------------------------------------------------
create or replace function public.my_call_deals_to_confirm()
returns table (
  deal_id    uuid,
  person_id  uuid,
  full_name  text,
  avatar_url text,
  skill      jsonb,
  amount     numeric,
  deal_date  date,
  confirm_by timestamptz
)
language sql stable security definer set search_path = public as $$
  select d.id, p.id, p.full_name, p.avatar_url,
         (select jsonb_build_object('id', s.id, 'name_en', s.name_en, 'name_ne', s.name_ne, 'emoji', s.emoji, 'category', s.category)
            from public.skills s where s.id = d.skill_id),
         d.amount, d.deal_date, d.confirm_by
    from public.call_deals d
    join public.profiles p on p.id = d.hirer_profile_id
   where d.worker_profile_id = public.current_profile_id()
     and d.status = 'reported'
     and d.confirm_by > now()
   order by d.created_at desc
   limit 10;
$$;

revoke execute on function public.my_call_deals_to_confirm() from public, anon;
grant execute on function public.my_call_deals_to_confirm() to authenticated;
