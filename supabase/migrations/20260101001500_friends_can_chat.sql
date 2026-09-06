-- =====================================================================
-- Duleko MVP :: 1500 :: Friends can see contact + chat too
-- =====================================================================
-- can_view_contact gates both profile_contacts (the Call button) and
-- messages (the Chat button) — it originally only allowed this once a
-- work_engagement existed between the two people. The Friends list lets
-- you message a friend directly with no engagement in between, so widen
-- the same gate to also allow accepted friendships.
create or replace function public.can_view_contact(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select target = public.current_profile_id()
      or exists (
        select 1 from public.work_engagements e
        where e.status in ('accepted','confirmed','completed')
          and (
            (e.worker_profile_id = target   and e.employer_profile_id = public.current_profile_id())
         or (e.employer_profile_id = target and e.worker_profile_id   = public.current_profile_id())
          )
      )
      or exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and (
            (f.requester_profile_id = target and f.addressee_profile_id = public.current_profile_id())
         or (f.addressee_profile_id = target and f.requester_profile_id = public.current_profile_id())
          )
      );
$$;
