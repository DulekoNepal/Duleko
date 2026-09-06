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
`can_view_contact()`. A number is invisible until that person has accepted or confirmed
work with you. Blocking is mutual and enforced in the RLS policies themselves, so a
blocked person disappears from search, profiles, and reviews.

### Notifications
Database triggers write notification rows on every status change and new review, in both
languages. The notifications screen subscribes over Supabase Realtime, and the bottom nav
polls the unread count.

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
supabase/migrations/ The database, in order
docs/TESTING.md      Manual test script for the beta
```

## Adding a skill

Insert a row in `skills` (id, `name_en`, `name_ne`, emoji, `sort_order`) - the home grid,
filters and profile picker all read from that table, so nothing in the code needs changing.

## Costs

Everything here fits the Supabase and Vercel free tiers: 500 MB database, 1 GB storage,
100 GB bandwidth. That covers a few thousand users comfortably.

## Not built yet (deliberately)

In-app chat, phone (OTP) verification, payments via Khalti/eSewa, map view, and push
notifications. Each is a Phase 2 item in the roadmap; the schema leaves room for all of them.
