-- =====================================================================
-- Duleko MVP :: 4900 :: Duleko Membership ID number
-- =====================================================================
-- NOTE: the format below was replaced by DLK-26AA0001 in 5100, which also
-- renumbers everyone. This file is kept exactly as it was run.
--
-- Every member gets one permanent, unique membership number, shown on
-- their profile and printed on their Professional ID card:
--
--     DLK-2026-00042
--      |    |     '--- running number, in the order people joined
--      |    '--------- the year they joined (Nepal time)
--      '-------------- Duleko
--
-- The running number never restarts, so it alone is already unique; the
-- year is there to read, not to tell two members apart. The number is
-- not a secret and nothing looks anyone up by it - shared links keep
-- using the opaque public_slug (3000) - so counting up in join order
-- gives away nothing "member since" on the same profile doesn't.
--
-- Safe to run more than once.

create sequence if not exists public.member_number_seq;

create or replace function public.new_member_no(joined_at timestamptz default now())
returns text
language sql volatile security definer set search_path = public as $$
  select 'DLK-'
      || to_char(joined_at at time zone 'Asia/Kathmandu', 'YYYY')
      || '-'
      -- lpad would cut a sixth digit off rather than make room for it.
      || lpad(n::text, greatest(5, length(n::text)), '0')
    from (select nextval('public.member_number_seq') as n) s;
$$;

-- Only the insert trigger below hands numbers out. Callable over the API
-- it would let anyone burn through the sequence and leave gaps.
revoke execute on function public.new_member_no(timestamptz) from public, anon, authenticated;

alter table public.profiles add column if not exists member_no text;

-- Backfill in join order, so the founding members hold the first numbers.
do $$
declare
  r record;
begin
  for r in
    select id, created_at from public.profiles where member_no is null order by created_at, id
  loop
    update public.profiles set member_no = public.new_member_no(r.created_at) where id = r.id;
  end loop;
end;
$$;

alter table public.profiles alter column member_no set not null;

create unique index if not exists profiles_member_no_key on public.profiles (member_no);

-- ---------------------------------------------------------------------
-- Issued by the database, never chosen, never changed
-- ---------------------------------------------------------------------
-- A trigger rather than a column default: a default only applies when
-- the insert leaves the column out, and the browser could otherwise
-- claim a number of its choosing - including one the sequence has yet
-- to reach, which would make a later member's sign-up fail on the
-- unique index.
-- SECURITY DEFINER because the signing-up member runs this insert, and
-- they may not call new_member_no() themselves (see above).
create or replace function public.assign_member_no()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.member_no := public.new_member_no(coalesce(new.created_at, now()));
  return new;
end;
$$;

drop trigger if exists trg_profiles_member_no on public.profiles;
create trigger trg_profiles_member_no before insert on public.profiles
  for each row execute function public.assign_member_no();

-- Same rule as the share slug: once issued it is printed on cards people
-- carry, so it can never be rewritten through "update my own profile".
create or replace function public.guard_member_no()
returns trigger language plpgsql as $$
begin
  if new.member_no is distinct from old.member_no then
    new.member_no := old.member_no;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_member_no_guard on public.profiles;
create trigger trg_profiles_member_no_guard before update on public.profiles
  for each row execute function public.guard_member_no();

-- profiles_read already covers who may see a profile, so the number is
-- readable by exactly the audience that can open that profile.
