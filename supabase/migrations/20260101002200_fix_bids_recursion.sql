-- =====================================================================
-- Duleko MVP :: 0022 :: Fix "infinite recursion" on the bids insert policy
-- =====================================================================
-- bids_insert_turn's WITH CHECK queried public.bids from inside a policy
-- ON public.bids — Postgres re-applies RLS to that inner query too, which
-- re-triggers the same policy, forever (error 42P17). The fix used
-- elsewhere in this schema (current_profile_id, can_view_contact, ...):
-- do the lookup in a SECURITY DEFINER function, which runs with the
-- function owner's privileges and so doesn't re-invoke RLS on bids.
create or replace function public.last_bidder(p_engagement_id uuid)
returns uuid
language sql stable security definer set search_path = public as $$
  select bidder_profile_id
    from public.bids
   where engagement_id = p_engagement_id
   order by created_at desc
   limit 1;
$$;

drop policy if exists bids_insert_turn on public.bids;
create policy bids_insert_turn on public.bids
  for insert to authenticated
  with check (
    bidder_profile_id = public.current_profile_id()
    and exists (
      select 1 from public.work_engagements e
       where e.id = bids.engagement_id
         and e.status = 'pending'
         and public.current_profile_id() in (e.employer_profile_id, e.worker_profile_id)
    )
    -- Can't bid twice in a row — the other party has to respond first.
    and public.last_bidder(bids.engagement_id) is distinct from public.current_profile_id()
  );
