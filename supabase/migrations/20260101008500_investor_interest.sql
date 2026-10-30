-- =====================================================================
-- Duleko MVP :: 8500 :: "Invest in Duleko" form
-- =====================================================================
-- Run after 8400.
--
-- The website's footer (Partnerships > Investors) opens /invest, a short
-- form: name, email, phone number, complete address and a message.
-- Anyone can send it, signed in or not. Each one sent:
--
--   1. is kept in investor_interests (staff only - it holds an email, a
--      phone number and a home address),
--   2. is emailed to Duleko's official inbox (app_settings
--      'official_email'), with Reply-To set to the sender so answering
--      is one tap - through the same outbox as every other email (2500),
--   3. alerts every staff member in the app (alert kind
--      'investor_interest', opening /staff/investors). Their personal
--      email copy is dropped: the official inbox already has it.
--
-- Staff mark one "replied" on the Investors screen once someone has
-- answered, so the others know.
--
-- Abuse guard (no sign-in, no captcha): three from one email address a
-- day, and forty in all a day.
-- =====================================================================

insert into public.app_settings (key, value) values ('official_email', 'dulekonepal@gmail.com')
on conflict (key) do nothing;

create table if not exists public.investor_interests (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null check (char_length(full_name) between 2 and 100),
  email        text not null check (char_length(email) between 5 and 200),
  -- Any country: digits with an optional leading +.
  phone        text not null check (phone ~ '^\+?[0-9]{7,15}$'),
  address      text not null check (char_length(address) between 5 and 300),
  message      text not null check (char_length(message) between 10 and 2000),
  lang         text not null default 'en' check (lang in ('en', 'ne')),
  -- Set when the sender was signed in.
  profile_id   uuid references public.profiles(id) on delete set null,
  replied_by   uuid references public.profiles(id) on delete set null,
  replied_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- RLS on with no policies: read and written only through the functions below.
alter table public.investor_interests enable row level security;

create index if not exists investor_interests_created_idx on public.investor_interests (created_at desc);
create index if not exists investor_interests_email_idx on public.investor_interests (lower(email), created_at desc);

-- ---------------------------------------------------------------------
-- The outbox can now carry an email that isn't for a member
-- ---------------------------------------------------------------------
-- profile_id was always the member being told. The official inbox has
-- no profile, so it may be empty now; reply_to is the address a reply
-- goes to (the edge function passes it to Brevo).
alter table public.notification_deliveries alter column profile_id drop not null;
alter table public.notification_deliveries add column if not exists reply_to text;

-- ---------------------------------------------------------------------
-- Alerts
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
     'deal_dispute',
     'investor_interest')) not valid;

-- Staff copies of the alert (they carry a notification_id) aren't
-- emailed - the official inbox already got it. The official email itself
-- opens the Investors screen.
create or replace function public.decorate_investor_delivery()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'investor_interest' then
    if new.notification_id is not null and new.channel = 'email' then
      return null;
    end if;
    new.link_path := '/staff/investors';
  end if;
  return new;
end;
$$;

-- "trg_notification_deliveries_a..." sorts first, so a dropped row never
-- reaches the daily email count.
drop trigger if exists trg_notification_deliveries_a_investor on public.notification_deliveries;
create trigger trg_notification_deliveries_a_investor
  before insert on public.notification_deliveries
  for each row execute function public.decorate_investor_delivery();

-- ---------------------------------------------------------------------
-- submit_investor_interest: the form on /invest
-- ---------------------------------------------------------------------
create or replace function public.submit_investor_interest(
  p_name    text,
  p_email   text,
  p_phone   text,
  p_address text,
  p_message text,
  p_lang    text default 'en'
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_name    text := left(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), 100);
  v_email   text := lower(trim(coalesce(p_email, '')));
  -- Spaces, dashes, dots and brackets dropped; a leading 00 means +.
  v_phone   text := regexp_replace(regexp_replace(coalesce(p_phone, ''), '[\s().-]', '', 'g'), '^00', '+');
  v_address text := left(trim(coalesce(p_address, '')), 300);
  v_message text := left(trim(coalesce(p_message, '')), 2000);
  v_lang    text := case when p_lang = 'ne' then 'ne' else 'en' end;
  inbox     text;
begin
  if char_length(v_name) < 2 or char_length(v_address) < 5 or char_length(v_message) < 10 then
    raise exception 'INVESTOR_INCOMPLETE' using errcode = 'P0001';
  end if;
  if char_length(v_email) > 200 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVESTOR_BAD_EMAIL' using errcode = 'P0001';
  end if;
  if v_phone !~ '^\+?[0-9]{7,15}$' then
    raise exception 'INVESTOR_BAD_PHONE' using errcode = 'P0001';
  end if;

  -- Two at the same moment must not both slip under the limits.
  perform pg_advisory_xact_lock(hashtext('investor_interest_limits'));
  if (select count(*) from public.investor_interests
       where lower(email) = v_email and created_at > now() - interval '1 day') >= 3
     or (select count(*) from public.investor_interests
          where created_at > now() - interval '1 day') >= 40
  then
    raise exception 'INVESTOR_TOO_MANY' using errcode = 'P0001';
  end if;

  insert into public.investor_interests (full_name, email, phone, address, message, lang, profile_id)
  values (v_name, v_email, v_phone, v_address, v_message, v_lang, public.current_profile_id());

  -- 1. The official inbox.
  select nullif(trim(value), '') into inbox from public.app_settings where key = 'official_email';
  if inbox is not null then
    insert into public.notification_deliveries
      (profile_id, kind, channel, lang, destination, reply_to, subject, body)
    values
      (null, 'investor_interest', 'email', 'en', inbox, v_email,
       'Investor interest: ' || v_name,
       'Someone filled in the "Invest in Duleko" form.' || E'\n\n'
         || 'Name: ' || v_name || E'\n'
         || 'Email: ' || v_email || E'\n'
         || 'Phone: ' || v_phone || E'\n'
         || 'Address: ' || v_address || E'\n\n'
         || 'Message:' || E'\n' || v_message || E'\n\n'
         || 'Reply to this email to answer them. Once someone has, mark it replied on the Investors screen.');
  end if;

  -- 2. Every staff member, in the app.
  insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne, actor_name)
  select s.profile_id, 'investor_interest',
         'Investor interest', 'लगानीको इच्छा',
         v_name || ' (' || v_email || ') would like to talk about investing in Duleko. See it in Investors.',
         v_name || ' (' || v_email || ') डुलेकोमा लगानी गर्ने बारे कुरा गर्न चाहनुहुन्छ। लगानीकर्तामा हेर्नुहोस्।',
         v_name
    from public.staff_roles s;
end;
$$;

revoke execute on function public.submit_investor_interest(text, text, text, text, text, text) from public;
grant execute on function public.submit_investor_interest(text, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- staff_investor_interests: the Investors screen
-- ---------------------------------------------------------------------
-- p_view 'new' (not replied yet, oldest first) or 'all' (newest first),
-- one page at a time, every row carrying the view's total for the pager.
create or replace function public.staff_investor_interests(
  p_view   text    default 'new',
  p_limit  integer default 20,
  p_offset integer default 0
)
returns table (
  id              uuid,
  full_name       text,
  email           text,
  phone           text,
  address         text,
  message         text,
  lang            text,
  profile_id      uuid,
  created_at      timestamptz,
  replied_at      timestamptz,
  replied_by_name text,
  total           bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Staff only' using errcode = 'insufficient_privilege';
  end if;
  if p_view not in ('new', 'all') then
    raise exception 'Unknown view' using errcode = 'invalid_parameter_value';
  end if;
  return query
    select i.id, i.full_name, i.email, i.phone, i.address, i.message, i.lang, i.profile_id,
           i.created_at, i.replied_at, rp.full_name,
           count(*) over ()
      from public.investor_interests i
      left join public.profiles rp on rp.id = i.replied_by
     where p_view = 'all' or i.replied_at is null
     order by
       case when p_view = 'new' then i.created_at end asc,
       i.created_at desc
     limit greatest(1, least(coalesce(p_limit, 20), 100))
     offset greatest(0, coalesce(p_offset, 0));
end;
$$;

revoke execute on function public.staff_investor_interests(text, integer, integer) from public, anon;
grant execute on function public.staff_investor_interests(text, integer, integer) to authenticated;

-- Staff: someone answered it (or, p_replied false, undo that).
create or replace function public.mark_investor_interest_replied(p_id uuid, p_replied boolean default true)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Staff only' using errcode = 'insufficient_privilege';
  end if;
  update public.investor_interests
     set replied_by = case when p_replied then public.current_profile_id() end,
         replied_at = case when p_replied then now() end
   where id = p_id;
end;
$$;

revoke execute on function public.mark_investor_interest_replied(uuid, boolean) from public, anon;
grant execute on function public.mark_investor_interest_replied(uuid, boolean) to authenticated;

-- How many wait for a reply - the count on Profile > Staff.
create or replace function public.count_new_investor_interests()
returns integer
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Staff only' using errcode = 'insufficient_privilege';
  end if;
  return (select count(*) from public.investor_interests where replied_at is null);
end;
$$;

revoke execute on function public.count_new_investor_interests() from public, anon;
grant execute on function public.count_new_investor_interests() to authenticated;

-- =====================================================================
-- MANUAL STEP after running this file
-- =====================================================================
-- Redeploy the edge function so the official email carries Reply-To:
--   supabase functions deploy send-notifications
-- (Until then it still sends; replying just goes to the no-reply sender.)
