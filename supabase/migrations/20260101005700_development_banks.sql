-- =====================================================================
-- Duleko MVP :: 5700 :: Development banks in payment details
-- =====================================================================
-- 5600 listed Nepal's 20 commercial banks; anything else was typed in as
-- "other". This adds the 16 development ("B" class) banks Nepal Rastra
-- Bank lists as operating in 2026, each with its own logo in the app
-- (src/lib/banks.ts has the same codes). Karnali Development Bank, under
-- NRB resolution, stays an "other" bank. Run after 5600. Safe to run more
-- than once.

alter table public.payment_methods drop constraint if exists payment_methods_bank_code_check;
alter table public.payment_methods add constraint payment_methods_bank_code_check
  check (bank_code is null or bank_code in (
    -- commercial banks
    'nabil', 'nimb', 'gibl', 'nicasia', 'himalayan', 'everest', 'sbi', 'scb',
    'nbl', 'rbb', 'adbl', 'kumari', 'laxmisunrise', 'siddhartha',
    'machhapuchchhre', 'citizens', 'prime', 'nmb', 'prabhu', 'sanima',
    -- development banks
    'muktinath', 'garima', 'jyoti', 'shangrila', 'lumbini', 'kamanasewa',
    'mahalaxmi', 'shineresunga', 'corporate', 'excel', 'green', 'miteri',
    'narayani', 'salapa', 'saptakoshi', 'sindhu',
    'other'));

-- The names recorded with a fee payment, now covering the development banks.
create or replace function public.bank_name_of(code text)
returns text language sql immutable as $$
  select case code
    when 'nabil' then 'Nabil Bank'
    when 'nimb' then 'Nepal Investment Mega Bank'
    when 'gibl' then 'Global IME Bank'
    when 'nicasia' then 'NIC Asia Bank'
    when 'himalayan' then 'Himalayan Bank'
    when 'everest' then 'Everest Bank'
    when 'sbi' then 'Nepal SBI Bank'
    when 'scb' then 'Standard Chartered Bank Nepal'
    when 'nbl' then 'Nepal Bank'
    when 'rbb' then 'Rastriya Banijya Bank'
    when 'adbl' then 'Agricultural Development Bank'
    when 'kumari' then 'Kumari Bank'
    when 'laxmisunrise' then 'Laxmi Sunrise Bank'
    when 'siddhartha' then 'Siddhartha Bank'
    when 'machhapuchchhre' then 'Machhapuchchhre Bank'
    when 'citizens' then 'Citizens Bank International'
    when 'prime' then 'Prime Commercial Bank'
    when 'nmb' then 'NMB Bank'
    when 'prabhu' then 'Prabhu Bank'
    when 'sanima' then 'Sanima Bank'
    when 'muktinath' then 'Muktinath Bikas Bank'
    when 'garima' then 'Garima Bikas Bank'
    when 'jyoti' then 'Jyoti Bikas Bank'
    when 'shangrila' then 'Shangri-la Development Bank'
    when 'lumbini' then 'Lumbini Bikas Bank'
    when 'kamanasewa' then 'Kamana Sewa Bikas Bank'
    when 'mahalaxmi' then 'Mahalaxmi Bikas Bank'
    when 'shineresunga' then 'Shine Resunga Development Bank'
    when 'corporate' then 'Corporate Development Bank'
    when 'excel' then 'Excel Development Bank'
    when 'green' then 'Green Development Bank'
    when 'miteri' then 'Miteri Development Bank'
    when 'narayani' then 'Narayani Development Bank'
    when 'salapa' then 'Salapa Bikas Bank'
    when 'saptakoshi' then 'Saptakoshi Development Bank'
    when 'sindhu' then 'Sindhu Bikas Bank'
    when 'esewa' then 'eSewa'
    when 'khalti' then 'Khalti'
    else code
  end;
$$;
