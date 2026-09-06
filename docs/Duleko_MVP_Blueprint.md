# Duleko MVP - Fast Track Blueprint
## Build & Deploy in Free Tier (Complete Tech Stack)

---

## 🚀 RECOMMENDED TECH STACK (For Speed & Free Tier)

### **Frontend**
- **Framework**: React 19 + Vite (keep current setup)
- **Mobile**: Expo / React Native Web (progressive, browser-first for MVP)
- **UI Components**: shadcn/ui + Tailwind CSS (already implemented ✓)
- **State**: TanStack Query + Context API (keep current ✓)
- **Routing**: TanStack Router (keep current ✓)
- **Forms**: React Hook Form + Zod (keep current ✓)
- **i18n**: Custom i18n lib (keep current ✓)

### **Backend**
- **Database**: Supabase (PostgreSQL) - **FREE TIER: 500MB storage, unlimited API calls**
- **Auth**: Supabase Auth - **built-in, FREE**
- **File Storage**: Supabase Storage (avatars) - **FREE: 1GB**
- **Real-time**: Supabase Realtime subscriptions - **FREE**
- **Server Functions**: Supabase Edge Functions - **FREE TIER: 500k invocations/month**

### **Deployment**
- **Frontend**: Vercel - **FREE: Unlimited deployments, custom domain**
- **Alternative**: Netlify - **FREE: Same features**
- **Database**: Supabase Hosted - **FREE: All features included**

### **Monitoring & Errors**
- **Error Tracking**: Sentry (free plan) OR Supabase Logs
- **Analytics**: Vercel Analytics (free) OR Plausible (privacy-first, ~$9/mo)

### **SMS/Phone Verification** (when needed)
- **Option 1**: Twilio - $0.0075/SMS (pay-as-you-go, FREE trial credits)
- **Option 2**: Vonage/Nexmo - similar pricing
- **For MVP**: Start with manual verification or OTP via email

### **Maps** (location features)
- **Google Maps**: Free tier includes Geocoding + Distance Matrix (limited but sufficient)
- **Alternative**: OpenStreetMap + Nominatim (completely FREE)

---

## 📋 CURRENT CODEBASE ASSESSMENT

### ✅ KEEP (Production-Ready)
- Database schema (fully normalized, great RLS policies)
- Supabase auth + session handling
- Work engagement + notification system (with triggers!)
- Review & rating system
- i18n infrastructure (bilingual English/Nepali)
- UI components (shadcn) + styling
- Form validation (Zod)

### ⚠️ REFACTOR (Simplify for MVP)
| Current | Simplify For MVP | Reason |
|---------|-----------------|--------|
| TanStack Start (SSR) | Vite SPA | Faster dev, easier deployment |
| AI Photo functions | Simple image upload | Reduce complexity, use Supabase Storage directly |
| Lovable AI layer | Direct React code | Own the codebase, easier to modify |
| Photo Editor component | Basic cropper or skip | Keep it simple initially |

### 🗑️ REMOVE (Not MVP Critical)
- Lovable project config (if you want full control)
- Complex error reporting (use Sentry instead)
- Advanced photo editing (just upload + basic preview)
- Some unused Radix UI components (tree-shake)

---

## 🛠️ QUICK START: Setup & Deploy

### **Step 1: Clone & Clean Up (1 hour)**
```bash
# Copy your current project
git clone <your-repo>
cd duleko

# Remove Lovable dependencies
npm uninstall @lovable.dev/* lovable

# Remove TanStack Start, keep only Vite
npm uninstall @tanstack/react-start

# Keep these:
npm list | grep -E "@tanstack/react-router|react-query|supabase|tailwindcss"
```

### **Step 2: Supabase Setup (15 min - FREE)**
1. Go to [supabase.com](https://supabase.com) → Sign up
2. Create project (Free tier, region: closest to Nepal)
3. Run migrations from your `supabase/migrations/` folder
4. Set environment variables:
```env
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### **Step 3: Run Locally (10 min)**
```bash
npm install
npm run dev
# Visit http://localhost:5173
```

### **Step 4: Deploy to Vercel (5 min - FREE)**
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project
3. Add environment variables
4. Deploy (automatic on push)
5. Your app live at: `duleko.vercel.app`

---

## 📊 MVP SCOPE (Minimum Viable Features)

### **Phase 1: Core (Week 1-2)**
- [x] Sign up / Login (Supabase Auth)
- [x] Create profile (name, location, skills)
- [x] Add 1+ skills from predefined list
- [x] Set availability (available/not available)
- [x] Search nearby workers by skill
- [x] View worker profile + contact info
- [x] Direct message or call (phone number visible after accepting request)

### **Phase 2: Work Requests (Week 2-3)**
- [x] Create work request (date, skill, location, payment)
- [x] Worker accepts/declines
- [x] Employer confirms
- [x] Work marked complete
- [x] Both sides leave review (1-5 stars + comment)

### **Phase 3: Launch Ready (Week 3-4)**
- [x] Bilingual UI (English/Nepali)
- [x] Mobile-responsive (already done)
- [x] Basic reporting (block user, report abuse)
- [x] Notifications (for requests, reviews)
- [x] Privacy (phone only shown after accepting work)

### **Phase 4: Later (Post-MVP)**
- [ ] Phone verification (Twilio when budget allows)
- [ ] Chat in-app (Supabase Realtime)
- [ ] Ratings/reputation system improvements
- [ ] Payment processing (Khalti, eSewa)
- [ ] Advanced map features
- [ ] Worker categories/badges

---

## 🗂️ PROJECT STRUCTURE (After Refactor)

```
duleko/
├── public/
├── src/
│   ├── components/
│   │   ├── duleko/           # Custom Duleko components (keep)
│   │   └── ui/               # shadcn/ui (keep)
│   ├── lib/
│   │   ├── supabase/         # Supabase client (simplify)
│   │   ├── i18n.ts           # Bilingual setup (keep)
│   │   ├── types.ts          # New: simplified types
│   │   └── queries.ts        # New: centralized API calls
│   ├── routes/
│   │   ├── index.tsx         # Home (simplify)
│   │   ├── auth.tsx          # Login/Signup (keep)
│   │   ├── search.tsx        # Worker search (keep)
│   │   ├── profile.tsx       # User profile (simplify)
│   │   ├── work/
│   │   │   ├── requests.tsx  # My work requests
│   │   │   └── review.tsx    # Leave review
│   │   └── notifications.tsx # Alerts (keep)
│   ├── hooks/
│   │   ├── use-session.ts    # Auth context (keep)
│   │   └── use-location.ts   # Location (simplify)
│   ├── styles.css            # Tailwind (keep)
│   └── main.tsx              # Entry point
├── supabase/
│   ├── migrations/           # Keep current
│   └── config.toml
├── .env.example
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 📈 FREE TIER LIMITS & COSTS

| Service | Free Tier | Cost If Exceeded | MVP Use |
|---------|-----------|-----------------|---------|
| **Supabase** | 500MB DB + 1GB Storage | $10-25/mo | Unlimited API calls ✓ |
| **Vercel** | 100GB bandwidth/mo | $20+/mo | Frontend hosting ✓ |
| **Netlify** | 100GB bandwidth/mo | Pay-as-you-go | Alternative to Vercel ✓ |
| **Twilio SMS** | $15 trial | $0.0075/SMS | Phone verification (future) |
| **Sentry** | 5k errors/month | $29/mo | Error tracking (optional) |
| **Google Maps** | $200 free/month | $0.005-0.015/call | Location features ✓ |
| **OpenStreetMap** | Unlimited | Free | Map alternative ✓ |

**Total MVP Cost: $0/month** (all free tiers)  
**Recommended Later: ~$15-20/mo** (when scaling)

---

## 🚦 MIGRATION CHECKLIST

### Before Starting
- [ ] Backup current Supabase database (export SQL)
- [ ] Document all custom functions/triggers (already listed in migrations ✓)
- [ ] Test auth flow (login, signup, logout)
- [ ] Verify all routes work locally

### During Refactor
- [ ] Remove Lovable dependencies
- [ ] Keep TanStack Router (working great)
- [ ] Simplify photo upload (remove editor initially)
- [ ] Test search/filter functionality
- [ ] Verify notifications trigger correctly
- [ ] Test reviews & ratings

### Before Deployment
- [ ] Set Supabase environment to production
- [ ] Enable RLS policies (already enabled ✓)
- [ ] Test SMS/email settings (if applicable)
- [ ] Add custom domain (optional)
- [ ] Setup automatic backups (Supabase → Settings)

### First Beta Test
- [ ] Invite 10-20 local users
- [ ] Test full workflow (signup → search → request → review)
- [ ] Collect feedback on UI/UX
- [ ] Monitor Supabase usage & logs
- [ ] Verify notifications work

---

## 🎯 NEXT STEPS (Week-by-Week)

### **Week 1: Setup & Refactor**
- Clean up code (remove Lovable)
- Deploy to Vercel (pre-production)
- Test entire flow locally
- Create onboarding guide for beta users

### **Week 2: Optimize & Polish**
- Fix any bugs from local testing
- Optimize images/assets for slow internet
- Add loading states & error messages
- Improve mobile responsiveness

### **Week 3: Beta Launch**
- Deploy to production
- Invite first 20 users from Kapilvastu
- Monitor server logs & performance
- Collect user feedback

### **Week 4: Iterate & Plan**
- Fix feedback-based issues
- Plan Phase 2 features (in-app chat, payments)
- Document lessons learned
- Plan scaling strategy

---

## 💡 MVP SUCCESS METRICS

Track these to decide if MVP works:
- **Adoption**: # of profiles created in Week 1-4
- **Engagement**: # of work requests per day
- **Completion**: % of requests that become completed work
- **Quality**: Average rating given by both sides
- **Retention**: % of users active after 2 weeks
- **Satisfaction**: User feedback on simplicity

**MVP is successful if:**
- At least 50+ profiles created in 2 weeks
- 1+ work request per day by Week 3
- 70%+ of requests reach completion
- Average rating > 4.0 stars
- Users find & contact each other easily

---

## 🔐 SECURITY CHECKLIST

- [x] Supabase RLS policies (already strong ✓)
- [x] Phone numbers hidden until work accepted
- [x] No sensitive data in logs
- [x] HTTPS enforced (Vercel default)
- [ ] Rate limiting (add if needed)
- [ ] Report/block functionality works
- [ ] Notifications don't leak personal info

---

## 🌐 INTERNATIONALIZATION (i18n)

Current setup supports English + Nepali:
```
// In app
const { t, lang } = useI18n();
t("namaste")  // "Namaste" or "नमस्ते"
```

**Bilingual Database:**
```sql
-- Skills table
name_en: "Electrician"
name_ne: "बिजुली मिस्त्री"

-- Profiles
full_name: (single field, user enters name)
```

No changes needed-already bilingual! Just ensure:
- [ ] All UI strings in `i18n.tsx`
- [ ] Skills have both `name_en` + `name_ne`
- [ ] Notifications respect user's language preference

---

## 📚 KEY FILES TO UNDERSTAND

| File | Purpose | Keep? |
|------|---------|-------|
| `src/lib/duleko.ts` | Core queries & helpers | Refactor to `queries.ts` |
| `src/lib/i18n.tsx` | Bilingual setup (22KB) | Keep, maybe split |
| `supabase/migrations/` | Database schema | Keep all |
| `src/integrations/supabase/` | Supabase client setup | Keep core, remove Lovable hooks |
| `src/components/duleko/` | Custom components | Keep & improve |
| `src/routes/` | Page components | Refactor & simplify |

---

## 🎓 LEARNING RESOURCES (If Needed)

- Supabase: https://supabase.com/docs
- React 19: https://react.dev/
- Vite: https://vitejs.dev/
- Vercel: https://vercel.com/docs
- TanStack Query: https://tanstack.com/query/

---

## ⚡ COMMANDS CHEAT SHEET

```bash
# Development
npm install
npm run dev

# Build
npm run build
npm run preview

# Lint
npm run lint
npm run format

# Supabase (if using local setup)
supabase start
supabase stop

# Deploy (automatic with GitHub)
git push origin main  # → Vercel auto-deploys
```

---

## 📞 SUPPORT & COMMON ISSUES

**Q: How do users find workers?**
A: Search by skill → See all nearby workers → Click profile → Call/contact directly

**Q: How do workers get paid?**
A: MVP: Direct agreement & cash. Phase 2: Add payment processing (Khalti, eSewa)

**Q: Can one person be worker + employer?**
A: Yes! Everyone can offer skills AND request work.

**Q: What if internet is slow?**
A: App is optimized for mobile + slow networks. Images are compressed, queries efficient.

**Q: Is data safe?**
A: Yes. Supabase RLS ensures users only see their own data unless shared.

---

## 🚀 YOU'RE READY TO BUILD!

**Time to Deploy MVP: 3-4 weeks (solo)**

Current codebase is 80% done. Focus on:
1. Simplify (remove Lovable layer)
2. Deploy (Vercel + Supabase)
3. Beta test (20 real users)
4. Iterate (fix feedback)
5. Scale (Phase 2 features)

**Total Cost: $0 (free tier)** ✓  
**Deployment: Automated** ✓  
**Time to Live: Days, not months** ✓

---

## 📝 QUESTIONS BEFORE START?

Let me know:
1. Timeline preference (weeks vs months)?
2. Do you want to keep React Web or pivot to React Native Expo immediately?
3. Budget for paid services later?
4. Team size (solo vs. with help)?
5. Any specific features blocking MVP?

**Next: Pick a week to start. You've got this!** 🚀
