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

const workRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/work",
  // ?job=<engagement id> opens that job's details straight away - the
  // landing spot for notifications about it.
  // ?from=notifications makes closing the sheet return there.
  validateSearch: (search: Record<string, unknown>): { job?: string; from?: "notifications" } => ({
    job: typeof search.job === "string" && search.job ? search.job : undefined,
    from: search.from === "notifications" ? "notifications" : undefined,
  }),
  component: lazyRouteComponent(() => import("@/routes/WorkScreen"), "WorkScreen"),
});

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notifications",
  component: lazyRouteComponent(() => import("@/routes/NotificationsScreen"), "NotificationsScreen"),
});

export type ProfileTab = "overview" | "calendar" | "settings" | "about";

const PROFILE_TABS: ProfileTab[] = ["overview", "calendar", "settings", "about"];

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

const moderationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/moderation",
  component: lazyRouteComponent(() => import("@/routes/ModerationScreen"), "ModerationScreen"),
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
  notificationsRoute,
  profileRoute,
  friendsRoute,
  chatRoute,
  chatsRoute,
  moderationRoute,
  privacyRoute,
  aboutRoute,
  founderRoute,
  missionRoute,
  individualsRoute,
  businessesRoute,
  partnersRoute,
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
