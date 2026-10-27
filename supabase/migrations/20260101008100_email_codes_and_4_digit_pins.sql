-- =====================================================================
-- Duleko MVP :: 8100 :: 4-digit email codes and 4-digit PINs
-- =====================================================================
-- Creating an account now starts with an email: a 4-digit code goes out
-- through Brevo, and once it's typed back the person picks a password.
-- Forgot password uses the same code. Supabase's own email codes are at
-- least 6 digits, so the edge function `account-auth` makes and checks
-- these itself, then hands the app a one-time sign-in token.
--
-- New PINs are 4 digits. Four digits are far too few to leave open to
-- guessing, so they are not the Supabase password any more: the PIN is
-- kept here as a keyed hash (the key, PIN_PEPPER, lives only in the edge
-- function) and every check goes through `account-auth`, which locks the
-- number after 5 wrong tries (15 minutes, then 1 hour, then a day).
-- A phone-only account's real Supabase password becomes a long random
-- one that nobody knows and that changes at each sign-in.
--
-- Email and Google accounts can now add a mobile number + PIN as a
-- second way in (Settings). Signing in that way never touches their
-- email password.
--
-- Existing 6-digit PINs (6000) keep working as they are, until the person
-- changes their PIN in Settings, which moves them to 4 digits.
--
--   auth_email_codes   one live code per email, with send/try limits
--   account_pins       mobile number + PIN hash + lockout, per account
--   phone_pin_length() 4, 6 or null: how many boxes the sign-in shows
--   my_pin()           the signed-in person's PIN number and length
--   phone_account_exists()  now also checks account_pins
--
-- After running this file, deploy the function and set its key:
--   supabase secrets set PIN_PEPPER=<64 random hex characters>
--   supabase functions deploy account-auth --no-verify-jwt
-- (BREVO_API_KEY and NOTIFY_EMAIL_FROM are already set for
-- send-notifications.) Never change PIN_PEPPER afterwards: every 4-digit
-- PIN would stop working.
--
-- Forgotten 4-digit PIN, reset by staff here: delete the row and give a
-- temporary 6-digit PIN the old way. They sign in with it and choose a
-- new 4-digit PIN in Settings > Change PIN.
--
--   delete from public.account_pins where phone = '<10-digit number>';
--   update auth.users
--      set encrypted_password = extensions.crypt('Duleko-PIN-' || '<temp 6 digits>', extensions.gen_salt('bf'))
--    where phone = '977<10-digit number>';
--
-- (For an email account that added a PIN, deleting the row is enough:
-- they sign in with email and add the number again.)
--
-- Safe to run more than once.

-- ---------------------------------------------------------------------
-- Email codes. Only the edge function (service role) reads or writes.
-- ---------------------------------------------------------------------
create table if not exists public.auth_email_codes (
  email        text primary key,
  purpose      text not null check (purpose in ('signup', 'reset')),
  code_hash    text not null,
  expires_at   timestamptz not null,
  attempts     int not null default 0,
  last_sent_at timestamptz not null default now(),
  -- At most 5 codes an hour per email.
  hour_start   timestamptz not null default now(),
  hour_count   int not null default 0,
  -- At most 10 wrong codes a day per email, across every code sent.
  day_start    timestamptz not null default now(),
  day_failed   int not null default 0
);

alter table public.auth_email_codes enable row level security;
revoke all on public.auth_email_codes from anon, authenticated;

-- ---------------------------------------------------------------------
-- Mobile number + PIN, one per account.
-- ---------------------------------------------------------------------
create table if not exists public.account_pins (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  phone        text not null unique check (phone ~ '^9[678][0-9]{8}$'),
  pin_hash     text not null,
  failed_count int not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz not null default now()
);

alter table public.account_pins enable row level security;
revoke all on public.account_pins from anon, authenticated;

-- ---------------------------------------------------------------------
-- How many PIN boxes to show for a number on the sign-in screen.
-- Says no more than phone_account_exists already does.
-- ---------------------------------------------------------------------
create or replace function public.phone_pin_length(p_phone text)
returns int
language sql stable security definer set search_path = public as $$
  with wanted as (
    select right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10) as local
  )
  select case
    when length(w.local) <> 10 then null
    when exists (select 1 from public.account_pins p where p.phone = w.local) then 4
    when exists (
      select 1 from auth.users u
       where u.phone is not null
         and right(regexp_replace(u.phone, '\D', '', 'g'), 10) = w.local
    ) then 6
    else null
  end
  from wanted w;
$$;

revoke execute on function public.phone_pin_length(text) from public;
grant execute on function public.phone_pin_length(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- The signed-in person's sign-in number and PIN length, or null.
-- ---------------------------------------------------------------------
create or replace function public.my_pin()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object('phone', p.phone, 'length', 4)
       from public.account_pins p
      where p.user_id = auth.uid()),
    (select jsonb_build_object('phone', right(regexp_replace(u.phone, '\D', '', 'g'), 10), 'length', 6)
       from auth.users u
      where u.id = auth.uid()
        and coalesce(u.phone, '') <> ''
        and exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'phone'))
  );
$$;

revoke execute on function public.my_pin() from public, anon;
grant execute on function public.my_pin() to authenticated;

-- ---------------------------------------------------------------------
-- Is this number already on a Duleko account? (6000, plus account_pins.)
-- ---------------------------------------------------------------------
create or replace function public.phone_account_exists(p_phone text)
returns boolean
language sql stable security definer set search_path = public as $$
  with wanted as (
    select right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10) as local
  )
  select length(w.local) = 10
     and (
       exists (
         select 1 from auth.users u
          where u.phone is not null
            and right(regexp_replace(u.phone, '\D', '', 'g'), 10) = w.local
       )
       or exists (select 1 from public.account_pins p where p.phone = w.local)
       or exists (
         select 1 from public.profile_contacts c
          where right(regexp_replace(c.phone, '\D', '', 'g'), 10) = w.local
       )
     )
    from wanted w;
$$;

revoke execute on function public.phone_account_exists(text) from public;
grant execute on function public.phone_account_exists(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- For the edge function only (service role).
-- ---------------------------------------------------------------------

-- The account with this email, if any, and whether the email is confirmed.
create or replace function public.auth_user_by_email(p_email text)
returns table (id uuid, confirmed boolean)
language sql stable security definer set search_path = public as $$
  select u.id, u.email_confirmed_at is not null
    from auth.users u
   where lower(u.email) = lower(trim(p_email))
   limit 1;
$$;

-- Someone other than p_user already has this number (any of the three places).
create or replace function public.phone_used_by_other(p_phone text, p_user uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  with wanted as (
    select right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10) as local
  )
  select exists (
           select 1 from auth.users u
            where u.id <> p_user and u.phone is not null
              and right(regexp_replace(u.phone, '\D', '', 'g'), 10) = w.local
         )
      or exists (select 1 from public.account_pins p where p.user_id <> p_user and p.phone = w.local)
      or exists (
           select 1 from public.profile_contacts c
             join public.profiles pr on pr.id = c.profile_id
            where pr.user_id <> p_user
              and right(regexp_replace(c.phone, '\D', '', 'g'), 10) = w.local
         )
    from wanted w;
$$;

-- An old 6-digit PIN (6000), checked without signing in again.
create or replace function public.legacy_pin_matches(p_user uuid, p_pin text)
returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(
    (select u.encrypted_password = extensions.crypt('Duleko-PIN-' || p_pin, u.encrypted_password)
       from auth.users u
      where u.id = p_user and coalesce(u.encrypted_password, '') <> ''),
    false
  );
$$;

revoke execute on function public.auth_user_by_email(text) from public, anon, authenticated;
revoke execute on function public.phone_used_by_other(text, uuid) from public, anon, authenticated;
revoke execute on function public.legacy_pin_matches(uuid, text) from public, anon, authenticated;
grant execute on function public.auth_user_by_email(text) to service_role;
grant execute on function public.phone_used_by_other(text, uuid) to service_role;
grant execute on function public.legacy_pin_matches(uuid, text) to service_role;
