-- =====================================================================
-- Duleko MVP :: 0020 :: Free the rest of the day on an early finish
-- =====================================================================
-- A confirmed job books the worker's whole day (public.sync_availability).
-- If the work actually wraps up before 10 AM Nepal time, that's most of
-- the day still free - re-open the day so the worker can be booked again,
-- rather than staying locked out until midnight over one morning job.
create or replace function public.sync_availability()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'confirmed' then
    insert into public.availability (profile_id, day, status, engagement_id)
    values (new.worker_profile_id, new.work_date, 'booked', new.id)
    on conflict (profile_id, day)
      do update set status = 'booked', engagement_id = excluded.engagement_id;

  elsif new.status in ('declined','cancelled') then
    update public.availability
       set status = 'available', engagement_id = null
     where engagement_id = new.id;

  elsif new.status = 'completed' then
    if extract(hour from (coalesce(new.completed_at, now()) at time zone 'Asia/Kathmandu')) < 10 then
      update public.availability
         set status = 'available', engagement_id = null
       where engagement_id = new.id;
    end if;
  end if;

  return null;
end;
$$;
