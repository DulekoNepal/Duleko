-- =====================================================================
-- Duleko MVP :: 2800 :: Let someone delete their own account
-- =====================================================================
-- One call, and the account and everything hanging off it goes. The
-- browser cannot delete an auth user with the anon key, so this runs as
-- the definer - but it only ever deletes auth.uid(), so it can be handed
-- to `authenticated` without letting anyone touch someone else's row.
--
-- Uploaded files are the one thing no foreign key reaches, so they are
-- cleared explicitly first. Everything else follows auth.users by
-- cascade: the profile, its skills, availability, certificates,
-- contacts, engagements and bids, messages and reactions, friendships,
-- reviews, notifications, delivery rows and presence.
--
-- Reviews the person *wrote* about others go too, and that is handled:
-- trg_reviews_recalculate already fires on delete, so everyone they
-- rated has their average recomputed on the way out.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'You must be signed in to delete your account'
      using errcode = 'insufficient_privilege';
  end if;

  delete from storage.objects
   where bucket_id in ('avatars', 'covers', 'certificates')
     and (storage.foldername(name))[1] = uid::text;

  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- =====================================================================
-- Worth testing with a throwaway account before trusting it
-- =====================================================================
-- Sign up a spare account, sign in as it, then in the app use
-- Profile -> Settings -> Delete account. Afterwards:
--
--   select count(*) from auth.users where email = 'spare@example.com';   -- 0
--   select count(*) from public.profiles where user_id = '<that uid>';   -- 0
--
-- If the delete from auth.users is refused, the function owner needs the
-- privilege granting once, as the postgres role:
--
--   grant delete on auth.users to postgres;
