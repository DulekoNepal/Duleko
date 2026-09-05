-- =====================================================================
-- Duleko MVP :: 0006 :: Skill catalogue (bilingual, safe to re-run)
-- =====================================================================
insert into public.skills (id, name_en, name_ne, emoji, sort_order) values
  ('electrician', 'Electrician',   'बिजुली मिस्त्री',    '💡', 10),
  ('plumber',     'Plumber',       'धारा मिस्त्री',      '🚰', 20),
  ('carpenter',   'Carpenter',     'सिकर्मी',            '🪚', 30),
  ('mason',       'Mason',         'डकर्मी',             '🧱', 40),
  ('painter',     'Painter',       'रंगरोगन गर्ने',      '🎨', 50),
  ('mechanic',    'Mechanic',      'मेकानिक',            '🔧', 60),
  ('farm_worker', 'Farm worker',   'खेतालो',             '🌾', 70),
  ('labourer',    'Labourer',      'ज्यामी',             '🏗️', 80),
  ('driver',      'Driver',        'चालक',               '🚗', 90),
  ('tutor',       'Tutor',         'ट्युटर',             '📚', 100),
  ('tailor',      'Tailor',        'दर्जी',              '🧵', 110),
  ('cleaner',     'Cleaner',       'सरसफाइकर्मी',        '🧹', 120),
  ('cook',        'Cook',          'भान्से',             '🍲', 130),
  ('welder',      'Welder',        'वेल्डर',             '🔥', 140)
on conflict (id) do update
  set name_en = excluded.name_en,
      name_ne = excluded.name_ne,
      emoji   = excluded.emoji,
      sort_order = excluded.sort_order;
