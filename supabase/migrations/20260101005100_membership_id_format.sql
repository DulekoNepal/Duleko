-- =====================================================================
-- Duleko MVP :: 5100 :: Membership ID as DLK-26-00001, admins first
-- =====================================================================
-- 4900 gave every member a DLK-2026-00001-style number in plain join
-- order. This file replaces that, before any card was handed out:
--
--     DLK-26-00001
--         |   '--- counting up in the order people sign up
--         '------- the year they signed up (Nepal time); each year
--                  starts again at 00001
--
-- 99,999 members a year at this length; past that the number just
-- grows a digit (DLK-26-100000), so it never runs out. The two-digit
-- year only repeats in 2126.
--
-- It also removes the test accounts made while building Duleko, then
-- renumbers everyone: the three admins first - Sanjay DLK-26-00001,
-- Sunil DLK-26-00002, Dipendra DLK-26-00003 - then everyone else in
-- the order they first signed in.
--
-- Safe to run more than once: a number already in this format is never
-- changed again.

-- ---------------------------------------------------------------------
-- First: the four test accounts go, with everything attached to them.
-- Deleting the auth user takes the profile and all that hangs off it
-- (the same cascade delete_my_account relies on, 2800). None of them is
-- staff, verified or the official account; none had a photo uploaded.
-- ---------------------------------------------------------------------
delete from auth.users
 where id in (
   '18db53c1-33cd-4a10-bc5f-26127b4a7114',  -- Test User
   '0c87403d-1064-470d-801a-318c8c0e9d5f',  -- QA Tester
   '987eaaca-c889-4aa5-9eac-36711bbb0ae8',  -- Retry Tester
   'f3b5ac94-085c-4c24-acbf-a4e2bd13271c'   -- Dup Phone Tester
 );

-- ---------------------------------------------------------------------
-- The formula
-- ---------------------------------------------------------------------
-- One counter per year. A row lock, not a sequence: two people signing
-- up at the same moment queue for the next number instead of skipping
-- one, and a sign-up that fails hands its number straight back.
create table if not exists public.member_number_counters (
  sign_up_year integer primary key,
  last_number  bigint  not null
);

-- RLS on with no policies: only new_member_no() below touches it.
alter table public.member_number_counters enable row level security;

-- Same name and signature as 4900's, so the insert trigger picks the new
-- format up as it is.
create or replace function public.new_member_no(joined_at timestamptz default now())
returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  yr integer := extract(year from joined_at at time zone 'Asia/Kathmandu')::integer;
  n  bigint;
begin
  insert into public.member_number_counters as c (sign_up_year, last_number)
  values (yr, 1)
  on conflict (sign_up_year) do update set last_number = c.last_number + 1
  returning c.last_number into n;
  -- lpad would cut a sixth digit off rather than make room for it.
  return 'DLK-' || lpad((yr % 100)::text, 2, '0') || '-'
      || lpad(n::text, greatest(5, length(n::text)), '0');
end;
$$;

-- Only the insert trigger hands numbers out. Callable over the API it
-- would let anyone burn through the counter and leave gaps.
revoke execute on function public.new_member_no(timestamptz) from public, anon, authenticated;

-- 4900's counter; member_number_counters replaces it.
drop sequence if exists public.member_number_seq;

-- ---------------------------------------------------------------------
-- Renumber: the three admins in a fixed order, then everyone else in
-- the order they first signed in (when their account was created).
-- ---------------------------------------------------------------------
-- The guard trigger would quietly keep every old number, so it is off
-- for the renumbering and back on just below. All of this file runs as
-- one transaction, so nobody can change their own number in between.
drop trigger if exists trg_profiles_member_no_guard on public.profiles;

do $$
declare
  r record;
begin
  for r in
    select p.id, u.created_at
      from public.profiles p
      join auth.users u on u.id = p.user_id
     where p.member_no is null
        or p.member_no !~ '^DLK-[0-9]{2}-[0-9]{5,}$'
     order by array_position(
                array['b7bc1f68-7f04-4eb4-addd-df5d71db8e98',   -- Sanjay Gupta       -> DLK-26-00001
                      'fc5757c4-cd73-4dc0-b3d6-441c4c1dad00',   -- Sunil Kumar        -> DLK-26-00002
                      '541bf85d-3b39-465f-b14d-f0267ab09b10'    -- Dipendra Chaudhary -> DLK-26-00003
                     ]::uuid[],
                p.id) nulls last,
              u.created_at, p.created_at, p.id
  loop
    update public.profiles set member_no = public.new_member_no(r.created_at) where id = r.id;
  end loop;
end;
$$;

create trigger trg_profiles_member_no_guard before update on public.profiles
  for each row execute function public.guard_member_no();
