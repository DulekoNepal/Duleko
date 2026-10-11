<div align="center">

<img src="public/apple-touch-icon.png" alt="Duleko" width="88" height="88" />

# Duleko

**Find skilled people near you in Nepal, or get found for what you do.**

A bilingual (English / नेपाली) local skills marketplace. Workers list what they can do and where
they are, people who need work find them or post a job, both sides agree a price, and both rate
each other afterwards. Built for Kapilvastu first, mobile-first, and designed to run entirely on
free tiers.

[![Website](https://img.shields.io/badge/web-duleko.com-15803d?style=flat-square)](https://www.duleko.com)
[![Google Play](https://img.shields.io/badge/Android-Google%20Play-3ddc84?style=flat-square&logo=googleplay&logoColor=white)](https://play.google.com/store/apps/details?id=com.duleko.app)
![Android app](https://img.shields.io/badge/app-v1.2%20(code%206)-0f172a?style=flat-square)
![React 19](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ecf8e?style=flat-square&logo=supabase&logoColor=white)
![Capacitor 8](https://img.shields.io/badge/Capacitor-8-119eff?style=flat-square&logo=capacitor&logoColor=white)

[Website](https://www.duleko.com) · [Android app](https://play.google.com/store/apps/details?id=com.duleko.app) · [Quick start](#quick-start) · [Architecture](#architecture) · [Database](#database-and-migrations) · [Android](#android-app)

</div>

---

## Contents

- [What Duleko does](#what-duleko-does)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Project layout](#project-layout)
- [Database and migrations](#database-and-migrations)
- [How the core flows work](#how-the-core-flows-work)
- [Privacy and security model](#privacy-and-security-model)
- [Notifications: in-app, email, SMS, phone](#notifications-in-app-email-sms-phone)
- [Android app](#android-app)
- [Website and SEO](#website-and-seo)
- [Deployment](#deployment)
- [Scripts](#scripts)

---

## What Duleko does

Duleko connects people who need a job done with people who can do it, locally.

**For workers**
- Create a profile listing your skills, service area, and availability.
- Get discovered by location and skill, or respond to jobs people post.
- Agree a price directly with the customer.
- Build a reputation through ratings after each job.

**For people who need work done**
- Browse and search workers by skill and place.
- Or post a job and let workers come to you.
- Agree a price, get the work done, then rate the worker.

**Across the app**
- Fully bilingual: English and नेपाली, switchable at any time.
- Mobile-first UI, also shipped as an Android app.
- Two-sided ratings: both parties rate each other once the job is finished.
- Starts with Kapilvastu and is built so other districts can be added.
- Runs on free tiers (Vercel + Supabase) so it costs almost nothing to operate.

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19, Vite, TypeScript |
| Routing and data | TanStack Router, TanStack Query |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (Postgres, Auth, Storage, Realtime) |
| Security | Postgres Row Level Security (RLS) |
| Mobile | Capacitor 8 (Android) |
| Hosting | Vercel (web), Google Play (Android) |

## Architecture

```
┌──────────────────────────┐       ┌───────────────────────────┐
│  Web app (React + Vite)  │       │  Android app (Capacitor)  │
│  duleko.com on Vercel    │       │  wraps the same web build │
└────────────┬─────────────┘       └─────────────┬─────────────┘
             │         supabase-js (anon key)    │
             └──────────────────┬────────────────┘
                                ▼
                  ┌───────────────────────────┐
                  │          Supabase         │
                  │  Auth · Postgres + RLS    │
                  │  Storage · Realtime       │
                  └───────────────────────────┘
```

- The browser talks to Supabase directly. There is no custom API server to run.
- Authorization lives in the database: every table is protected by RLS policies.
- The Android app is the same React build packaged with Capacitor, so web and mobile share one codebase.
- TanStack Query handles caching and refetching; Realtime pushes live updates (for example new messages or job status changes).

## Quick start

### Prerequisites

- Node.js 20 or newer
- npm (or your preferred package manager)
- A free [Supabase](https://supabase.com) project

### Setup

```bash
# 1. Clone and install
git clone <your-repo-url> duleko
cd duleko
npm install

# 2. Configure environment
cp .env.example .env
# then fill in the values (see below)

# 3. Apply database migrations (see "Database and migrations")

# 4. Run the dev server
npm run dev
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |

Only the anon key belongs in the frontend. Never put the `service_role` key in a `VITE_` variable
or commit it to the repo.

## Project layout

```
.
├── android/              # Capacitor Android project
├── public/               # Static assets, icons, robots.txt, sitemap
├── src/
│   ├── components/       # Shared UI components
│   ├── routes/           # TanStack Router route files
│   ├── lib/              # Supabase client, helpers, i18n
│   ├── hooks/            # Data hooks (TanStack Query)
│   └── locales/          # English and Nepali translations
├── supabase/
│   └── migrations/       # SQL migrations, applied in order
├── capacitor.config.ts
├── vite.config.ts
└── package.json
```

> Folder names above describe the intended structure; adjust to match the repository if anything differs.

## Database and migrations

All schema changes are SQL files in `supabase/migrations/`, applied in filename order.

**Option A: Supabase CLI (recommended)**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Option B: SQL editor**

Open the Supabase dashboard, go to SQL Editor, and run each migration file in order.

Guidelines:
- Never edit a migration that has already been applied; add a new one instead.
- Every new table must have RLS enabled and explicit policies.
- Keep storage buckets private unless the files are meant to be public (for example profile photos).

## How the core flows work

**1. Sign up and profile**
A user signs up, then chooses to offer skills, find workers, or both. Workers add skills, area,
and a short description.

**2. Discovery**
Customers search workers by skill and location, or post a job with a description, place, and
budget idea.

**3. Agreeing a price**
Worker and customer settle the price directly in the app. Duleko does not process payments; the
agreed amount is recorded so both sides have a shared reference.

**4. Completion and ratings**
Once the job is done, both sides rate each other. Ratings appear on public profiles and feed
search ranking.

## Privacy and security model

- **Row Level Security everywhere.** Users can only read and write rows they are allowed to; the
  database enforces this, not the client.
- **Contact details are protected.** Phone numbers and other private fields are not exposed
  publicly and are shared only as the flow requires.
- **Least privilege keys.** The frontend uses the anon key only. Privileged operations run
  server-side (Supabase functions or database triggers).
- **Private storage by default.** Uploads are scoped per user with storage policies.
- **Minimal data.** Only what the marketplace needs is collected.
- **Reporting.** Users can report profiles or jobs that look abusive or fraudulent.

If you find a security issue, please report it privately to the maintainers rather than opening a
public issue.

## Notifications: in-app, email, SMS, phone

Duleko reaches people on the channel they actually use.

| Channel | Used for |
| --- | --- |
| In-app | Live updates via Supabase Realtime (new job, price offer, accepted, rating request) |
| Email | Account emails and non-urgent updates |
| SMS | Important alerts for users who are rarely in the app |
| Phone | Phone-number based sign-in and contact for users who prefer calls |

Channels are opt-in where possible, and in-app notifications are always the source of truth.

## Android app

The Android app is the same React build wrapped with [Capacitor](https://capacitorjs.com).

- **Google Play:** [com.duleko.app](https://play.google.com/store/apps/details?id=com.duleko.app)
- **Current version:** v1.2 (version code 6)
- **App id:** `com.duleko.app`

### Build and run

```bash
# Build the web app and copy it into the Android project
npm run build
npx cap sync android

# Open in Android Studio
npx cap open android
```

From Android Studio you can run on a device or emulator, or build a signed release bundle (AAB)
for Google Play.

### Releasing a new version

1. Bump `versionCode` and `versionName` in `android/app/build.gradle`.
2. `npm run build && npx cap sync android`.
3. Build a signed AAB in Android Studio.
4. Upload it in the Google Play Console and roll out.

Keep your signing keystore and its passwords out of the repository.

## Website and SEO

- Live at [duleko.com](https://www.duleko.com).
- Per-page titles, descriptions, and Open Graph tags.
- `sitemap.xml` and `robots.txt` served from `public/`.
- Language-aware content so both English and नेपाली pages can be indexed.
- Fast, mobile-first pages, which matters on slower networks.

## Deployment

**Web (Vercel)**

1. Import the repo into Vercel.
2. Framework preset: Vite. Build command `npm run build`, output directory `dist`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Project Settings, Environment Variables.
4. Add a rewrite so client-side routes resolve to `index.html` (SPA fallback).
5. Point `duleko.com` at the project in the Domains tab.

**Backend (Supabase)**

- Apply migrations with `supabase db push`.
- Set the Auth site URL and redirect URLs to your production domain and the Android app scheme.
- Configure email and SMS providers under Auth settings.

**Android**

See [Releasing a new version](#releasing-a-new-version).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and create a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run the linter |
| `npx cap sync android` | Copy the web build and plugins into the Android project |
| `npx cap open android` | Open the Android project in Android Studio |
| `npx supabase db push` | Apply pending migrations to the linked project |

---

<div align="center">

Made in Nepal 🇳🇵 · [duleko.com](https://www.duleko.com)

</div>
