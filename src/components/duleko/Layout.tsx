import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Briefcase, Globe, Home, MessageCircle, Moon, Sun, User } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useIsDark, useThemeChoice } from "@/lib/theme";
import { useSession } from "@/hooks/use-session";
import { countUnread, countUnreadMessages } from "@/lib/queries";
import { setAppBadge } from "@/lib/native-android";
import { supabase } from "@/lib/supabase";
import { cn, formatNumber } from "@/lib/utils";
import dulekoMark from "@/assets/duleko-mark.webp";


/**
 * The one language switch, used everywhere (app headers, auth, onboarding,
 * the welcome screen, the website header): shows the language you are in
 * and flips on tap. Each screen shows it exactly once.
 */
/**
 * One content width and side gutter for every app screen - page content,
 * page titles and the chat card all use these, so the left and right edges
 * line up exactly from Home to Work, Alerts, Profile and Chats.
 */
export const PAGE_WIDTH = "max-w-5xl";
export const PAGE_GUTTER = "px-4 lg:px-6";

export function LanguageToggleButton({ className }: { className?: string }) {
  const { lang, toggleLang, t } = useI18n();
  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={lang === "en" ? t("switchToNepali") : t("switchToEnglish")}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-surface px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-50",
        className,
      )}
    >
      <Globe className="h-3.5 w-3.5" aria-hidden />
      {lang === "en" ? "EN" : "ने"}
    </button>
  );
}

/**
 * A small sun/moon that flips between Light and Dark - the icon shows the
 * look you're in. "Auto" (follow the phone) stays in Settings > Appearance.
 */
export function ThemeToggleButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const dark = useIsDark();
  const [, setTheme] = useThemeChoice();
  const Icon = dark ? Moon : Sun;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={t("darkMode")}
      title={t("darkMode")}
      onClick={(e) => {
        const box = e.currentTarget.getBoundingClientRect();
        setTheme(dark ? "light" : "dark", { x: box.left + box.width / 2, y: box.top + box.height / 2 });
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full p-1.5 text-slate-600 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-900",
        className,
      )}
    >
      <Icon key={String(dark)} className="h-3.5 w-3.5 animate-[theme-icon-in_0.4s_ease-out]" aria-hidden />
    </button>
  );
}

/**
 * The bars' one quiet control: theme and language in a single pill -
 * [sun | EN] - instead of two loose buttons. `themeClassName` hides the
 * theme half where it lives elsewhere (the website's drawer on phones).
 */
export function HeaderToggles({ className, themeClassName }: { className?: string; themeClassName?: string }) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center overflow-hidden rounded-full border border-slate-200 bg-surface",
        className,
      )}
    >
      <ThemeToggleButton className={cn("self-stretch rounded-none pl-2.5 pr-2", themeClassName)} />
      <span className={cn("h-3.5 w-px bg-slate-200", themeClassName)} aria-hidden />
      <LanguageToggleButton className="self-stretch rounded-none border-0 bg-transparent" />
    </div>
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
  title: React.ReactNode;
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
  const { t } = useI18n();
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-slate-200 pt-[var(--sat)] backdrop-blur",
        gradient ? "bg-gradient-to-r from-brand-50/60 via-surface/95 to-surface/95" : "bg-surface/95",
        // From md up the top bar (TopNav) is the one and only bar: this
        // becomes a plain page-title row that scrolls with the page, and a
        // header with nothing but the logo (Home) isn't shown at all.
        "md:static md:border-0 md:bg-transparent md:bg-none md:pt-0 md:backdrop-blur-none",
        logo && !subtitle && !right && !below && !back && "md:hidden",
      )}
    >
      <div className={cn("mx-auto py-2 md:pb-1 md:pt-5", PAGE_WIDTH, PAGE_GUTTER)}>
        <div className="flex items-center gap-3">
          {back}
          {leading}
          {logo ? (
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              {/* The top bar already shows the logo from md up. Like that
                  one, it goes to the website's home. */}
              <Link to="/" aria-label={t("siteHomeAria")} className="shrink-0 rounded-xl md:hidden">
                <img src={dulekoMark} alt="" className="h-8 w-8 rounded-xl object-cover shadow-sm" />
              </Link>
              {/* Still announced to screen readers/tab title - just not spelled out visually next to its own mark. */}
              <h1 className="sr-only">{title}</h1>
              {subtitle && <p className="truncate text-xs text-slate-500 md:text-sm">{subtitle}</p>}
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-slate-900 md:text-xl md:font-bold md:tracking-tight">
                {title}
              </h1>
              {subtitle && <p className="truncate text-xs text-slate-500 md:text-sm">{subtitle}</p>}
            </div>
          )}
          {right}
          {/* On every phone screen that uses this header - from md up they
              live in the top bar instead, so they're never shown twice. */}
          <HeaderToggles className="md:hidden" />
        </div>
        {below}
      </div>
    </header>
  );
}

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main className={cn("mx-auto w-full pb-20 pt-3 md:pb-10", PAGE_WIDTH, PAGE_GUTTER, className)}>
      {children}
    </main>
  );
}

// The search bar at the top of Home/Search is enough on its own - no separate
// nav item for it (it's still reachable via /search, just not pinned here).
const NAV = [
  { to: "/home", key: "navHome", icon: Home },
  { to: "/work", key: "navWork", icon: Briefcase },
  { to: "/notifications", key: "navAlerts", icon: Bell },
  { to: "/chats", key: "navChats", icon: MessageCircle },
  { to: "/profile", key: "navProfile", icon: User },
] as const;

/**
 * Unread counts for the two badged nav items. Read-only and safe to call from
 * multiple components at once - react-query dedupes by queryKey, so
 * BottomNav and TopNav (both always mounted, just CSS-hidden per
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
 * TopNav are both always mounted, giving each its own subscription
 * used to open two channels for the same topic, and Supabase's client
 * reuses the existing channel object for a repeated topic name - so the
 * second `.on()` call landed on an already-subscribed channel and threw.
 */
export function useNotificationsBadgeSync() {
  const { profile } = useSession();
  const queryClient = useQueryClient();
  const badges = useNavBadges();
  const total = profile?.id ? badges.notifications + badges.chats : 0;

  // Mirror the unread total onto the Android launcher icon.
  useEffect(() => {
    setAppBadge(total);
  }, [total]);

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

/** Phones: a fixed tab bar at the bottom, hidden once the top bar takes over. */
export function BottomNav() {
  const { t, lang } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const badges = useNavBadges();

  // A full-screen chat thread hides the tab bar, like a normal chat app.
  if (pathname.startsWith("/chat/")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-surface pb-[var(--sab)] md:hidden"
      aria-label={t("mainNavLabel")}
    >
      <div className="mx-auto flex max-w-3xl">
        {NAV.map(({ to, key, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          const badge = navBadgeFor(to, badges);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors duration-200",
                active ? "text-teal-700" : "text-slate-500",
              )}
            >
              <span className="relative">
                <Icon className="h-6 w-6" aria-hidden />
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
 * Tablets and up: a top navigation bar replaces the phone's bottom tab bar -
 * logo on the left, the five sections centred. From lg the links sit in the
 * exact middle of the bar (a 1fr | auto | 1fr grid); on a tablet they centre
 * in the room beside the logo so the two can never collide. It sits in the page
 * flow (sticky, not fixed), so nothing needs padding to clear it; screen
 * headers become plain title rows beneath it (see AppHeader), so it's the
 * only bar on desktop. It carries the language switch.
 */
export function TopNav() {
  const { t, lang } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const badges = useNavBadges();

  return (
    <header className="sticky top-0 z-40 hidden border-b border-slate-200 bg-surface/95 pt-[var(--sat)] backdrop-blur md:block">
      <div className="flex h-14 items-center gap-4 px-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-6">
        {/* The logo goes to the website's home (the Android app, which has
            no website, is sent on to /home by the "/" route). */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5 justify-self-start rounded-xl"
          aria-label={t("siteHomeAria")}
        >
          <img src={dulekoMark} alt="" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-base font-bold tracking-tight text-slate-900">{t("appName")}</span>
        </Link>
        <nav className="flex flex-1 items-center justify-center gap-1" aria-label={t("mainNavLabel")}>
          {NAV.map(({ to, key, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(`${to}/`);
            const badge = navBadgeFor(to, badges);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand-500",
                  active ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  {badge > 0 && (
                    <span className="absolute -right-2 -top-1.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
                      {formatNumber(badge > 9 ? "9+" : badge, lang)}
                    </span>
                  )}
                </span>
                <span className="whitespace-nowrap">{t(key)}</span>
              </Link>
            );
          })}
        </nav>
        {/* Right column: the theme and language switches - here on desktop
            instead of in each screen's header. It also balances the logo
            column so the links stay truly centred. */}
        <div className="flex shrink-0 justify-end">
          <HeaderToggles />
        </div>
      </div>
    </header>
  );
}
