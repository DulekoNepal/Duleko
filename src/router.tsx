import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
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
import { PrivacyPolicyScreen } from "@/routes/PrivacyPolicyScreen";
import { AboutScreen } from "@/routes/AboutScreen";
import { MissionScreen } from "@/routes/MissionScreen";
import { MotivationScreen } from "@/routes/MotivationScreen";
import { RegistrationPolicyScreen } from "@/routes/RegistrationPolicyScreen";
import { TermsOfUseScreen } from "@/routes/TermsOfUseScreen";

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
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

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
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
  component: PrivacyPolicyScreen,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: AboutScreen,
});

const missionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mission",
  component: MissionScreen,
});

const motivationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/motivation",
  component: MotivationScreen,
});

const registrationPolicyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/registration-policy",
  component: RegistrationPolicyScreen,
});

const termsOfUseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/terms",
  component: TermsOfUseScreen,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
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
  missionRoute,
  motivationRoute,
  registrationPolicyRoute,
  termsOfUseRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
