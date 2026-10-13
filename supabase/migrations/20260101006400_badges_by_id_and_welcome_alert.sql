-- =====================================================================
-- Duleko MVP :: 6400 :: Every badge by ID check; welcome by alert only
-- =====================================================================
-- Run after 6300 (this replaces its deliver_welcome).
--
-- 1. The verified badges given by hand before ID checks (6300) are
--    removed, so every badge from now on stands for an ID that staff
--    have seen. The three staff keep theirs: the staff badge comes from
--    staff_roles, which this doesn't touch (and none of them has a row in
--    profile_verifications - the guard below makes sure of that anyway).
--
-- 2. A new member no longer gets welcome chats from Sunil and Sanjay -
--    only the welcome alert, and its email if they signed up with an
--    email address. The alert now covers all three: welcome, complete
--    your profile, get verified.
--    welcome_senders stays as it is: it is also what lets members chat
--    with Sunil and Sanjay (can_chat_with, 3700) and reply to them. The
--    welcome chats people already have are left in their inboxes.
--
-- 3. The welcome email's button, and the "you're verified" email's,
--    open your profile, where both the finish-your-profile steps and
--    Get verified are.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Remove the hand-given badges (never the staff's)
-- ---------------------------------------------------------------------
delete from public.profile_verifications pv
 where not exists (select 1 from public.staff_roles sr where sr.profile_id = pv.profile_id);

-- ---------------------------------------------------------------------
-- 2. The welcome: one alert (and its email), no chats
-- ---------------------------------------------------------------------
create or replace function public.deliver_welcome(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  target      record;
  first_name  text;
begin
  select id, full_name into target
    from public.profiles where id = p_profile_id;
  if not found then
    return;
  end if;

  first_name := coalesce(
    nullif(split_part(trim(target.full_name), ' ', 1), ''),
    trim(target.full_name)
  );

  if not exists (
    select 1 from public.notifications
     where profile_id = target.id and kind = 'welcome'
  ) then
    insert into public.notifications
      (profile_id, kind, title_en, title_ne, body_en, body_ne, actor_name)
    values (
      target.id, 'welcome',
      'Welcome to Duleko 👋', 'डुलेकोमा स्वागत छ 👋',
      'Hi ' || first_name || ', welcome to Duleko! First, complete your profile: add a clear photo, your skills and a short bio so people nearby can find you. Then get verified: send a photo of your citizenship, national ID, driving licence or passport from your profile. The verified badge shows people they can trust you.',
      'नमस्ते ' || first_name || ', डुलेकोमा स्वागत छ! पहिले आफ्नो प्रोफाइल पूरा गर्नुहोस्: नजिकैका मानिसहरूले भेट्टाउन सकून् भनेर स्पष्ट फोटो, सीप र छोटो परिचय थप्नुहोस्। त्यसपछि प्रमाणित हुनुहोस्: प्रोफाइलबाट आफ्नो नागरिकता, राष्ट्रिय परिचयपत्र, सवारी चालक अनुमतिपत्र वा राहदानीको फोटो पठाउनुहोस्। प्रमाणित ब्याजले मानिसहरूलाई तपाईंमाथि भरोसा गर्न मद्दत गर्छ।',
      'Duleko'
    );
  end if;
end;
$$;

revoke execute on function public.deliver_welcome(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Their emails open your profile (see 5000 for link_path)
-- ---------------------------------------------------------------------
create or replace function public.decorate_profile_delivery()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind in ('welcome', 'verified') then
    new.link_path := '/profile';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notification_deliveries_profile on public.notification_deliveries;
create trigger trg_notification_deliveries_profile
  before insert on public.notification_deliveries
  for each row execute function public.decorate_profile_delivery();
