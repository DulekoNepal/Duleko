-- =====================================================================
-- Duleko MVP :: 5500 :: "Update Duleko from the Play Store" note
-- =====================================================================
-- One-time send from Sanjay to every other profile, Sunil and Dipendra
-- included: an in-app alert, the matching email via the 2500 trigger for
-- everyone with email on, and a phone alert on 1.2+ installs (5300).
--
-- Kind is 'announcement', not a notice-board 'notice': most people are
-- still on the 1.0 app, which opens a tapped alert's link only for
-- 'announcement' - exactly the people who need to reach the Play Store.
-- The text is signed "Tech Lead, Duleko", and actor_name/related_profile_id
-- point at Sanjay; the email still comes from the usual Duleko address.
--
-- Safe to run more than once: anyone who already has it is skipped.

insert into public.notifications
  (profile_id, kind, title_en, title_ne, body_en, body_ne, actor_name, related_profile_id)
select
  p.id, 'announcement',
  'Update Duleko from the Play Store',
  'Play Store बाट डुलेको अपडेट गर्नुहोस्',
  'Hi ' || coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'there') ||
    ', the new Duleko app is now live on the Play Store. Please update it here: https://play.google.com/store/apps/details?id=com.duleko.app' ||
    E'\n\nTech Lead, Duleko',
  'नमस्ते ' || coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), '') ||
    ', नयाँ डुलेको एप अब Play Store मा आएको छ। कृपया यहाँबाट अपडेट गर्नुहोस्: https://play.google.com/store/apps/details?id=com.duleko.app' ||
    E'\n\nTech Lead, Duleko',
  'Sanjay Gupta',
  'b7bc1f68-7f04-4eb4-addd-df5d71db8e98'  -- Sanjay Gupta (3500)
from public.profiles p
where p.id <> 'b7bc1f68-7f04-4eb4-addd-df5d71db8e98'
  and not exists (
    select 1 from public.notifications n
     where n.profile_id = p.id
       and n.kind = 'announcement'
       and n.title_en = 'Update Duleko from the Play Store'
  );
