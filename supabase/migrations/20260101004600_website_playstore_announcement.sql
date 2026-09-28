-- =====================================================================
-- Duleko MVP :: 4600 :: "Use Duleko on the website" note
-- =====================================================================
-- One-time send: every profile except staff gets a short, plain note
-- (in-app alert + matching email via the 2500 trigger for everyone with
-- email on). Kind stays 'announcement' only because that is the one kind
-- whose https:// link is tappable in the Alerts tab.

insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne)
select
  p.id, 'announcement',
  'Use Duleko on the website',
  'वेबसाइटमा डुलेको चलाउनुहोस्',
  'Hi ' || coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'there') ||
    ', you can now use all of Duleko''s features at https://www.duleko.com. The updated app will be on the Play Store within a week.',
  'नमस्ते ' || coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), '') ||
    ', अब डुलेकोका सबै सुविधाहरू https://www.duleko.com मा चलाउन सकिन्छ। नयाँ एप एक हप्ताभित्र Play Store मा आउनेछ।'
from public.profiles p
where not exists (select 1 from public.staff_roles sr where sr.profile_id = p.id);
