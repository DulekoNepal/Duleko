-- =====================================================================
-- Duleko MVP :: 7900 :: Referral codes - one free job each
-- =====================================================================
-- Run after 7800.
--
-- Every member gets a short code: four letters from their name plus a
-- number (SANJ42). Names with fewer than four English letters - written
-- in Nepali, say - use DULE instead (DULE42). A new member who joins
-- with someone's code - typed while creating their profile, or filled
-- in by an invite link (duleko.com/?ref=SANJ42) - and the member who
-- invited them each get ONE more free job: no Duleko fee on it, on top
-- of the usual welcome jobs (fee_welcome_jobs, 5). The inviter earns one
-- for every person who joins with their code.
--
-- A code can be added up to 7 days after joining (if it was forgotten
-- at sign-up), only once, and never your own.
--
--   profiles.referral_code    issued by the database, never changed
--   referrals                 who joined with whose code
--   free_jobs_for(worker)     welcome jobs + referral bonus
--   apply_referral(code)      member: "I joined with this code"
--   my_referral()             member: my code, how many joined, who invited me
--
-- The fee trigger and fee summary (5600) now count FREE jobs used
-- against each worker's own allowance, so a bonus earned after the
-- welcome jobs are used up still makes the next job free.
-- Safe to run more than once.
-- =====================================================================

-- ---------------------------------------------------------------------
-- The code
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists referral_code text;
create unique index if not exists profiles_referral_code_key on public.profiles (referral_code);

create or replace function public.new_referral_code(p_name text)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  letters text := upper(regexp_replace(coalesce(p_name, ''), '[^A-Za-z]', '', 'g'));
  word    text;
  digits  integer;
  code    text;
begin
  word := case when length(letters) >= 4 then left(letters, 4) else 'DULE' end;
  -- Two digits while there's room, then three, then more.
  for attempt in 1..60 loop
    digits := case when attempt <= 25 then 2 when attempt <= 50 then 3 else 5 end;
    code := word || (power(10, digits - 1)::integer
                     + floor(random() * 9 * power(10, digits - 1))::integer)::text;
    if not exists (select 1 from public.profiles where referral_code = code) then
      return code;
    end if;
  end loop;
  return word || floor(random() * 900000000 + 100000000)::bigint::text;
end;
$$;

revoke execute on function public.new_referral_code(text) from public, anon, authenticated;

create or replace function public.assign_referral_code()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.referral_code := public.new_referral_code(new.full_name);
  return new;
end;
$$;

drop trigger if exists trg_profiles_referral_code on public.profiles;
create trigger trg_profiles_referral_code before insert on public.profiles
  for each row execute function public.assign_referral_code();

-- Once issued it's been shared, so it never changes (a renamed member
-- keeps theirs).
create or replace function public.guard_referral_code()
returns trigger language plpgsql as $$
begin
  if old.referral_code is not null and new.referral_code is distinct from old.referral_code then
    new.referral_code := old.referral_code;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_referral_code_guard on public.profiles;
create trigger trg_profiles_referral_code_guard before update on public.profiles
  for each row execute function public.guard_referral_code();

-- Everyone already on Duleko gets one.
do $$
declare r record;
begin
  for r in select id, full_name from public.profiles where referral_code is null order by created_at, id loop
    update public.profiles set referral_code = public.new_referral_code(r.full_name) where id = r.id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Who joined with whose code
-- ---------------------------------------------------------------------
create table if not exists public.referrals (
  -- One code per new member.
  referred_profile_id uuid primary key references public.profiles(id) on delete cascade,
  -- Kept (as null) if the inviter later deletes their account: the new
  -- member keeps their free job.
  referrer_profile_id uuid references public.profiles(id) on delete set null,
  code                text not null,
  created_at          timestamptz not null default now(),
  check (referred_profile_id is distinct from referrer_profile_id)
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_profile_id, created_at desc);

alter table public.referrals enable row level security;

-- Written only by apply_referral(); staff can look (and remove a made-up
-- one in the table editor).
drop policy if exists referrals_staff_read on public.referrals;
create policy referrals_staff_read on public.referrals
  for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------
-- A worker's free jobs: the welcome jobs + one per referral either way
-- ---------------------------------------------------------------------
create or replace function public.free_jobs_for(p_worker uuid)
returns integer language sql stable security definer set search_path = public as $$
  select public.fee_welcome_jobs()
       + (select count(*)::integer from public.referrals where referrer_profile_id = p_worker)
       + (select count(*)::integer from public.referrals where referred_profile_id = p_worker);
$$;

revoke execute on function public.free_jobs_for(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- charge_fee_on_completion (latest: 5600), against the worker's own allowance
-- ---------------------------------------------------------------------
create or replace function public.charge_fee_on_completion()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  done_day date := (coalesce(new.completed_at, now()) at time zone 'Asia/Kathmandu')::date;
  month    text := public.bs_period_of(done_day);
  used     integer;
  welcome  boolean;
begin
  if coalesce(new.payment_amount, 0) <= 0
     or (new.created_at at time zone 'Asia/Kathmandu')::date < public.fee_start_date()
     or month is null then
    return null;
  end if;

  -- Free jobs used so far, against this worker's own allowance (the
  -- welcome jobs plus any referral bonus, 7900).
  select count(*) into used from public.fee_charges c
   where c.worker_profile_id = new.worker_profile_id and c.welcome;
  welcome := used < public.free_jobs_for(new.worker_profile_id);

  insert into public.fee_charges
    (engagement_id, worker_profile_id, job_title, price, amount, welcome, completed_on, period)
  values
    (new.id, new.worker_profile_id, new.title, new.payment_amount,
     case when welcome then 0 else public.duleko_fee_for(new.payment_amount) end,
     welcome, done_day, month)
  on conflict (engagement_id) do nothing;
  return null;
exception when others then
  -- A fee that fails to record must never undo the job being completed.
  raise warning 'Duleko fee not recorded for job %: %', new.id, sqlerrm;
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- fee_summary_for (latest: 5600), plus free_jobs / referral_jobs
-- ---------------------------------------------------------------------
create or replace function public.fee_summary_for(p_worker uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  today        date := public.nepal_today();
  current_p    text := coalesce(public.bs_period_of(today), '9999-99');
  paid_total   integer;
  awaiting     integer;
  unallocated  integer;
  r            record;
  paid_here    integer;
  left_here    integer;
  due          date;
  state        text;
  periods      jsonb := '[]'::jsonb;
  charged      integer := 0;
  payable_now  integer := 0;
  overdue      integer := 0;
  next_due     date;
  jobs_charged integer;
begin
  select coalesce(sum(amount) filter (where status = 'confirmed'), 0),
         coalesce(sum(amount) filter (where status = 'reported'), 0)
    into paid_total, awaiting
    from public.fee_payments where worker_profile_id = p_worker;
  unallocated := paid_total;

  for r in
    select period, count(*)::integer as jobs, sum(amount)::integer as amount
      from public.fee_charges
     where worker_profile_id = p_worker
     group by period
     order by period
  loop
    paid_here := least(r.amount, unallocated);
    unallocated := unallocated - paid_here;
    left_here := r.amount - paid_here;
    due := public.fee_due_on(r.period);
    state := case
      when r.period >= current_p then 'open'
      when left_here = 0 then 'paid'
      when today > due then 'overdue'
      else 'due' end;

    charged := charged + r.amount;
    if state in ('due', 'overdue') then payable_now := payable_now + left_here; end if;
    if state = 'overdue' then overdue := overdue + left_here; end if;
    if left_here > 0 and (next_due is null or due < next_due) then next_due := due; end if;

    periods := jsonb_build_array(jsonb_build_object(
      'period', r.period, 'jobs', r.jobs, 'amount', r.amount, 'paid', paid_here,
      'left', left_here, 'due_on', due, 'status', state)) || periods;
  end loop;

  -- Free jobs used, not every job: a referral bonus earned after the
  -- welcome jobs are gone still counts (7900).
  select count(*) into jobs_charged from public.fee_charges where worker_profile_id = p_worker and welcome;

  return jsonb_build_object(
    'today', today,
    'current_period', public.bs_period_of(today),
    'periods', periods,
    'charged', charged,
    'paid', paid_total,
    'awaiting', awaiting,
    'balance', greatest(0, charged - paid_total),
    'payable_now', payable_now,
    'overdue', overdue,
    'due_on', next_due,
    'max_payment', greatest(0, charged - paid_total - awaiting),
    'blocked', overdue - awaiting > 0,
    'welcome_left', greatest(0, public.free_jobs_for(p_worker) - jobs_charged),
    'free_jobs', public.free_jobs_for(p_worker),
    'referral_jobs', public.free_jobs_for(p_worker) - public.fee_welcome_jobs(),
    'rules', public.fee_rules());
end;
$$;

revoke execute on function public.fee_summary_for(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Alerts: 'referral'
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
     'referral')) not valid;

-- ---------------------------------------------------------------------
-- Member: "I joined with this code"
-- ---------------------------------------------------------------------
-- Errors the app turns into words: referral_not_found, referral_own_code,
-- referral_already_used, referral_too_late.
create or replace function public.apply_referral(p_code text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me           uuid := public.current_profile_id();
  me_name      text;
  joined_at    timestamptz;
  clean        text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  inviter_id   uuid;
  inviter_name text;
begin
  if me is null then
    raise exception 'You must be signed in' using errcode = 'insufficient_privilege';
  end if;
  select full_name, created_at into me_name, joined_at from public.profiles where id = me;

  if exists (select 1 from public.referrals where referred_profile_id = me) then
    raise exception 'referral_already_used' using errcode = 'check_violation';
  end if;
  if joined_at < now() - interval '7 days' then
    raise exception 'referral_too_late' using errcode = 'check_violation';
  end if;

  select id, full_name into inviter_id, inviter_name from public.profiles where referral_code = clean;
  if inviter_id is null then
    raise exception 'referral_not_found' using errcode = 'no_data_found';
  end if;
  if inviter_id = me then
    raise exception 'referral_own_code' using errcode = 'check_violation';
  end if;

  insert into public.referrals (referred_profile_id, referrer_profile_id, code)
  values (me, inviter_id, clean);

  insert into public.notifications
    (profile_id, kind, title_en, title_ne, body_en, body_ne, actor_name, related_profile_id)
  values
    (inviter_id, 'referral',
     'You earned a free job', 'तपाईंले एउटा निःशुल्क काम पाउनुभयो',
     me_name || ' joined Duleko with your code. You both get one job with no Duleko fee.',
     me_name || ' तपाईंको कोडबाट डुलेकोमा जोडिनुभयो। तपाईं दुवैले डुलेको शुल्क नलाग्ने एउटा काम पाउनुभयो।',
     me_name, me),
    (me, 'referral',
     'You earned a free job', 'तपाईंले एउटा निःशुल्क काम पाउनुभयो',
     'You joined with ' || inviter_name || '''s code. You both get one job with no Duleko fee.',
     'तपाईं ' || inviter_name || 'को कोडबाट जोडिनुभयो। तपाईं दुवैले डुलेको शुल्क नलाग्ने एउटा काम पाउनुभयो।',
     inviter_name, inviter_id);

  return jsonb_build_object('referrer_name', inviter_name);
end;
$$;

revoke execute on function public.apply_referral(text) from public, anon;
grant execute on function public.apply_referral(text) to authenticated;

-- ---------------------------------------------------------------------
-- Member: my code, how many joined with it, who invited me
-- ---------------------------------------------------------------------
create or replace function public.my_referral()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := public.current_profile_id();
begin
  if me is null then
    raise exception 'You must be signed in' using errcode = 'insufficient_privilege';
  end if;
  return (
    select jsonb_build_object(
      'code', p.referral_code,
      'joined', (select count(*) from public.referrals where referrer_profile_id = me),
      'referred_by', (select q.full_name from public.referrals r
                        join public.profiles q on q.id = r.referrer_profile_id
                       where r.referred_profile_id = me),
      'can_enter', not exists (select 1 from public.referrals where referred_profile_id = me)
                   and p.created_at >= now() - interval '7 days')
      from public.profiles p
     where p.id = me);
end;
$$;

revoke execute on function public.my_referral() from public, anon;
grant execute on function public.my_referral() to authenticated;
