import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Briefcase, Home, User } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { countUnread } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { cn, formatNumber } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div
      className={cn("inline-flex rounded-full bg-slate-100 p-0.5 text-xs font-medium", className)}
      role="group"
      aria-label="Language"
    >
      {(["en", "ne"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            "rounded-full px-2.5 py-1 transition-colors",
            lang === code ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
          )}
        >
          {code === "en" ? "EN" : "नेपाली"}
        </button>
      ))}
    </div>
  );
}

export function AppHeader({
  title,
  subtitle,
  right,
  back,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  back?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        {back}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main className={cn("mx-auto w-full max-w-3xl px-4 pb-28 pt-4", className)}>{children}</main>
  );
}

// The search bar at the top of Home/Search is enough on its own — no separate
// bottom-nav tab for it (it's still reachable via /search, just not pinned here).
const NAV = [
  { to: "/", key: "navHome", icon: Home },
  { to: "/work", key: "navWork", icon: Briefcase },
  { to: "/notifications", key: "navAlerts", icon: Bell },
  { to: "/profile", key: "navProfile", icon: User },
] as const;

export function BottomNav() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const queryClient = useQueryClient();

  const unread = useQuery({
    queryKey: ["unread", profile?.id],
    queryFn: () => countUnread(profile!.id),
    enabled: Boolean(profile?.id),
    refetchInterval: 60_000,
  });

  // Live badge updates the instant a notification arrives, from anywhere in
  // the app — not just while the Notifications screen itself is open.
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`notifications-badge:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${profile.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["unread", profile.id] });
          queryClient.invalidateQueries({ queryKey: ["notifications", profile.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  // A full-screen chat thread hides the tab bar, like a normal chat app.
  if (pathname.startsWith("/chat/")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-3xl">
        {NAV.map(({ to, key, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const badge = to === "/notifications" ? unread.data ?? 0 : 0;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-brand-700" : "text-slate-500",
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" aria-hidden />
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
                    {formatNumber(badge > 9 ? "9+" : badge, lang)}
                  </span>
                )}
              </span>
              {t(key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
