-- =====================================================================
-- Duleko MVP :: 6000 :: Create an account with a phone number and a PIN
-- =====================================================================
-- New members can join and sign in with a Nepali mobile number and a
-- 6-digit PIN instead of an email. Supabase Auth's own phone provider does
-- the work (signUp / signInWithPassword with `phone`), with "Enable phone
-- confirmations" OFF: no SMS code is sent, the account works right away.
-- Email + password and Google sign-in carry on unchanged.
--
--   phone_account_exists()  sign-up asks this first, so a number that is
--                           already on an account (a phone sign-in, or the
--                           contact number of an email/Google account)
--                           gets "sign in instead", not a half-made account
--                           that then fails at the phone step of
--                           onboarding (profile_contacts_phone_unique).
--
--   send_sms_hook()         Supabase's dashboard only lets the Phone
--                           provider be switched on once an SMS provider is
--                           set up, unless the "Send SMS" auth hook is on.
--                           This hook sends nothing and says so. With phone
--                           confirmations off nothing ever calls it; it is
--                           also where SMS codes (Sparrow SMS) go later.
--
-- Dashboard steps, in this order, after running this file:
--   1. Authentication > Auth Hooks > Add hook > "Send SMS hook",
--      type Postgres, schema public, function send_sms_hook.
--   2. Authentication > Sign In / Providers > Phone: Enable Phone provider,
--      turn OFF "Enable phone confirmations", save.
--
-- The PIN is the account's Supabase password, wrapped as 'Duleko-PIN-'
-- followed by the 6 digits (src/lib/phone-auth.ts), so it meets any
-- password-strength rule set for email accounts. There is no SMS, so a
-- forgotten PIN is reset by staff, here in the SQL editor:
--
--   update auth.users
--      set encrypted_password = extensions.crypt('Duleko-PIN-' || '<new 6 digits>', extensions.gen_salt('bf'))
--    where phone = '977<10-digit number>';
--
-- Safe to run more than once.

-- ---------------------------------------------------------------------
-- Is this number already on a Duleko account?
-- Compares the last 10 digits, so 98XXXXXXXX, +97798XXXXXXXX and
-- 97798XXXXXXXX are the same number. Says only yes or no.
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
-- The "Send SMS" auth hook: no SMS provider yet, so it refuses politely.
-- ---------------------------------------------------------------------
create or replace function public.send_sms_hook(event jsonb)
returns jsonb
language plpgsql as $$
begin
  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 422,
      'message', 'Duleko does not send SMS codes yet.'
    )
  );
end;
$$;

grant usage on schema public to supabase_auth_admin;
revoke execute on function public.send_sms_hook(jsonb) from public, anon, authenticated;
grant execute on function public.send_sms_hook(jsonb) to supabase_auth_admin;
