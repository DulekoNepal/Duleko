-- =====================================================================
-- Duleko MVP :: 8600 :: At most five certificates on a profile
-- =====================================================================
-- Run after 8500.
--
-- Get verified (/verify) now has a Duleko certification step where a
-- member sends several certificates at once, one per skill. Five is the
-- most a profile holds: certificates being checked and approved ones
-- count, turned-down ones don't (they can be replaced). Removing one
-- frees a place. Profiles already over five keep what they have.
-- =====================================================================

create or replace function public.limit_certificates()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Two uploads at the same moment must not both take the fifth place.
  perform pg_advisory_xact_lock(hashtext('certificates_limit'), hashtext(new.profile_id::text));
  if (select count(*) from public.certificates
       where profile_id = new.profile_id and status <> 'rejected') >= 5 then
    raise exception 'CERT_LIMIT' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_certificates_limit on public.certificates;
create trigger trg_certificates_limit before insert on public.certificates
  for each row execute function public.limit_certificates();
