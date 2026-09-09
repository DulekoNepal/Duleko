# Duleko

A simple local skills marketplace: workers list what they can do and where they
are, people who need work find them, and both sides rate each other afterwards.
Built for Kapilvastu first - bilingual (English / नेपाली), mobile-first, and
designed to run entirely on free tiers.

Stack: React 19 + Vite + TypeScript · TanStack Router & Query · Tailwind CSS v4 ·
Supabase (Postgres, Auth, Storage, Realtime) · deployed on Vercel.

---

## 1. Prerequisites

- Node.js 20 or newer (`node -v`)
- A free Supabase account - https://supabase.com
- A free Vercel account for deployment - https://vercel.com

## 2. Install

```bash
npm install
```

## 3. Create the Supabase project

1. supabase.com → **New project**. Region: **Southeast Asia (Singapore)** - closest to Nepal.
2. Wait ~2 minutes for it to finish provisioning.
3. Open **SQL Editor** and run the files in `supabase/migrations/` **in filename order**:

   | Order | File | What it does |
   |---|---|---|
   | 1 | `20260101000000_init_schema.sql` | Tables, indexes, constraints |
   | 2 | `20260101000100_functions_triggers.sql` | Helpers, ratings, notifications, availability |
   | 3 | `20260101000200_rls.sql` | Row Level Security on every table |
   | 4 | `20260101000300_search_rpc.sql` | `search_workers` and `skill_counts` |
   | 5 | `20260101000400_storage.sql` | `avatars` storage bucket + policies |
   | 6 | `20260101000500_seed_skills.sql` | The 14 bilingual skills |
   | 7 | `20260101000600_transition_roles_realtime.sql` | Status-change rules + realtime |

   Each file is safe to run more than once.

4. **Authentication → Providers → Email**: for the beta, turn **"Confirm email" off**
   so villagers are not stuck waiting on an inbox. Turn it back on before a public launch.
5. **Project Settings → API**: copy the Project URL and the `anon` public key.

## 4. Configure the app

```bash
cp .env.example .env.local
```

Then fill in:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

The anon key is meant to be public - every table is protected by RLS, not by key secrecy.

## 5. Run

```bash
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
npm run preview  # serve the production build locally
```

If `.env.local` is missing, the app shows a setup screen instead of a blank page.

## 6. Deploy to Vercel

1. Push to GitHub.
2. Vercel → **Add New → Project** → import the repo (framework auto-detects as Vite).
3. Add the same two environment variables under **Settings → Environment Variables**.
4. Deploy. `vercel.json` already rewrites all routes to `index.html` so deep links work.
5. In Supabase → **Authentication → URL Configuration**, set **Site URL** to your Vercel
   URL and add it to **Redirect URLs**.

## 7. The official account and the welcome message

Migration `20260101002400_welcome_message.sql` gives every brand new profile a welcome
notification *and* a real chat message from the founder's account, which they can reply to.
It needs one manual step: sign up in the app with the account the message should come from,
then flag it once.

```sql
update public.profiles p
   set is_official = true
  from auth.users u
 where u.id = p.user_id
   and u.email = 'you@example.com';
```

The wording lives in `public.app_settings` under `welcome_message_en` / `welcome_message_ne`,
so it can be edited from the Supabase table editor with no deploy. `{first_name}` is replaced
with the first word of the person's name.

To send it to people who signed up before this existed (safe to run twice - nobody gets two):

```sql
select public.deliver_welcome(id) from public.profiles where not is_official;
```

The official account can chat with anyone and anyone can reply to it - that is the only thing
`is_official` unlocks. It does **not** give the account access to anyone's phone number.

## 8. Email and SMS alerts

Migration `20260101002500_notification_delivery.sql` mirrors every in-app notification into an
outbox (`notification_deliveries`), and the `send-notifications` edge function drains it.

```bash
supabase functions deploy send-notifications

# Email (Brevo free tier: 300/day)
supabase secrets set BREVO_API_KEY=xkeysib-xxx
supabase secrets set NOTIFY_EMAIL_FROM="Duleko <hello@duleko.com>"
supabase secrets set SITE_URL=https://www.duleko.com

# SMS - optional, costs money per message. Pick one:
supabase secrets set SMS_PROVIDER=sparrow SPARROW_TOKEN=xxx SPARROW_FROM=Duleko
# or
supabase secrets set SMS_PROVIDER=twilio TWILIO_ACCOUNT_SID=ACxxx TWILIO_AUTH_TOKEN=xxx TWILIO_FROM=+1xxx
```

Then tell Postgres to poke the function once a minute. Store the two values in Vault first
(Database → Vault, or SQL), so the service key is never written into a migration:

```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-notifications',
                           'notify_function_url');
select vault.create_secret('<service_role key>', 'notify_service_key');

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('drain-notification-outbox', '* * * * *', $cron$
  select public.requeue_stuck_deliveries();
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'notify_function_url'),
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                                                 where name = 'notify_service_key')),
    body    := '{}'::jsonb
  );
$cron$);
```

Check on it with `select status, count(*) from public.notification_deliveries group by 1;` -
anything in `failed` has the provider's own message in `last_error`.

## 9. Marketing contact sync

`hello@duleko.com` sends Campaigns by hand from Brevo's own dashboard - that needs a contact
list to send to. Migration `20260101003400_brevo_contact_sync.sql` mirrors every profile that
finishes onboarding into `marketing_contact_syncs`, and the `sync-brevo-contacts` edge function
drains it into a Brevo list. It never sends anything itself; it only keeps the list current.

```bash
supabase functions deploy sync-brevo-contacts

# BREVO_API_KEY is the same one set for send-notifications above - reused, not a second key.
supabase secrets set BREVO_API_KEY=xkeysib-xxx
supabase secrets set BREVO_LIST_ID=7   # Brevo -> Contacts -> Lists -> open one -> id is in the URL
```

Same Vault + cron pattern as section 8, with its own function URL secret and schedule name -
see the migration's own comment block for the exact SQL (`brevo_sync_function_url`,
`drain-marketing-contact-syncs`). It reuses the `notify_service_key` Vault secret from section 8
rather than storing the service key twice.

---

## How the app works

### Roles
There are no separate accounts for workers and employers. Everyone has one profile;
adding a skill makes you findable as a worker, and anyone can request work from anyone.

### The work lifecycle

```
employer sends request   →  pending
worker accepts           →  accepted      (phone numbers become visible)
employer confirms        →  confirmed     (worker's calendar day is booked)
either marks done        →  completed     (both sides can review)
```

Either side can cancel before completion; the worker can decline a pending request.
These transitions are enforced by a database trigger, not just by the UI - the worker
is the only one who can accept, and the employer the only one who can confirm.

### Privacy
Phone numbers live in a separate `profile_contacts` table whose read policy calls
`can_view_contact()`, and chat goes through `can_chat_with()`. **For the beta both are open
to any signed-in user with a completed profile** - anyone can message or call anyone. Guests
still see neither: those policies are `to authenticated` only, and the functions also require
the caller to have their own profile.

The original rule - a number and a chat thread unlock only after an accepted work engagement
or an accepted friendship - is one `create or replace` away; migration
`20260101002600_open_chat_and_call.sql` carries the exact SQL to put it back.

### Notifications
Database triggers write notification rows on every status change, new review, friend request,
chat message and new signup, in both languages. The notifications screen subscribes over
Supabase Realtime, and the bottom nav polls the unread count.

The same rows fan out to email and SMS through the `notification_deliveries` outbox. Two rules
keep it from being annoying: chat alerts only leave the app when the person has not been seen
for three minutes, and at most one per sender per fifteen minutes. Email is on by default; SMS
is opt-in per user (Profile → Settings) and only fires for the kinds listed in the `sms_kinds`
app setting - work requests, confirmations and friend requests - because each text costs money.

### Ratings
A trigger on `reviews` recalculates the reviewee's `rating` and `rating_count`, so the
number on a profile card is always consistent with the reviews under it. One review per
person per job, enforced by a unique constraint.

---

## Project layout

```
src/
  components/
    duleko/          Domain components (worker card, calendar, dialogs, nav)
    ui/              Small primitives (button, field, card, dialog, badge…)
  hooks/
    use-session.tsx  Auth + profile context
    use-toast.tsx    Toasts
  lib/
    i18n.tsx         Every user-facing string, EN + NE
    nepal.ts         Provinces, all 77 districts, launch-district local bodies
    queries.ts       Every Supabase call in the app
    supabase.ts      Client + error formatting
    types.ts         Domain types
    utils.ts         Dates, money, Nepali numerals, phone validation
  routes/            One file per screen
  router.tsx         Route tree
supabase/
  migrations/        The database, in order
  functions/         Edge functions (send-notifications: email/SMS sender;
                     sync-brevo-contacts: keeps the marketing list current)
docs/TESTING.md      Manual test script for the beta
```

## Adding a skill

Insert a row in `skills` (id, `name_en`, `name_ne`, emoji, `sort_order`) - the home grid,
filters and profile picker all read from that table, so nothing in the code needs changing.

## Costs

Everything here fits the Supabase and Vercel free tiers: 500 MB database, 1 GB storage,
100 GB bandwidth. That covers a few thousand users comfortably. Email adds nothing on Brevo's
free tier (300/day).

SMS is the one line item that is not free - roughly NPR 1-2 per message through a Nepali
gateway like Sparrow, and closer to NPR 7 through Twilio. That is why it defaults to off, is
opt-in per user, and never fires for chat messages. Leave `SMS_PROVIDER` unset and the whole
SMS path stays dormant.

## Not built yet (deliberately)

Phone (OTP) verification, payments via Khalti/eSewa, map view, and web push notifications.
Each is a Phase 2 item in the roadmap; the schema leaves room for all of them.
