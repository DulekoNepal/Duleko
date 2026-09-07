import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { listNotifications, markAllRead, markNotificationRead } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { cn, relativeTime } from "@/lib/utils";

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

  const notifications = useQuery({
    queryKey: ["notifications", profile?.id],
    queryFn: () => listNotifications(profile!.id),
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

  const items = notifications.data ?? [];
  const hasUnread = items.some((n) => !n.is_read);

  if (!profile) return <SignInRequiredScreen title={t("notifications")} />;

  return (
    <>
      <AppHeader
        title={t("notifications")}
        right={
          hasUnread ? (
            <Button variant="ghost" size="sm" onClick={() => readAll.mutate()}>
              <CheckCheck className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t("markAllRead")}</span>
            </Button>
          ) : undefined
        }
      />
      <PageContainer>
        {notifications.isLoading ? (
          <CardSkeleton count={4} />
        ) : items.length === 0 ? (
          <EmptyState icon={<Bell className="h-8 w-8" />} title={t("noNotifications")} />
        ) : (
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
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
                  }}
                  className={cn(
                    "flex w-full gap-3 rounded-2xl border p-3.5 text-left transition-colors duration-200",
                    n.is_read
                      ? "border-slate-200 bg-white"
                      : "border-brand-200 bg-brand-50/60 hover:bg-brand-50",
                  )}
                >
                  <NotificationIcon kind={n.kind} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-slate-900">
                        {lang === "ne" ? n.title_ne : n.title_en}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {relativeTime(n.created_at, lang)}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm text-slate-600">
                      {lang === "ne" ? n.body_ne : n.body_en}
                    </span>
                  </span>
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                </button>
              </li>
            ))}
          </ul>
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

