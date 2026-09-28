-- =====================================================================
-- Duleko MVP :: 4800 :: "Complete your profile on the website" note
-- =====================================================================
-- One-time send: every profile except staff gets a short note (in-app
-- alert + matching email via the 2500 trigger for everyone with email
-- on). Kind is 'announcement' so the https:// link is tappable.

insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne)
select
  p.id, 'announcement',
  'Complete your Duleko profile',
  'आफ्नो डुलेको प्रोफाइल पूरा गर्नुहोस्',
  'Hi ' || coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'there') ||
    ', go to https://www.duleko.com and complete your profile. Add a clear photo, your skills and a short bio so people nearby can find you.',
  'नमस्ते ' || coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), '') ||
    ', https://www.duleko.com मा गएर आफ्नो प्रोफाइल पूरा गर्नुहोस्। नजिकैका मानिसहरूले भेट्टाउन सकून् भनेर स्पष्ट फोटो, सीप र छोटो परिचय थप्नुहोस्।'
from public.profiles p
where not exists (select 1 from public.staff_roles sr where sr.profile_id = p.id);
