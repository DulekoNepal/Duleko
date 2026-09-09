-- =====================================================================
-- Duleko MVP :: 2500 :: Email + SMS delivery for notifications
-- =====================================================================
-- Every in-app notification already lands in public.notifications. This
-- adds a delivery layer on top of that single source of truth:
--
--   notifications  --trigger-->  notification_deliveries (outbox)
--                                        |
--                        pg_cron (1/min) | pg_net
--                                        v
--                          edge function `send-notifications`
--                                        |
--                             Brevo (email) / SMS provider
--
-- The outbox exists so a failed send is retried instead of lost, and so
-- nothing user-facing ever blocks on an external HTTP call.

-- ---------------------------------------------------------------------
-- Per-user preferences
-- ---------------------------------------------------------------------
-- Email defaults on (free). SMS defaults OFF: every text message costs
-- real money, so it is opt-in and limited to the kinds listed in the
-- 'sms_kinds' setting below.
create table if not exists public.notification_prefs (
  profile_id    uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  sms_enabled   boolean not null default false,
  updated_at    timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

drop trigger if exists trg_notification_prefs_touch on public.notification_prefs;
create trigger trg_notification_prefs_touch before update on public.notification_prefs
  for each row execute function public.touch_updated_at();

drop policy if exists notification_prefs_own on public.notification_prefs;
create policy notification_prefs_own on public.notification_prefs
  for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

-- ---------------------------------------------------------------------
-- The outbox
-- ---------------------------------------------------------------------
-- RLS on with no policies: service_role (the edge function) only. It
-- holds email addresses and phone numbers, so the browser never sees it.
create table if not exists public.notification_deliveries (
  id                  uuid primary key default gen_random_uuid(),
  notification_id     uuid references public.notifications(id) on delete cascade,
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  related_profile_id  uuid references public.profiles(id) on delete set null,
  kind                text not null,
  channel             text not null check (channel in ('email','sms')),
  lang                text not null default 'en' check (lang in ('en','ne')),
  destination         text not null,
  subject             text not null,
  body                text not null,
  status              text not null default 'pending'
                        check (status in ('pending','sending','sent','failed')),
  attempts            integer not null default 0,
  last_error          text,
  created_at          timestamptz not null default now(),
  sent_at             timestamptz
);

alter table public.notification_deliveries enable row level security;

create index if not exists notification_deliveries_pending_idx
  on public.notification_deliveries (created_at)
  where status = 'pending';

-- Feeds the "have we already emailed them about this sender lately?"
-- throttle below.
create index if not exists notification_deliveries_throttle_idx
  on public.notification_deliveries (profile_id, kind, related_profile_id, created_at desc);

-- ---------------------------------------------------------------------
-- Settings the delivery layer reads (editable from the table editor)
-- ---------------------------------------------------------------------
-- Normally created by migration 2400; repeated here so this file still
-- applies cleanly if the two are run out of order.
create table if not exists public.app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

insert into public.app_settings (key, value) values
  -- Only these notification kinds are ever worth paying for an SMS.
  ('sms_kinds', 'request,confirmed,friend_request'),
  -- Used to build the "Open Duleko" link in the email.
  ('site_url',  'https://www.duleko.com')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Enqueue: one row per notification per enabled channel
-- ---------------------------------------------------------------------
create or replace function public.enqueue_notification_delivery()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_lang  text;
  user_email text;
  user_phone text;
  pref_email boolean;
  pref_sms   boolean;
  last_seen  timestamptz;
  joined_at  timestamptz;
  msg_subject text;
  msg_body    text;
  sms_kinds   text[];
begin
  select p.language,
         coalesce(np.email_enabled, true),
         coalesce(np.sms_enabled, false),
         u.email,
         pc.phone,
         pr.last_seen_at,
         p.created_at
    into user_lang, pref_email, pref_sms, user_email, user_phone, last_seen, joined_at
    from public.profiles p
    join auth.users u                       on u.id = p.user_id
    left join public.notification_prefs np  on np.profile_id = p.id
    left join public.profile_contacts pc    on pc.profile_id = p.id
    left join public.presence pr            on pr.profile_id = p.id
   where p.id = new.profile_id;

  if not found then
    return null;
  end if;

  msg_subject := case when user_lang = 'ne' then new.title_ne else new.title_en end;
  msg_body    := coalesce(case when user_lang = 'ne' then new.body_ne else new.body_en end, '');

  -- Chat is the noisy kind. Three guards, all aimed at not being annoying:
  -- don't reach outside the app while the person is actually in it, don't
  -- email the founder's welcome chat to someone who is mid-signup (they
  -- already get the welcome mail), and never more than one message alert
  -- per sender per 15 minutes.
  if new.kind = 'message' then
    if last_seen is not null and last_seen > now() - interval '3 minutes' then
      return null;
    end if;

    if joined_at > now() - interval '5 minutes' then
      return null;
    end if;

    if exists (
      select 1 from public.notification_deliveries d
       where d.profile_id = new.profile_id
         and d.kind = 'message'
         and d.related_profile_id is not distinct from new.related_profile_id
         and d.created_at > now() - interval '15 minutes'
    ) then
      return null;
    end if;
  end if;

  if pref_email and user_email is not null then
    insert into public.notification_deliveries
      (notification_id, profile_id, related_profile_id, kind, channel, lang,
       destination, subject, body)
    values
      (new.id, new.profile_id, new.related_profile_id, new.kind, 'email',
       coalesce(user_lang, 'en'), user_email, msg_subject, msg_body);
  end if;

  select string_to_array(replace(value, ' ', ''), ',') into sms_kinds
    from public.app_settings where key = 'sms_kinds';

  if pref_sms
     and user_phone is not null
     and new.kind = any (coalesce(sms_kinds, '{}'::text[]))
  then
    insert into public.notification_deliveries
      (notification_id, profile_id, related_profile_id, kind, channel, lang,
       destination, subject, body)
    values
      (new.id, new.profile_id, new.related_profile_id, new.kind, 'sms',
       coalesce(user_lang, 'en'), user_phone, msg_subject,
       left(msg_subject || ' - ' || msg_body, 300));
  end if;

  return null;
end;
$$;

drop trigger if exists trg_notifications_deliver on public.notifications;
create trigger trg_notifications_deliver
  after insert on public.notifications
  for each row execute function public.enqueue_notification_delivery();

-- ---------------------------------------------------------------------
-- Claim: the edge function calls this instead of selecting directly, so
-- two overlapping runs can never send the same message twice.
-- ---------------------------------------------------------------------
create or replace function public.claim_notification_deliveries(batch_size integer default 40)
returns setof public.notification_deliveries
language sql security definer set search_path = public as $$
  update public.notification_deliveries d
     set status   = 'sending',
         attempts = d.attempts + 1
   where d.id in (
     select id from public.notification_deliveries
      where status = 'pending'
      order by created_at
      limit batch_size
      for update skip locked
   )
  returning d.*;
$$;

-- The edge function (service_role) is the only caller.
revoke execute on function public.claim_notification_deliveries(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_deliveries(integer) to service_role;

-- Anything stuck in 'sending' for over 10 minutes means the function died
-- mid-flight; put it back in the queue (or bury it after 3 tries).
create or replace function public.requeue_stuck_deliveries()
returns void
language sql security definer set search_path = public as $$
  update public.notification_deliveries
     set status = case when attempts >= 3 then 'failed' else 'pending' end,
         last_error = coalesce(last_error, 'timed out in sending')
   where status = 'sending'
     and created_at < now() - interval '10 minutes';
$$;

revoke execute on function public.requeue_stuck_deliveries() from public, anon, authenticated;
grant execute on function public.requeue_stuck_deliveries() to service_role;

-- =====================================================================
-- MANUAL STEPS after running this file  (see README section 10)
-- =====================================================================
-- 1. Deploy the edge function:
--      supabase functions deploy send-notifications
--
-- 2. Set its secrets (email is enough to start; SMS is optional):
--      supabase secrets set BREVO_API_KEY=xkeysib-xxx
--      supabase secrets set NOTIFY_EMAIL_FROM="Duleko <hello@duleko.com>"
--      supabase secrets set SMS_PROVIDER=sparrow          # or twilio, or leave unset
--      supabase secrets set SPARROW_TOKEN=xxx SPARROW_FROM=Duleko
--
-- 3. Store the two values pg_cron needs in Vault (Database -> Vault, or SQL):
--      select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-notifications',
--                                 'notify_function_url');
--      select vault.create_secret('<your service_role key>', 'notify_service_key');
--
-- 4. Schedule the drain (safe to re-run; cron.schedule updates by name):
--      create extension if not exists pg_cron;
--      create extension if not exists pg_net;
--
--      select cron.schedule('drain-notification-outbox', '* * * * *', $cron$
--        select public.requeue_stuck_deliveries();
--        select net.http_post(
--          url     := (select decrypted_secret from vault.decrypted_secrets
--                       where name = 'notify_function_url'),
--          headers := jsonb_build_object(
--                       'Content-Type', 'application/json',
--                       'Authorization', 'Bearer ' || (select decrypted_secret
--                                                        from vault.decrypted_secrets
--                                                       where name = 'notify_service_key')),
--          body    := '{}'::jsonb
--        );
--      $cron$);
--
-- To watch it work:  select status, count(*) from public.notification_deliveries group by 1;
