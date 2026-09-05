-- =====================================================================
-- Duleko MVP :: 0003 :: Row Level Security
-- Every table is locked down; access flows through current_profile_id().
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.skills           enable row level security;
alter table public.user_skills      enable row level security;
alter table public.availability     enable row level security;
alter table public.work_engagements enable row level security;
alter table public.reviews          enable row level security;
alter table public.notifications    enable row level security;
alter table public.profile_contacts enable row level security;
alter table public.blocked_users    enable row level security;
alter table public.reports          enable row level security;

-- ------------------------------ skills -------------------------------
drop policy if exists skills_read on public.skills;
create policy skills_read on public.skills
  for select to authenticated using (true);

-- ----------------------------- profiles ------------------------------
-- Signed-in users can browse the directory, minus anyone blocked either way.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (
    user_id = auth.uid()
    or not public.is_blocked(id, public.current_profile_id())
  );

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
  for delete to authenticated using (user_id = auth.uid());

-- --------------------------- user_skills -----------------------------
drop policy if exists user_skills_read on public.user_skills;
create policy user_skills_read on public.user_skills
  for select to authenticated
  using (not public.is_blocked(profile_id, public.current_profile_id()));

drop policy if exists user_skills_write_own on public.user_skills;
create policy user_skills_write_own on public.user_skills
  for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

-- --------------------------- availability ----------------------------
drop policy if exists availability_read on public.availability;
create policy availability_read on public.availability
  for select to authenticated
  using (not public.is_blocked(profile_id, public.current_profile_id()));

drop policy if exists availability_write_own on public.availability;
create policy availability_write_own on public.availability
  for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

-- ------------------------- work_engagements --------------------------
drop policy if exists engagements_read_party on public.work_engagements;
create policy engagements_read_party on public.work_engagements
  for select to authenticated
  using (public.current_profile_id() in (employer_profile_id, worker_profile_id));

-- Only the employer opens a request, and never with a blocked counterparty.
drop policy if exists engagements_insert_employer on public.work_engagements;
create policy engagements_insert_employer on public.work_engagements
  for insert to authenticated
  with check (
    employer_profile_id = public.current_profile_id()
    and worker_profile_id <> public.current_profile_id()
    and status = 'pending'
    and not public.is_blocked(worker_profile_id, public.current_profile_id())
  );

drop policy if exists engagements_update_party on public.work_engagements;
create policy engagements_update_party on public.work_engagements
  for update to authenticated
  using (public.current_profile_id() in (employer_profile_id, worker_profile_id))
  with check (public.current_profile_id() in (employer_profile_id, worker_profile_id));

-- ------------------------------ reviews ------------------------------
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews
  for select to authenticated
  using (not public.is_blocked(reviewee_profile_id, public.current_profile_id()));

-- Review only your own completed jobs, and only the other party.
drop policy if exists reviews_insert_party on public.reviews;
create policy reviews_insert_party on public.reviews
  for insert to authenticated
  with check (
    reviewer_profile_id = public.current_profile_id()
    and reviewee_profile_id <> public.current_profile_id()
    and exists (
      select 1 from public.work_engagements e
      where e.id = engagement_id
        and e.status = 'completed'
        and public.current_profile_id() in (e.employer_profile_id, e.worker_profile_id)
        and reviewee_profile_id in (e.employer_profile_id, e.worker_profile_id)
    )
  );

drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own on public.reviews
  for update to authenticated
  using (reviewer_profile_id = public.current_profile_id())
  with check (reviewer_profile_id = public.current_profile_id());

-- --------------------------- notifications ---------------------------
drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications
  for select to authenticated using (profile_id = public.current_profile_id());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
  for delete to authenticated using (profile_id = public.current_profile_id());
-- No INSERT policy: only the SECURITY DEFINER triggers create notifications.

-- -------------------------- profile_contacts -------------------------
drop policy if exists contacts_read_gated on public.profile_contacts;
create policy contacts_read_gated on public.profile_contacts
  for select to authenticated using (public.can_view_contact(profile_id));

drop policy if exists contacts_write_own on public.profile_contacts;
create policy contacts_write_own on public.profile_contacts
  for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

-- --------------------------- blocked_users ---------------------------
drop policy if exists blocks_read_own on public.blocked_users;
create policy blocks_read_own on public.blocked_users
  for select to authenticated using (blocker_profile_id = public.current_profile_id());

drop policy if exists blocks_write_own on public.blocked_users;
create policy blocks_write_own on public.blocked_users
  for all to authenticated
  using (blocker_profile_id = public.current_profile_id())
  with check (blocker_profile_id = public.current_profile_id());

-- ------------------------------ reports ------------------------------
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (reporter_profile_id = public.current_profile_id()
              and reported_profile_id <> public.current_profile_id());

drop policy if exists reports_read_own on public.reports;
create policy reports_read_own on public.reports
  for select to authenticated using (reporter_profile_id = public.current_profile_id());
