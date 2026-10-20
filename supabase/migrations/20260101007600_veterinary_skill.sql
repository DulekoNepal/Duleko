-- =====================================================================
-- Duleko MVP :: 7600 :: Veterinary (vet doctor) as a professional skill
-- =====================================================================
-- Animal doctors are asked for separately from 'health' (people), so
-- they get their own entry under Professional & Skilled Services, right
-- after Health / Medical (210). Safe to run more than once.

insert into public.skills (id, name_en, name_ne, emoji, sort_order, category) values
  ('veterinary', 'Vet Doctor / Veterinary', 'पशु चिकित्सक', '🐾', 215, 'professional')
on conflict (id) do update
  set name_en    = excluded.name_en,
      name_ne    = excluded.name_ne,
      emoji      = excluded.emoji,
      sort_order = excluded.sort_order,
      category   = excluded.category;
