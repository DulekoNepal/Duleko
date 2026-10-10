-- =====================================================================
-- Duleko MVP :: 5600 :: Payment details, Duleko's accounts, monthly fees
-- =====================================================================
-- Duleko still never moves money. This adds three things, the same way
-- FLITO does them:
--
-- 1. payment_methods: how a member takes payment - a bank account (one of
--    Nepal's commercial banks, or another bank typed in) with its number,
--    its payment QR, or both; or an eSewa / Khalti wallet with its number
--    and optional QR. Up to five, one primary. A row with no profile_id is
--    one of Duleko's own official accounts, which only admins manage.
--    Who sees a member's accounts: the other side of an accepted,
--    confirmed or completed job with them, and anyone who may see their
--    phone number (public.can_call - their "Who can call me" choice, and
--    friends always).
--
-- 2. fee_charges: Duleko's fee on each completed job, paid by the worker,
--    on the agreed price:
--      5% of the first Rs 5,000, 4% of Rs 5,000-20,000, 3% above
--    (Rs 1,000 -> Rs 50, Rs 10,000 -> Rs 450, Rs 50,000 -> Rs 1,750; the
--    fee never falls as the price rises). Only jobs requested on or after
--    the 'fee_start_date' setting (1 Mangsir 2083) carry a fee, and each
--    worker's first 'fee_welcome_jobs' (5) of those are free.
--
-- 3. fee_payments: jobs are billed by Nepali month; a month's fees are due
--    by the 15th of the next. The worker pays into one of Duleko's
--    accounts and records it here; an admin confirms it (or says it never
--    arrived). Confirmed payments pay off the oldest month first. A worker
--    with fees past due can't accept new work requests until they pay or
--    record a payment; jobs already accepted carry on.
--
-- Safe to run more than once.

-- ---------------------------------------------------------------------
-- 1. Payment details
-- ---------------------------------------------------------------------
create table if not exists public.payment_methods (
  id             uuid primary key default gen_random_uuid(),
  -- null: one of Duleko's own official accounts.
  profile_id     uuid references public.profiles(id) on delete cascade,
  kind           text not null check (kind in ('bank', 'esewa', 'khalti')),
  -- Banks only. The codes match src/lib/banks.ts; 'other' has its name typed in.
  bank_code      text check (bank_code is null or bank_code in (
                   'nabil', 'nimb', 'gibl', 'nicasia', 'himalayan', 'everest', 'sbi', 'scb',
                   'nbl', 'rbb', 'adbl', 'kumari', 'laxmisunrise', 'siddhartha',
                   'machhapuchchhre', 'citizens', 'prime', 'nmb', 'prabhu', 'sanima', 'other')),
  bank_name      text check (bank_name is null or char_length(trim(bank_name)) between 2 and 100),
  branch         text check (branch is null or char_length(branch) <= 80),
  account_number text check (account_number is null or account_number ~ '^[0-9A-Za-z][0-9A-Za-z -]{3,39}$'),
  -- The name on the account or wallet, so the payer can check it before paying.
  account_name   text not null check (char_length(trim(account_name)) between 2 and 80),
  -- eSewa / Khalti: the wallet's mobile number.
  wallet_id      text check (wallet_id is null or wallet_id ~ '^9[678][0-9]{8}$'),
  -- A photo of the bank's or wallet's payment QR (the 'payments' bucket below).
  qr_url         text check (qr_url is null or qr_url like 'https://%'),
  -- The one shown first to whoever is paying.
  is_primary     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint payment_methods_shape check (
    (kind = 'bank'
      and bank_code is not null and wallet_id is null
      and (bank_code <> 'other' or bank_name is not null)
      and (account_number is not null or qr_url is not null))
    or (kind in ('esewa', 'khalti')
      and wallet_id is not null
      and bank_code is null and bank_name is null and branch is null and account_number is null)
  )
);

create index if not exists payment_methods_profile_idx on public.payment_methods (profile_id, created_at);

-- One primary per member, and one among Duleko's own.
create unique index if not exists payment_methods_one_primary
  on public.payment_methods (coalesce(profile_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where is_primary;

-- Whether the signed-in member may see `target`'s payment details.
create or replace function public.can_see_payment_methods(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select target is not null and public.current_profile_id() is not null and (
    target = public.current_profile_id()
    or public.can_call(target)
    or exists (
      select 1 from public.work_engagements e
      where e.status in ('accepted', 'confirmed', 'completed')
        and ((e.worker_profile_id = target and e.employer_profile_id = public.current_profile_id())
          or (e.employer_profile_id = target and e.worker_profile_id = public.current_profile_id()))
    )
  );
$$;

-- Whose accounts the signed-in member may change: their own, and an
-- admin's Duleko ones.
create or replace function public.can_edit_payment_methods(owner uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when owner is null then public.is_admin_or_above()
    else owner = public.current_profile_id()
  end;
$$;

alter table public.payment_methods enable row level security;

drop policy if exists payment_methods_read on public.payment_methods;
create policy payment_methods_read on public.payment_methods
  for select to authenticated
  using (profile_id is null or public.can_see_payment_methods(profile_id));

drop policy if exists payment_methods_insert on public.payment_methods;
create policy payment_methods_insert on public.payment_methods
  for insert to authenticated
  with check (public.can_edit_payment_methods(profile_id));

drop policy if exists payment_methods_update on public.payment_methods;
create policy payment_methods_update on public.payment_methods
  for update to authenticated
  using (public.can_edit_payment_methods(profile_id))
  with check (public.can_edit_payment_methods(profile_id));

drop policy if exists payment_methods_delete on public.payment_methods;
create policy payment_methods_delete on public.payment_methods
  for delete to authenticated
  using (public.can_edit_payment_methods(profile_id));

-- At most five each; the first one is primary; making one primary takes
-- it off the others; an account never moves to someone else.
create or replace function public.payment_methods_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.payment_methods m
         where m.profile_id is not distinct from new.profile_id) >= 5 then
      raise exception 'PAYMENT_METHOD_LIMIT' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.payment_methods m
                    where m.profile_id is not distinct from new.profile_id) then
      new.is_primary := true;
    end if;
  else
    new.profile_id := old.profile_id;
    new.created_at := old.created_at;
    -- The primary one stays primary until another is chosen (that choice
    -- clears it from inside this trigger, one level down).
    if old.is_primary and not new.is_primary and pg_trigger_depth() = 1 then
      new.is_primary := true;
    end if;
  end if;

  new.account_name := trim(new.account_name);
  new.bank_name    := nullif(trim(coalesce(new.bank_name, '')), '');
  new.branch       := nullif(trim(coalesce(new.branch, '')), '');
  new.updated_at   := now();

  if new.is_primary then
    update public.payment_methods m
       set is_primary = false
     where m.profile_id is not distinct from new.profile_id
       and m.id <> new.id
       and m.is_primary;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payment_methods_before_write on public.payment_methods;
create trigger trg_payment_methods_before_write
  before insert or update on public.payment_methods
  for each row execute function public.payment_methods_before_write();

-- Removing the primary one makes the oldest of the rest primary.
create or replace function public.payment_methods_after_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.is_primary then
    update public.payment_methods
       set is_primary = true
     where id = (select m.id from public.payment_methods m
                  where m.profile_id is not distinct from old.profile_id
                  order by m.created_at limit 1);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_payment_methods_after_delete on public.payment_methods;
create trigger trg_payment_methods_after_delete
  after delete on public.payment_methods
  for each row execute function public.payment_methods_after_delete();

-- ---------------------------------------------------------------------
-- Files: payment QRs and payment screenshots
-- payments/<auth.uid()>/<random>.webp for a member's own,
-- payments/duleko/<random>.webp for Duleko's accounts (admins).
-- Public like avatars, but with no "anyone may list" policy, and every
-- file name carries a random UUID, so a file is only reachable through
-- the row that links it.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payments', 'payments', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_write_payment_file(object_name text)
returns boolean
language sql stable security definer set search_path = public as $$
  select (storage.foldername(object_name))[1] = auth.uid()::text
      or ((storage.foldername(object_name))[1] = 'duleko' and public.is_admin_or_above());
$$;

drop policy if exists "payment files: list own" on storage.objects;
create policy "payment files: list own" on storage.objects
  for select to authenticated
  using (bucket_id = 'payments' and public.can_write_payment_file(name));

drop policy if exists "payment files: upload own" on storage.objects;
create policy "payment files: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payments' and public.can_write_payment_file(name));

drop policy if exists "payment files: update own" on storage.objects;
create policy "payment files: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'payments' and public.can_write_payment_file(name));

drop policy if exists "payment files: delete own" on storage.objects;
create policy "payment files: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'payments' and public.can_write_payment_file(name));

-- ---------------------------------------------------------------------
-- 2. The Nepali (Bikram Sambat) calendar, for billing by month
-- ---------------------------------------------------------------------
-- Each BS month and its first and last AD day, BS 2080-2090 (April 2023
-- to April 2034), from the same month-length table FLITO uses. Add rows
-- before 2090 runs out.
create table if not exists public.bs_months (
  period    text primary key check (period ~ '^\d{4}-\d{2}$'),
  starts_on date not null unique,
  ends_on   date not null
);

alter table public.bs_months enable row level security;

drop policy if exists bs_months_read on public.bs_months;
create policy bs_months_read on public.bs_months
  for select to authenticated, anon using (true);

grant select on public.bs_months to anon;

insert into public.bs_months (period, starts_on, ends_on) values
  ('2080-01', '2023-04-14', '2023-05-14'), ('2080-02', '2023-05-15', '2023-06-15'), ('2080-03', '2023-06-16', '2023-07-16'), ('2080-04', '2023-07-17', '2023-08-17'),
  ('2080-05', '2023-08-18', '2023-09-17'), ('2080-06', '2023-09-18', '2023-10-17'), ('2080-07', '2023-10-18', '2023-11-16'), ('2080-08', '2023-11-17', '2023-12-16'),
  ('2080-09', '2023-12-17', '2024-01-14'), ('2080-10', '2024-01-15', '2024-02-12'), ('2080-11', '2024-02-13', '2024-03-13'), ('2080-12', '2024-03-14', '2024-04-12'),
  ('2081-01', '2024-04-13', '2024-05-13'), ('2081-02', '2024-05-14', '2024-06-14'), ('2081-03', '2024-06-15', '2024-07-15'), ('2081-04', '2024-07-16', '2024-08-16'),
  ('2081-05', '2024-08-17', '2024-09-16'), ('2081-06', '2024-09-17', '2024-10-16'), ('2081-07', '2024-10-17', '2024-11-15'), ('2081-08', '2024-11-16', '2024-12-15'),
  ('2081-09', '2024-12-16', '2025-01-13'), ('2081-10', '2025-01-14', '2025-02-12'), ('2081-11', '2025-02-13', '2025-03-13'), ('2081-12', '2025-03-14', '2025-04-13'),
  ('2082-01', '2025-04-14', '2025-05-14'), ('2082-02', '2025-05-15', '2025-06-14'), ('2082-03', '2025-06-15', '2025-07-16'), ('2082-04', '2025-07-17', '2025-08-16'),
  ('2082-05', '2025-08-17', '2025-09-16'), ('2082-06', '2025-09-17', '2025-10-17'), ('2082-07', '2025-10-18', '2025-11-16'), ('2082-08', '2025-11-17', '2025-12-15'),
  ('2082-09', '2025-12-16', '2026-01-14'), ('2082-10', '2026-01-15', '2026-02-12'), ('2082-11', '2026-02-13', '2026-03-14'), ('2082-12', '2026-03-15', '2026-04-13'),
  ('2083-01', '2026-04-14', '2026-05-14'), ('2083-02', '2026-05-15', '2026-06-14'), ('2083-03', '2026-06-15', '2026-07-16'), ('2083-04', '2026-07-17', '2026-08-16'),
  ('2083-05', '2026-08-17', '2026-09-16'), ('2083-06', '2026-09-17', '2026-10-17'), ('2083-07', '2026-10-18', '2026-11-16'), ('2083-08', '2026-11-17', '2026-12-15'),
  ('2083-09', '2026-12-16', '2027-01-14'), ('2083-10', '2027-01-15', '2027-02-12'), ('2083-11', '2027-02-13', '2027-03-14'), ('2083-12', '2027-03-15', '2027-04-13'),
  ('2084-01', '2027-04-14', '2027-05-14'), ('2084-02', '2027-05-15', '2027-06-15'), ('2084-03', '2027-06-16', '2027-07-16'), ('2084-04', '2027-07-17', '2027-08-17'),
  ('2084-05', '2027-08-18', '2027-09-17'), ('2084-06', '2027-09-18', '2027-10-17'), ('2084-07', '2027-10-18', '2027-11-16'), ('2084-08', '2027-11-17', '2027-12-16'),
  ('2084-09', '2027-12-17', '2028-01-14'), ('2084-10', '2028-01-15', '2028-02-12'), ('2084-11', '2028-02-13', '2028-03-13'), ('2084-12', '2028-03-14', '2028-04-13'),
  ('2085-01', '2028-04-14', '2028-05-13'), ('2085-02', '2028-05-14', '2028-06-14'), ('2085-03', '2028-06-15', '2028-07-15'), ('2085-04', '2028-07-16', '2028-08-16'),
  ('2085-05', '2028-08-17', '2028-09-16'), ('2085-06', '2028-09-17', '2028-10-16'), ('2085-07', '2028-10-17', '2028-11-15'), ('2085-08', '2028-11-16', '2028-12-15'),
  ('2085-09', '2028-12-16', '2029-01-13'), ('2085-10', '2029-01-14', '2029-02-12'), ('2085-11', '2029-02-13', '2029-03-13'), ('2085-12', '2029-03-14', '2029-04-13'),
  ('2086-01', '2029-04-14', '2029-05-14'), ('2086-02', '2029-05-15', '2029-06-14'), ('2086-03', '2029-06-15', '2029-07-16'), ('2086-04', '2029-07-17', '2029-08-16'),
  ('2086-05', '2029-08-17', '2029-09-16'), ('2086-06', '2029-09-17', '2029-10-17'), ('2086-07', '2029-10-18', '2029-11-16'), ('2086-08', '2029-11-17', '2029-12-15'),
  ('2086-09', '2029-12-16', '2030-01-14'), ('2086-10', '2030-01-15', '2030-02-12'), ('2086-11', '2030-02-13', '2030-03-14'), ('2086-12', '2030-03-15', '2030-04-13'),
  ('2087-01', '2030-04-14', '2030-05-14'), ('2087-02', '2030-05-15', '2030-06-14'), ('2087-03', '2030-06-15', '2030-07-16'), ('2087-04', '2030-07-17', '2030-08-16'),
  ('2087-05', '2030-08-17', '2030-09-16'), ('2087-06', '2030-09-17', '2030-10-17'), ('2087-07', '2030-10-18', '2030-11-16'), ('2087-08', '2030-11-17', '2030-12-16'),
  ('2087-09', '2030-12-17', '2031-01-14'), ('2087-10', '2031-01-15', '2031-02-13'), ('2087-11', '2031-02-14', '2031-03-15'), ('2087-12', '2031-03-16', '2031-04-14'),
  ('2088-01', '2031-04-15', '2031-05-14'), ('2088-02', '2031-05-15', '2031-06-14'), ('2088-03', '2031-06-15', '2031-07-16'), ('2088-04', '2031-07-17', '2031-08-17'),
  ('2088-05', '2031-08-18', '2031-09-16'), ('2088-06', '2031-09-17', '2031-10-17'), ('2088-07', '2031-10-18', '2031-11-16'), ('2088-08', '2031-11-17', '2031-12-16'),
  ('2088-09', '2031-12-17', '2032-01-14'), ('2088-10', '2032-01-15', '2032-02-13'), ('2088-11', '2032-02-14', '2032-03-14'), ('2088-12', '2032-03-15', '2032-04-13'),
  ('2089-01', '2032-04-14', '2032-05-13'), ('2089-02', '2032-05-14', '2032-06-14'), ('2089-03', '2032-06-15', '2032-07-15'), ('2089-04', '2032-07-16', '2032-08-16'),
  ('2089-05', '2032-08-17', '2032-09-16'), ('2089-06', '2032-09-17', '2032-10-16'), ('2089-07', '2032-10-17', '2032-11-15'), ('2089-08', '2032-11-16', '2032-12-15'),
  ('2089-09', '2032-12-16', '2033-01-13'), ('2089-10', '2033-01-14', '2033-02-12'), ('2089-11', '2033-02-13', '2033-03-14'), ('2089-12', '2033-03-15', '2033-04-13'),
  ('2090-01', '2033-04-14', '2033-05-13'), ('2090-02', '2033-05-14', '2033-06-14'), ('2090-03', '2033-06-15', '2033-07-15'), ('2090-04', '2033-07-16', '2033-08-16'),
  ('2090-05', '2033-08-17', '2033-09-16'), ('2090-06', '2033-09-17', '2033-10-16'), ('2090-07', '2033-10-17', '2033-11-15'), ('2090-08', '2033-11-16', '2033-12-15'),
  ('2090-09', '2033-12-16', '2034-01-13'), ('2090-10', '2034-01-14', '2034-02-12'), ('2090-11', '2034-02-13', '2034-03-14'), ('2090-12', '2034-03-15', '2034-04-13')
on conflict (period) do nothing;

-- Today in Nepal.
create or replace function public.nepal_today()
returns date language sql stable as $$
  select (now() at time zone 'Asia/Kathmandu')::date;
$$;

-- The BS month ('2083-08') an AD day falls in.
create or replace function public.bs_period_of(d date)
returns text language sql stable set search_path = public as $$
  select period from public.bs_months where d between starts_on and ends_on;
$$;

-- A month's fees are due by the 15th of the month after: Kartik's by 15 Mangsir.
create or replace function public.fee_due_on(p_period text)
returns date language sql stable set search_path = public as $$
  select ends_on + 15 from public.bs_months where period = p_period;
$$;

-- ---------------------------------------------------------------------
-- The fee rule and its settings
-- ---------------------------------------------------------------------
-- When fees start and how many first jobs are free live in app_settings
-- (editable in the Supabase table editor, read only by the functions here).
insert into public.app_settings (key, value) values
  ('fee_start_date', '2026-11-17'),   -- 1 Mangsir 2083; jobs requested from this Nepal day
  ('fee_welcome_jobs', '5')
on conflict (key) do nothing;

create or replace function public.fee_start_date()
returns date language sql stable security definer set search_path = public as $$
  select coalesce(
    (select value::date from public.app_settings
      where key = 'fee_start_date' and value ~ '^\d{4}-\d{2}-\d{2}$'),
    date '2026-11-17');
$$;

create or replace function public.fee_welcome_jobs()
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(
    (select value::integer from public.app_settings
      where key = 'fee_welcome_jobs' and value ~ '^\d{1,3}$'),
    5);
$$;

-- Duleko's fee on a job's agreed price, in whole rupees. Kept in step
-- with feeFor() in src/lib/fees.ts, which only estimates it for display.
create or replace function public.duleko_fee_for(price numeric)
returns integer language sql immutable as $$
  select round(
      least(greatest(coalesce(price, 0), 0), 5000) * 0.05
    + greatest(least(coalesce(price, 0), 20000) - 5000, 0) * 0.04
    + greatest(coalesce(price, 0) - 20000, 0) * 0.03
  )::integer;
$$;

-- The rule as the app shows it.
create or replace function public.fee_rules()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'tiers', jsonb_build_array(
      jsonb_build_object('up_to', 5000, 'percent', 5),
      jsonb_build_object('up_to', 20000, 'percent', 4),
      jsonb_build_object('up_to', null, 'percent', 3)),
    'starts_on', public.fee_start_date(),
    'welcome_jobs', public.fee_welcome_jobs(),
    'due_day', 15);
$$;

-- ---------------------------------------------------------------------
-- Fees on completed jobs
-- ---------------------------------------------------------------------
create table if not exists public.fee_charges (
  id                uuid primary key default gen_random_uuid(),
  -- Kept if the job itself is ever deleted (the employer closing their account).
  engagement_id     uuid unique references public.work_engagements(id) on delete set null,
  worker_profile_id uuid not null references public.profiles(id) on delete cascade,
  job_title         text not null,
  price             numeric(10,2) not null check (price >= 0),
  amount            integer not null check (amount >= 0),
  -- One of the worker's first free jobs.
  welcome           boolean not null default false,
  completed_on      date not null,
  period            text not null,
  created_at        timestamptz not null default now()
);

create index if not exists fee_charges_worker_idx on public.fee_charges (worker_profile_id, period);

alter table public.fee_charges enable row level security;

-- Written only by the trigger below.
drop policy if exists fee_charges_read on public.fee_charges;
create policy fee_charges_read on public.fee_charges
  for select to authenticated
  using (worker_profile_id = public.current_profile_id() or public.is_staff());

create or replace function public.charge_fee_on_completion()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  done_day date := (coalesce(new.completed_at, now()) at time zone 'Asia/Kathmandu')::date;
  month    text := public.bs_period_of(done_day);
  used     integer;
  welcome  boolean;
begin
  if coalesce(new.payment_amount, 0) <= 0
     or (new.created_at at time zone 'Asia/Kathmandu')::date < public.fee_start_date()
     or month is null then
    return null;
  end if;

  select count(*) into used from public.fee_charges where worker_profile_id = new.worker_profile_id;
  welcome := used < public.fee_welcome_jobs();

  insert into public.fee_charges
    (engagement_id, worker_profile_id, job_title, price, amount, welcome, completed_on, period)
  values
    (new.id, new.worker_profile_id, new.title, new.payment_amount,
     case when welcome then 0 else public.duleko_fee_for(new.payment_amount) end,
     welcome, done_day, month)
  on conflict (engagement_id) do nothing;
  return null;
exception when others then
  -- A fee that fails to record must never undo the job being completed.
  raise warning 'Duleko fee not recorded for job %: %', new.id, sqlerrm;
  return null;
end;
$$;

drop trigger if exists trg_engagements_charge_fee on public.work_engagements;
create trigger trg_engagements_charge_fee
  after update of status on public.work_engagements
  for each row
  when (new.status = 'completed' and old.status is distinct from 'completed')
  execute function public.charge_fee_on_completion();

-- The fee is on the price both sides agreed, so the price stops changing
-- once the request is accepted. (Bids, which move it, are pending-only.)
create or replace function public.freeze_agreed_price()
returns trigger language plpgsql as $$
begin
  if old.status <> 'pending'
     and new.payment_amount is distinct from old.payment_amount
     and public.current_profile_id() is not null then
    new.payment_amount := old.payment_amount;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_engagements_freeze_price on public.work_engagements;
create trigger trg_engagements_freeze_price
  before update on public.work_engagements
  for each row execute function public.freeze_agreed_price();

-- ---------------------------------------------------------------------
-- 3. Paying Duleko
-- ---------------------------------------------------------------------
create table if not exists public.fee_payments (
  id                uuid primary key default gen_random_uuid(),
  worker_profile_id uuid not null references public.profiles(id) on delete cascade,
  amount            integer not null check (amount between 1 and 10000000),
  method            text not null check (method in ('bank', 'esewa', 'khalti', 'cash')),
  -- Which of Duleko's accounts it went to, and what that account was then.
  paid_to_id        uuid references public.payment_methods(id) on delete set null,
  paid_to_label     text check (paid_to_label is null or char_length(paid_to_label) <= 160),
  transaction_id    text check (transaction_id is null or char_length(transaction_id) <= 60),
  proof_url         text check (proof_url is null or proof_url like 'https://%'),
  note              text check (note is null or char_length(note) <= 300),
  status            text not null default 'reported' check (status in ('reported', 'confirmed', 'rejected')),
  rejection_reason  text check (rejection_reason is null or char_length(rejection_reason) <= 300),
  reviewed_by       uuid references public.profiles(id) on delete set null,
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists fee_payments_worker_idx on public.fee_payments (worker_profile_id, created_at desc);
create index if not exists fee_payments_reported_idx on public.fee_payments (created_at) where status = 'reported';

alter table public.fee_payments enable row level security;

drop policy if exists fee_payments_read on public.fee_payments;
create policy fee_payments_read on public.fee_payments
  for select to authenticated
  using (worker_profile_id = public.current_profile_id() or public.is_staff());

drop policy if exists fee_payments_insert_own on public.fee_payments;
create policy fee_payments_insert_own on public.fee_payments
  for insert to authenticated
  with check (worker_profile_id = public.current_profile_id());

-- Only admins confirm or reject.
drop policy if exists fee_payments_review on public.fee_payments;
create policy fee_payments_review on public.fee_payments
  for update to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- A worker can take back a payment they recorded by mistake, while it
-- still waits to be checked.
drop policy if exists fee_payments_withdraw_own on public.fee_payments;
create policy fee_payments_withdraw_own on public.fee_payments
  for delete to authenticated
  using (worker_profile_id = public.current_profile_id() and status = 'reported');

-- ---------------------------------------------------------------------
-- Where a worker stands
-- ---------------------------------------------------------------------
-- From their fees per month and their payments:
--   periods       each month with jobs, newest first: what it came to, how
--                 much is paid, and whether it is open (this month), due,
--                 overdue or paid
--   charged       every fee so far           paid      confirmed payments
--   awaiting      payments still to be checked
--   balance       charged - paid             payable_now  left on ended months
--   overdue       left on months past due    due_on    the next due day
--   max_payment   the most the worker can record paying now
--   blocked       whether accepting new work is paused until they pay
-- Internal: fee_account() below is the one members and staff call.
create or replace function public.fee_summary_for(p_worker uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  today        date := public.nepal_today();
  current_p    text := coalesce(public.bs_period_of(today), '9999-99');
  paid_total   integer;
  awaiting     integer;
  unallocated  integer;
  r            record;
  paid_here    integer;
  left_here    integer;
  due          date;
  state        text;
  periods      jsonb := '[]'::jsonb;
  charged      integer := 0;
  payable_now  integer := 0;
  overdue      integer := 0;
  next_due     date;
  jobs_charged integer;
begin
  select coalesce(sum(amount) filter (where status = 'confirmed'), 0),
         coalesce(sum(amount) filter (where status = 'reported'), 0)
    into paid_total, awaiting
    from public.fee_payments where worker_profile_id = p_worker;
  unallocated := paid_total;

  for r in
    select period, count(*)::integer as jobs, sum(amount)::integer as amount
      from public.fee_charges
     where worker_profile_id = p_worker
     group by period
     order by period
  loop
    paid_here := least(r.amount, unallocated);
    unallocated := unallocated - paid_here;
    left_here := r.amount - paid_here;
    due := public.fee_due_on(r.period);
    state := case
      when r.period >= current_p then 'open'
      when left_here = 0 then 'paid'
      when today > due then 'overdue'
      else 'due' end;

    charged := charged + r.amount;
    if state in ('due', 'overdue') then payable_now := payable_now + left_here; end if;
    if state = 'overdue' then overdue := overdue + left_here; end if;
    if left_here > 0 and (next_due is null or due < next_due) then next_due := due; end if;

    periods := jsonb_build_array(jsonb_build_object(
      'period', r.period, 'jobs', r.jobs, 'amount', r.amount, 'paid', paid_here,
      'left', left_here, 'due_on', due, 'status', state)) || periods;
  end loop;

  select count(*) into jobs_charged from public.fee_charges where worker_profile_id = p_worker;

  return jsonb_build_object(
    'today', today,
    'current_period', public.bs_period_of(today),
    'periods', periods,
    'charged', charged,
    'paid', paid_total,
    'awaiting', awaiting,
    'balance', greatest(0, charged - paid_total),
    'payable_now', payable_now,
    'overdue', overdue,
    'due_on', next_due,
    'max_payment', greatest(0, charged - paid_total - awaiting),
    'blocked', overdue - awaiting > 0,
    'welcome_left', greatest(0, public.fee_welcome_jobs() - jobs_charged),
    'rules', public.fee_rules());
end;
$$;

revoke execute on function public.fee_summary_for(uuid) from public, anon, authenticated;

-- A member's own fees (no argument), or any worker's for staff.
create or replace function public.fee_account(p_worker uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  worker uuid := coalesce(p_worker, public.current_profile_id());
begin
  if worker is null then
    raise exception 'You must be signed in' using errcode = 'insufficient_privilege';
  end if;
  if worker <> public.current_profile_id() and not public.is_staff() then
    raise exception 'Not authorized' using errcode = 'insufficient_privilege';
  end if;
  return public.fee_summary_for(worker);
end;
$$;

revoke execute on function public.fee_account(uuid) from public, anon;
grant execute on function public.fee_account(uuid) to authenticated;

-- Staff: totals, and every worker with fees, most owed first.
create or replace function public.fee_overview()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  w       record;
  s       jsonb;
  workers jsonb := '[]'::jsonb;
  totals  jsonb := jsonb_build_object('charged', 0, 'paid', 0, 'awaiting', 0, 'balance', 0, 'overdue', 0);
  k       text;
begin
  if not public.is_staff() then
    raise exception 'Not authorized' using errcode = 'insufficient_privilege';
  end if;

  for w in
    select p.id, p.full_name, p.avatar_url, p.member_no
      from public.profiles p
     where exists (select 1 from public.fee_charges c where c.worker_profile_id = p.id)
        or exists (select 1 from public.fee_payments f where f.worker_profile_id = p.id)
  loop
    s := public.fee_summary_for(w.id);
    foreach k in array array['charged', 'paid', 'awaiting', 'balance', 'overdue'] loop
      totals := jsonb_set(totals, array[k], to_jsonb((totals->>k)::integer + (s->>k)::integer));
    end loop;
    workers := workers || jsonb_build_object(
      'profile_id', w.id, 'full_name', w.full_name, 'avatar_url', w.avatar_url, 'member_no', w.member_no,
      'charged', s->'charged', 'paid', s->'paid', 'awaiting', s->'awaiting',
      'balance', s->'balance', 'overdue', s->'overdue', 'blocked', s->'blocked', 'due_on', s->'due_on');
  end loop;

  return totals || jsonb_build_object('workers', coalesce((
    select jsonb_agg(x order by (x->>'overdue')::integer desc, (x->>'balance')::integer desc, x->>'full_name')
      from jsonb_array_elements(workers) x), '[]'::jsonb));
end;
$$;

revoke execute on function public.fee_overview() from public, anon;
grant execute on function public.fee_overview() to authenticated;

-- ---------------------------------------------------------------------
-- Recording and checking payments
-- ---------------------------------------------------------------------
-- A bank's or wallet's name by its code (src/lib/banks.ts has the same list),
-- for the record of where a payment went.
create or replace function public.bank_name_of(code text)
returns text language sql immutable as $$
  select case code
    when 'nabil' then 'Nabil Bank'
    when 'nimb' then 'Nepal Investment Mega Bank'
    when 'gibl' then 'Global IME Bank'
    when 'nicasia' then 'NIC Asia Bank'
    when 'himalayan' then 'Himalayan Bank'
    when 'everest' then 'Everest Bank'
    when 'sbi' then 'Nepal SBI Bank'
    when 'scb' then 'Standard Chartered Bank Nepal'
    when 'nbl' then 'Nepal Bank'
    when 'rbb' then 'Rastriya Banijya Bank'
    when 'adbl' then 'Agricultural Development Bank'
    when 'kumari' then 'Kumari Bank'
    when 'laxmisunrise' then 'Laxmi Sunrise Bank'
    when 'siddhartha' then 'Siddhartha Bank'
    when 'machhapuchchhre' then 'Machhapuchchhre Bank'
    when 'citizens' then 'Citizens Bank International'
    when 'prime' then 'Prime Commercial Bank'
    when 'nmb' then 'NMB Bank'
    when 'prabhu' then 'Prabhu Bank'
    when 'sanima' then 'Sanima Bank'
    when 'esewa' then 'eSewa'
    when 'khalti' then 'Khalti'
    else code
  end;
$$;

create or replace function public.fee_payments_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  account public.payment_methods;
  room    integer;
begin
  if tg_op = 'INSERT' then
    -- A new payment always starts out waiting to be checked.
    new.status := 'reported';
    new.rejection_reason := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.created_at := now();
    new.transaction_id := nullif(trim(coalesce(new.transaction_id, '')), '');
    new.note := nullif(trim(coalesce(new.note, '')), '');

    if new.method = 'cash' then
      new.paid_to_id := null;
      new.paid_to_label := null;
    else
      select * into account from public.payment_methods
       where id = new.paid_to_id and profile_id is null;
      if account.id is null then
        raise exception 'FEE_ACCOUNT_REQUIRED' using errcode = 'P0001';
      end if;
      new.method := account.kind;
      new.paid_to_label := left(
        case account.kind
          when 'bank' then coalesce(account.bank_name, public.bank_name_of(account.bank_code)) || ' · '
                           || coalesce(account.account_number, 'QR') || ' · ' || account.account_name
          else public.bank_name_of(account.kind) || ' · ' || account.wallet_id || ' · ' || account.account_name
        end, 160);
    end if;

    room := (public.fee_summary_for(new.worker_profile_id)->>'max_payment')::integer;
    if room <= 0 then
      raise exception 'FEE_NOTHING_TO_PAY' using errcode = 'P0001';
    end if;
    if new.amount > room then
      raise exception 'FEE_PAYMENT_TOO_MUCH' using errcode = 'P0001', detail = room::text;
    end if;
    return new;
  end if;

  -- UPDATE: only an admin's verdict on a payment still waiting.
  if old.status <> 'reported' or new.status not in ('confirmed', 'rejected') then
    raise exception 'This payment has already been checked' using errcode = 'check_violation';
  end if;
  new.worker_profile_id := old.worker_profile_id;
  new.amount            := old.amount;
  new.method            := old.method;
  new.paid_to_id        := old.paid_to_id;
  new.paid_to_label     := old.paid_to_label;
  new.transaction_id    := old.transaction_id;
  new.proof_url         := old.proof_url;
  new.note              := old.note;
  new.created_at        := old.created_at;
  new.reviewed_by       := public.current_profile_id();
  new.reviewed_at       := now();
  new.rejection_reason  := case when new.status = 'rejected'
                             then nullif(trim(coalesce(new.rejection_reason, '')), '') end;
  return new;
end;
$$;

drop trigger if exists trg_fee_payments_before_write on public.fee_payments;
create trigger trg_fee_payments_before_write
  before insert or update on public.fee_payments
  for each row execute function public.fee_payments_before_write();

-- Fees past due pause accepting new work until the worker pays (or
-- records a payment). Jobs already accepted carry on.
create or replace function public.block_accept_when_fees_overdue()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'pending' and new.status = 'accepted'
     and public.current_profile_id() is not null
     and (public.fee_summary_for(new.worker_profile_id)->>'blocked')::boolean then
    raise exception 'FEES_OVERDUE' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_engagements_fee_block on public.work_engagements;
create trigger trg_engagements_fee_block
  before update of status on public.work_engagements
  for each row execute function public.block_accept_when_fees_overdue();

-- ---------------------------------------------------------------------
-- Alerts: admins hear about a payment to check; the worker hears the verdict
-- ---------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in
    ('request','accepted','declined','confirmed','completed','cancelled','review',
     'friend_request','friend_accepted','message','welcome','verified','verify_reminder',
     'announcement','notice','fee_payment','fee_review'));

create or replace function public.notify_on_fee_payment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  worker_name text;
  money_en    text := 'Rs ' || to_char(new.amount, 'FM99,99,99,999');
  money_ne    text := 'रु ' || translate(to_char(new.amount, 'FM99,99,99,999'), '0123456789', '०१२३४५६७८९');
begin
  if tg_op = 'INSERT' then
    select full_name into worker_name from public.profiles where id = new.worker_profile_id;
    insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne, actor_name)
    select s.profile_id, 'fee_review',
           'Fee payment to check', 'जाँच्नुपर्ने शुल्क भुक्तानी',
           worker_name || ' recorded paying ' || money_en || ' in Duleko fees. Check it arrived, then confirm it.',
           worker_name || 'ले डुलेको शुल्क ' || money_ne || ' तिरेको जनाउनुभयो। पैसा आयो कि जाँचेर पुष्टि गर्नुहोस्।',
           worker_name
      from public.staff_roles s
     where s.role in ('admin', 'technical_admin')
       and s.profile_id <> new.worker_profile_id;
  elsif new.status = 'confirmed' then
    insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne)
    values (new.worker_profile_id, 'fee_payment',
            'Payment confirmed', 'भुक्तानी पुष्टि भयो',
            'Duleko received your payment of ' || money_en || '. Thank you!',
            'डुलेकोले तपाईंको ' || money_ne || ' भुक्तानी पायो। धन्यवाद!');
  elsif new.status = 'rejected' then
    insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne)
    values (new.worker_profile_id, 'fee_payment',
            'Payment not found', 'भुक्तानी भेटिएन',
            'Duleko could not find your payment of ' || money_en || '.'
              || coalesce(' ' || rtrim(new.rejection_reason, '.।') || '.', '')
              || ' Open Duleko fees to pay again.',
            'डुलेकोले तपाईंको ' || money_ne || ' भुक्तानी भेट्टाउन सकेन।'
              || coalesce(' ' || rtrim(new.rejection_reason, '.।') || '।', '')
              || ' फेरि तिर्न डुलेको शुल्क खोल्नुहोस्।');
  end if;
  return null;
end;
$$;

drop trigger if exists trg_fee_payments_notify on public.fee_payments;
create trigger trg_fee_payments_notify
  after insert or update of status on public.fee_payments
  for each row execute function public.notify_on_fee_payment();
