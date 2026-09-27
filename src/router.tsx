import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { AppShell } from "@/App";
import { HomeScreen } from "@/routes/HomeScreen";
import { SearchScreen, type SearchFilters } from "@/routes/SearchScreen";
import { WorkerScreen } from "@/routes/WorkerScreen";
import { WorkScreen } from "@/routes/WorkScreen";
import { NotificationsScreen } from "@/routes/NotificationsScreen";
import { ProfileScreen } from "@/routes/ProfileScreen";
import { FriendsScreen } from "@/routes/FriendsScreen";
import { ChatScreen } from "@/routes/ChatScreen";
import { ChatsScreen } from "@/routes/ChatsScreen";
import { ModerationScreen } from "@/routes/ModerationScreen";
import { PrivacyPage } from "@/routes/site/PrivacyPage";
import { AboutPage } from "@/routes/site/AboutPage";
import { FounderPage } from "@/routes/site/FounderPage";
import { MissionPage } from "@/routes/site/MissionPage";
import { ForBusinessesPage, ForIndividualsPage, PartnersPage } from "@/routes/site/AudiencePages";
import { SafetyPage } from "@/routes/site/SafetyPage";
import { MotivationPage } from "@/routes/site/MotivationPage";
import { RegistrationPolicyPage } from "@/routes/site/RegistrationPolicyPage";
import { LandingPage } from "@/routes/site/LandingPage";
import { TermsPage } from "@/routes/site/TermsPage";
import { syncSeoTags } from "@/lib/seo";

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
  component: SearchScreen,
});

const workerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/worker/$workerId",
  component: WorkerScreen,
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
  component: WorkScreen,
});

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notifications",
  component: NotificationsScreen,
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
  component: ProfileScreen,
});

const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/friends",
  component: FriendsScreen,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat/$otherId",
  component: ChatScreen,
});

const chatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chats",
  component: ChatsScreen,
});

const moderationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/moderation",
  component: ModerationScreen,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/privacy",
  component: PrivacyPage,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: AboutPage,
});

// Each team member's own page: /about/sanjay-gupta, ...
const founderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about/$slug",
  component: FounderPage,
});

const missionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mission",
  component: MissionPage,
});

const individualsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/individuals",
  component: ForIndividualsPage,
});

const businessesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/businesses",
  component: ForBusinessesPage,
});

const partnersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/partners",
  component: PartnersPage,
});

const safetyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/safety",
  component: SafetyPage,
});

const motivationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/motivation",
  component: MotivationPage,
});

const registrationPolicyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/registration-policy",
  component: RegistrationPolicyPage,
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
  component: TermsPage,
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
