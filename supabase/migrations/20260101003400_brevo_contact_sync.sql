-- =====================================================================
-- Duleko MVP :: 3400 :: Sync new profiles into a Brevo marketing list
-- =====================================================================
-- Mirrors the notification_deliveries outbox pattern from migration 2500,
-- for a different purpose: every profile that finishes onboarding gets
-- queued for Brevo's Contacts API, so hello@duleko.com's Campaigns tool
-- (sent by hand from Brevo's own dashboard - no code involved there) has
-- someone real to send to.
--
--   profiles  --trigger-->  marketing_contact_syncs (outbox)
--                                    |
--                    pg_cron (1/min) | pg_net
--                                    v
--                edge function `sync-brevo-contacts`
--                                    |
--                          Brevo Contacts API
--
-- Deliberately its own outbox rather than piggybacking on
-- notification_deliveries: this is a contact-list sync, not a message
-- with a subject/body, and a stuck or failing Brevo call should never be
-- able to block a real work-request email from going out.

create table if not exists public.marketing_contact_syncs (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null unique references public.profiles(id) on delete cascade,
  status      text not null default 'pending'
                check (status in ('pending','sending','sent','failed')),
  attempts    integer not null default 0,
  last_error  text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);

-- RLS on with no policies: service_role (the edge function) only, same as
-- notification_deliveries - this table exists purely for the backend.
alter table public.marketing_contact_syncs enable row level security;

create index if not exists marketing_contact_syncs_pending_idx
  on public.marketing_contact_syncs (created_at)
  where status = 'pending';

-- ---------------------------------------------------------------------
-- Enqueue: one row per new profile
-- ---------------------------------------------------------------------
create or replace function public.enqueue_marketing_contact_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.marketing_contact_syncs (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;
  return null;
end;
$$;

drop trigger if exists trg_profiles_marketing_sync on public.profiles;
create trigger trg_profiles_marketing_sync
  after insert on public.profiles
  for each row execute function public.enqueue_marketing_contact_sync();

-- ---------------------------------------------------------------------
-- Claim: same skip-locked pattern as claim_notification_deliveries, so
-- two overlapping cron runs can never double-submit the same contact.
-- Joins to auth.users/profiles here rather than at enqueue time, so a
-- name or profile edit before the sync actually runs is still picked up.
-- ---------------------------------------------------------------------
create or replace function public.claim_marketing_contact_syncs(batch_size integer default 40)
returns table (
  id         uuid,
  profile_id uuid,
  email      text,
  full_name  text,
  lang       text,
  attempts   integer
)
language sql security definer set search_path = public as $$
  with claimed as (
    update public.marketing_contact_syncs s
       set status   = 'sending',
           attempts = s.attempts + 1
     where s.id in (
       select id from public.marketing_contact_syncs
        where status = 'pending'
        order by created_at
        limit batch_size
        for update skip locked
     )
    returning s.*
  )
  select c.id, c.profile_id, u.email, p.full_name, p.language, c.attempts
    from claimed c
    join public.profiles p on p.id = c.profile_id
    join auth.users u      on u.id = p.user_id
   where u.email is not null;
$$;

revoke execute on function public.claim_marketing_contact_syncs(integer) from public, anon, authenticated;
grant execute on function public.claim_marketing_contact_syncs(integer) to service_role;

-- Anything stuck in 'sending' for over 10 minutes means the function died
-- mid-flight; put it back in the queue (or bury it after 3 tries).
create or replace function public.requeue_stuck_contact_syncs()
returns void
language sql security definer set search_path = public as $$
  update public.marketing_contact_syncs
     set status = case when attempts >= 3 then 'failed' else 'pending' end,
         last_error = coalesce(last_error, 'timed out in sending')
   where status = 'sending'
     and created_at < now() - interval '10 minutes';
$$;

revoke execute on function public.requeue_stuck_contact_syncs() from public, anon, authenticated;
grant execute on function public.requeue_stuck_contact_syncs() to service_role;

-- Back-fill: every profile that already existed before this migration
-- ran gets queued too, not just new signups from here on.
insert into public.marketing_contact_syncs (profile_id)
select id from public.profiles
on conflict (profile_id) do nothing;

-- =====================================================================
-- MANUAL STEPS after running this file
-- =====================================================================
-- 1. In Brevo: Contacts -> Lists -> create (or pick) a list, e.g.
--    "Duleko users". Its numeric id is in the URL when you open it,
--    e.g. .../lists/7 -> the id is 7.
--
-- 2. Deploy the edge function:
--      supabase functions deploy sync-brevo-contacts
--
-- 3. Set its secrets (BREVO_API_KEY is the same one already set for
--    send-notifications - reuse it, no need to generate a second one):
--      supabase secrets set BREVO_API_KEY=xkeysib-xxx
--      supabase secrets set BREVO_LIST_ID=7
--
-- 4. Store this function's URL in Vault (the service_role key secret,
--    'notify_service_key', already exists from migration 2500 - reused
--    here rather than duplicated):
--      select vault.create_secret('https://<ref>.supabase.co/functions/v1/sync-brevo-contacts',
--                                 'brevo_sync_function_url');
--
-- 5. Schedule the drain:
--      select cron.schedule('drain-marketing-contact-syncs', '* * * * *', $cron$
--        select public.requeue_stuck_contact_syncs();
--        select net.http_post(
--          url     := (select decrypted_secret from vault.decrypted_secrets
--                       where name = 'brevo_sync_function_url'),
--          headers := jsonb_build_object(
--                       'Content-Type', 'application/json',
--                       'Authorization', 'Bearer ' || (select decrypted_secret
--                                                        from vault.decrypted_secrets
--                                                       where name = 'notify_service_key')),
--          body    := '{}'::jsonb
--        );
--      $cron$);
--
-- To watch it work:  select status, count(*) from public.marketing_contact_syncs group by 1;
