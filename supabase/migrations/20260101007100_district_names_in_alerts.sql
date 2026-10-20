-- =====================================================================
-- Duleko MVP :: 7100 :: District names in Nepali alerts
-- =====================================================================
-- Run after 7000 (this replaces its fan_out_job_post).
--
-- Districts are stored by their English name (the picker in
-- src/lib/nepal.ts), so the Nepali "new work near you" alert read
-- "Kathmanduमा". district_label() is the SQL twin of districtLabel() in
-- nepal.ts: a known district gives its Nepali name, anything else (a
-- typed-in or old value) comes back as it is. The 77 names below are
-- copied from nepal.ts - keep the two lists the same.
--
-- Only the Nepali body changes; the English alert and who gets it stay
-- the same. Alerts already sent keep their old text.
-- =====================================================================

create or replace function public.district_label(district text, lang text)
returns text language sql immutable set search_path = public as $$
  select case
    when lang = 'ne' then coalesce(
      (select d.ne from (values
        ('Achham', 'अछाम'),
        ('Arghakhanchi', 'अर्घाखाँची'),
        ('Baglung', 'बागलुङ'),
        ('Baitadi', 'बैतडी'),
        ('Bajhang', 'बझाङ'),
        ('Bajura', 'बाजुरा'),
        ('Banke', 'बाँके'),
        ('Bara', 'बारा'),
        ('Bardiya', 'बर्दिया'),
        ('Bhaktapur', 'भक्तपुर'),
        ('Bhojpur', 'भोजपुर'),
        ('Chitwan', 'चितवन'),
        ('Dadeldhura', 'डडेल्धुरा'),
        ('Dailekh', 'दैलेख'),
        ('Dang', 'दाङ'),
        ('Darchula', 'दार्चुला'),
        ('Dhading', 'धादिङ'),
        ('Dhankuta', 'धनकुटा'),
        ('Dhanusha', 'धनुषा'),
        ('Dolakha', 'दोलखा'),
        ('Dolpa', 'डोल्पा'),
        ('Doti', 'डोटी'),
        ('Eastern Rukum', 'रुकुम पूर्व'),
        ('Gorkha', 'गोरखा'),
        ('Gulmi', 'गुल्मी'),
        ('Humla', 'हुम्ला'),
        ('Ilam', 'इलाम'),
        ('Jajarkot', 'जाजरकोट'),
        ('Jhapa', 'झापा'),
        ('Jumla', 'जुम्ला'),
        ('Kailali', 'कैलाली'),
        ('Kalikot', 'कालिकोट'),
        ('Kanchanpur', 'कञ्चनपुर'),
        ('Kapilvastu', 'कपिलवस्तु'),
        ('Kaski', 'कास्की'),
        ('Kathmandu', 'काठमाडौं'),
        ('Kavrepalanchok', 'काभ्रेपलाञ्चोक'),
        ('Khotang', 'खोटाङ'),
        ('Lalitpur', 'ललितपुर'),
        ('Lamjung', 'लमजुङ'),
        ('Mahottari', 'महोत्तरी'),
        ('Makwanpur', 'मकवानपुर'),
        ('Manang', 'मनाङ'),
        ('Morang', 'मोरङ'),
        ('Mugu', 'मुगु'),
        ('Mustang', 'मुस्ताङ'),
        ('Myagdi', 'म्याग्दी'),
        ('Nawalpur', 'नवलपुर'),
        ('Nuwakot', 'नुवाकोट'),
        ('Okhaldhunga', 'ओखलढुङ्गा'),
        ('Palpa', 'पाल्पा'),
        ('Panchthar', 'पाँचथर'),
        ('Parasi', 'परासी'),
        ('Parbat', 'पर्वत'),
        ('Parsa', 'पर्सा'),
        ('Pyuthan', 'प्युठान'),
        ('Ramechhap', 'रामेछाप'),
        ('Rasuwa', 'रसुवा'),
        ('Rautahat', 'रौतहट'),
        ('Rolpa', 'रोल्पा'),
        ('Rupandehi', 'रूपन्देही'),
        ('Salyan', 'सल्यान'),
        ('Sankhuwasabha', 'संखुवासभा'),
        ('Saptari', 'सप्तरी'),
        ('Sarlahi', 'सर्लाही'),
        ('Sindhuli', 'सिन्धुली'),
        ('Sindhupalchok', 'सिन्धुपाल्चोक'),
        ('Siraha', 'सिराहा'),
        ('Solukhumbu', 'सोलुखुम्बु'),
        ('Sunsari', 'सुनसरी'),
        ('Surkhet', 'सुर्खेत'),
        ('Syangja', 'स्याङ्जा'),
        ('Tanahun', 'तनहुँ'),
        ('Taplejung', 'ताप्लेजुङ'),
        ('Terhathum', 'तेह्रथुम'),
        ('Udayapur', 'उदयपुर'),
        ('Western Rukum', 'रुकुम पश्चिम')
      ) as d(en, ne) where d.en = district),
      district)
    else district
  end;
$$;

-- ---------------------------------------------------------------------
-- fan_out_job_post (latest: 7000) - the district now in Nepali
-- ---------------------------------------------------------------------
create or replace function public.fan_out_job_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  poster_name text;
  skill_en    text;
  skill_ne    text;
  budget_en   text := public.job_budget_text(new.budget_min, new.budget_max, 'en');
  budget_ne   text := public.job_budget_text(new.budget_min, new.budget_max, 'ne');
begin
  if new.kind = 'offer' then
    return null;
  end if;

  select full_name into poster_name from public.profiles where id = new.employer_profile_id;
  select name_en, name_ne into skill_en, skill_ne from public.skills where id = new.skill_id;

  insert into public.notifications
    (profile_id, kind, title_en, title_ne, body_en, body_ne, job_post_id, actor_name)
  select p.id, 'job_post',
         'New work near you: ' || new.title,
         'नजिकै नयाँ काम: ' || new.title,
         poster_name || ' needs ' || coalesce(skill_en, 'help') || ' work in ' || new.district
           || coalesce(' (' || budget_en || ')', '') || '. Send an offer if you can do it.',
         poster_name || 'लाई ' || public.district_label(new.district, 'ne') || 'मा ' || coalesce(skill_ne || ' ', '') || 'काम चाहिएको छ'
           || coalesce(' (' || budget_ne || ')', '') || '। गर्न सक्नुहुन्छ भने प्रस्ताव पठाउनुहोस्।',
         new.id, poster_name
    from public.profiles p
   where p.id <> new.employer_profile_id
     and p.district = new.district
     and p.is_available
     and exists (select 1 from public.user_skills us
                  where us.profile_id = p.id and us.skill_id = new.skill_id)
     and not public.is_profile_suspended(p.id)
   order by (p.municipality is not distinct from new.municipality) desc,
            p.rating desc, p.rating_count desc, p.created_at desc
   limit 30;

  return null;
end;
$$;
