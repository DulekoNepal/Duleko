-- =====================================================================
-- Duleko MVP :: 8700 :: New "Who can call me" choices, Everyone by default
-- =====================================================================
-- Run after 8600.
--
-- profiles.call_permission now has three choices:
--   everyone       - any signed-in user                        (default)
--   friends        - accepted friends, plus anyone with an open work
--                    request with me: pending, accepted, confirmed or
--                    completed, sent by either side. Declined and
--                    cancelled requests don't count.
--   accepted_work  - no one, except the other side of an accepted,
--                    confirmed or completed job. Friends too: the
--                    "friends always" rule of 4400 is gone.
-- 'nobody' is retired. Every member is moved to 'everyone' (decided
-- 2026-10-31); anyone can pick another choice in Settings.
--
-- can_call also decides who sees payment accounts (5600) and who can log
-- a call (6800), so those follow the new rule without changes.
-- =====================================================================

update public.profiles set call_permission = 'everyone' where call_permission <> 'everyone';

alter table public.profiles alter column call_permission set default 'everyone';
alter table public.profiles drop constraint if exists profiles_call_permission_check;
alter table public.profiles add constraint profiles_call_permission_check
  check (call_permission in ('everyone', 'friends', 'accepted_work'));

create or replace function public.can_call(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when target is null or public.current_profile_id() is null then false
    when target = public.current_profile_id() then true
    else coalesce((
      select case p.call_permission
        when 'everyone' then true
        when 'friends' then exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and ((f.requester_profile_id = target and f.addressee_profile_id = public.current_profile_id())
              or (f.addressee_profile_id = target and f.requester_profile_id = public.current_profile_id()))
        ) or exists (
          select 1 from public.work_engagements e
          where e.status in ('pending','accepted','confirmed','completed')
            and ((e.worker_profile_id = target and e.employer_profile_id = public.current_profile_id())
              or (e.employer_profile_id = target and e.worker_profile_id = public.current_profile_id()))
        )
        else exists (
          select 1 from public.work_engagements e
          where e.status in ('accepted','confirmed','completed')
            and ((e.worker_profile_id = target and e.employer_profile_id = public.current_profile_id())
              or (e.employer_profile_id = target and e.worker_profile_id = public.current_profile_id()))
        )
      end
      from public.profiles p where p.id = target
    ), false)
  end;
$$;
