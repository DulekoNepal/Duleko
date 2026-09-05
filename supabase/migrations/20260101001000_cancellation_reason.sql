-- =====================================================================
-- Duleko MVP :: 0011 :: Cancellation requires a reason
-- =====================================================================
alter table public.work_engagements
  add column if not exists cancellation_reason text check (cancellation_reason in
    ('schedule_conflict','change_of_plans','price_disagreement',
     'found_someone_else','no_longer_needed','other')),
  add column if not exists cancellation_note text check (char_length(cancellation_note) <= 300);

-- Same transition guard as before, plus: cancelling now requires a reason.
-- Enforced here too (not just in the UI) so the rule holds regardless of caller.
create or replace function public.guard_engagement_transition()
returns trigger language plpgsql as $$
declare
  actor uuid := public.current_profile_id();
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
       (old.status = 'pending'   and new.status in ('accepted','declined','cancelled'))
    or (old.status = 'accepted'  and new.status in ('confirmed','cancelled'))
    or (old.status = 'confirmed' and new.status in ('completed','cancelled'))
  ) then
    raise exception 'Invalid status change: % -> %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  if actor is not null then
    if new.status in ('accepted','declined') and actor <> old.worker_profile_id then
      raise exception 'Only the worker can accept or decline this request'
        using errcode = 'insufficient_privilege';
    end if;

    if new.status = 'confirmed' and actor <> old.employer_profile_id then
      raise exception 'Only the employer can confirm this job'
        using errcode = 'insufficient_privilege';
    end if;

    if actor not in (old.employer_profile_id, old.worker_profile_id) then
      raise exception 'Only the employer or worker can change this job'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- These fields are set by the flow, never rewritten by either party.
  new.employer_profile_id := old.employer_profile_id;
  new.worker_profile_id   := old.worker_profile_id;
  new.created_at          := old.created_at;

  if new.status = 'completed' and new.completed_at is null then
    new.completed_at = now();
  end if;

  if new.status = 'cancelled' then
    if new.cancelled_by is null then
      new.cancelled_by = actor;
    end if;
    if new.cancellation_reason is null then
      raise exception 'A reason is required to cancel this job'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_engagements_guard on public.work_engagements;
create trigger trg_engagements_guard before update on public.work_engagements
  for each row execute function public.guard_engagement_transition();
