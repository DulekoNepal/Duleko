-- =====================================================================
-- Duleko MVP :: 2700 :: Quoted replies and message editing
-- =====================================================================
-- Two new columns on messages and a much stricter update guard.
--
-- Worth calling out: until now the guard only pinned `body` when a
-- message was being unsent, and messages_update_party lets either side
-- of a thread update a row - so the *recipient* could quietly rewrite
-- what the sender had said. That is closed here: only the sender can
-- change body, only within 15 minutes, and never after an unsend.

alter table public.messages
  add column if not exists reply_to_id uuid references public.messages(id) on delete set null,
  add column if not exists edited_at   timestamptz;

create index if not exists messages_reply_to_idx
  on public.messages (reply_to_id) where reply_to_id is not null;

-- ---------------------------------------------------------------------
-- Insert guard: a reply may only quote a message from the same thread
-- ---------------------------------------------------------------------
-- Not expressible as a check constraint (it needs a subquery), and worth
-- enforcing server-side so a crafted request cannot quote a stranger's
-- message into a conversation it does not belong to.
create or replace function public.guard_message_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  new.edited_at := null;

  if new.reply_to_id is not null then
    if not exists (
      select 1 from public.messages m
       where m.id = new.reply_to_id
         and m.profile_a = new.profile_a
         and m.profile_b = new.profile_b
    ) then
      raise exception 'A reply must quote a message from the same conversation'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_messages_insert_guard on public.messages;
create trigger trg_messages_insert_guard before insert on public.messages
  for each row execute function public.guard_message_insert();

-- ---------------------------------------------------------------------
-- Update guard
-- ---------------------------------------------------------------------
-- read_at   - recipient only, settable once
-- deleted_at- sender only, settable once, wipes the body
-- body      - sender only, within 15 minutes, never after an unsend
-- everything else is immutable after insert
create or replace function public.guard_message_update()
returns trigger language plpgsql set search_path = public as $$
declare
  actor        uuid := public.current_profile_id();
  edit_window  constant interval := interval '15 minutes';
begin
  new.profile_a         := old.profile_a;
  new.profile_b         := old.profile_b;
  new.sender_profile_id := old.sender_profile_id;
  new.created_at        := old.created_at;
  new.reply_to_id       := old.reply_to_id;

  if new.read_at is distinct from old.read_at then
    if old.read_at is not null then
      new.read_at := old.read_at;
    elsif actor is not null and actor = old.sender_profile_id then
      raise exception 'Only the recipient can mark a message read'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if new.deleted_at is distinct from old.deleted_at then
    if old.deleted_at is not null then
      -- Already removed: pin everything and stop, so a second update
      -- cannot resurrect or rewrite it.
      new.deleted_at := old.deleted_at;
      new.body       := old.body;
      new.edited_at  := old.edited_at;
      return new;
    elsif actor is not null and actor <> old.sender_profile_id then
      raise exception 'Only the sender can remove this message'
        using errcode = 'insufficient_privilege';
    else
      new.body      := '';
      new.edited_at := old.edited_at;
      return new;
    end if;
  end if;

  if new.body is distinct from old.body then
    if old.deleted_at is not null then
      raise exception 'A removed message cannot be edited'
        using errcode = 'check_violation';
    end if;
    if actor is not null and actor <> old.sender_profile_id then
      raise exception 'Only the sender can edit this message'
        using errcode = 'insufficient_privilege';
    end if;
    if old.created_at < now() - edit_window then
      raise exception 'Messages can only be edited within 15 minutes of sending'
        using errcode = 'check_violation';
    end if;
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_messages_guard on public.messages;
create trigger trg_messages_guard before update on public.messages
  for each row execute function public.guard_message_update();
