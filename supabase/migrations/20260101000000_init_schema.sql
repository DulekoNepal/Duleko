-- =====================================================================
-- Duleko MVP :: 0001 :: Core schema
-- =====================================================================
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  full_name     text not null check (char_length(trim(full_name)) between 2 and 80),
  about         text check (char_length(about) <= 600),
  avatar_url    text,
  province      text,
  district      text,
  municipality  text,
  ward          integer check (ward is null or (ward between 1 and 40)),
  locality      text,
  is_available  boolean not null default true,
  language      text not null default 'en' check (language in ('en','ne')),
  rating        numeric(3,2) not null default 0 check (rating >= 0 and rating <= 5),
  rating_count  integer not null default 0 check (rating_count >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_district_idx     on public.profiles (district);
create index if not exists profiles_municipality_idx on public.profiles (municipality);
create index if not exists profiles_available_idx    on public.profiles (is_available);
create index if not exists profiles_rating_idx       on public.profiles (rating desc);

-- ---------------------------------------------------------------------
-- skills (bilingual catalogue) + user_skills
-- ---------------------------------------------------------------------
create table if not exists public.skills (
  id         text primary key,
  name_en    text not null,
  name_ne    text not null,
  emoji      text not null default '🛠️',
  sort_order integer not null default 100
);

create table if not exists public.user_skills (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skill_id   text not null references public.skills(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, skill_id)
);

create index if not exists user_skills_skill_idx on public.user_skills (skill_id);

-- ---------------------------------------------------------------------
-- availability (day level)
-- ---------------------------------------------------------------------
create table if not exists public.availability (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  day           date not null,
  status        text not null default 'available' check (status in ('available','booked')),
  engagement_id uuid,
  created_at    timestamptz not null default now(),
  unique (profile_id, day)
);

create index if not exists availability_day_idx on public.availability (day, status);

-- ---------------------------------------------------------------------
-- work_engagements
-- ---------------------------------------------------------------------
create table if not exists public.work_engagements (
  id                  uuid primary key default gen_random_uuid(),
  employer_profile_id uuid not null references public.profiles(id) on delete cascade,
  worker_profile_id   uuid not null references public.profiles(id) on delete cascade,
  skill_id            text references public.skills(id) on delete set null,
  title               text not null check (char_length(trim(title)) between 3 and 120),
  details             text check (char_length(details) <= 800),
  work_date           date not null,
  location_text       text not null check (char_length(trim(location_text)) between 2 and 160),
  payment_amount      numeric(10,2) check (payment_amount is null or payment_amount >= 0),
  payment_note        text check (char_length(payment_note) <= 120),
  status              text not null default 'pending'
                      check (status in ('pending','accepted','declined','confirmed','completed','cancelled')),
  cancelled_by        uuid references public.profiles(id) on delete set null,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint no_self_hire check (employer_profile_id <> worker_profile_id)
);

create index if not exists engagements_worker_idx   on public.work_engagements (worker_profile_id, status);
create index if not exists engagements_employer_idx on public.work_engagements (employer_profile_id, status);
create index if not exists engagements_date_idx     on public.work_engagements (work_date);

alter table public.availability
  drop constraint if exists availability_engagement_id_fkey;
alter table public.availability
  add constraint availability_engagement_id_fkey
  foreign key (engagement_id) references public.work_engagements(id) on delete set null;

-- ---------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id                  uuid primary key default gen_random_uuid(),
  engagement_id       uuid not null references public.work_engagements(id) on delete cascade,
  reviewer_profile_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_profile_id uuid not null references public.profiles(id) on delete cascade,
  rating              integer not null check (rating between 1 and 5),
  comment             text check (char_length(comment) <= 500),
  created_at          timestamptz not null default now(),
  unique (engagement_id, reviewer_profile_id),
  constraint no_self_review check (reviewer_profile_id <> reviewee_profile_id)
);

create index if not exists reviews_reviewee_idx on public.reviews (reviewee_profile_id, created_at desc);

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  kind          text not null check (kind in
                  ('request','accepted','declined','confirmed','completed','cancelled','review')),
  title_en      text not null,
  title_ne      text not null,
  body_en       text,
  body_ne       text,
  engagement_id uuid references public.work_engagements(id) on delete cascade,
  actor_name    text,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists notifications_profile_idx on public.notifications (profile_id, is_read, created_at desc);

-- ---------------------------------------------------------------------
-- profile_contacts (private phone numbers)
-- ---------------------------------------------------------------------
create table if not exists public.profile_contacts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  phone      text not null check (char_length(trim(phone)) between 7 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- blocked_users + reports
-- ---------------------------------------------------------------------
create table if not exists public.blocked_users (
  blocker_profile_id uuid not null references public.profiles(id) on delete cascade,
  blocked_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at         timestamptz not null default now(),
  primary key (blocker_profile_id, blocked_profile_id),
  constraint no_self_block check (blocker_profile_id <> blocked_profile_id)
);

create table if not exists public.reports (
  id                  uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid not null references public.profiles(id) on delete cascade,
  reported_profile_id uuid not null references public.profiles(id) on delete cascade,
  reason              text not null check (reason in ('spam','fake_profile','abusive','no_show','unsafe','other')),
  details             text check (char_length(details) <= 600),
  status              text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at          timestamptz not null default now(),
  constraint no_self_report check (reporter_profile_id <> reported_profile_id)
);

create index if not exists reports_reported_idx on public.reports (reported_profile_id);
