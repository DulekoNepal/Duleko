-- =====================================================================
-- Duleko MVP :: 0007 :: Who may make which status change, plus realtime
-- =====================================================================

-- Only the worker can accept or decline; only the employer can confirm.
-- Either party may complete or cancel. Admin/SQL-editor updates (no auth
-- context) are left alone so the team can fix data by hand.
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

  if new.status = 'cancelled' and new.cancelled_by is null then
    new.cancelled_by = actor;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_engagements_guard on public.work_engagements;
create trigger trg_engagements_guard before update on public.work_engagements
  for each row execute function public.guard_engagement_transition();

-- ---------------------------------------------------------------------
-- Realtime: the notifications screen subscribes to its own rows.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception
  when undefined_object then
    -- No supabase_realtime publication (e.g. plain Postgres): nothing to do.
    null;
end;
$$;
