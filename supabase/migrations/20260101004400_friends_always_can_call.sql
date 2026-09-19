-- =====================================================================
-- Duleko MVP :: 4400 :: Friends can always call and chat
-- =====================================================================
-- Accepted friends are exempt from the "who can call me" setting - even
-- 'nobody' - so no rule applies between friends. Chat is already open to
-- every signed-in user. The 'friends' option is now redundant, so anyone
-- who had it moves to 'accepted_work' (friends still get through).

update public.profiles set call_permission = 'accepted_work' where call_permission = 'friends';

create or replace function public.can_call(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when target is null or public.current_profile_id() is null then false
    when target = public.current_profile_id() then true
    when exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_profile_id = target and f.addressee_profile_id = public.current_profile_id())
          or (f.addressee_profile_id = target and f.requester_profile_id = public.current_profile_id()))
    ) then true
    else coalesce((
      select case p.call_permission
        when 'everyone' then true
        when 'nobody' then false
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
