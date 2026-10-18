-- =====================================================================
-- Duleko MVP :: 6600 :: A verified name and age stay as the ID says
-- =====================================================================
-- Run after 6300 (this replaces its name-change trigger).
--
-- First-release feedback, item 7: once staff have checked someone's ID,
-- the details it vouches for can't be edited any more.
--
--   * Name - 6300 let a verified member change it and quietly took the
--     badge away. Now the change is refused instead (NAME_LOCKED_VERIFIED).
--     Spacing and capital letters still don't count, so tidying
--     "ram  bahadur" to "Ram Bahadur" is fine.
--   * Age  - refused too once set (AGE_LOCKED_VERIFIED). An age left
--     empty may still be filled in once.
--
-- Someone who really must change them (a new name after marriage, a
-- typo staff missed) asks Duleko: staff remove the badge from the
-- profile's menu, the member edits, and sends their ID again.
--
-- Staff were never verified through profile_verifications, so their own
-- profiles aren't affected. Staff can already see every ID - pending,
-- approved or rejected - through 6300's policies; the app now shows the
-- approved ones too (ID checks > Recently checked, and a profile's menu).
-- =====================================================================

drop trigger if exists trg_profiles_unverify_on_name on public.profiles;
drop function if exists public.unverify_on_name_change();

create or replace function public.lock_verified_identity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profile_verifications where profile_id = new.id) then
    return new;
  end if;
  if lower(regexp_replace(trim(new.full_name), '\s+', ' ', 'g'))
     is distinct from lower(regexp_replace(trim(old.full_name), '\s+', ' ', 'g')) then
    raise exception 'NAME_LOCKED_VERIFIED' using errcode = 'P0001';
  end if;
  if old.age is not null and new.age is distinct from old.age then
    raise exception 'AGE_LOCKED_VERIFIED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_lock_verified_identity on public.profiles;
create trigger trg_profiles_lock_verified_identity
  before update of full_name, age on public.profiles
  for each row execute function public.lock_verified_identity();
