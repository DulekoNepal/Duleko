import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Briefcase, Globe, Home, MessageCircle, User } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { countUnread, countUnreadMessages } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { cn, formatNumber } from "@/lib/utils";
import dulekoMark from "@/assets/duleko-mark.png";

/** Shared width for the desktop sidebar and the left inset it leaves on content. */
export const SIDEBAR_WIDTH_CLASS = "md:pl-60";

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
            "rounded-full px-2.5 py-1 transition-colors duration-200",
            lang === code ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
          )}
        >
          {code === "en" ? "EN" : "नेपाली"}
        </button>
      ))}
    </div>
  );
}

/**
 * Compact one-tap language switch, small enough to sit in a header
 * alongside whatever else that screen already puts in `right` (a share
 * icon, a filter toggle, "mark all read"). Shows the language you are
 * currently in and flips on tap - the full two-segment picker below is
 * for the handful of screens with room to spare and a reason to make
 * the choice explicit (auth, onboarding, the welcome screen).
 */
export function LanguageToggleButton({ className }: { className?: string }) {
  const { lang, toggleLang, t } = useI18n();
  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={lang === "en" ? t("switchToNepali") : t("switchToEnglish")}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-50",
        className,
      )}
    >
      <Globe className="h-3.5 w-3.5" aria-hidden />
      {lang === "en" ? "EN" : "ने"}
    </button>
  );
}

export function AppHeader({
  title,
  subtitle,
  right,
  back,
  leading,
  below,
  gradient,
  logo = false,
}: {
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  back?: React.ReactNode;
  leading?: React.ReactNode;
  /** An extra row under the title/subtitle - e.g. Home's rating/trust line. */
  below?: React.ReactNode;
  /** A faint brand-tinted wash instead of plain white - reserved for the Home greeting, so the rest of the app stays neutral. */
  gradient?: boolean;
  /** Home only: the brand mark itself instead of a text title - the app's
   * name in wordmark form doesn't need to also be spelled out next to it. */
  logo?: boolean;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-slate-200 backdrop-blur",
        gradient ? "bg-gradient-to-r from-brand-50/60 via-white/95 to-white/95" : "bg-white/95",
      )}
    >
      <div className="mx-auto max-w-4xl px-4 py-3 md:py-4">
        <div className="flex items-center gap-3">
          {back}
          {leading}
          {logo ? (
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <img src={dulekoMark} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm" />
              {/* Still announced to screen readers/tab title - just not spelled out visually next to its own mark. */}
              <h1 className="sr-only">{title}</h1>
              {subtitle && <p className="truncate text-xs text-slate-500 md:text-sm">{subtitle}</p>}
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold text-slate-900 md:text-xl">{title}</h1>
              {subtitle && <p className="truncate text-xs text-slate-500 md:text-sm">{subtitle}</p>}
            </div>
          )}
          {right}
          {/* Always present, on every screen that uses this header - not
              something you have to remember to wire up per route, and
              not something a screen can accidentally leave out. */}
          <LanguageToggleButton />
        </div>
        {below}
      </div>
    </header>
  );
}

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main className={cn("mx-auto w-full max-w-4xl px-4 pb-28 pt-4 md:pb-10", className)}>
      {children}
    </main>
  );
}

// The search bar at the top of Home/Search is enough on its own - no separate
// nav item for it (it's still reachable via /search, just not pinned here).
const NAV = [
  { to: "/", key: "navHome", icon: Home },
  { to: "/work", key: "navWork", icon: Briefcase },
  { to: "/notifications", key: "navAlerts", icon: Bell },
  { to: "/chats", key: "navChats", icon: MessageCircle },
  { to: "/profile", key: "navProfile", icon: User },
] as const;

/**
 * Unread counts for the two badged nav items. Read-only and safe to call from
 * multiple components at once - react-query dedupes by queryKey, so
 * BottomNav and DesktopSidebar (both always mounted, just CSS-hidden per
 * breakpoint) share one cached result instead of firing duplicate requests.
 */
function useNavBadges() {
  const { profile } = useSession();

  const unread = useQuery({
    queryKey: ["unread", profile?.id],
    queryFn: () => countUnread(profile!.id),
    enabled: Boolean(profile?.id),
    refetchInterval: 60_000,
  });

  // Message notifications drive the Chats badge instead of Alerts - kept
  // as a separate count so the two badges never affect each other.
  const unreadMessages = useQuery({
    queryKey: ["unread-messages", profile?.id],
    queryFn: () => countUnreadMessages(profile!.id),
    enabled: Boolean(profile?.id),
    refetchInterval: 60_000,
  });

  return { notifications: unread.data ?? 0, chats: unreadMessages.data ?? 0 };
}

/**
 * Live badge updates the instant a notification arrives, from anywhere in
 * the app - not just while the Notifications/Chats screen itself is open.
 * Mount exactly once (in AppShell) - unlike useNavBadges, a realtime channel
 * isn't safe to open from multiple components at once: since BottomNav and
 * DesktopSidebar are both always mounted, giving each its own subscription
 * used to open two channels for the same topic, and Supabase's client
 * reuses the existing channel object for a repeated topic name - so the
 * second `.on()` call landed on an already-subscribed channel and threw.
 */
export function useNotificationsBadgeSync() {
  const { profile } = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`notifications-badge:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${profile.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["unread", profile.id] });
          queryClient.invalidateQueries({ queryKey: ["unread-messages", profile.id] });
          queryClient.invalidateQueries({ queryKey: ["notifications", profile.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);
}

function navBadgeFor(to: (typeof NAV)[number]["to"], badges: { notifications: number; chats: number }) {
  if (to === "/notifications") return badges.notifications;
  if (to === "/chats") return badges.chats;
  return 0;
}

/** Phones/small tablets: a fixed tab bar, hidden once the sidebar takes over. */
export function BottomNav() {
  const { t, lang } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const badges = useNavBadges();

  // A full-screen chat thread hides the tab bar, like a normal chat app.
  if (pathname.startsWith("/chat/")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-3xl">
        {NAV.map(({ to, key, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const badge = navBadgeFor(to, badges);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors duration-200",
                active ? "text-teal-700" : "text-slate-500",
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

/**
 * Tablets and up: a persistent left sidebar replaces the bottom tab bar, so
 * navigation reads as a real desktop app rather than a stretched phone UI.
 * Pair with SIDEBAR_WIDTH_CLASS on the content wrapper so nothing sits under it.
 */
export function DesktopSidebar() {
  const { t, lang } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const badges = useNavBadges();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-200 bg-white md:flex">
      <Link to="/" className="flex items-center gap-2.5 px-5 py-5">
        <img src={dulekoMark} alt="" className="h-8 w-8 rounded-lg object-cover" />
        <span className="text-lg font-semibold text-slate-900">{t("appName")}</span>
      </Link>
      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {NAV.map(({ to, key, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const badge = navBadgeFor(to, badges);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                active ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="flex-1">{t(key)}</span>
              {badge > 0 && (
                <span className="min-w-5 rounded-full bg-red-500 px-1.5 text-center text-[11px] font-bold leading-5 text-white">
                  {formatNumber(badge > 9 ? "9+" : badge, lang)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
