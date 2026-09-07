-- =====================================================================
-- Duleko MVP :: 2600 :: Chat and call open to every signed-in user
-- =====================================================================
-- For the beta: anyone with an account can message and call anyone else.
-- The old rule (an accepted/confirmed/completed work engagement, or an
-- accepted friendship) turned out to be a chicken-and-egg problem - you
-- could not talk to someone to arrange the work that would let you talk
-- to them.
--
-- Guests are still shut out. can_view_contact() is only ever reached
-- through policies that are `to authenticated`, and it now additionally
-- requires the caller to have finished their own profile - so browsing
-- without an account still shows no numbers and no chat, which is what
-- the published privacy policy says.
--
-- Nothing else changes: the RLS policies on profile_contacts and
-- messages are untouched, only the two functions they call.

create or replace function public.can_view_contact(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select target is not null
     and public.current_profile_id() is not null;
$$;

create or replace function public.can_chat_with(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.can_view_contact(target);
$$;

-- =====================================================================
-- TO PUT THE GATE BACK
-- =====================================================================
-- Run this to return to "only after accepted work or an accepted
-- friendship" (this is exactly what migrations 1500 and 2400 defined):
--
--   create or replace function public.can_view_contact(target uuid)
--   returns boolean
--   language sql stable security definer set search_path = public as $fn$
--     select target = public.current_profile_id()
--         or exists (
--           select 1 from public.work_engagements e
--           where e.status in ('accepted','confirmed','completed')
--             and (
--               (e.worker_profile_id = target   and e.employer_profile_id = public.current_profile_id())
--            or (e.employer_profile_id = target and e.worker_profile_id   = public.current_profile_id())
--             )
--         )
--         or exists (
--           select 1 from public.friendships f
--           where f.status = 'accepted'
--             and (
--               (f.requester_profile_id = target and f.addressee_profile_id = public.current_profile_id())
--            or (f.addressee_profile_id = target and f.requester_profile_id = public.current_profile_id())
--             )
--         );
--   $fn$;
--
--   create or replace function public.can_chat_with(target uuid)
--   returns boolean
--   language sql stable security definer set search_path = public as $fn$
--     select public.can_view_contact(target)
--         or exists (
--           select 1 from public.profiles p
--           where p.is_official
--             and p.id in (target, public.current_profile_id())
--         );
--   $fn$;
