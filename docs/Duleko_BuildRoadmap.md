# Duleko MVP - Development Roadmap (4 Weeks)

## OVERVIEW
**Goal**: Deploy a working MVP with real users by Week 4  
**Effort**: ~4-6 hours/day (solo development)  
**Cost**: $0 (all free tier)  
**Success Metric**: 10+ real users creating profiles and requesting work

---

## WEEK 1: FOUNDATION & SETUP
*Goal: Get codebase clean, deployed to staging, ready for development*

### Days 1-2: Code Cleanup
**Monday & Tuesday**
- [ ] Create new GitHub branch `mvp-refactor`
- [ ] Remove Lovable dependencies from `package.json`
  ```bash
  npm uninstall @lovable.dev/*
  npm uninstall @tanstack/react-start
  npm install  # Reinstall without them
  ```
- [ ] Delete Lovable-specific config files:
  - `.lovable/` directory
  - `AGENTS.md`
  - Any Lovable env vars
- [ ] Keep all Supabase migrations (already solid ✓)
- [ ] Keep all current components (tested ✓)
- [ ] Test that app still runs: `npm run dev`
- **Commit**: "refactor: remove lovable dependencies"

### Days 3-4: Supabase & Environment
**Wednesday & Thursday**
- [ ] Go to https://supabase.com → Sign up (free)
- [ ] Create new project:
  - Name: `duleko`
  - Region: Asia Pacific (Singapore) [closest to Nepal]
  - Plan: Free
- [ ] Wait for project to initialize (~2 min)
- [ ] In Supabase dashboard → SQL Editor:
  - Copy/paste ALL migrations from `./supabase/migrations/`
  - Run migrations in order (they handle ordering)
  - Verify tables created: profiles, skills, work_engagements, etc.
- [ ] Get Supabase credentials:
  - Project Settings → API → Copy `URL` and `anon key`
- [ ] Create `.env.local` in project root:
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key-here
  ```
- [ ] Test locally:
  ```bash
  npm run dev
  # Should not get "missing env" errors
  ```
- **Commit**: "chore: add supabase configuration"

### Days 5: Deploy to Vercel (Staging)
**Friday**
- [ ] Push code to GitHub: `git push origin mvp-refactor`
- [ ] Go to https://vercel.com → Sign in with GitHub
- [ ] Click "Add New..." → "Project"
- [ ] Select your duleko repo
- [ ] Add environment variables:
  - `VITE_SUPABASE_URL` = (from Supabase)
  - `VITE_SUPABASE_ANON_KEY` = (from Supabase)
- [ ] Click Deploy (takes ~1-2 min)
- [ ] Your app is now live at: `https://your-project-name.vercel.app`
- [ ] Test login/signup (should work!)
- **Commit**: "chore: deploy staging to vercel"

### Week 1 Deliverable
✅ Clean codebase  
✅ Supabase database running  
✅ App deployed & live  
✅ No console errors  

---

## WEEK 2: SIMPLIFY UI & TEST CORE FLOWS
*Goal: Make sure MVP features work, simplify unnecessarily complex components*

### Days 1-2: Onboarding Flow
**Monday & Tuesday**
- [ ] Test entire signup → profile creation → skills selection
- [ ] From Vercel URL (not localhost):
  1. Click "Sign Up"
  2. Enter email & password
  3. Verify redirect to onboarding
  4. Add profile (name, location, availability)
  5. Select skills (should see 14 skills in English + Nepali)
  6. Verify profile created in Supabase DB
- [ ] Fix any bugs (mostly UI tweaks)
- [ ] Remove photo editor (keep simple image upload):
  - Delete `src/components/duleko/PhotoEditor.tsx`
  - Update profile component to use simple `<input type="file">`
- [ ] Simplify skill picker (already good, just test)
- **Commit**: "refactor: simplify onboarding flow"

### Days 3-4: Search & Discovery
**Wednesday & Thursday**
- [ ] Test search flow:
  1. Login as user
  2. Go to Home
  3. Click skill card (e.g., "Electrician")
  4. See list of nearby electricians
  5. Click on a profile → see full details
- [ ] Verify location filtering works (shows "nearby")
- [ ] Check sorting by rating
- [ ] Confirm phone numbers are hidden (show only after work accepted)
- [ ] Test bilingual: switch language, see all text in Nepali
- [ ] Fix any UI glitches
- **Commit**: "test: verify search & discovery flow"

### Days 5: Work Request Flow
**Friday**
- [ ] Test full work request lifecycle:
  1. Login as Employer (use demo account or create new)
  2. Find a worker profile
  3. Click "Request Work"
  4. Fill form: date, location, payment
  5. Logout, login as Worker
  6. See notification "New work request"
  7. Accept/Decline
  8. Logout, login as Employer
  9. See notification "Worker accepted"
  10. Click confirm
  11. See status change to "Confirmed"
- [ ] Test cancellation flow
- [ ] Verify notifications appear correctly
- **Commit**: "test: work request flow end-to-end"

### Week 2 Deliverable
✅ Onboarding works  
✅ Search/discovery tested  
✅ Work requests tested  
✅ Bilingual confirmed  
✅ No major bugs  

---

## WEEK 3: REVIEWS & POLISH
*Goal: Complete review system, add final touches, prepare for real users*

### Days 1-2: Reviews & Ratings
**Monday & Tuesday**
- [ ] Test review flow:
  1. Complete a work engagement (mark as done in DB manually if needed)
  2. Both users should see "Leave Review" button
  3. Submit 1-5 star rating + comment
  4. Refresh → verify rating appears on profile
  5. Test that average rating updates
- [ ] Verify review stats show on profile (count + average)
- [ ] Confirm both English & Nepali work for review text
- [ ] Test edge case: can't leave 2 reviews for same work
- **Commit**: "test: reviews & rating system"

### Days 3: Notifications & UX Polish
**Wednesday**
- [ ] Verify all notifications appear:
  - Work request received
  - Worker accepted/declined
  - Work confirmed
  - Work completed (reminder to review)
- [ ] Add loading states (spinners) on buttons
- [ ] Add success messages after actions
- [ ] Fix any mobile layout issues
- [ ] Test on real phone (iOS/Android) if possible
- [ ] Ensure fonts render correctly in Nepali
- **Commit**: "refactor: improve notifications & UX"

### Days 4: Testing with Multiple Users
**Thursday**
- [ ] Create 5 test accounts:
  - 3 workers (electrician, plumber, farm worker)
  - 2 employers
- [ ] Do complete workflow:
  - Employer 1 → Request work from Worker 1
  - Worker 1 → Accept
  - Employer 1 → Confirm
  - Both → Leave reviews
  - Check ratings updated
- [ ] Verify all notifications sent
- [ ] Check Supabase logs for errors
- **Commit**: "test: multi-user workflow"

### Days 5: Security & Privacy Check
**Friday**
- [ ] Verify phone numbers NOT visible on public profiles
- [ ] Confirm they only appear after work accepted
- [ ] Test blocking: block a user, they should be hidden
- [ ] Test reporting: report a user (just verify form submits)
- [ ] Ensure logged-out users can't see sensitive info
- [ ] Check Supabase RLS policies are working
- [ ] Verify no data leaks in console logs
- **Commit**: "test: security & privacy checks"

### Week 3 Deliverable
✅ Reviews working & ratings calculating  
✅ Notifications complete  
✅ Multi-user flows tested  
✅ Mobile responsive  
✅ Security verified  
✅ Ready for beta users  

---

## WEEK 4: BETA LAUNCH & MONITORING
*Goal: Invite first real users, monitor closely, iterate*

### Days 1-2: Final Checks & Documentation
**Monday & Tuesday**
- [ ] Create user guide (simple 1-page PDF):
  - How to sign up
  - How to add skills
  - How to find workers
  - How to request work
  - How to leave reviews
- [ ] Set up Supabase monitoring:
  - Go to Supabase → Reports
  - Enable usage tracking
  - Set alerts if approaching limits
- [ ] Create feedback form (Google Form or Typeform):
  - Simplicity (1-5)
  - Usefulness (1-5)
  - What to improve
  - Free text comments
- [ ] Prepare launch email to beta users:
  ```
  Subject: Duleko Beta - Help Find Local Workers

  Hi [Name],

  We're launching Duleko - a simple app to find local workers 
  and get work done.

  Sign up here: [URL]
  Guide: [PDF link]

  We'd love your feedback!

  Questions? Reply to this email.
  
  - Duleko team
  ```

### Days 3-4: Beta User Recruitment & Launch
**Wednesday & Thursday**
- [ ] Start with ~15-20 users from Kapilvastu area
  - Invite the workers you know
  - Invite potential employers (farmers, households)
  - Mix of tech-savvy & less tech-savvy
- [ ] Send sign-up link: https://duleko.vercel.app
- [ ] Provide user guide + support contact
- [ ] Be available for help (WhatsApp, call)
- [ ] Monitor Supabase logs for errors
- [ ] Check Vercel analytics for page loads
- [ ] Gather initial feedback

### Days 5: Monitoring & First Iteration
**Friday**
- [ ] Review feedback:
  - What's confusing?
  - What's missing?
  - What works great?
- [ ] Check metrics:
  - # of profiles created
  - # of work requests
  - # of completed jobs
  - # of reviews
- [ ] Fix top 3 complaints
  - Merge to main branch
  - Vercel auto-deploys
  - Users see fix immediately
- [ ] Plan Week 2 based on feedback
- **Commit**: "chore: first beta iteration fixes"

### Week 4 Deliverable
✅ MVP live with real users  
✅ 15-20 beta testers active  
✅ User feedback collected  
✅ Monitoring in place  
✅ First iteration complete  

---

## QUICK STATUS CHECKS (DAILY)

### Every Workday:
**15 minutes in morning:**
- [ ] Check Vercel: any deploy errors?
- [ ] Check Supabase: any database errors?
- [ ] Check Discord/Slack: any user messages?
- [ ] Check test account: can I still login?

**30 minutes at end of day:**
- [ ] Commit all work to GitHub
- [ ] Update Trello/Notion board with progress
- [ ] List blockers for tomorrow
- [ ] Test one feature end-to-end

---

## TOOLS YOU'LL NEED

1. **Code Editor**: VS Code (free)
2. **GitHub**: Account (free)
3. **Vercel**: Account (free)
4. **Supabase**: Account (free)
5. **Browser DevTools**: Chrome/Firefox (free)
6. **Postman** (optional): Test API calls
7. **Figma** (optional): Quick UI sketches

---

## COMMON GOTCHAS & SOLUTIONS

| Problem | Solution |
|---------|----------|
| "Supabase key not found" error | Check `.env.local` has correct values |
| Migrations fail to run | Make sure Supabase project initialized (wait 2 min) |
| Vercel deploy fails | Check `.env` vars added in Vercel settings |
| Phone numbers visible | Check RLS policies enabled in Supabase |
| Bilingual text shows English only | Verify i18n provider wrapping app |
| Mobile layout broken | Run `npm run build` locally, test on phone |
| Notifications not appearing | Check Supabase triggers firing (SQL logs) |
| User can't login | Check auth table in Supabase, verify email confirmed |

---

## SUCCESS SIGNS

**Week 1:**
- ✅ App deploys without errors
- ✅ Can login/signup from live URL

**Week 2:**
- ✅ Can create complete profile
- ✅ Can search and find workers
- ✅ Can request work

**Week 3:**
- ✅ Can complete full workflow (request → accept → confirm → review)
- ✅ Ratings calculate correctly
- ✅ Bilingual works perfectly

**Week 4:**
- ✅ 10+ real users active
- ✅ 5+ work requests created
- ✅ 2+ reviews submitted
- ✅ Users report it's "simple" (primary goal!)
- ✅ No major bugs

---

## POST-MVP: WHAT'S NEXT

Once MVP succeeds:
- [ ] Week 5: In-app messaging (Supabase Realtime)
- [ ] Week 6: Payment integration (Khalti / eSewa)
- [ ] Week 7: Phone verification (Twilio)
- [ ] Week 8: App store release (Expo)
- [ ] Ongoing: Scale to more districts

---

## KEY METRICS TO TRACK

**Daily:**
- Active users
- Profiles created
- Work requests sent
- Reviews left

**Weekly:**
- Retention rate (% active after 1 week)
- Completion rate (% requests → completed)
- Average rating given
- Support tickets/feedback

**Monthly:**
- Total signups
- Geographic spread
- User satisfaction (survey)
- Infrastructure costs ($0 target!)

---

## SUPPORT & HELP

**If stuck:**
1. Check Supabase logs: Dashboard → Logs
2. Check Vercel logs: Vercel dashboard → Deployments → Function logs
3. Check browser console: DevTools → Console
4. Check your code: VS Code → Problems panel
5. Ask AI/Claude: Share error message + code

**Common commands:**
```bash
# See all logs locally
npm run dev -- --debug

# Check what's in production
vercel logs

# Reset Supabase locally (if using local)
supabase reset

# Build for production
npm run build

# Test production build locally
npm run preview
```

---

## FINAL THOUGHTS

**You've already done 80% of the work:**
- Database schema: ✓
- Auth system: ✓
- Core UI: ✓
- Bilingual: ✓
- Review system: ✓
- Notifications: ✓

**This 4-week plan is just:**
- Clean up (5%)
- Deploy (5%)
- Test (5%)
- Collect feedback (5%)

**You're much closer than you think. Start Week 1. You've got this! 🚀**

---

## WEEK-BY-WEEK TIME ESTIMATE

| Week | Task | Hours | Status |
|------|------|-------|--------|
| 1 | Setup + Deploy | 15 hrs | Foundation |
| 2 | Test Core Flows | 12 hrs | Verify |
| 3 | Polish + Security | 12 hrs | Refine |
| 4 | Beta Launch | 10 hrs | Launch |
| **Total** | **MVP Complete** | **49 hrs** | **$0** |

**That's ~6 hours/day for one month. You're all set!**

---

## GO TIME 🚀

- [ ] Week 1 starts Monday
- [ ] GitHub repo cleaned
- [ ] Supabase account ready
- [ ] Vercel account ready
- [ ] First deploy by Friday

**Let's build something that actually helps people find work!**
