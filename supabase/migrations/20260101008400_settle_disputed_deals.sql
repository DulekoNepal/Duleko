-- =====================================================================
-- Duleko MVP :: 8400 :: Staff settle disputed call deals
-- =====================================================================
-- Run after 8300.
--
-- A call deal is "disputed" when the caller says they made a deal and
-- the worker says they didn't (6800). Until now staff could only see a
-- count of every dispute ever, and Profile > Staff kept showing it as
-- "waiting" forever - there was nothing to do with one.
--
-- Now a dispute is something staff settle, once:
--
--   counted   staff are satisfied the work happened: the deal counts
--             (status 'confirmed') and the caller's rating is posted.
--   no_deal   it stays out of every count, and the rating is dropped.
--
-- Both people get an alert either way. Staff hear about each new dispute
-- (alert kind 'deal_dispute', opening the Call deals screen), and
-- "Disputed deals" counts only the ones nobody has settled yet.
-- Removing a made-up deal (6900) still works as before.
--
-- staff_call_deals(view, since, limit, offset) lists deals for the Call
-- deals screen, a page at a time:
--   disputed  waiting for staff, oldest dispute first
--   waiting   the worker hasn't answered yet, soonest to count first
--   settled   settled or removed by staff, newest first
--   all       everything, newest first
-- =====================================================================

alter table public.call_deals
  add column if not exists settled_by  uuid references public.profiles(id) on delete set null,
  add column if not exists settled_at  timestamptz,
  add column if not exists settlement  text check (settlement in ('counted', 'no_deal')),
  add column if not exists settle_note text check (settle_note is null or char_length(settle_note) <= 300);

create index if not exists call_deals_disputes_idx
  on public.call_deals (worker_answered_at) where status = 'disputed' and settled_at is null;

-- ---------------------------------------------------------------------
-- Alerts: staff hear about a new dispute
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
     'done_check','done_not_yet',
     'referral',
     'deal_dispute')) not valid;

create or replace function public.notify_staff_of_dispute()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  hirer  text;
  worker text;
begin
  if new.status = 'disputed' and old.status is distinct from 'disputed' then
    select full_name into hirer from public.profiles where id = new.hirer_profile_id;
    select full_name into worker from public.profiles where id = new.worker_profile_id;
    insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne, actor_name, call_deal_id)
    select s.profile_id, 'deal_dispute',
           'Deal to settle', 'टुङ्ग्याउनुपर्ने सम्झौता',
           hirer || ' says they made a deal with ' || worker || ' after a call, but ' || worker
             || ' says there was none. Settle it in Call deals.',
           hirer || 'ले फोनपछि ' || worker || 'सँग सम्झौता भएको बताउनुभयो, तर ' || worker
             || 'ले सम्झौता नभएको भन्नुभयो। फोन सम्झौतामा टुङ्ग्याउनुहोस्।',
           worker, new.id
      from public.staff_roles s
     where s.profile_id not in (new.hirer_profile_id, new.worker_profile_id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_call_deals_dispute on public.call_deals;
create trigger trg_call_deals_dispute after update of status on public.call_deals
  for each row execute function public.notify_staff_of_dispute();

-- The alert email opens the right screen (see 5000 for link_path).
create or replace function public.decorate_deal_dispute_delivery()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'deal_dispute' then
    new.link_path := '/staff/deals';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notification_deliveries_deal_dispute on public.notification_deliveries;
create trigger trg_notification_deliveries_deal_dispute
  before insert on public.notification_deliveries
  for each row execute function public.decorate_deal_dispute_delivery();

-- ---------------------------------------------------------------------
-- settle_call_deal: staff decide a dispute, once
-- ---------------------------------------------------------------------
create or replace function public.settle_call_deal(p_deal uuid, p_count boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  me     uuid := public.current_profile_id();
  deal   public.call_deals;
  hirer  text;
  worker text;
  note   text := nullif(left(trim(coalesce(p_note, '')), 300), '');
  extra_en text;
  extra_ne text;
begin
  if not public.is_staff() then
    raise exception 'Staff only' using errcode = 'insufficient_privilege';
  end if;

  select * into deal from public.call_deals where id = p_deal for update;
  if not found then
    raise exception 'CALL_DEAL_NOT_FOUND' using errcode = 'P0001';
  end if;
  if deal.status <> 'disputed' or deal.settled_at is not null then
    raise exception 'CALL_DEAL_SETTLED' using errcode = 'P0001';
  end if;
  -- Nobody settles their own dispute.
  if me in (deal.hirer_profile_id, deal.worker_profile_id) then
    raise exception 'CALL_DEAL_OWN' using errcode = 'P0001';
  end if;

  update public.call_deals
     set status      = case when p_count then 'confirmed' else 'disputed' end,
         settlement  = case when p_count then 'counted' else 'no_deal' end,
         settled_by  = me,
         settled_at  = now(),
         settle_note = note
   where id = p_deal
  returning * into deal;

  if p_count then
    perform public.post_call_deal_review(deal);
  end if;

  select full_name into hirer from public.profiles where id = deal.hirer_profile_id;
  select full_name into worker from public.profiles where id = deal.worker_profile_id;
  extra_en := case when note is not null then ' ' || rtrim(note, '.।') || '.' else '' end;
  extra_ne := case when note is not null then ' ' || rtrim(note, '.।') || '।' else '' end;

  insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne, actor_name, call_deal_id)
  values
    (deal.hirer_profile_id, 'call_deal',
     case when p_count then 'Your deal counts' else 'Your deal doesn''t count' end,
     case when p_count then 'तपाईंको सम्झौता गनियो' else 'तपाईंको सम्झौता गनिएन' end,
     case when p_count
          then 'Duleko looked into your deal with ' || worker || ' and it now counts.'
          else 'Duleko looked into your deal with ' || worker || '. It doesn''t count, as ' || worker || ' said there was no deal.'
     end || extra_en,
     case when p_count
          then 'डुलेकोले ' || worker || 'सँगको तपाईंको सम्झौता हेर्‍यो, अब यो गनिन्छ।'
          else 'डुलेकोले ' || worker || 'सँगको तपाईंको सम्झौता हेर्‍यो। ' || worker || 'ले सम्झौता नभएको भन्नुभएकाले यो गनिँदैन।'
     end || extra_ne,
     'Duleko', deal.id),
    (deal.worker_profile_id, 'call_deal',
     case when p_count then 'A deal with you counts' else 'Deal settled' end,
     case when p_count then 'तपाईंसँगको सम्झौता गनियो' else 'सम्झौता टुङ्गियो' end,
     case when p_count
          then 'Duleko looked into the deal ' || hirer || ' reported with you and counted it.'
          else 'Duleko looked into the deal ' || hirer || ' reported with you. It doesn''t count.'
     end || extra_en,
     case when p_count
          then 'डुलेकोले ' || hirer || 'ले तपाईंसँग भएको भनेको सम्झौता हेरेर गन्यो।'
          else 'डुलेकोले ' || hirer || 'ले तपाईंसँग भएको भनेको सम्झौता हेर्‍यो। यो गनिँदैन।'
     end || extra_ne,
     'Duleko', deal.id);
end;
$$;

revoke execute on function public.settle_call_deal(uuid, boolean, text) from public, anon;
grant execute on function public.settle_call_deal(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------
-- activity_stats: "disputed" now means "waiting for staff"
-- Same as 6900 otherwise.
-- ---------------------------------------------------------------------
create or replace function public.activity_stats()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Staff only' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'all_time', public.activity_numbers(null),
    'last_30_days', public.activity_numbers(now() - interval '30 days'),
    'public_visible', coalesce((select value from public.app_settings where key = 'public_stats_visible'), 'false') = 'true',
    'disputed_deals', (select count(*) from public.call_deals where status = 'disputed' and settled_at is null),
    'waiting_deals', (select count(*) from public.call_deals where status = 'reported')
  );
end;
$$;

-- ---------------------------------------------------------------------
-- staff_call_deals: the Call deals screen
-- ---------------------------------------------------------------------
-- One page at a time (p_limit, p_offset), every row carrying the view's
-- total for the pager. p_since keeps deals reported from then on (the
-- "Last 30 days" switch); null is all time.
drop function if exists public.staff_call_deals(text, integer);
drop function if exists public.staff_call_deals(text, timestamptz, integer, integer);

create or replace function public.staff_call_deals(
  p_view   text        default 'disputed',
  p_since  timestamptz default null,
  p_limit  integer     default 20,
  p_offset integer     default 0
)
returns table (
  deal_id            uuid,
  status             text,
  amount             numeric,
  deal_date          date,
  created_at         timestamptz,
  skill_id           text,
  hirer_id           uuid,
  hirer_name         text,
  hirer_photo        text,
  worker_id          uuid,
  worker_name        text,
  worker_photo       text,
  rating             integer,
  comment            text,
  confirm_by         timestamptz,
  worker_answered_at timestamptz,
  settlement         text,
  settled_at         timestamptz,
  settled_by_name    text,
  settle_note        text,
  total              bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Staff only' using errcode = 'insufficient_privilege';
  end if;
  if p_view not in ('disputed', 'waiting', 'settled', 'all') then
    raise exception 'Unknown view' using errcode = 'invalid_parameter_value';
  end if;
  return query
    select d.id, d.status, d.amount, d.deal_date, d.created_at, d.skill_id,
           h.id, h.full_name, h.avatar_url, w.id, w.full_name, w.avatar_url,
           d.rating, d.comment, d.confirm_by, d.worker_answered_at,
           d.settlement, d.settled_at,
           coalesce(sp.full_name, rp.full_name),
           d.settle_note,
           count(*) over ()
      from public.call_deals d
      join public.profiles h on h.id = d.hirer_profile_id
      join public.profiles w on w.id = d.worker_profile_id
      left join public.profiles sp on sp.id = d.settled_by
      left join public.profiles rp on rp.id = d.removed_by
     where case p_view
             when 'disputed' then d.status = 'disputed' and d.settled_at is null
             when 'waiting'  then d.status = 'reported'
             when 'settled'  then d.settled_at is not null or d.status = 'removed'
             else true
           end
       and (p_since is null or d.created_at >= p_since)
     order by
       case when p_view = 'disputed' then d.worker_answered_at end asc nulls last,
       case when p_view = 'waiting'  then d.confirm_by end asc nulls last,
       case when p_view = 'settled'  then coalesce(d.settled_at, d.updated_at) end desc nulls last,
       d.created_at desc
     limit greatest(1, least(coalesce(p_limit, 20), 100))
     offset greatest(0, coalesce(p_offset, 0));
end;
$$;

revoke execute on function public.staff_call_deals(text, timestamptz, integer, integer) from public, anon;
grant execute on function public.staff_call_deals(text, timestamptz, integer, integer) to authenticated;

-- ---------------------------------------------------------------------
-- activity_item: a deal now carries how staff settled it.
-- Same as 7500 otherwise.
-- ---------------------------------------------------------------------
create or replace function public.activity_item(p_type text, p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  item jsonb;
begin
  if not public.is_staff() then
    raise exception 'Staff only' using errcode = 'insufficient_privilege';
  end if;

  if p_type = 'call' then
    select jsonb_build_object(
             'type', 'call', 'id', c.id, 'created_at', c.created_at,
             'from', public.activity_person(c.caller_profile_id),
             'to', public.activity_person(c.callee_profile_id),
             'outcome', c.outcome, 'answered_at', c.answered_at, 'ask_again_at', c.ask_again_at,
             'deal_id', (select d.id from public.call_deals d where d.call_id = c.id))
      into item
      from public.contact_calls c
     where c.id = p_id;

  elsif p_type = 'request' then
    select jsonb_build_object(
             'type', 'request', 'id', e.id, 'created_at', e.created_at, 'updated_at', e.updated_at,
             'from', public.activity_person(e.employer_profile_id),
             'to', public.activity_person(e.worker_profile_id),
             'skill_id', e.skill_id, 'title', e.title, 'details', e.details,
             'work_date', e.work_date, 'location_text', e.location_text,
             'amount', e.payment_amount, 'payment_note', e.payment_note,
             'status', e.status, 'completed_at', e.completed_at,
             'cancelled_by', public.activity_person(e.cancelled_by),
             'reviews', (
               select coalesce(jsonb_agg(jsonb_build_object(
                        'id', v.id, 'at', v.created_at, 'rating', v.rating, 'comment', v.comment,
                        'from', public.activity_person(v.reviewer_profile_id)) order by v.created_at), '[]')
                 from public.reviews v where v.engagement_id = e.id))
      into item
      from public.work_engagements e
     where e.id = p_id;

  elsif p_type = 'deal' then
    select jsonb_build_object(
             'type', 'deal', 'id', d.id, 'created_at', d.created_at, 'updated_at', d.updated_at,
             'from', public.activity_person(d.hirer_profile_id),
             'to', public.activity_person(d.worker_profile_id),
             'skill_id', d.skill_id, 'amount', d.amount, 'deal_date', d.deal_date,
             'status', d.status, 'confirm_by', d.confirm_by, 'worker_answered_at', d.worker_answered_at,
             'rating', d.rating, 'comment', d.comment,
             'removed_by', public.activity_person(d.removed_by),
             'settlement', d.settlement, 'settled_at', d.settled_at,
             'settled_by', public.activity_person(d.settled_by), 'settle_note', d.settle_note,
             'call_id', d.call_id,
             'review_id', (select v.id from public.reviews v where v.call_deal_id = d.id limit 1))
      into item
      from public.call_deals d
     where d.id = p_id;

  elsif p_type = 'review' then
    select jsonb_build_object(
             'type', 'review', 'id', v.id, 'created_at', v.created_at,
             'from', public.activity_person(v.reviewer_profile_id),
             'to', public.activity_person(v.reviewee_profile_id),
             'rating', v.rating, 'comment', v.comment,
             'request_id', v.engagement_id, 'deal_id', v.call_deal_id)
      into item
      from public.reviews v
     where v.id = p_id;

  else
    raise exception 'Unknown activity item' using errcode = 'invalid_parameter_value';
  end if;

  return item;
end;
$$;

revoke execute on function public.activity_item(text, uuid) from public, anon;
grant execute on function public.activity_item(text, uuid) to authenticated;
