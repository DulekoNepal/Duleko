-- =====================================================================
-- Duleko MVP :: 4100 :: A generic staff-broadcast notification kind
-- =====================================================================
-- Distinct from 'verify_reminder' (that one is specifically about the
-- verified badge) - this one is for feature announcements and other
-- general broadcasts to everyone, present and future.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in
    ('request','accepted','declined','confirmed','completed','cancelled','review',
     'friend_request','friend_accepted','message','welcome','verified','verify_reminder',
     'announcement'));
