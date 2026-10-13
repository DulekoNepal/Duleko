-- =====================================================================
-- Duleko MVP :: 6300 :: ID checks (KYC) before the verified badge
-- =====================================================================
-- Until now any staff member could hand out the verified badge from a
-- profile's menu. From here on the badge means "Duleko has seen this
-- person's ID": a member sends a photo of at least one of
--
--   citizenship certificate   national ID card
--   driving licence           passport
--
-- (one is required; once one is in, the rest are optional), and staff
-- (all three tiers) check it in the ID checks queue (/staff/verify).
-- Approving gives the badge; rejecting tells the member why.
--
--   kyc_submissions - one row per attempt: pending, approved or rejected
--   kyc_documents   - the documents in an attempt, one row per kind
--   storage 'kyc'   - the photos. PRIVATE: no public URL. The owner and
--                     staff read them through short-lived signed URLs.
--
-- Staff never need an ID check: their staff badge already says they
-- speak for Duleko, so submit_kyc turns them away.
--
-- profile_verifications can no longer be written from the app. Staff
-- may still remove a badge (delete), but the only way to add one is
-- review_kyc() approving an ID. The 12 badges given by hand before this
-- migration stay as they are.
--
-- Changing your name after you're verified removes the badge: the badge
-- vouches for the name on the ID, not whatever the profile says later.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table if not exists public.kyc_submissions (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at       timestamptz not null default now(),
  reviewed_by      uuid references public.profiles(id) on delete set null,
  reviewed_at      timestamptz,
  -- Why it was turned down: a fixed reason (so the member reads it in
  -- their own language) plus an optional note in the reviewer's words.
  rejection_code   text check (rejection_code in ('unclear', 'name_mismatch', 'incomplete', 'not_valid', 'other')),
  rejection_note   text check (rejection_note is null or char_length(rejection_note) <= 300)
);

-- One attempt waiting at a time per member.
create unique index if not exists kyc_submissions_one_pending
  on public.kyc_submissions (profile_id) where status = 'pending';
create index if not exists kyc_submissions_profile_idx
  on public.kyc_submissions (profile_id, created_at desc);
create index if not exists kyc_submissions_queue_idx
  on public.kyc_submissions (created_at) where status = 'pending';
create index if not exists kyc_submissions_reviewed_idx
  on public.kyc_submissions (reviewed_at desc) where status <> 'pending';

create table if not exists public.kyc_documents (
  submission_id uuid not null references public.kyc_submissions(id) on delete cascade,
  doc_type      text not null check (doc_type in ('citizenship', 'national_id', 'driving_license', 'passport')),
  -- Object names in the private 'kyc' bucket: <auth.uid()>/<random>.webp
  front_path    text not null,
  -- Cards have two sides; a passport only its photo page.
  back_path     text,
  primary key (submission_id, doc_type)
);

-- ---------------------------------------------------------------------
-- RLS: the owner and staff read; nobody writes except through the RPCs
-- ---------------------------------------------------------------------
alter table public.kyc_submissions enable row level security;
alter table public.kyc_documents   enable row level security;

revoke all on public.kyc_submissions, public.kyc_documents from anon;
revoke insert, update, delete on public.kyc_submissions, public.kyc_documents from authenticated;

drop policy if exists kyc_submissions_read on public.kyc_submissions;
create policy kyc_submissions_read on public.kyc_submissions
  for select to authenticated
  using (profile_id = public.current_profile_id() or public.is_staff());

drop policy if exists kyc_documents_read on public.kyc_documents;
create policy kyc_documents_read on public.kyc_documents
  for select to authenticated
  using (exists (
    select 1 from public.kyc_submissions s
     where s.id = kyc_documents.submission_id
       and (s.profile_id = public.current_profile_id() or public.is_staff())
  ));

-- The badge: still readable by everyone (3500), but only removable by
-- staff - adding one is review_kyc()'s job alone.
drop policy if exists profile_verifications_write on public.profile_verifications;
drop policy if exists profile_verifications_delete on public.profile_verifications;
create policy profile_verifications_delete on public.profile_verifications
  for delete to authenticated
  using (public.is_staff());

-- ---------------------------------------------------------------------
-- Files: the private 'kyc' bucket
-- kyc/<auth.uid()>/<random>.webp. Never public; the owner may add and
-- remove their own (deleting an account clears them), and staff may
-- read every one of them to check it.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kyc', 'kyc', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "kyc files: read own or staff" on storage.objects;
create policy "kyc files: read own or staff" on storage.objects
  for select to authenticated
  using (bucket_id = 'kyc'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));

drop policy if exists "kyc files: upload own" on storage.objects;
create policy "kyc files: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "kyc files: delete own" on storage.objects;
create policy "kyc files: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- Alerts: staff hear about an ID to check; the member hears if it was
-- turned down (approval sends the existing 'verified' alert)
-- ---------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in
    ('request','accepted','declined','confirmed','completed','cancelled','review',
     'friend_request','friend_accepted','message','welcome','verified','verify_reminder',
     'announcement','notice','fee_payment','fee_review',
     'job_post','job_offer','job_closed',
     'kyc_review','kyc_result'));

-- The badge alert now says what was checked.
create or replace function public.notify_on_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne)
  values (
    new.profile_id, 'verified',
    'Your profile is verified', 'तपाईंको प्रोफाइल प्रमाणित भयो',
    'Duleko checked your ID and verified your profile. The verified badge now shows next to your name.',
    'डुलेकोले तपाईंको परिचयपत्र जाँचेर प्रोफाइल प्रमाणित गर्‍यो। अब तपाईंको नाउँ छेउ प्रमाणित ब्याज देखिन्छ।'
  );
  return null;
end;
$$;

-- A rejection reason as one sentence, in English or Nepali.
create or replace function public.kyc_reason_text(code text, lang text)
returns text language sql immutable as $$
  select case code
    when 'unclear' then case when lang = 'ne' then 'फोटो धमिलो वा पढ्न गाह्रो छ।'
                             else 'The photo is blurry or hard to read.' end
    when 'name_mismatch' then case when lang = 'ne' then 'कागजातको नाम तपाईंको प्रोफाइलको नामसँग मिलेन।'
                                   else 'The name on the document does not match your profile name.' end
    when 'incomplete' then case when lang = 'ne' then 'कागजातको केही भाग छुटेको वा काटिएको छ।'
                                else 'Part of the document is missing or cut off.' end
    when 'not_valid' then case when lang = 'ne' then 'यो मान्य परिचयपत्र होइन, वा यसको म्याद सकिएको छ।'
                               else 'This is not an accepted ID, or it has expired.' end
    else null
  end;
$$;

-- The alert email opens the right screen (see 5000 for link_path).
create or replace function public.decorate_kyc_delivery()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'kyc_review' then
    new.link_path := '/staff/verify';
  elsif new.kind = 'kyc_result' then
    new.link_path := '/verify';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notification_deliveries_kyc on public.notification_deliveries;
create trigger trg_notification_deliveries_kyc
  before insert on public.notification_deliveries
  for each row execute function public.decorate_kyc_delivery();

-- ---------------------------------------------------------------------
-- submit_kyc: send the documents for checking
-- p_documents: [{ "type": "citizenship", "front": "<path>", "back": "<path>" }, ...]
-- The photos are uploaded to the 'kyc' bucket first; each path must be
-- in the caller's own folder, so nobody can point at someone else's.
-- ---------------------------------------------------------------------
create or replace function public.submit_kyc(p_documents jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me       uuid := public.current_profile_id();
  folder   text := auth.uid()::text || '/';
  doc      jsonb;
  doc_kind text;
  front    text;
  back     text;
  new_id   uuid;
  me_name  text;
begin
  if me is null then
    raise exception 'KYC_SIGN_IN' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.staff_roles where profile_id = me) then
    raise exception 'KYC_STAFF' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profile_verifications where profile_id = me) then
    raise exception 'KYC_ALREADY_VERIFIED' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.kyc_submissions where profile_id = me and status = 'pending') then
    raise exception 'KYC_PENDING' using errcode = 'P0001';
  end if;
  if p_documents is null or jsonb_typeof(p_documents) <> 'array' or jsonb_array_length(p_documents) = 0 then
    raise exception 'KYC_DOCUMENT_REQUIRED' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_documents) > 4 then
    raise exception 'KYC_BAD_DOCUMENT' using errcode = 'P0001';
  end if;

  insert into public.kyc_submissions (profile_id) values (me) returning id into new_id;

  for doc in select value from jsonb_array_elements(p_documents) loop
    doc_kind := doc->>'type';
    front    := nullif(trim(coalesce(doc->>'front', '')), '');
    back     := nullif(trim(coalesce(doc->>'back', '')), '');

    if doc_kind is null or doc_kind not in ('citizenship', 'national_id', 'driving_license', 'passport')
       or exists (select 1 from public.kyc_documents where submission_id = new_id and doc_type = doc_kind) then
      raise exception 'KYC_BAD_DOCUMENT' using errcode = 'P0001';
    end if;
    if front is null then
      raise exception 'KYC_FRONT_REQUIRED' using errcode = 'P0001', detail = doc_kind;
    end if;
    if doc_kind = 'passport' then
      back := null;
    elsif back is null then
      raise exception 'KYC_BACK_REQUIRED' using errcode = 'P0001', detail = doc_kind;
    end if;

    if left(front, length(folder)) <> folder or (back is not null and left(back, length(folder)) <> folder) then
      raise exception 'KYC_BAD_FILE' using errcode = 'P0001';
    end if;

    insert into public.kyc_documents (submission_id, doc_type, front_path, back_path)
    values (new_id, doc_kind, front, back);
  end loop;

  select full_name into me_name from public.profiles where id = me;
  insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne, actor_name)
  select s.profile_id, 'kyc_review',
         'ID to check', 'जाँच्नुपर्ने परिचयपत्र',
         me_name || ' sent their ID for the verified badge. Check it in ID checks.',
         me_name || 'ले प्रमाणित ब्याजका लागि परिचयपत्र पठाउनुभयो। परिचयपत्र जाँचमा हेर्नुहोस्।',
         me_name
    from public.staff_roles s;

  return new_id;
end;
$$;

revoke execute on function public.submit_kyc(jsonb) from public, anon;
grant execute on function public.submit_kyc(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- review_kyc: staff approve (gives the badge) or reject (with a reason)
-- ---------------------------------------------------------------------
create or replace function public.review_kyc(
  p_submission uuid,
  p_approve    boolean,
  p_reason     text default null,
  p_note       text default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  sub      public.kyc_submissions;
  reviewer uuid := public.current_profile_id();
  code     text;
  note     text := nullif(left(trim(coalesce(p_note, '')), 300), '');
begin
  if not public.is_staff() then
    raise exception 'Not authorized' using errcode = 'insufficient_privilege';
  end if;

  select * into sub from public.kyc_submissions where id = p_submission for update;
  if sub.id is null then
    raise exception 'KYC_NOT_FOUND' using errcode = 'P0001';
  end if;
  if sub.status <> 'pending' then
    raise exception 'KYC_ALREADY_REVIEWED' using errcode = 'P0001';
  end if;

  if p_approve then
    update public.kyc_submissions
       set status = 'approved', reviewed_by = reviewer, reviewed_at = now(),
           rejection_code = null, rejection_note = null
     where id = sub.id;
    -- The 3500 trigger on this insert sends the 'verified' alert.
    insert into public.profile_verifications (profile_id, verified_by)
    values (sub.profile_id, reviewer)
    on conflict (profile_id) do nothing;
    return;
  end if;

  code := coalesce(nullif(p_reason, ''), 'other');
  if code not in ('unclear', 'name_mismatch', 'incomplete', 'not_valid', 'other') then
    raise exception 'KYC_BAD_REASON' using errcode = 'P0001';
  end if;
  if code = 'other' and note is null then
    raise exception 'KYC_REASON_REQUIRED' using errcode = 'P0001';
  end if;

  update public.kyc_submissions
     set status = 'rejected', reviewed_by = reviewer, reviewed_at = now(),
         rejection_code = code, rejection_note = note
   where id = sub.id;

  insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne)
  values (
    sub.profile_id, 'kyc_result',
    'ID not accepted', 'परिचयपत्र स्वीकृत भएन',
    concat_ws(' ', 'Duleko could not verify your ID.', public.kyc_reason_text(code, 'en'),
              case when note is not null then rtrim(note, '.।') || '.' end,
              'Open Get verified to send it again.'),
    concat_ws(' ', 'डुलेकोले तपाईंको परिचयपत्र प्रमाणित गर्न सकेन।', public.kyc_reason_text(code, 'ne'),
              case when note is not null then rtrim(note, '.।') || '।' end,
              'फेरि पठाउन "प्रमाणित हुनुहोस्" खोल्नुहोस्।')
  );
end;
$$;

revoke execute on function public.review_kyc(uuid, boolean, text, text) from public, anon;
grant execute on function public.review_kyc(uuid, boolean, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- A new name means a new ID check. Spacing and capital letters don't
-- count, so tidying "ram  bahadur" to "Ram Bahadur" keeps the badge.
-- ---------------------------------------------------------------------
create or replace function public.unverify_on_name_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(regexp_replace(trim(new.full_name), '\s+', ' ', 'g'))
     is distinct from lower(regexp_replace(trim(old.full_name), '\s+', ' ', 'g')) then
    delete from public.profile_verifications where profile_id = new.id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_profiles_unverify_on_name on public.profiles;
create trigger trg_profiles_unverify_on_name
  after update of full_name on public.profiles
  for each row execute function public.unverify_on_name_change();

-- ---------------------------------------------------------------------
-- The welcome alert (3700) promised a badge for a complete profile.
-- Same function, new wording: the badge now comes from sending an ID.
-- ---------------------------------------------------------------------
create or replace function public.deliver_welcome(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  target      record;
  first_name  text;
  sender      record;
  a uuid;
  b uuid;
begin
  select id, full_name, language into target
    from public.profiles where id = p_profile_id;
  if not found then
    return;
  end if;

  first_name := coalesce(
    nullif(split_part(trim(target.full_name), ' ', 1), ''),
    trim(target.full_name)
  );

  if not exists (
    select 1 from public.notifications
     where profile_id = target.id and kind = 'welcome'
  ) then
    insert into public.notifications
      (profile_id, kind, title_en, title_ne, body_en, body_ne, actor_name)
    values (
      target.id, 'welcome',
      'Welcome to Duleko 👋', 'डुलेकोमा स्वागत छ 👋',
      'Hi ' || first_name || ', welcome to Duleko! Add your skills and a short bio so people nearby can find you. Then send a photo of your citizenship, national ID, driving licence or passport from your profile to get the verified badge, which builds more trust with people looking for help nearby.',
      'नमस्ते ' || first_name || ', डुलेकोमा स्वागत छ! नजिकैका मानिसहरूले भेट्टाउन सकून् भनेर आफ्नो सीप र छोटो परिचय थप्नुहोस्। त्यसपछि प्रमाणित ब्याजका लागि प्रोफाइलबाट आफ्नो नागरिकता, राष्ट्रिय परिचयपत्र, सवारी चालक अनुमतिपत्र वा राहदानीको फोटो पठाउनुहोस्, जसले नजिकैका मानिसहरूको भरोसा अझ बढाउँछ।',
      'Duleko'
    );
  end if;

  for sender in
    select profile_id, message from public.welcome_senders order by sort_order
  loop
    if sender.profile_id = target.id then
      continue;
    end if;

    if sender.profile_id < target.id then
      a := sender.profile_id; b := target.id;
    else
      a := target.id;   b := sender.profile_id;
    end if;

    if exists (
      select 1 from public.messages
       where profile_a = a and profile_b = b and sender_profile_id = sender.profile_id
    ) then
      continue;
    end if;

    -- Fires trg_messages_notify too, so the new user gets the usual
    -- unread badge on the Chats tab for each founder's message.
    insert into public.messages (profile_a, profile_b, sender_profile_id, body)
    values (a, b, sender.profile_id, left(replace(sender.message, '{first_name}', first_name), 1000));
  end loop;
end;
$$;
