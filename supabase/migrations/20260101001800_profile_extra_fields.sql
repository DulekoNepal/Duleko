-- =====================================================================
-- Duleko MVP :: 0018 :: More About-section fields
-- =====================================================================
-- Public, low-sensitivity extras shown in the About section: age, highest
-- education, and a short one-line bio (kept separate from the longer
-- "about" text — a LinkedIn-style headline, not a replacement for it).
alter table public.profiles
  add column if not exists age       smallint check (age is null or age between 14 and 100),
  add column if not exists education text     check (education is null or char_length(education) <= 100),
  add column if not exists bio       text     check (bio is null or char_length(bio) <= 100);

-- An alternative phone number lives next to the primary one — private,
-- gated by the exact same can_view_contact() rule (only visible once a
-- work request is accepted or the two are friends).
alter table public.profile_contacts
  add column if not exists alt_phone text check (alt_phone is null or char_length(trim(alt_phone)) between 7 and 20);
