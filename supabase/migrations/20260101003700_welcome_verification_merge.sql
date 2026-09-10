-- =====================================================================
-- Duleko MVP :: 3700 :: Welcome + verification merged, two-founder welcome
-- =====================================================================
-- Two changes to what happens the instant a new profile is created:
--
--   1. The one 'welcome' notification (and its one email) now also
--      introduces the verified badge, instead of that being a second,
--      separate email.
--
--   2. Both Sunil (founder) and Sanjay (co-founder, tech) send their own
--      personal chat message - English only - to every new signup, not
--      just the single is_official account as before. welcome_senders
--      replaces is_official as the source of truth for "who auto-
--      messages a new signup"; is_official itself is left untouched,
--      in case anything else ever wants it.

create table if not exists public.welcome_senders (
  profile_id  uuid primary key references public.profiles(id) on delete cascade,
  message     text not null check (char_length(message) <= 1000),
  sort_order  integer not null default 100
);

-- RLS on, no policies - same as app_settings: only the security definer
-- functions below (deliver_welcome, can_chat_with) ever read this.
alter table public.welcome_senders enable row level security;

insert into public.welcome_senders (profile_id, message, sort_order) values
  ('fc5757c4-cd73-4dc0-b3d6-441c4c1dad00', $msg$Hi {first_name}! 👋

It genuinely makes me happy to welcome you to Duleko. From now on, people nearby can see your skills and reach out when they need help. And whenever you need something done, you can just as easily find skilled people around you.

I'm Sunil, the founder of Duleko. Whatever your main profession is, I truly believe the skills you already have can open up new opportunities and extra income.

Take a look around and try out what's available on Duleko so far. If you run into any suggestions, ideas, or issues, please don't hesitate to message me directly. Your feedback matters a lot as we keep making Duleko better.

Wishing you all the best on this new journey! 🙏

Sunil K. Chaudhary
Founder, Duleko
www.duleko.com$msg$, 1),
  ('b7bc1f68-7f04-4eb4-addd-df5d71db8e98', $msg$Hi {first_name}! 👋

I'm Sanjay, co-founder of Duleko. I build and run the entire tech side myself.

If something breaks, feels slow, or could be easier to use, message me directly. I read every message and fix things fast.

Thanks for trying Duleko. Glad to have you here.

Sanjay Gupta
Co-Founder, Duleko
www.duleko.com$msg$, 2)
on conflict (profile_id) do update set message = excluded.message, sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------
-- Chat gate: anyone in welcome_senders can talk to everyone - same
-- shape as the old is_official check, just table-driven so it supports
-- more than one sender.
-- ---------------------------------------------------------------------
create or replace function public.can_chat_with(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.can_view_contact(target)
      or exists (
        select 1 from public.welcome_senders ws
        where ws.profile_id in (target, public.current_profile_id())
      );
$$;

-- ---------------------------------------------------------------------
-- deliver_welcome: one combined welcome+verification notification (and
-- its one email), then one chat message per row in welcome_senders.
-- Safe to call twice per person - the notification only ever inserts
-- once (kind='welcome' guard), and each sender's chat message only
-- ever inserts once (the a/b/sender_profile_id existence check).
-- ---------------------------------------------------------------------
create or replace function public.deliver_welcome(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  target      record;
  first_name  text;
  sender      record;
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
      'Welcome to Duleko 👋', 'डुलेकोमा स्वागत छ 👋',
      'Hi ' || first_name || ', welcome to Duleko! Add your skills and a short bio so people nearby can find you. Complete your profile with a clear photo too, and our team will review it for the verified badge, which builds more trust with people looking for help nearby.',
      'नमस्ते ' || first_name || ', डुलेकोमा स्वागत छ! नजिकैका मानिसहरूले भेट्टाउन सकून् भनेर आफ्नो सीप र छोटो परिचय थप्नुहोस्। स्पष्ट फोटो सहित प्रोफाइल पूरा गर्नुहोस्, हाम्रो टिमले हेरेर प्रमाणित ब्याज दिनेछ, जसले नजिकैका मानिसहरूको भरोसा अझ बढाउँछ।',
      'Duleko'
    );
  end if;

  for sender in
    select profile_id, message from public.welcome_senders order by sort_order
  loop
    if sender.profile_id = target.id then
      continue;
    end if;

    if sender.profile_id < target.id then
      a := sender.profile_id; b := target.id;
    else
      a := target.id;   b := sender.profile_id;
    end if;

    if exists (
      select 1 from public.messages
       where profile_a = a and profile_b = b and sender_profile_id = sender.profile_id
    ) then
      continue;
    end if;

    -- Fires trg_messages_notify too, so the new user gets the usual
    -- unread badge on the Chats tab for each founder's message.
    insert into public.messages (profile_a, profile_b, sender_profile_id, body)
    values (a, b, sender.profile_id, left(replace(sender.message, '{first_name}', first_name), 1000));
  end loop;
end;
$$;
