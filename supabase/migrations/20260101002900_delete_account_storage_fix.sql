-- =====================================================================
-- Duleko MVP :: 2900 :: delete_my_account without touching storage
-- =====================================================================
-- Migration 2800 tried to clear the person's uploads with a plain
-- `delete from storage.objects`. Supabase blocks that outright:
--
--   Direct deletion from storage tables is not allowed.
--   Use the Storage API instead.
--
-- So the files are now removed by the browser through the Storage API
-- first (the "users delete own avatar" style policies already allow
-- exactly that, and only inside the person's own folder), and this
-- function is left to do the one thing the browser cannot: delete the
-- auth user. Everything in public.* still follows by cascade.
--
-- File cleanup is best-effort on the client. An orphaned image in a
-- bucket is untidy, but it must never be the reason someone cannot
-- close their account.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'You must be signed in to delete your account'
      using errcode = 'insufficient_privilege';
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
