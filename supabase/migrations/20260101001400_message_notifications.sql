-- =====================================================================
-- Duleko MVP :: 1400 :: Notify on new chat message
-- =====================================================================

-- A generic "open this profile" pointer for notification kinds that
-- aren't about a work engagement (e.g. a chat message).
alter table public.notifications
  add column if not exists related_profile_id uuid references public.profiles(id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in
    ('request','accepted','declined','confirmed','completed','cancelled','review',
     'friend_request','friend_accepted','message'));

create or replace function public.notify_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient   uuid := case when new.profile_a = new.sender_profile_id then new.profile_b else new.profile_a end;
  sender_name text;
  preview     text := case when char_length(new.body) > 80 then left(new.body, 80) || '…' else new.body end;
begin
  select full_name into sender_name from public.profiles where id = new.sender_profile_id;

  insert into public.notifications
    (profile_id, kind, title_en, title_ne, body_en, body_ne, related_profile_id, actor_name)
  values (
    recipient, 'message',
    'New message', 'नयाँ सन्देश',
    coalesce(sender_name, '') || ': ' || preview,
    coalesce(sender_name, '') || ': ' || preview,
    new.sender_profile_id,
    sender_name
  );

  return null;
end;
$$;

drop trigger if exists trg_messages_notify on public.messages;
create trigger trg_messages_notify
  after insert on public.messages
  for each row execute function public.notify_on_message();
