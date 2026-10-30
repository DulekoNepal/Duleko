import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Check, CheckCheck, CheckCircle2, MessageCircle, Search, Users, X } from "lucide-react";
import { FriendsPanel } from "./FriendsPanel";
import { VerifiedBadge } from "./VerifiedBadge";
import { Avatar } from "@/components/ui/avatar";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { usePresence } from "@/hooks/use-presence";
import {
  MESSAGES_PAGE,
  chatPairKey,
  getProfile,
  listConversations,
  listMessages,
  reconcileMessageNotifications,
} from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { cn, formatNumber, relativeTime } from "@/lib/utils";
import type { ConversationSummary } from "@/lib/types";

/**
 * Keeps the conversation list live. Call it once per screen - it opens a
 * realtime channel, and the same topic twice would clash. Listening to every
 * event, not just INSERT, keeps the Seen tick and the "removed" preview
 * current without opening the thread; reactions come from their own table.
 */
export function useConversationsLive(profileId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!profileId) return;
    // A burst of changes (a thread marked read, a reaction, a message)
    // becomes one refetch, not one each.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => queryClient.invalidateQueries({ queryKey: ["conversations", profileId] }), 250);
    };
    const channel = supabase
      .channel(`conversations:${profileId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `profile_a=eq.${profileId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `profile_b=eq.${profileId}` },
        refresh,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, refresh)
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [profileId, queryClient]);
}

/**
 * Starts loading a thread before it's opened - on hover, focus or the
 * first touch of its row - so by the time the screen slides in, its code,
 * the person and their latest messages are usually already here.
 */
export function usePrefetchThread(myProfileId: string | undefined) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return (otherId: string) => {
    if (!myProfileId) return;
    void router.preloadRoute({ to: "/chat/$otherId", params: { otherId } }).catch(() => undefined);
    void queryClient.prefetchQuery({
      queryKey: ["messages", chatPairKey(myProfileId, otherId), MESSAGES_PAGE],
      queryFn: () => listMessages(myProfileId, otherId, MESSAGES_PAGE),
      staleTime: 30_000,
    });
    void queryClient.prefetchQuery({
      queryKey: ["profile", otherId],
      queryFn: () => getProfile(otherId),
      staleTime: 5 * 60_000,
    });
  };
}

export function useConversations(profileId: string | undefined) {
  return useQuery({
    queryKey: ["conversations", profileId],
    queryFn: () => listConversations(profileId!),
    enabled: Boolean(profileId),
  });
}

/** Three dots rising in turn - "typing…" in the list, the header and the thread. */
export function TypingDots({ className, size = "sm" }: { className?: string; size?: "sm" | "md" }) {
  return (
    <span className={cn("inline-flex items-center", size === "md" ? "gap-1" : "gap-0.5", className)} aria-hidden>
      {[0, 160, 320].map((delay) => (
        <span
          key={delay}
          className={cn("typing-dot rounded-full bg-current", size === "md" ? "h-[7px] w-[7px]" : "h-1 w-1")}
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

type Filter = "all" | "unread";

/**
 * Search, All/Unread, and the rows themselves. `typingFrom` comes from the
 * screen (see useTypingFrom) so the typing channel is only opened once even
 * when a thread and this list are on screen together.
 */
export function ConversationList({
  typingFrom,
  activeId,
  dense = false,
  top,
}: {
  typingFrom: Set<string>;
  /** Shown first inside the search panel (the Chats/Friends switch), so the controls read as one group. */
  top?: React.ReactNode;
  /** The thread open beside the list, on desktop. */
  activeId?: string;
  /** Tighter padding for the desktop sidebar. */
  dense?: boolean;
}) {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const navigate = useNavigate();
  const prefetchThread = usePrefetchThread(profile?.id);
  const conversations = useConversations(profile?.id);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const all = conversations.data ?? [];
  const online = usePresence(all.map((c) => c.otherProfileId));
  const unreadCount = all.filter((c) => c.unread).length;

  const q = query.trim().toLowerCase();
  const items = all.filter(
    (c) =>
      (filter === "all" || c.unread) &&
      (!q || c.otherName.toLowerCase().includes(q) || (!c.lastDeleted && c.lastBody.toLowerCase().includes(q))),
  );

  const pad = dense ? "px-3" : "px-4";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ---- Search + filter: one panel, like the job board's ---------- */}
      <div className={cn("pb-2.5", pad)}>
        <div className="@container space-y-2.5 rounded-xl border border-slate-200 bg-surface p-2.5 shadow-sm">
          {top}
          {/* Side by side when there's room; stacked in the narrow desktop sidebar. */}
          <div className="flex flex-col gap-2 @xs:flex-row">
            <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-surface px-3 transition-colors focus-within:border-brand-600">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchChats")}
                aria-label={t("searchChats")}
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600"
                  aria-label={t("clearSearch")}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label={t("filters")}>
              {(["all", "unread"] as const).map((f) => {
                const selected = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    aria-pressed={selected}
                    className={cn(
                      "inline-flex h-8 items-center justify-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-colors",
                      selected ? "bg-surface text-brand-800 shadow-sm" : "text-slate-600 hover:text-slate-900",
                    )}
                  >
                    {f === "all" ? t("filterAll") : t("filterUnread")}
                    {f === "unread" && unreadCount > 0 && (
                      <span className="min-w-4 rounded-full bg-brand-600 px-1 text-center text-[10px] font-bold leading-4 text-white">
                        {formatNumber(unreadCount, lang)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Rows ----------------------------------------------------- */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversations.isLoading ? (
          <ul className={cn("space-y-1", pad)}>
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <div className="skeleton h-11 w-11 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="skeleton h-3.5 w-32" />
                  <div className="skeleton mt-2 h-3 w-48 max-w-full" />
                </div>
              </li>
            ))}
          </ul>
        ) : all.length === 0 ? (
          <div className={cn("flex flex-col items-center py-10 text-center", pad)}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <MessageCircle className="h-6 w-6" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900">{t("noChatsYet")}</p>
            <p className="mt-1 max-w-xs text-xs text-slate-500">{t("noChatsYetHint")}</p>
            <Link
              to="/search"
              className="mt-3.5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              <Search className="h-4 w-4" aria-hidden />
              {t("findPeople")}
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className={cn("flex flex-col items-center py-10 text-center", pad)}>
            {filter === "unread" && !q ? (
              <>
                <CheckCircle2 className="h-9 w-9 text-brand-500" aria-hidden />
                <p className="mt-3 font-semibold text-slate-900">{t("allCaughtUp")}</p>
                <p className="mt-1 text-sm text-slate-500">{t("allCaughtUpHint")}</p>
              </>
            ) : (
              <>
                <Search className="h-8 w-8 text-slate-300" aria-hidden />
                <p className="mt-3 text-sm font-medium text-slate-600">{t("noChatMatches", { q: query.trim() })}</p>
              </>
            )}
          </div>
        ) : (
          <ul className={cn("space-y-0.5 pb-3", dense ? "px-2" : "px-2 sm:px-3")}>
            {items.map((c) => (
              <ConversationRow
                key={c.otherProfileId}
                c={c}
                me={profile?.id}
                online={Boolean(online[c.otherProfileId])}
                typing={typingFrom.has(c.otherProfileId)}
                active={c.otherProfileId === activeId}
                onWarm={() => prefetchThread(c.otherProfileId)}
                onOpen={() => navigate({ to: "/chat/$otherId", params: { otherId: c.otherProfileId } })}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ConversationRow({
  c,
  me,
  online,
  typing,
  active,
  onWarm,
  onOpen,
}: {
  c: ConversationSummary;
  me?: string;
  online: boolean;
  typing: boolean;
  active: boolean;
  onWarm: () => void;
  onOpen: () => void;
}) {
  const { t, lang } = useI18n();
  const mineLast = c.lastSenderProfileId === me;

  return (
    // The avatar is a sibling of the button, not inside it: the face opens
    // that person's profile while the rest of the row opens the thread, and
    // a link nested in a button would be invalid markup with both firing.
    <li
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-150",
        active ? "bg-brand-50 ring-1 ring-brand-200" : c.unread ? "bg-brand-50/50 hover:bg-brand-50" : "hover:bg-slate-50",
      )}
    >
      {active && <span className="absolute inset-y-3 left-0 w-1 rounded-full bg-brand-600" aria-hidden />}
      <Avatar name={c.otherName} src={c.otherAvatarUrl} size={44} online={online} profileId={c.otherProfileId} />
      <button
        type="button"
        onClick={onOpen}
        onPointerEnter={onWarm}
        onPointerDown={onWarm}
        onFocus={onWarm}
        aria-current={active ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1">
              <span
                className={cn(
                  "truncate text-sm",
                  c.unread ? "font-bold text-slate-950" : "font-semibold text-slate-900",
                )}
              >
                {c.otherName}
              </span>
              <VerifiedBadge
                staffRole={c.otherStaffRole}
                verified={c.otherIsVerified}
                skillVerified={c.otherSkillVerified}
                size={14}
              />
            </span>
            <span className={cn("shrink-0 text-[11px]", c.unread ? "font-semibold text-brand-700" : "text-slate-400")}>
              {relativeTime(c.lastCreatedAt, lang)}
            </span>
          </span>

          {typing ? (
            <span className="mt-0.5 flex items-center gap-1.5 text-[13px] font-medium text-brand-700">
              <TypingDots />
              {t("typingIndicator")}
            </span>
          ) : (
            <span
              className={cn(
                "mt-0.5 flex items-center gap-1 text-[13px]",
                c.unread ? "font-semibold text-slate-800" : "text-slate-500",
              )}
            >
              {/* Seen tick sits on my own last message, like Messenger. */}
              {mineLast &&
                (c.lastReadAt ? (
                  <CheckCheck className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-label={t("seenLabel")} />
                ) : (
                  <Check className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                ))}
              <span className={cn("truncate", c.lastDeleted && "italic")}>
                {mineLast ? t("youPrefix") : ""}
                {c.lastDeleted ? t("messageRemoved") : c.lastBody}
              </span>
              {c.lastReaction && <span className="shrink-0">{c.lastReaction}</span>}
            </span>
          )}
        </span>
        {c.unread && (
          <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600 ring-[3px] ring-brand-100" aria-hidden />
        )}
      </button>
    </li>
  );
}

type Division = "chats" | "friends";

/**
 * The left pane on desktop, and the whole Chats page on a phone: title,
 * the Chats/Friends switch, then the list (or the friends panel).
 */
export function ChatSidebar({
  typingFrom,
  activeId,
  showDivisions = true,
  className,
}: {
  typingFrom: Set<string>;
  activeId?: string;
  showDivisions?: boolean;
  className?: string;
}) {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const [division, setDivision] = useState<Division>("chats");
  const conversations = useConversations(profile?.id);
  const unread = (conversations.data ?? []).filter((c) => c.unread).length;
  const queryClient = useQueryClient();

  // Keep the Chats badge honest: drop leftover counts for threads this list
  // already shows as read.
  useEffect(() => {
    const myId = profile?.id;
    if (!myId || !conversations.data) return;
    reconcileMessageNotifications(myId, conversations.data)
      .then((changed) => {
        if (changed) queryClient.invalidateQueries({ queryKey: ["unread-messages", myId] });
      })
      .catch(() => {
        // Best-effort, same as the read receipt in ChatScreen.
      });
  }, [profile?.id, conversations.data, queryClient]);

  // Same segmented switch as the job board's People hiring / Services offered.
  const divisionTabs = showDivisions ? (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label={t("chatsTitle")}>
      {(["chats", "friends"] as const).map((d) => {
        const selected = division === d;
        const Icon = d === "chats" ? MessageCircle : Users;
        return (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => setDivision(d)}
            className={cn(
              "inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-semibold transition-colors",
              selected ? "bg-surface text-brand-800 shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{d === "chats" ? t("navChats") : t("myFriends")}</span>
            {d === "chats" && unread > 0 && (
              <span className="min-w-4.5 shrink-0 rounded-full bg-brand-600 px-1.5 text-center text-[10px] font-bold leading-[18px] text-white">
                {formatNumber(unread, lang)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {showDivisions && division === "friends" ? (
        <>
          <div className="px-4 pb-2.5">
            <div className="rounded-xl border border-slate-200 bg-surface p-2.5 shadow-sm">{divisionTabs}</div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <FriendsPanel />
          </div>
        </>
      ) : (
        <ConversationList typingFrom={typingFrom} activeId={activeId} dense={!showDivisions} top={divisionTabs} />
      )}
    </div>
  );
}
