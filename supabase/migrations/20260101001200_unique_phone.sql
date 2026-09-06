-- =====================================================================
-- Duleko MVP :: 1200 :: One phone number, one account
-- =====================================================================
-- Prevents the same phone number from being saved on more than one
-- profile. If this fails to apply because two existing profiles
-- already share a number, resolve that duplicate data first (e.g.
-- merge or clear one of the conflicting profile_contacts rows), then
-- re-run the migration.
alter table public.profile_contacts
  add constraint profile_contacts_phone_unique unique (phone);
