-- =====================================================================
-- Duleko MVP :: 8200 :: No phone numbers or emojis in what people write
-- =====================================================================
-- Names, bios, skills, job posts, offers, work requests and reviews may
-- not contain a phone number or an emoji. A number belongs in the contact
-- details, which Duleko shares once a job is agreed - not in text anyone
-- can read, where it skips that step (and Duleko's fee). Emojis keep
-- posts plain and easy to read.
--
-- The app checks as people type (src/lib/text-rules.ts, same rules);
-- these triggers make sure a request sent around the app can't skip it.
-- They only look at a field when it changes, so an older post with a
-- number in it still loads and can still change its other fields.
--
--   A phone number: 9 or more digits in a row, Latin or Nepali (०-९),
--   allowing spaces, dots, dashes, slashes, brackets and + between them -
--   so 98XXXXXXXX, +977-98..., 01-4228094 and "98 41 23 45 67" all count,
--   while prices (Rs 15,000) and years (2024-2025) do not.
--   An emoji: anything in the emoji and pictograph blocks, symbols and
--   dingbats, plus the emoji variation selector and keycap mark.
--
-- The error message is the code (TEXT_HAS_PHONE / TEXT_HAS_EMOJI) and the
-- hint is the column, for src/lib/supabase.ts to put in words.
--
-- Not covered: chats, reports to staff, payment notes, and the contact
-- phone fields themselves.
--
-- Safe to run more than once.

create or replace function public.text_rule_violation(p_text text)
returns text
language sql immutable as $$
  select case
    when p_text is null then null
    when p_text ~ '[0-9०-९]([[:space:]().+/-]*[0-9०-९]){8,}' then 'TEXT_HAS_PHONE'
    when p_text ~ '[\U0001F000-\U0001FAFF☀-➿⌀-⏿⬀-⯿️⃣]' then 'TEXT_HAS_EMOJI'
    else null
  end;
$$;

-- The columns to check come in as the trigger's arguments.
create or replace function public.enforce_text_rules()
returns trigger
language plpgsql as $$
declare
  col     text;
  fresh   jsonb := to_jsonb(new);
  before  jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  problem text;
begin
  foreach col in array tg_argv loop
    if tg_op = 'INSERT' or (fresh ->> col) is distinct from (before ->> col) then
      problem := public.text_rule_violation(fresh ->> col);
      if problem is not null then
        raise exception '%', problem using errcode = 'check_violation', hint = col;
      end if;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists profiles_text_rules on public.profiles;
create trigger profiles_text_rules
  before insert or update of full_name, about, bio, education on public.profiles
  for each row execute function public.enforce_text_rules('full_name', 'about', 'bio', 'education');

drop trigger if exists user_skills_text_rules on public.user_skills;
create trigger user_skills_text_rules
  before insert or update of custom_label, custom_note on public.user_skills
  for each row execute function public.enforce_text_rules('custom_label', 'custom_note');

drop trigger if exists job_posts_text_rules on public.job_posts;
create trigger job_posts_text_rules
  before insert or update of title, details, location_text on public.job_posts
  for each row execute function public.enforce_text_rules('title', 'details', 'location_text');

drop trigger if exists job_offers_text_rules on public.job_offers;
create trigger job_offers_text_rules
  before insert or update of note on public.job_offers
  for each row execute function public.enforce_text_rules('note');

drop trigger if exists work_engagements_text_rules on public.work_engagements;
create trigger work_engagements_text_rules
  before insert or update of title, details, location_text on public.work_engagements
  for each row execute function public.enforce_text_rules('title', 'details', 'location_text');

drop trigger if exists reviews_text_rules on public.reviews;
create trigger reviews_text_rules
  before insert or update of comment on public.reviews
  for each row execute function public.enforce_text_rules('comment');
