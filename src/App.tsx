import { AlertTriangle } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useI18n } from "@/lib/i18n";
import { isSupabaseConfigured } from "@/lib/supabase";
import { AuthScreen } from "@/routes/AuthScreen";
import { OnboardingScreen } from "@/routes/OnboardingScreen";
import { BottomNav } from "@/components/duleko/Layout";
import { FullPageLoader } from "@/components/ui/states";

/** Shown when .env.local has not been filled in yet — the most common first-run trip-up. */
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
 * with a profile — the last one is the app proper.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { session, profile, loadingSession, loadingProfile } = useSession();

  if (!isSupabaseConfigured) return <SetupScreen />;
  if (loadingSession) return <FullPageLoader label={t("loading")} />;
  if (!session) return <AuthScreen />;
  if (loadingProfile) return <FullPageLoader label={t("loading")} />;
  if (!profile) return <OnboardingScreen />;

  return (
    <div className="min-h-dvh">
      {children}
      <BottomNav />
    </div>
  );
}
