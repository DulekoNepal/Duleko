import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { AlertTriangle } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { GuestModeProvider, readGuestMode, persistGuestMode } from "@/hooks/use-guest-mode";
import { useI18n } from "@/lib/i18n";
import { isSupabaseConfigured } from "@/lib/supabase";
import { AuthScreen } from "@/routes/AuthScreen";
import { OnboardingScreen } from "@/routes/OnboardingScreen";
import { WelcomeChoiceScreen } from "@/components/duleko/WelcomeChoiceScreen";
import { SiteActionsProvider, type SiteActions } from "@/components/duleko/Site";
import { LandingPage } from "@/routes/site/LandingPage";
import {
  BottomNav,
  TopNav,
  useNotificationsBadgeSync,
} from "@/components/duleko/Layout";
import { WelcomeWalkthrough, hasSeenWalkthrough } from "@/components/duleko/WelcomeWalkthrough";
import { AutoShareLocation } from "@/components/duleko/AutoShareLocation";
import { FullPageLoader } from "@/components/ui/states";

/** Shown when .env.local has not been filled in yet - the most common first-run trip-up. */
function SetupScreen() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <AlertTriangle className="mb-4 h-10 w-10 text-amber-500" aria-hidden />
      <h1 className="text-lg font-semibold text-slate-900">{t("setupNeeded")}</h1>
      <p className="mt-2 text-sm text-slate-600">{t("setupHint")}</p>
      <pre className="mt-4 w-full overflow-x-auto rounded-xl bg-slate-900 px-4 py-3 text-left text-xs text-slate-100">
{`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...`}
      </pre>
    </div>
  );
}

/**
 * Auth gate. Three states: signed out, signed in without a profile, signed in
 * with a profile - the last one is the app proper.
 */
const WELCOMED_THIS_SESSION_KEY = "duleko_welcomed_this_session";

/** Fully static pages - no session, no Supabase call - that render for
 * anyone regardless of auth state. See the early-return below. */
const STATIC_PATHS = [
  "/privacy",
  "/terms",
  "/about",
  "/mission",
  "/motivation",
  "/individuals",
  "/businesses",
  "/partners",
  "/safety",
  "/registration-policy",
  "/welcome",
];

/** The Android app keeps its compact welcome screen; the web gets the full website. */
const IS_NATIVE_APP = Capacitor.isNativePlatform();

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { session, profile, loadingSession, loadingProfile, isPasswordRecovery, clearPasswordRecovery, signOut } =
    useSession();
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  // One realtime subscription for the whole app, regardless of how many nav
  // components (bottom bar, top bar) are mounted at once.
  useNotificationsBadgeSync();

  // Pre-account browsing: "Explore" persists across a refresh; "sign in
  // now" (from the choice screen, or from any gated action while browsing
  // as a guest) is transient - backing out of it just returns to wherever
  // it was triggered from.
  const [guestMode, setGuestMode] = useState(readGuestMode);
  const [authIntent, setAuthIntent] = useState<"signin" | "signup" | null>(null);

  // Routes someone can be sent straight to from outside the app.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isSharedProfileLink = pathname.startsWith("/worker/");
  const isStaticPage = STATIC_PATHS.includes(pathname);
  const navigate = useNavigate();

  function enterGuest() {
    setGuestMode(true);
    persistGuestMode(true);
    setAuthIntent(null);
  }

  // How the public website's buttons get into the app.
  const siteActions: SiteActions = {
    signedIn: Boolean(session),
    inApp: Boolean(session) || guestMode || IS_NATIVE_APP,
    back: () => {
      // TanStack keeps its position in history.state: above zero means
      // there's an in-app page to return to (Profile -> About -> Mission
      // unwinds one step at a time). A cold open has nowhere to go back to.
      const state = window.history.state as { __TSR_index?: number; idx?: number } | null;
      const idx = state?.__TSR_index ?? state?.idx;
      if (typeof idx === "number" && idx > 0) {
        window.history.back();
        return;
      }
      void navigate({ to: session ? "/profile" : "/" });
    },
    explore: (to = "/") => {
      if (!session) enterGuest();
      window.scrollTo({ top: 0 });
      void navigate({ to });
    },
    createProfile: () => {
      window.scrollTo({ top: 0 });
      if (session) {
        void navigate({ to: profile ? "/profile" : "/" });
        return;
      }
      setAuthIntent("signup");
      void navigate({ to: "/" });
    },
    signIn: () => {
      window.scrollTo({ top: 0 });
      if (session) {
        void navigate({ to: "/" });
        return;
      }
      // Same screen as "Create profile", on its sign-in step; its Back
      // returns to the website.
      setAuthIntent("signin");
      void navigate({ to: "/" });
    },
  };

  // A "Welcome back" toast once per app session (not on every screen change
  // within it), plus a one-time feature walkthrough for brand-new devices.
  useEffect(() => {
    if (!profile || isStaticPage) return;
    if (!hasSeenWalkthrough()) {
      setShowWalkthrough(true);
      return;
    }
    try {
      if (window.sessionStorage.getItem(WELCOMED_THIS_SESSION_KEY)) return;
      window.sessionStorage.setItem(WELCOMED_THIS_SESSION_KEY, "1");
    } catch {
      // No storage - just skip the once-per-session guard silently.
    }
    const firstName = profile.full_name?.split(/\s+/)[0] ?? "";
    toast(t("welcomeBack", { name: firstName }), "info");
    // Only meant to fire once, right when a profile first becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(profile), isStaticPage]);

  // Fully public, no matter what: an app-store reviewer or a signed-out
  // visitor following a shared link (Play Store listing, site footer) has
  // no session and shouldn't need one. Every check below this - Supabase
  // configured, session loading, signed in or not - is irrelevant to a
  // static page, so it renders before any of that runs rather than after.
  // (After every hook, so moving between a static page and the app doesn't
  // change the hook count.)
  if (isStaticPage) return <SiteActionsProvider value={siteActions}>{children}</SiteActionsProvider>;

  if (!isSupabaseConfigured) return <SetupScreen />;
  if (loadingSession) return <FullPageLoader label={t("loading")} />;

  // A recovery code just verified, which does sign them in - but that's a
  // side effect of the code, not the point of it. Keep them on the
  // password step regardless of session/profile state below, until they
  // actually set a new one.
  if (isPasswordRecovery) {
    return (
      <AuthScreen
        onBack={() => {
          clearPasswordRecovery();
          signOut();
        }}
      />
    );
  }

  if (!session) {
    if (authIntent) return <AuthScreen initialMode={authIntent} onBack={() => setAuthIntent(null)} />;
    // A shared profile link has to land on the profile. Showing a
    // first-time visitor the sign-up choice instead throws away the deep
    // link and makes every shared link look like a wall.
    if (!guestMode && !isSharedProfileLink) {
      if (IS_NATIVE_APP) {
        return <WelcomeChoiceScreen onExplore={enterGuest} onSignIn={() => setAuthIntent("signin")} />;
      }
      return (
        <SiteActionsProvider value={siteActions}>
          <LandingPage />
        </SiteActionsProvider>
      );
    }
    // Explored, hasn't signed in: the real app, read-only until they try
    // something that needs an account - see useGuestMode().requestSignIn.
    return (
      <GuestModeProvider value={{ isGuest: true, requestSignIn: () => setAuthIntent("signin") }}>
        <div className="min-h-dvh">
          <TopNav />
          {children}
          <BottomNav />
        </div>
      </GuestModeProvider>
    );
  }

  if (loadingProfile) return <FullPageLoader label={t("loading")} />;
  if (!profile) return <OnboardingScreen />;

  return (
    <div className="min-h-dvh">
      <TopNav />
      {children}
      <BottomNav />
      {showWalkthrough && <WelcomeWalkthrough onDone={() => setShowWalkthrough(false)} />}
      <AutoShareLocation />
    </div>
  );
}
