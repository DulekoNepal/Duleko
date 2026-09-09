-- =====================================================================
-- Duleko MVP :: 3300 :: Correct the Nepali brand spelling
-- =====================================================================
-- The Nepali name is डुलेको (ड / ḍa), not दुलेको (द / da). The wrong
-- spelling shipped in 2400 and is baked into three places the frontend
-- cannot reach:
--
--   1. app_settings.welcome_message_ne  - the founder's welcome chat
--   2. deliver_welcome()                - the 'welcome' notification title
--   3. notifications rows already delivered to existing users
--
-- 2400 is left untouched on purpose: it has already run everywhere, so
-- editing it would change nothing on a live database.

-- ---------------------------------------------------------------------
-- 1. The editable welcome copy
-- ---------------------------------------------------------------------
-- A targeted replace(), not an overwrite: 2400 says this row is meant to
-- be edited from the Supabase table editor, so any wording changed there
-- must survive this migration. Only the misspelt name is touched.
update public.app_settings
   set value = replace(value, 'दुलेको', 'डुलेको')
 where key = 'welcome_message_ne'
   and value like '%दुलेको%';

-- ---------------------------------------------------------------------
-- 2. The stored function
-- ---------------------------------------------------------------------
-- Byte-for-byte the body from 2400, with the one Nepali title corrected.
-- A function body cannot be patched in place, so it is restated in full.
create or replace function public.deliver_welcome(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  target        record;
  first_name    text;
  official_id   uuid;
  template      text;
  msg_body      text;
  a uuid;
  b uuid;
begin
  select id, full_name, language into target
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
      'Welcome to Duleko', 'डुलेकोमा स्वागत छ',
      'Hi ' || first_name || ', your profile is ready. Add your skills so people nearby can find you.',
      'नमस्ते ' || first_name || ', तपाईंको प्रोफाइल तयार भयो। नजिकैका मानिसहरूले भेट्न सकून् भनेर आफ्नो सीप थप्नुहोस्।',
      'Duleko'
    );
  end if;

  -- The founder's note, as an actual chat message. Skipped silently
  -- until someone is flagged is_official.
  select id into official_id
    from public.profiles
   where is_official
   order by created_at
   limit 1;

  if official_id is null or official_id = target.id then
    return;
  end if;

  if official_id < target.id then
    a := official_id; b := target.id;
  else
    a := target.id;   b := official_id;
  end if;

  if exists (
    select 1 from public.messages
     where profile_a = a and profile_b = b and sender_profile_id = official_id
  ) then
    return;
  end if;

  select value into template
    from public.app_settings
   where key = case when target.language = 'ne' then 'welcome_message_ne' else 'welcome_message_en' end;

  if template is null then
    return;
  end if;

  -- messages.body is capped at 1000 characters.
  msg_body := left(replace(template, '{first_name}', first_name), 1000);

  -- This insert fires trg_messages_notify too, so the new user also gets
  -- the usual unread badge on the Chats tab.
  insert into public.messages (profile_a, profile_b, sender_profile_id, body)
  values (a, b, official_id, msg_body);
end;
$$;

-- create or replace keeps existing privileges, but restate the revoke so
-- this file is honest about the function's security posture on its own.
revoke execute on function public.deliver_welcome(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Notifications already delivered
-- ---------------------------------------------------------------------
-- These rows are system-generated product copy, not anything a user
-- wrote, so correcting the brand name in place is safe and reversible
-- (swap the arguments to undo).
update public.notifications
   set title_ne = replace(title_ne, 'दुलेको', 'डुलेको')
 where title_ne like '%दुलेको%';

update public.notifications
   set body_ne = replace(body_ne, 'दुलेको', 'डुलेको')
 where body_ne like '%दुलेको%';

-- ---------------------------------------------------------------------
-- Deliberately NOT done here: the welcome chat messages
-- ---------------------------------------------------------------------
-- public.messages rows are delivered conversation. Rewriting a message
-- someone has already received is a different kind of act from fixing
-- product copy, so it is left as a decision rather than a side effect.
-- To correct the brand name in the official account's sent messages:
--
--   update public.messages m
--      set body = replace(m.body, 'दुलेको', 'डुलेको')
--     from public.profiles p
--    where p.id = m.sender_profile_id
--      and p.is_official
--      and m.body like '%दुलेको%';
