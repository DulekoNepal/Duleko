-- =====================================================================
-- Duleko MVP :: 0008 :: More skills + "Others" custom entry + per-skill rate
-- =====================================================================

-- New in-demand skills, plus a catch-all "Others" that sorts last so the
-- most requested skills stay at the top of pickers and the skill grid.
insert into public.skills (id, name_en, name_ne, emoji, sort_order) values
  ('it_computer',   'IT / Computer',  'आईटी / कम्प्युटर', '💻', 15),
  ('mobile_repair', 'Mobile Repair',  'मोबाइल मर्मत',      '📱', 25),
  ('other',         'Others',         'अन्य',              '➕', 999)
on conflict (id) do update
  set name_en = excluded.name_en,
      name_ne = excluded.name_ne,
      emoji   = excluded.emoji,
      sort_order = excluded.sort_order;

-- "Others" lets someone describe a skill we don't have a chip for yet.
-- Every skill can optionally carry the worker's own expected rate, e.g.
-- "Rs. 100 / switch" - entirely optional, shown on the worker's profile.
alter table public.user_skills
  add column if not exists custom_label text check (char_length(custom_label) <= 60),
  add column if not exists custom_note  text check (char_length(custom_note)  <= 300),
  add column if not exists rate_amount  numeric(10,2) check (rate_amount is null or rate_amount >= 0),
  add column if not exists rate_unit    text check (char_length(rate_unit) <= 30);
