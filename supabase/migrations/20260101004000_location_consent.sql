-- =====================================================================
-- Duleko MVP :: 4000 :: Location sharing - ask once, remember the answer
-- =====================================================================
-- Previously: a manual "Share location" button on Profile, asked with
-- Duleko's own explanation dialog every time someone hadn't shared yet.
-- Now: the explanation is shown once, ever, the moment a profile first
-- exists with no decision on file. Whatever they choose is recorded
-- here - 'granted' silently re-shares a fresh location on every future
-- login (no dialog, no button), 'declined' means never ask again.
--
-- The browser's own native permission prompt is a separate, one-time
-- thing it handles itself - nothing server-side can affect that, and
-- this column only ever gates whether the app *attempts* to read a
-- location, not whether the browser allows it.
alter table public.profiles
  add column if not exists location_consent text
  check (location_consent is null or location_consent in ('granted', 'declined'));
