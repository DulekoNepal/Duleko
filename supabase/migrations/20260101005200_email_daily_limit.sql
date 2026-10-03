-- =====================================================================
-- Duleko MVP :: 5200 :: Stop emailing when the day's email limit is used
-- =====================================================================
-- Brevo's free plan sends 300 emails a day, counted from 00:00 UTC
-- (5:45 am in Nepal). Every in-app alert is created no matter what; only
-- its email copy is held back once the day's allowance is spent:
--
--   notifications --2500--> notification_deliveries (email)
--                                  |
--                                  '-- today's emails >= email_daily_limit?
--                                        yes -> status 'skipped', never sent
--
-- The limit lives in app_settings, editable from the table editor with
-- no deploy. It starts at 280, not 300: sign-up and password-reset codes
-- may go out through the same Brevo account, and they must never be the
-- ones that miss out. Raise it to match a paid plan, or delete the row to
-- turn the limit off.
--
-- send-notifications also treats Brevo's own "not enough credits" (402)
-- the same way, in case the count here and Brevo's ever disagree.
--
-- Safe to run more than once.

alter table public.notification_deliveries drop constraint if exists notification_deliveries_status_check;
alter table public.notification_deliveries add constraint notification_deliveries_status_check
  check (status in ('pending','sending','sent','failed','skipped'));

insert into public.app_settings (key, value) values ('email_daily_limit', '280')
on conflict (key) do nothing;

-- Feeds the count below: today's emails only.
create index if not exists notification_deliveries_email_day_idx
  on public.notification_deliveries (created_at)
  where channel = 'email';

create or replace function public.apply_email_daily_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  daily_limit integer;
  used        integer;
begin
  if new.channel <> 'email' or new.status <> 'pending' then
    return new;
  end if;

  select nullif(trim(value), '')::integer into daily_limit
    from public.app_settings where key = 'email_daily_limit';
  if daily_limit is null then
    return new;
  end if;

  -- Two notices going out at the same moment must not both see room for
  -- the last few emails: count one at a time.
  perform pg_advisory_xact_lock(hashtext('notification_email_daily_limit'));

  select count(*) into used
    from public.notification_deliveries
   where channel = 'email'
     and status in ('pending', 'sending', 'sent')
     and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';

  if used >= daily_limit then
    new.status     := 'skipped';
    new.last_error := 'daily email limit reached';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notification_deliveries_email_limit on public.notification_deliveries;
create trigger trg_notification_deliveries_email_limit
  before insert on public.notification_deliveries
  for each row execute function public.apply_email_daily_limit();

-- How many were held back today:
--   select count(*) from public.notification_deliveries
--    where status = 'skipped' and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
