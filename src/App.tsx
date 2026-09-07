import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { GuestModeProvider, readGuestMode, persistGuestMode } from "@/hooks/use-guest-mode";
import { useI18n } from "@/lib/i18n";
import { isSupabaseConfigured } from "@/lib/supabase";
import { AuthScreen } from "@/routes/AuthScreen";
import { OnboardingScreen } from "@/routes/OnboardingScreen";
import { WelcomeChoiceScreen } from "@/components/duleko/WelcomeChoiceScreen";
import {
  BottomNav,
  DesktopSidebar,
  SIDEBAR_WIDTH_CLASS,
  useNotificationsBadgeSync,
} from "@/components/duleko/Layout";
import { WelcomeWalkthrough, hasSeenWalkthrough } from "@/components/duleko/WelcomeWalkthrough";
import { FullPageLoader } from "@/components/ui/states";
import { cn } from "@/lib/utils";

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { session, profile, loadingSession, loadingProfile } = useSession();
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  // One realtime subscription for the whole app, regardless of how many nav
  // components (bottom bar, desktop sidebar) are mounted at once.
  useNotificationsBadgeSync();

  // Pre-account browsing: "Explore" persists across a refresh; "sign in
  // now" (from the choice screen, or from any gated action while browsing
  // as a guest) is transient - backing out of it just returns to wherever
  // it was triggered from.
  const [guestMode, setGuestMode] = useState(readGuestMode);
  const [authIntent, setAuthIntent] = useState(false);

  function enterGuest() {
    setGuestMode(true);
    persistGuestMode(true);
    setAuthIntent(false);
  }

  // A "Welcome back" toast once per app session (not on every screen change
  // within it), plus a one-time feature walkthrough for brand-new devices.
  useEffect(() => {
    if (!profile) return;
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
  }, [Boolean(profile)]);

  if (!isSupabaseConfigured) return <SetupScreen />;
  if (loadingSession) return <FullPageLoader label={t("loading")} />;

  if (!session) {
    if (authIntent) return <AuthScreen onBack={() => setAuthIntent(false)} />;
    if (!guestMode) return <WelcomeChoiceScreen onExplore={enterGuest} onSignIn={() => setAuthIntent(true)} />;
    // Explored, hasn't signed in: the real app, read-only until they try
    // something that needs an account - see useGuestMode().requestSignIn.
    return (
      <GuestModeProvider value={{ isGuest: true, requestSignIn: () => setAuthIntent(true) }}>
        <div className={cn("min-h-dvh", SIDEBAR_WIDTH_CLASS)}>
          <DesktopSidebar />
          {children}
          <BottomNav />
        </div>
      </GuestModeProvider>
    );
  }

  if (loadingProfile) return <FullPageLoader label={t("loading")} />;
  if (!profile) return <OnboardingScreen />;

  return (
    <div className={cn("min-h-dvh", SIDEBAR_WIDTH_CLASS)}>
      <DesktopSidebar />
      {children}
      <BottomNav />
      {showWalkthrough && <WelcomeWalkthrough onDone={() => setShowWalkthrough(false)} />}
    </div>
  );
}
