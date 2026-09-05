# Duleko MVP - Tech Stack Quick Reference

## 🏗️ ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│                    (Mobile or Desktop)                           │
└────────────────┬──────────────────────────────┬──────────────────┘
                 │                              │
                 │                              │
        ┌────────▼─────────┐          ┌────────▼──────────┐
        │   Vercel CDN     │          │   Vercel Edge     │
        │  (Frontend Dist) │          │  (API Routes)     │
        └────────┬─────────┘          └────────┬──────────┘
                 │                              │
                 └──────────────┬───────────────┘
                                │
                   ┌────────────▼────────────┐
                   │  Supabase (Backend)     │
                   │  ✓ PostgreSQL           │
                   │  ✓ Auth                 │
                   │  ✓ Realtime             │
                   │  ✓ Storage              │
                   │  ✓ Edge Functions       │
                   └────────────┬────────────┘
                                │
                 ┌──────────────┼──────────────┐
                 │              │              │
        ┌────────▼──────┐  ┌────▼─────┐  ┌───▼────────┐
        │  PostgreSQL   │  │ Storage  │  │ Functions  │
        │  Database     │  │ (Avatars)│  │(Triggers)  │
        │               │  │          │  │            │
        │ • Profiles    │  │ 1GB Free │  │ Automated  │
        │ • Skills      │  │ (enough) │  │ Logic      │
        │ • Availability│  │          │  │            │
        │ • Engagements │  │          │  │            │
        │ • Reviews     │  │          │  │            │
        └───────────────┘  └──────────┘  └────────────┘
```

---

## 🎯 TECH STACK - ONE PAGE

| Layer | Technology | Why | Cost |
|-------|-----------|-----|------|
| **Frontend Build** | Vite | Fast, modern, minimal config | Free |
| **UI Framework** | React 19 | Latest, hooks-based | Free |
| **Routing** | TanStack Router | File-based routing, tree-shakeable | Free |
| **State Management** | TanStack Query | Server state, caching, sync | Free |
| **Styling** | Tailwind CSS | Utility-first, mobile-first | Free |
| **Components** | shadcn/ui | Copy-paste, customizable | Free |
| **Forms** | React Hook Form + Zod | Lightweight, validated | Free |
| **Database** | Supabase (PostgreSQL) | Hosted, RLS, realtime | Free (500MB) |
| **Authentication** | Supabase Auth | Built-in, OAuth-ready | Free |
| **File Storage** | Supabase Storage | 1GB free for avatars | Free (1GB) |
| **Frontend Deploy** | Vercel | Zero-config, instant deploy | Free |
| **API/Backend** | Supabase Edge Fn | Serverless functions | Free (500k/mo) |
| **Real-time** | Supabase Realtime | WebSocket subscriptions | Free |
| **Monitoring** | Supabase Logs | Database & auth logs | Free |
| **i18n** | Custom (already built) | English + Nepali | Free |
| **Icons** | Lucide React | SVG icons, tree-shakeable | Free |
| **Notifications** | Custom (in DB) | Stored notifications | Free |
| **Maps** | OpenStreetMap/Google | Location features | Free/Paid |

---

## 💾 DATABASE SCHEMA (Current ✓)

```sql
-- Core Tables (Already Implemented)
profiles              -- User profiles (name, location, rating, avatar)
├── id (uuid)
├── user_id (auth link)
├── full_name
├── about
├── location (province, district, municipality, ward, locality)
├── is_available (boolean)
├── rating (numeric 1-5)
├── rating_count (integer)
└── created_at, updated_at

skills               -- Predefined skill list (bilingual)
├── id (text: 'electrician', 'plumber', etc)
├── name_en
├── name_ne
├── emoji
└── sort_order

user_skills         -- Junction: which skills each user offers
├── profile_id (fk)
├── skill_id (fk)
└── created_at

availability        -- Day-level availability per user
├── id
├── profile_id (fk)
├── day (date)
├── status ('available' or 'booked')
└── engagement_id (fk)

work_engagements    -- Work requests & jobs
├── id
├── employer_profile_id (who needs work)
├── worker_profile_id (who does work)
├── skill_id (fk)
├── title (job description)
├── work_date (date)
├── location_text (where)
├── payment_amount
├── status (pending → confirmed → completed)
└── created_at, updated_at

reviews             -- Ratings after job completion
├── id
├── engagement_id (fk)
├── reviewer_profile_id
├── reviewee_profile_id
├── rating (1-5)
├── comment
└── created_at

notifications       -- In-app notifications
├── id
├── profile_id (fk)
├── kind ('request', 'accepted', 'confirmed', etc)
├── title
├── body
├── engagement_id (fk)
├── is_read
└── created_at

profile_contacts    -- Phone numbers (encrypted, private)
├── profile_id (pk)
├── phone
└── created_at

blocked_users       -- User blocking
├── blocker_profile_id (fk)
├── blocked_profile_id (fk)
└── created_at

reports             -- User reports/flags
├── id
├── reporter_profile_id (fk)
├── reported_profile_id (fk)
├── reason
├── details
└── created_at
```

---

## 🔐 SECURITY FEATURES (Already Built ✓)

```
✓ Row-Level Security (RLS) - Users see only their data
✓ Auth middleware - Protected routes
✓ Phone number hidden - Until work accepted
✓ Profile visibility - Controlled RLS policies
✓ Reporting system - Flag abusive users
✓ Blocking system - Users can block each other
✓ Constraint checks - No self-hiring, self-reviewing
✓ Audit trail - All actions timestamped
✓ Soft delete patterns - Data preserved
```

---

## 📱 FRONTEND FEATURES (To Keep)

```
Home Screen
├── Greeting + Search
├── Browse skills grid
└── Workers available today

Search
├── Filter by skill
├── Filter by location (distance)
├── Sort by rating
└── View worker cards

Worker Profile
├── Name + avatar + rating
├── Skills listed
├── Bio/description
├── Availability calendar
└── Contact button

Work Request
├── Create request (skill, date, location, payment)
├── Worker accept/decline
├── Employer confirm
├── Mark complete

Reviews
├── Leave star rating + comment
├── See past reviews
└── Update rating (triggers re-calculation)

Notifications
├── Work requests
├── Acceptances/declines
├── Confirmations
├── Completion reminders
└── Mark as read

My Work
├── Active engagements
├── Completed jobs
├── Pending reviews
└── Calendar view
```

---

## 🚀 DEPLOYMENT FLOW

### Local Development
```bash
npm install
npm run dev
# → http://localhost:5173
```

### Staging (Optional)
```
GitHub branch: staging
↓
Vercel auto-deploys to staging.duleko.vercel.app
```

### Production
```
GitHub branch: main
↓
Vercel auto-deploys to duleko.vercel.app
↓
Supabase production environment
```

---

## 📊 FREE TIER SPECIFICATIONS

### Supabase
- **Database**: 500 MB (compress avatars to stay under)
- **Storage**: 1 GB (plenty for profile pics)
- **Auth users**: Unlimited
- **API calls**: Unlimited (1M+ per day possible)
- **Realtime**: Limited to 100 concurrent connections (fine for MVP)
- **Edge Functions**: 500k invocations/month (plenty)

### Vercel
- **Deployments**: Unlimited
- **Bandwidth**: 100 GB/month (way more than needed)
- **Serverless functions**: 100GB/month compute
- **Custom domain**: Free (add duleko.com later)

### Total Limits for MVP
- ~1000 users: ✓ All free tier
- ~5000 users: ✓ Still free (maybe optimize images)
- ~10000+ users: Consider paid tier ($10-50/mo)

---

## 🎬 GETTING STARTED (30-MINUTE VERSION)

### If starting from scratch:
```bash
# 1. Create new Vite + React project (2 min)
npm create vite@latest duleko -- --template react
cd duleko
npm install

# 2. Add dependencies (2 min)
npm install @supabase/supabase-js @tanstack/react-query @tanstack/react-router react-hook-form zod tailwindcss

# 3. Copy components from current project (10 min)
# → Copy src/components/duleko/
# → Copy src/lib/i18n.tsx
# → Copy src/integrations/supabase/

# 4. Setup Supabase (5 min)
# → Create account at supabase.com
# → Create project
# → Run migrations from ./supabase/migrations/

# 5. Add env vars (2 min)
echo "VITE_SUPABASE_URL=..." > .env.local
echo "VITE_SUPABASE_ANON_KEY=..." >> .env.local

# 6. Deploy to Vercel (5 min)
# → git push
# → vercel.com → Import
# → Done!
```

---

## 📈 GROWTH PATH

```
Week 1-2: MVP Built & Tested
  └─ Vercel + Supabase (Free Tier)

Week 3-4: Beta Launch (20 users, Kapilvastu)
  └─ Monitor Supabase usage
  └─ Collect feedback

Month 2: First Iterations
  └─ Small UI tweaks
  └─ Fix reported bugs
  └─ Still free tier

Month 3: Expand to 50-100 users
  └─ Monitor database size
  └─ Optimize images/queries
  └─ Still free tier

Month 4+: Scale Phase
  └─ If >5000 users → Supabase Pro ($10/mo)
  └─ Add Twilio SMS verification ($0.01/user)
  └─ Add payment processing (Khalti integration)
  └─ Monitor bandwidth (may exceed Vercel free at scale)
```

---

## 🎯 MVP SUCCESS = 

- Deploy by Week 3 ✓
- Zero infrastructure cost ✓
- Works on slow internet ✓
- Bilingual from day 1 ✓
- Real users finding work ✓
- Both user types (worker + employer) ✓
- Reviews & ratings working ✓
- Data safe & private ✓

**Then: Iterate based on user feedback.**

---

## 🔗 IMPORTANT LINKS

| Service | URL | Setup Time |
|---------|-----|-----------|
| Supabase | https://supabase.com | 5 min |
| Vercel | https://vercel.com | 5 min |
| GitHub | https://github.com | 5 min |
| Tailwind | https://tailwindcss.com | Included |
| React Query | https://tanstack.com/query | Included |
| TanStack Router | https://tanstack.com/router | Included |

---

## ✅ FINAL CHECKLIST

Before first users:
- [ ] Supabase project created + migrations run
- [ ] .env.local configured
- [ ] Vercel deployment working
- [ ] Login/signup flow tested
- [ ] Create profile flow tested
- [ ] Search & discovery works
- [ ] Request → Accept → Review flow tested
- [ ] Notifications trigger correctly
- [ ] Phone numbers hidden properly
- [ ] Blocking/reporting works
- [ ] Bilingual UI switches work
- [ ] Mobile layout responsive

**You're ready to launch!** 🚀
