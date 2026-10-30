import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { AppShell } from "@/App";
import { HomeScreen } from "@/routes/HomeScreen";
import type { SearchFilters } from "@/routes/SearchScreen";
import { LandingPage } from "@/routes/site/LandingPage";
import { syncSeoTags } from "@/lib/seo";

// The public website and the app's Home - the two screens people land on -
// load up front. Every other screen is fetched the first time it is opened
// (or hovered, via defaultPreload), so first load no longer downloads the
// whole app.
const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

// "/" is the public website's home for everyone on the web. The Android
// app has no website, so it opens straight into the app's Home.
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    if (Capacitor.isNativePlatform()) throw redirect({ to: "/home", replace: true });
  },
  component: LandingPage,
});

// The app's Home (skills, nearby workers). Signed-out visitors browse it
// as guests.
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/home",
  component: HomeScreen,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  validateSearch: (search: Record<string, unknown>): SearchFilters => ({
    skill: typeof search.skill === "string" ? search.skill : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    district: typeof search.district === "string" ? search.district : undefined,
    day: typeof search.day === "string" ? search.day : undefined,
    available: search.available === true || search.available === "true" ? true : undefined,
    sort:
      search.sort === "rating" ||
      search.sort === "newest" ||
      search.sort === "relevance" ||
      search.sort === "nearest"
        ? search.sort
        : undefined,
  }),
  component: lazyRouteComponent(() => import("@/routes/SearchScreen"), "SearchScreen"),
});

const workerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/worker/$workerId",
  component: lazyRouteComponent(() => import("@/routes/WorkerScreen"), "WorkerScreen"),
});

export type WorkRole = "worker" | "employer";
export type WorkView = "active" | "offers" | "posts" | "history";

// Everything you're part of: the work you do and the work you hire for,
// each split into what's active, what's on the job board (offers you sent,
// posts you made) and history.
// ?role= and ?view= pick the side and the list (without ?role= it opens
// the side you last looked at). ?job=<engagement id> opens that job's
// details on top - where notifications about it land.
// ?from=notifications makes closing the sheet return there.
const workRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/work",
  validateSearch: (
    search: Record<string, unknown>,
  ): { role?: WorkRole; view?: WorkView; job?: string; from?: "notifications" } => ({
    role: search.role === "worker" || search.role === "employer" ? search.role : undefined,
    view:
      search.view === "offers" || search.view === "posts" || search.view === "history" ? search.view : undefined,
    job: typeof search.job === "string" && search.job ? search.job : undefined,
    from: search.from === "notifications" ? "notifications" : undefined,
  }),
  component: lazyRouteComponent(() => import("@/routes/WorkScreen"), "WorkScreen"),
});

// The job board: open work requests to browse, and posting one. What you
// posted and the offers you sent are tracked in My Work - the old
// ?tab=mine and ?tab=offers links lead there. ?district= and ?skill=
// narrow the list; without a district it starts from the area Home is
// showing.
const jobsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/jobs",
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: "mine" | "offers"; kind?: "offer"; district?: string; skill?: string } => ({
    tab: search.tab === "mine" || search.tab === "offers" ? search.tab : undefined,
    kind: search.kind === "offer" ? "offer" : undefined,
    district: typeof search.district === "string" && search.district ? search.district : undefined,
    skill: typeof search.skill === "string" && search.skill ? search.skill : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (search.tab === "mine") throw redirect({ to: "/work", search: { role: "employer", view: "posts" }, replace: true });
    if (search.tab === "offers") throw redirect({ to: "/work", search: { role: "worker", view: "offers" }, replace: true });
  },
  component: lazyRouteComponent(() => import("@/routes/JobsScreen"), "JobsScreen"),
});

// One work request - where its alerts and emails lead.
const jobRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/jobs/$jobId",
  component: lazyRouteComponent(() => import("@/routes/JobsScreen"), "JobScreen"),
});

// The map of skilled people and open work requests. ?show= picks one
// layer, ?skill= narrows both.
const mapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/map",
  validateSearch: (search: Record<string, unknown>): { show?: "people" | "jobs"; skill?: string } => ({
    show: search.show === "people" || search.show === "jobs" ? search.show : undefined,
    skill: typeof search.skill === "string" && search.skill ? search.skill : undefined,
  }),
  component: lazyRouteComponent(() => import("@/routes/MapScreen"), "MapScreen"),
});

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notifications",
  component: lazyRouteComponent(() => import("@/routes/NotificationsScreen"), "NotificationsScreen"),
});

export type ProfileTab = "overview" | "calendar" | "payments" | "settings" | "staff" | "about";

const PROFILE_TABS: ProfileTab[] = ["overview", "calendar", "payments", "settings", "staff", "about"];

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  // ?tab= keeps the open tab across Back - opening a Duleko page from the
  // About tab and coming back lands on About again, not Overview.
  validateSearch: (search: Record<string, unknown>): { tab?: ProfileTab } => ({
    tab:
      typeof search.tab === "string" && PROFILE_TABS.includes(search.tab as ProfileTab) && search.tab !== "overview"
        ? (search.tab as ProfileTab)
        : undefined,
  }),
  component: lazyRouteComponent(() => import("@/routes/ProfileScreen"), "ProfileScreen"),
});

const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/friends",
  component: lazyRouteComponent(() => import("@/routes/FriendsScreen"), "FriendsScreen"),
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat/$otherId",
  component: lazyRouteComponent(() => import("@/routes/ChatScreen"), "ChatScreen"),
});

const chatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chats",
  component: lazyRouteComponent(() => import("@/routes/ChatsScreen"), "ChatsScreen"),
});

// A worker's Duleko fees: what they owe, how to pay, their bills.
const feesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/fees",
  component: lazyRouteComponent(() => import("@/routes/FeesScreen"), "FeesScreen"),
});

// Staff: payments to check, Duleko's own accounts, who owes.
const staffFeesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff/fees",
  component: lazyRouteComponent(() => import("@/routes/StaffFeesScreen"), "StaffFeesScreen"),
});

// Staff: how Duleko is being used, and the website's numbers switch (6900).
const staffActivityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff/activity",
  component: lazyRouteComponent(() => import("@/routes/ActivityScreen"), "ActivityScreen"),
});

// Staff: the records behind one activity number (7500).
const staffActivityListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff/activity/$kind",
  validateSearch: (search: Record<string, unknown>): { range?: "all_time" | "last_30_days" } => ({
    range: search.range === "last_30_days" ? "last_30_days" : undefined,
  }),
  component: lazyRouteComponent(() => import("@/routes/ActivityDetailScreens"), "ActivityListScreen"),
});

// Staff: one call, work request, call deal or review, in full (7500).
const staffActivityItemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff/activity/$type/$itemId",
  component: lazyRouteComponent(() => import("@/routes/ActivityDetailScreens"), "ActivityItemScreen"),
});

// Staff: deals agreed over a call - disputes to settle first (8400).
export type CallDealsView = "disputed" | "waiting" | "settled" | "all";
const staffDealsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff/deals",
  validateSearch: (search: Record<string, unknown>): { view?: CallDealsView; range?: "last_30_days" } => ({
    view: search.view === "waiting" || search.view === "settled" || search.view === "all" ? search.view : undefined,
    range: search.range === "last_30_days" ? "last_30_days" : undefined,
  }),
  component: lazyRouteComponent(() => import("@/routes/CallDealsScreen"), "CallDealsScreen"),
});

// Staff: messages from the website's investor form (8500).
const staffInvestorsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff/investors",
  validateSearch: (search: Record<string, unknown>): { view?: "all" } => ({
    view: search.view === "all" ? "all" : undefined,
  }),
  component: lazyRouteComponent(() => import("@/routes/InvestorsScreen"), "InvestorsScreen"),
});

// Get verified: two buttons - ID check (KYC) and Duleko certification.
// ?step= opens one of them.
export type VerifyStep = "id" | "certificates";
const verifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify",
  validateSearch: (search: Record<string, unknown>): { step?: VerifyStep } => ({
    step: search.step === "id" || search.step === "certificates" ? search.step : undefined,
  }),
  component: lazyRouteComponent(() => import("@/routes/VerifyScreen"), "VerifyScreen"),
});

// Staff: ID checks waiting, approve (gives the badge) or reject.
const staffVerifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff/verify",
  component: lazyRouteComponent(() => import("@/routes/KycQueueScreen"), "KycQueueScreen"),
});

const moderationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/moderation",
  component: lazyRouteComponent(() => import("@/routes/ModerationScreen"), "ModerationScreen"),
});

// The Duleko notice board: staff post, everyone (guests too) reads.
const noticesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notices",
  component: lazyRouteComponent(() => import("@/routes/NoticesScreen"), "NoticeBoardScreen"),
});

// One notice - where its alert and its email both lead.
const noticeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notices/$noticeId",
  component: lazyRouteComponent(() => import("@/routes/NoticesScreen"), "NoticeScreen"),
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/privacy",
  component: lazyRouteComponent(() => import("@/routes/site/PrivacyPage"), "PrivacyPage"),
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: lazyRouteComponent(() => import("@/routes/site/AboutPage"), "AboutPage"),
});

// Each team member's own page: /about/sanjay-gupta, ...
const founderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about/$slug",
  component: lazyRouteComponent(() => import("@/routes/site/FounderPage"), "FounderPage"),
});

const missionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mission",
  component: lazyRouteComponent(() => import("@/routes/site/MissionPage"), "MissionPage"),
});

const individualsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/individuals",
  component: lazyRouteComponent(() => import("@/routes/site/AudiencePages"), "ForIndividualsPage"),
});

const businessesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/businesses",
  component: lazyRouteComponent(() => import("@/routes/site/AudiencePages"), "ForBusinessesPage"),
});

const partnersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/partners",
  component: lazyRouteComponent(() => import("@/routes/site/AudiencePages"), "PartnersPage"),
});

// Partnerships > Investors: "Would you like to invest in Duleko?" and its form.
const investRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invest",
  component: lazyRouteComponent(() => import("@/routes/site/InvestPage"), "InvestPage"),
});

const safetyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/safety",
  component: lazyRouteComponent(() => import("@/routes/site/SafetyPage"), "SafetyPage"),
});

const motivationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/motivation",
  component: lazyRouteComponent(() => import("@/routes/site/MotivationPage"), "MotivationPage"),
});

const registrationPolicyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/registration-policy",
  component: lazyRouteComponent(() => import("@/routes/site/RegistrationPolicyPage"), "RegistrationPolicyPage"),
});

// Old address of the website home for members; "/" is that page now.
const welcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/welcome",
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});

const termsOfUseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/terms",
  component: lazyRouteComponent(() => import("@/routes/site/TermsPage"), "TermsPage"),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  homeRoute,
  searchRoute,
  workerRoute,
  workRoute,
  jobsRoute,
  jobRoute,
  mapRoute,
  notificationsRoute,
  profileRoute,
  friendsRoute,
  chatRoute,
  chatsRoute,
  feesRoute,
  staffFeesRoute,
  staffActivityRoute,
  staffActivityListRoute,
  staffActivityItemRoute,
  staffDealsRoute,
  staffInvestorsRoute,
  verifyRoute,
  staffVerifyRoute,
  moderationRoute,
  noticesRoute,
  noticeRoute,
  privacyRoute,
  aboutRoute,
  founderRoute,
  missionRoute,
  individualsRoute,
  businessesRoute,
  partnersRoute,
  investRoute,
  safetyRoute,
  motivationRoute,
  registrationPolicyRoute,
  termsOfUseRoute,
  welcomeRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  // styles.css makes the page scroll smoothly (for in-page anchors and
  // back-to-top). A page change shouldn't animate from the old page's
  // position - open at the top, or right back where you were.
  scrollRestorationBehavior: "instant",
});

syncSeoTags(router.state.location.pathname);
router.subscribe("onResolved", ({ toLocation }) => syncSeoTags(toLocation.pathname));

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
