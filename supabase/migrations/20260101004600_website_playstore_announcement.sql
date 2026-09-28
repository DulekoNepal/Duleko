-- =====================================================================
-- Duleko MVP :: 4600 :: "Try the website" announcement
-- =====================================================================
-- One-time broadcast: every profile except staff gets an 'announcement'
-- notification. The notifications trigger (2500) also queues a matching
-- email for everyone with email on, so this one insert covers both.
-- The https:// link makes the in-app alert tappable (announcements only).

insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne)
select
  p.id, 'announcement',
  'Duleko is live on the web 🌐',
  'डुलेको अब वेबमा पनि 🌐',
  'Check out all the features at https://www.duleko.com. The updated app is coming to the Play Store within a week.',
  'सबै सुविधाहरू https://www.duleko.com मा हेर्नुहोस्। नयाँ एप एक हप्ताभित्र Play Store मा आउँदैछ।'
from public.profiles p
where not exists (select 1 from public.staff_roles sr where sr.profile_id = p.id);
