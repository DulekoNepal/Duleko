import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Award,
  Bell,
  Briefcase,
  CalendarCheck,
  CheckCheck,
  MessageCircle,
  Sparkles,
  Star,
  ThumbsUp,
  UserCheck,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { Button } from "@/components/ui/button";
import { CardSkeleton, EmptyState } from "@/components/ui/states";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { NOTIFICATIONS_PAGE, listNotifications, markAllRead, markNotificationRead } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { cn, formatDayLabel, formatNumber, relativeTime, toDateKey } from "@/lib/utils";

// An icon per kind, each carrying the tone of its news - amber for
// something wanting attention, green for something settled, red for
// something that fell through.
//
// "message" notifications never reach this list - they drive the Chats
// tab badge instead (listNotifications excludes that kind entirely) -
// but it is mapped so nothing can render without an icon.
type IconTone = "brand" | "green" | "amber" | "slate";

const TONE_CLASS: Record<IconTone, string> = {
  brand: "bg-brand-50 text-brand-700",
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-500",
};

const KIND_ICON: Record<string, { icon: LucideIcon; tone: IconTone }> = {
  request: { icon: Briefcase, tone: "amber" },
  accepted: { icon: ThumbsUp, tone: "brand" },
  declined: { icon: XCircle, tone: "slate" },
  confirmed: { icon: CalendarCheck, tone: "green" },
  completed: { icon: Award, tone: "green" },
  cancelled: { icon: AlertTriangle, tone: "amber" },
  review: { icon: Star, tone: "amber" },
  friend_request: { icon: UserPlus, tone: "brand" },
  friend_accepted: { icon: UserCheck, tone: "green" },
  welcome: { icon: Sparkles, tone: "brand" },
  message: { icon: MessageCircle, tone: "brand" },
};

export function NotificationsScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Paged: the list only grows, and nobody needs every alert they have
  // ever had loaded to read the ones from this morning.
  const notifications = useInfiniteQuery({
    queryKey: ["notifications", profile?.id],
    queryFn: ({ pageParam }) => listNotifications(profile!.id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length < NOTIFICATIONS_PAGE ? undefined : all.length),
    enabled: Boolean(profile?.id),
  });

  // Live updates: new rows arrive over the realtime channel while the screen is open.
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${profile.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", profile.id] });
          queryClient.invalidateQueries({ queryKey: ["unread", profile.id] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  const readAll = useMutation({
    mutationFn: () => markAllRead(profile!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread"] });
    },
  });

  const readOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread"] });
    },
  });

  const items = notifications.data?.pages.flat() ?? [];
  const unreadCount = items.filter((n) => !n.is_read).length;
  const visible = filter === "unread" ? items.filter((n) => !n.is_read) : items;

  // Grouped by day, so a long list reads as "today, yesterday, before"
  // rather than one undifferentiated column of rows.
  const groups: Array<{ day: string; label: string; rows: typeof items }> = [];
  for (const n of visible) {
    const day = toDateKey(new Date(n.created_at));
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.rows.push(n);
    else groups.push({ day, label: formatDayLabel(n.created_at, lang), rows: [n] });
  }

  function openTarget(n: (typeof items)[number]) {
    if (!n.is_read) readOne.mutate(n.id);
    if (n.kind === "friend_request" || n.kind === "friend_accepted") {
      navigate({ to: "/friends" });
    } else if (n.kind === "welcome") {
      navigate({ to: "/profile" });
    } else if (n.related_profile_id) {
      navigate({ to: "/chat/$otherId", params: { otherId: n.related_profile_id } });
    } else if (n.engagement_id) {
      navigate({ to: "/work" });
    }
  }

  if (!profile) return <SignInRequiredScreen title={t("notifications")} />;

  return (
    <>
      <AppHeader
        title={t("notifications")}
        subtitle={unreadCount > 0 ? t("unreadCount", { count: formatNumber(unreadCount, lang) }) : undefined}
        right={
          unreadCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => readAll.mutate()} loading={readAll.isPending}>
              <CheckCheck className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t("markAllRead")}</span>
            </Button>
          ) : undefined
        }
      />
      <PageContainer>
        {/* All / Unread, with the count on the tab that has one - the
            fastest way to answer "what still needs me?" */}
        <div className="mb-4 inline-flex w-full rounded-xl bg-slate-100 p-1" role="tablist">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
              )}
            >
              {f === "all" ? t("filterAll") : t("filterUnread")}
              {f === "unread" && unreadCount > 0 && (
                <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {formatNumber(unreadCount, lang)}
                </span>
              )}
            </button>
          ))}
        </div>

        {notifications.isLoading ? (
          <CardSkeleton count={4} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-8 w-8" />}
            title={filter === "unread" ? t("noUnread") : t("noNotifications")}
          />
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.day}>
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {group.label}
                </h2>
                <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {group.rows.map((n) => (
                    <li key={n.id} className="border-b border-slate-100 last:border-0">
                      <button
                        type="button"
                        onClick={() => openTarget(n)}
                        className={cn(
                          "relative flex w-full gap-3 p-3.5 text-left transition-colors duration-200 hover:bg-slate-50",
                          !n.is_read && "bg-brand-50/40",
                        )}
                      >
                        {/* Unread gets an edge marker rather than a whole
                            tinted card - readable at a glance, quiet when
                            most of the list is unread. */}
                        {!n.is_read && (
                          <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-brand-600" />
                        )}
                        <NotificationIcon kind={n.kind} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span
                              className={cn(
                                "truncate",
                                n.is_read ? "font-medium text-slate-700" : "font-semibold text-slate-900",
                              )}
                            >
                              {lang === "ne" ? n.title_ne : n.title_en}
                            </span>
                            <span className="shrink-0 text-xs text-slate-400">
                              {relativeTime(n.created_at, lang)}
                            </span>
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-sm text-slate-500">
                            {lang === "ne" ? n.body_ne : n.body_en}
                          </span>
                        </span>
                        {!n.is_read && (
                          <span
                            aria-label={t("filterUnread")}
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600"
                          />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {notifications.hasNextPage && (
              <div className="flex justify-center pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  loading={notifications.isFetchingNextPage}
                  onClick={() => notifications.fetchNextPage()}
                >
                  {t("loadMore")}
                </Button>
              </div>
            )}
          </div>
        )}
      </PageContainer>
    </>
  );
}

/** The little tinted square that carries a notification's kind. */
function NotificationIcon({ kind }: { kind: string }) {
  const { icon: Icon, tone } = KIND_ICON[kind] ?? { icon: Bell, tone: "slate" as const };
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
        TONE_CLASS[tone],
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

