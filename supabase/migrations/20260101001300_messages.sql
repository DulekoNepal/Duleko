-- =====================================================================
-- Duleko MVP :: 1300 :: Simple direct chat
-- =====================================================================
-- One thread per profile pair, gated by the same rule as phone contacts
-- (can_view_contact): you can only message someone once you have an
-- accepted/confirmed/completed work_engagement with them, or it's you.
-- No group chats, no read receipts - deliberately minimal.

create table if not exists public.messages (
  id                uuid primary key default gen_random_uuid(),
  -- Always stored with profile_a < profile_b so both sides of a
  -- conversation land in the same row set regardless of who sent to whom.
  profile_a         uuid not null references public.profiles(id) on delete cascade,
  profile_b         uuid not null references public.profiles(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  body              text not null check (char_length(trim(body)) between 1 and 1000),
  created_at        timestamptz not null default now(),
  constraint no_self_message check (profile_a <> profile_b),
  constraint profile_pair_ordered check (profile_a < profile_b),
  constraint sender_is_party check (sender_profile_id in (profile_a, profile_b))
);

-- A single column a realtime subscription can filter on for "this conversation".
alter table public.messages
  add column if not exists pair_key text
  generated always as (profile_a::text || ':' || profile_b::text) stored;

create index if not exists messages_pair_idx on public.messages (pair_key, created_at);

alter table public.messages enable row level security;

drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages
  for select to authenticated
  using (
    public.current_profile_id() in (profile_a, profile_b)
    and public.can_view_contact(
      case when profile_a = public.current_profile_id() then profile_b else profile_a end
    )
  );

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_profile_id = public.current_profile_id()
    and public.current_profile_id() in (profile_a, profile_b)
    and public.can_view_contact(
      case when profile_a = public.current_profile_id() then profile_b else profile_a end
    )
  );

-- Live delivery: the chat panel subscribes to inserts for its pair_key.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
exception
  when undefined_object then
    null;
end;
$$;
