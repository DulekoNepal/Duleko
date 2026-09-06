-- =====================================================================
-- Duleko MVP :: 1600 :: Read receipts, unsend, and reactions for chat
-- =====================================================================
-- Typing indicators are realtime broadcast only (no rows), so nothing
-- here for those - this migration covers the three that need storage.

alter table public.messages add column if not exists read_at timestamptz;
alter table public.messages add column if not exists deleted_at timestamptz;

-- An unsent message wipes its own body - "removed", not just hidden -
-- so the length check has to allow empty once deleted_at is set.
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages add constraint messages_body_check
  check (deleted_at is not null or char_length(trim(body)) between 1 and 1000);

-- ---------------------------------------------------------------------
-- Guard: read_at can only be set once by the recipient, deleted_at can
-- only be set once by the sender (and wipes the body when it is) -
-- everything else about a message is immutable after insert.
-- ---------------------------------------------------------------------
create or replace function public.guard_message_update()
returns trigger language plpgsql as $$
declare
  actor uuid := public.current_profile_id();
begin
  new.profile_a := old.profile_a;
  new.profile_b := old.profile_b;
  new.sender_profile_id := old.sender_profile_id;
  new.created_at := old.created_at;

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
      new.deleted_at := old.deleted_at;
      new.body := old.body;
    elsif actor is not null and actor <> old.sender_profile_id then
      raise exception 'Only the sender can remove this message'
        using errcode = 'insufficient_privilege';
    else
      new.body := '';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_messages_guard on public.messages;
create trigger trg_messages_guard before update on public.messages
  for each row execute function public.guard_message_update();

drop policy if exists messages_update_party on public.messages;
create policy messages_update_party on public.messages
  for update to authenticated
  using (public.current_profile_id() in (profile_a, profile_b))
  with check (public.current_profile_id() in (profile_a, profile_b));

-- ---------------------------------------------------------------------
-- message_reactions - one reaction per person per message, single emoji.
-- ---------------------------------------------------------------------
create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  primary key (message_id, profile_id)
);

create index if not exists message_reactions_message_idx on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

-- Same visibility as the underlying message: both parties of that thread.
drop policy if exists message_reactions_read on public.message_reactions;
create policy message_reactions_read on public.message_reactions
  for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and public.current_profile_id() in (m.profile_a, m.profile_b)
    )
  );

drop policy if exists message_reactions_write_own on public.message_reactions;
create policy message_reactions_write_own on public.message_reactions
  for all to authenticated
  using (
    profile_id = public.current_profile_id()
    and exists (
      select 1 from public.messages m
      where m.id = message_id
        and public.current_profile_id() in (m.profile_a, m.profile_b)
    )
  )
  with check (
    profile_id = public.current_profile_id()
    and exists (
      select 1 from public.messages m
      where m.id = message_id
        and public.current_profile_id() in (m.profile_a, m.profile_b)
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'message_reactions'
  ) then
    alter publication supabase_realtime add table public.message_reactions;
  end if;
exception
  when undefined_object then
    null;
end;
$$;
