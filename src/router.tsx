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

const routeTree = rootRoute.addChildren([
  indexRoute,
  searchRoute,
  workerRoute,
  workRoute,
  notificationsRoute,
  profileRoute,
  friendsRoute,
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
