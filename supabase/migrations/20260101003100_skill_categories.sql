-- =====================================================================
-- Duleko MVP :: 3100 :: Skill categories, and the skills we were missing
-- =====================================================================
-- Fourteen trades in one flat grid was already a wall on a phone, and
-- Duleko is not only trades - people also look for a tutor, an
-- accountant, a barber. Skills now belong to one of three groups, and
-- the home screen shows the first few of each with the rest behind a
-- "view all".
--
-- Nothing existing is renamed or removed: every skill already on a
-- profile keeps its id, so no user_skills row is orphaned.

alter table public.skills
  add column if not exists category text not null default 'trades'
    check (category in ('trades', 'professional', 'personal'));

create index if not exists skills_category_idx on public.skills (category, sort_order);

-- ---------------------------------------------------------------------
-- 1. Trades & local services
-- ---------------------------------------------------------------------
update public.skills set category = 'trades'
 where id in ('electrician','plumber','carpenter','mason','painter','mechanic',
              'farm_worker','labourer','driver','cleaner','tailor','cook',
              'welder','mobile_repair');

-- ---------------------------------------------------------------------
-- 2. Professional & skilled services
-- ---------------------------------------------------------------------
update public.skills set category = 'professional' where id in ('it_computer','tutor');

insert into public.skills (id, name_en, name_ne, emoji, sort_order, category) values
  ('health',      'Health / Medical', 'स्वास्थ्य / चिकित्सा', '🩺', 210, 'professional'),
  ('accountant',  'Accountant',       'लेखापाल',              '🧮', 220, 'professional'),
  ('engineer',    'Engineer',         'इन्जिनियर',            '📐', 240, 'professional'),
  ('legal',       'Legal Services',   'कानुनी सेवा',          '⚖️', 250, 'professional'),
  ('designer',    'Designer',         'डिजाइनर',              '🎨', 260, 'professional'),
  ('photographer','Photographer',     'फोटोग्राफर',           '📷', 270, 'professional'),
  ('technician',  'Technician',       'प्राविधिक',            '🔧', 280, 'professional'),
  ('consultant',  'Consultant',       'सल्लाहकार',            '💼', 290, 'professional'),

-- ---------------------------------------------------------------------
-- 3. Personal & everyday services
-- ---------------------------------------------------------------------
  ('fitness',     'Fitness Trainer',  'फिटनेस प्रशिक्षक',     '🏋️', 310, 'personal'),
  ('barber',      'Barber / Salon',   'नाई / सैलुन',          '💈', 320, 'personal'),
  ('makeup',      'Makeup Artist',    'मेकअप आर्टिस्ट',       '💄', 330, 'personal'),
  ('music_dance', 'Music / Dance',    'संगीत / नृत्य',        '🎵', 340, 'personal'),
  ('delivery',    'Delivery',         'डेलिभरी',              '🛵', 350, 'personal'),
  ('care',        'Child / Elder Care','हेरचाह',              '🤝', 360, 'personal')
on conflict (id) do update
  set name_en    = excluded.name_en,
      name_ne    = excluded.name_ne,
      sort_order = excluded.sort_order,
      category   = excluded.category;

-- "Others" is the catch-all for anything not listed, so it belongs with
-- the everyday services and sorts last everywhere.
update public.skills set category = 'personal', sort_order = 999 where id = 'other';

-- ---------------------------------------------------------------------
-- Ordering within each group
-- ---------------------------------------------------------------------
-- The first four of each are what the home screen shows before "view
-- all", so the most-asked-for ones lead.
update public.skills set sort_order = 10  where id = 'electrician';
update public.skills set sort_order = 20  where id = 'plumber';
update public.skills set sort_order = 30  where id = 'carpenter';
update public.skills set sort_order = 40  where id = 'mason';
update public.skills set sort_order = 50  where id = 'painter';
update public.skills set sort_order = 60  where id = 'mechanic';
update public.skills set sort_order = 70  where id = 'mobile_repair';
update public.skills set sort_order = 80  where id = 'driver';
update public.skills set sort_order = 90  where id = 'tailor';
update public.skills set sort_order = 100 where id = 'cook';
update public.skills set sort_order = 110 where id = 'cleaner';
update public.skills set sort_order = 120 where id = 'welder';
update public.skills set sort_order = 130 where id = 'farm_worker';
update public.skills set sort_order = 140 where id = 'labourer';

update public.skills set sort_order = 200 where id = 'it_computer';
update public.skills set sort_order = 230 where id = 'tutor';

-- The emoji column is now unused by the app (icons come from the client's
-- own set) but stays as a hint when seeding a skill by hand.
