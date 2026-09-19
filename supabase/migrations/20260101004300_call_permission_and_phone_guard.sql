-- =====================================================================
-- Duleko MVP :: 4300 :: "Who can call me" + no phone numbers in chat
-- =====================================================================
-- 1. profiles.call_permission decides who may see a person's phone
--    number (and so who gets a working Call button):
--      everyone       - any signed-in user
--      accepted_work  - only after a work request between the two was
--                       accepted / confirmed / completed   (default)
--      friends        - accepted friends only
--      nobody         - no one
--    The owner always sees their own number.
-- 2. Chat stays open to everybody, but a message that contains a phone
--    number is rejected, so numbers are not shared around the call rule.

alter table public.profiles
  add column if not exists call_permission text not null default 'accepted_work'
  check (call_permission in ('everyone', 'accepted_work', 'friends', 'nobody'));

create or replace function public.can_call(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when target is null or public.current_profile_id() is null then false
    when target = public.current_profile_id() then true
    else coalesce((
      select case p.call_permission
        when 'everyone' then true
        when 'nobody' then false
        when 'friends' then exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and ((f.requester_profile_id = target and f.addressee_profile_id = public.current_profile_id())
              or (f.addressee_profile_id = target and f.requester_profile_id = public.current_profile_id()))
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

drop policy if exists contacts_read_gated on public.profile_contacts;
create policy contacts_read_gated on public.profile_contacts
  for select to authenticated using (public.can_call(profile_id));

-- ---------------------------------------------------------------------
-- Phone numbers in chat: 9+ digits in one run (spaces, dashes, dots,
-- brackets allowed between them, Nepali digits counted). Welcome
-- senders are exempt.
-- ---------------------------------------------------------------------
create or replace function public.text_has_phone_number(body text)
returns boolean
language plpgsql immutable as $$
declare
  m text[];
  normalized text := translate(coalesce(body, ''), '०१२३४५६७८९', '0123456789');
begin
  for m in select regexp_matches(normalized, '\+?\d[\d\s().\-]{7,}\d', 'g') loop
    if length(regexp_replace(m[1] , '\D', '', 'g')) >= 9 then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

create or replace function public.messages_block_phone_numbers()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.welcome_senders ws where ws.profile_id = new.sender_profile_id) then
    return new;
  end if;
  if (tg_op = 'INSERT' or new.body is distinct from old.body)
     and new.deleted_at is null
     and public.text_has_phone_number(new.body) then
    raise exception 'PHONE_NUMBER_NOT_ALLOWED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_block_phone_numbers on public.messages;
create trigger messages_block_phone_numbers
  before insert or update of body on public.messages
  for each row execute function public.messages_block_phone_numbers();
