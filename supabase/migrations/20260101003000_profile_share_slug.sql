-- =====================================================================
-- Duleko MVP :: 3000 :: An opaque handle for shared profile links
-- =====================================================================
-- Sharing a profile meant handing out its database id. This gives every
-- profile a random public_slug to share instead, so a link carries
-- nothing internal and nothing guessable - you cannot walk the
-- directory by incrementing anything, and the id behind it stays put.
--
-- The old /worker/<uuid> links keep working: the app resolves a handle
-- as an id first and falls back to the slug, so nothing already shared
-- or bookmarked breaks.

alter table public.profiles
  add column if not exists public_slug text;

-- ---------------------------------------------------------------------
-- Slug generation
-- ---------------------------------------------------------------------
-- ~10 characters from random bytes: 36^10 possibilities, so guessing one
-- is not a realistic way to find anybody.
create or replace function public.new_profile_slug()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := left(
      lower(translate(encode(gen_random_bytes(12), 'base64'), '+/=', '')),
      10
    );
    exit when length(candidate) = 10
          and not exists (select 1 from public.profiles where public_slug = candidate);
  end loop;
  return candidate;
end;
$$;

-- Backfill before the unique index, so existing profiles are shareable too.
update public.profiles
   set public_slug = public.new_profile_slug()
 where public_slug is null;

alter table public.profiles
  alter column public_slug set default public.new_profile_slug();

alter table public.profiles
  alter column public_slug set not null;

create unique index if not exists profiles_public_slug_key
  on public.profiles (public_slug);

-- ---------------------------------------------------------------------
-- The slug is immutable once issued
-- ---------------------------------------------------------------------
-- Otherwise someone could rewrite theirs and quietly break every link
-- they had already shared - or worse, claim a slug somebody else had
-- been handing out.
create or replace function public.guard_profile_slug()
returns trigger language plpgsql as $$
begin
  if new.public_slug is distinct from old.public_slug then
    new.public_slug := old.public_slug;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_slug_guard on public.profiles;
create trigger trg_profiles_slug_guard before update on public.profiles
  for each row execute function public.guard_profile_slug();

-- profiles_read is already `using (true)` for authenticated and anon, so
-- the slug is readable by exactly the audience that can open a profile.
