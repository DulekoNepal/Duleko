-- =====================================================================
-- Duleko MVP :: 0023 :: Guest browsing (anon read access) + online presence
-- =====================================================================
-- Guests (Supabase's built-in `anon` role, i.e. no session at all) can now
-- browse the public directory - skills, worker profiles, their skills,
-- reviews and certificates - exactly like a signed-in user, minus anything
-- private. Nothing that was gated stays gated: profile_contacts (phone
-- numbers), notifications, work_engagements, friendships, bids and
-- messages are untouched and still `to authenticated` only, so a guest
-- can look but the moment they try to call, message, friend, request work
-- or review someone, the app asks them to sign in first.

-- ------------------------------ skills -------------------------------
drop policy if exists skills_read on public.skills;
create policy skills_read on public.skills
  for select to authenticated, anon using (true);

-- ----------------------------- profiles ------------------------------
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated, anon using (true);

-- --------------------------- user_skills -----------------------------
drop policy if exists user_skills_read on public.user_skills;
create policy user_skills_read on public.user_skills
  for select to authenticated, anon using (true);

-- --------------------------- availability ----------------------------
-- Needed so a guest's "free on {day}" search filter reflects real bookings
-- instead of every worker looking free (RLS would otherwise hide the rows
-- search_workers checks, making not-exists() vacuously true).
drop policy if exists availability_read on public.availability;
create policy availability_read on public.availability
  for select to authenticated, anon using (true);

-- ------------------------------ reviews ------------------------------
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews
  for select to authenticated, anon using (true);

-- --------------------------- certificates ----------------------------
drop policy if exists certificates_read on public.certificates;
create policy certificates_read on public.certificates
  for select to authenticated, anon using (true);

-- Belt-and-suspenders: Supabase projects grant table privileges to `anon`
-- by default, but make it explicit here so this migration is self-contained.
grant select on public.skills, public.profiles, public.user_skills,
  public.availability, public.reviews, public.certificates to anon;

-- Discovery RPCs: same function, just reachable without a session too.
grant execute on function public.search_workers(
  text, text, text, text, text, date, boolean, text, integer, integer, double precision, double precision
) to anon;
grant execute on function public.skill_counts(text) to anon;
grant execute on function public.current_profile_id() to anon;

-- =====================================================================
-- Online presence - separate from is_available (which means "open to
-- accept new work"). This is a live "has the app open right now" signal,
-- shown as a small dot on the avatar rather than the availability badge.
-- =====================================================================
create table if not exists public.presence (
  profile_id   uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table public.presence enable row level security;

-- Presence is as public as the profile it belongs to (same audience as
-- profiles_read) - showing "online" on a public profile isn't sensitive.
drop policy if exists presence_read on public.presence;
create policy presence_read on public.presence
  for select to authenticated, anon using (true);

-- Only a signed-in profile can report its own presence, and only guests
-- and their own row - never someone else's.
drop policy if exists presence_write_own on public.presence;
create policy presence_write_own on public.presence
  for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

grant select on public.presence to anon;
