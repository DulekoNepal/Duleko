-- =====================================================================
-- Duleko MVP :: 2400 :: Official account + automatic welcome
-- =====================================================================
-- Every brand new profile gets two things the moment it is created:
--   1. a 'welcome' notification in the Alerts tab, and
--   2. a real chat message from the official Duleko account, so the
--      founder's note is sitting in their Chats tab and they can just
--      reply to it if something is broken.
--
-- The message text lives in app_settings (editable from the Supabase
-- table editor, no migration needed) with a {first_name} placeholder.

-- ---------------------------------------------------------------------
-- The official account
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_official boolean not null default false;

-- Only one profile is meant to carry the flag; if more than one ever
-- does, everything below deterministically takes the oldest.
create index if not exists profiles_official_idx
  on public.profiles (created_at) where is_official;

-- ---------------------------------------------------------------------
-- Editable copy: app_settings
-- ---------------------------------------------------------------------
-- RLS on with no policies at all = readable/writable by service_role and
-- security-definer functions only. Nothing here is meant for the browser.
create table if not exists public.app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop trigger if exists trg_app_settings_touch on public.app_settings;
create trigger trg_app_settings_touch before update on public.app_settings
  for each row execute function public.touch_updated_at();

insert into public.app_settings (key, value) values
  ('welcome_message_en', $msg$Hello {first_name},

Welcome to Duleko. I'm Sanjay, the person who's coding for this app. I'm so happy to see you excited for this idea, and hope you would also invite your friends to join.

Please feel free to send me a chat if you figure out any technical errors.

Best,
Sanjay
www.duleko.com$msg$),
  ('welcome_message_ne', $msg$नमस्ते {first_name},

दुलेकोमा स्वागत छ। म सञ्जय हुँ, यो एप बनाउने व्यक्ति। तपाईं यो सोचप्रति उत्साहित हुनुभएकोमा मलाई साह्रै खुसी लाग्यो, र आशा छ तपाईंले आफ्ना साथीहरूलाई पनि जोडिन निम्तो दिनुहुनेछ।

कुनै प्राविधिक समस्या भेट्नुभयो भने बेझिझक मलाई च्याट गर्नुहोस्।

धन्यवाद,
सञ्जय
www.duleko.com$msg$)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Chat gate: the official account can talk to everyone
-- ---------------------------------------------------------------------
-- can_view_contact() stays exactly as it was - it guards phone numbers,
-- and the official account has no business reading those. Chat gets its
-- own gate that is the contact rule plus "one side is Duleko itself",
-- so the welcome message is visible and replyable straight away.
create or replace function public.can_chat_with(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.can_view_contact(target)
      or exists (
        select 1 from public.profiles p
        where p.is_official
          and p.id in (target, public.current_profile_id())
      );
$$;

drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages
  for select to authenticated
  using (
    public.current_profile_id() in (profile_a, profile_b)
    and public.can_chat_with(
      case when profile_a = public.current_profile_id() then profile_b else profile_a end
    )
  );

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_profile_id = public.current_profile_id()
    and public.current_profile_id() in (profile_a, profile_b)
    and public.can_chat_with(
      case when profile_a = public.current_profile_id() then profile_b else profile_a end
    )
  );

-- ---------------------------------------------------------------------
-- notifications: the 'welcome' kind
-- ---------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in
    ('request','accepted','declined','confirmed','completed','cancelled','review',
     'friend_request','friend_accepted','message','welcome'));

-- ---------------------------------------------------------------------
-- The trigger
-- ---------------------------------------------------------------------
-- Kept separate from the trigger so it can also be called by hand to
-- backfill people who signed up before this migration existed. Safe to
-- call twice: it never sends the same person a second welcome.
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
      'Welcome to Duleko', 'दुलेकोमा स्वागत छ',
      'Hi ' || first_name || ', your profile is ready. Add your skills so people nearby can find you.',
      'नमस्ते ' || first_name || ', तपाईंको प्रोफाइल तयार भयो। नजिकैका मानिसहरूले भेट्न सकून् भनेर आफ्नो सीप थप्नुहोस्।',
      'Duleko'
    );
  end if;

  -- The founder's note, as an actual chat message. Skipped silently
  -- until someone is flagged is_official (see the note at the bottom).
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

revoke execute on function public.deliver_welcome(uuid) from public, anon, authenticated;

create or replace function public.welcome_new_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.deliver_welcome(new.id);
  return null;
end;
$$;

drop trigger if exists trg_profiles_welcome on public.profiles;
create trigger trg_profiles_welcome
  after insert on public.profiles
  for each row execute function public.welcome_new_profile();

-- =====================================================================
-- ONE MANUAL STEP after running this file
-- =====================================================================
-- Flag the account the welcome message should come from. Sign up as
-- Sanjay in the app first, then run this once with your own email:
--
--   update public.profiles p
--      set is_official = true
--     from auth.users u
--    where u.id = p.user_id
--      and u.email = 'you@example.com';
--
-- Optional - send the welcome to everyone who signed up before this
-- migration existed. deliver_welcome() skips anyone who already has one,
-- so this is safe to run more than once:
--
--   select public.deliver_welcome(id) from public.profiles where not is_official;
