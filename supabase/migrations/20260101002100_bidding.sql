-- =====================================================================
-- Duleko MVP :: 0021 :: Price negotiation (bidding) on a work request
-- =====================================================================
-- Both sides can go back and forth on price while a request is still
-- 'pending': the employer opens with an offer, the worker can counter or
-- accept, the employer can counter back, and so on. Whoever did NOT make
-- the most recent offer is the one who can accept it or counter it —
-- enforced below so the same person can't bid twice in a row.
--
-- work_engagements.payment_amount always mirrors the latest offer, so the
-- existing UI that already shows payment_amount keeps working unchanged;
-- accepting the job (the existing pending -> accepted transition) simply
-- locks in whatever that current amount is.

create table if not exists public.bids (
  id                uuid primary key default gen_random_uuid(),
  engagement_id     uuid not null references public.work_engagements(id) on delete cascade,
  bidder_profile_id uuid not null references public.profiles(id) on delete cascade,
  amount            numeric(10,2) not null check (amount > 0),
  note              text check (char_length(note) <= 200),
  created_at        timestamptz not null default now()
);

create index if not exists bids_engagement_idx on public.bids (engagement_id, created_at);

alter table public.bids enable row level security;

drop policy if exists bids_read_party on public.bids;
create policy bids_read_party on public.bids
  for select to authenticated
  using (
    exists (
      select 1 from public.work_engagements e
       where e.id = bids.engagement_id
         and public.current_profile_id() in (e.employer_profile_id, e.worker_profile_id)
    )
  );

drop policy if exists bids_insert_turn on public.bids;
create policy bids_insert_turn on public.bids
  for insert to authenticated
  with check (
    bidder_profile_id = public.current_profile_id()
    and exists (
      select 1 from public.work_engagements e
       where e.id = bids.engagement_id
         and e.status = 'pending'
         and public.current_profile_id() in (e.employer_profile_id, e.worker_profile_id)
    )
    -- Can't bid twice in a row — the other party has to respond first.
    and not exists (
      select 1 from (
        select b2.bidder_profile_id
          from public.bids b2
         where b2.engagement_id = bids.engagement_id
         order by b2.created_at desc
         limit 1
      ) last
      where last.bidder_profile_id = public.current_profile_id()
    )
  );

-- Keep work_engagements.payment_amount as "the current offer on the table".
create or replace function public.sync_bid_amount()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.work_engagements
     set payment_amount = new.amount
   where id = new.engagement_id
     and status = 'pending';
  return null;
end;
$$;

drop trigger if exists trg_bids_sync_amount on public.bids;
create trigger trg_bids_sync_amount
  after insert on public.bids
  for each row execute function public.sync_bid_amount();

-- The employer's opening payment_amount (set when the request is created)
-- becomes bid #1 automatically, so the negotiation always has a starting point.
create or replace function public.seed_initial_bid()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.payment_amount is not null then
    insert into public.bids (engagement_id, bidder_profile_id, amount)
    values (new.id, new.employer_profile_id, new.payment_amount);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_engagements_seed_bid on public.work_engagements;
create trigger trg_engagements_seed_bid
  after insert on public.work_engagements
  for each row execute function public.seed_initial_bid();
