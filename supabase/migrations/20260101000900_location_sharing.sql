-- =====================================================================
-- Duleko MVP :: 0010 :: Optional live location sharing
-- =====================================================================
-- A one-tap GPS snapshot, separate from the typed address fields. Useful
-- for "who's nearby right now" — drivers, auto-rickshaws, delivery.
alter table public.profiles
  add column if not exists lat double precision check (lat is null or (lat between -90 and 90)),
  add column if not exists lng double precision check (lng is null or (lng between -180 and 180)),
  add column if not exists location_shared_at timestamptz;
