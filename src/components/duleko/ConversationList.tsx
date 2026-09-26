import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, CheckCheck, CheckCircle2, MessageCircle, Search, Users, X } from "lucide-react";
import { FriendsPanel } from "./FriendsPanel";
import { VerifiedBadge } from "./VerifiedBadge";
import { Avatar } from "@/components/ui/avatar";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { usePresence } from "@/hooks/use-presence";
import { listConversations } from "@/lib/queries";
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
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["conversations", profileId] });
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
      supabase.removeChannel(channel);
    };
  }, [profileId, queryClient]);
}

export function useConversations(profileId: string | undefined) {
  return useQuery({
    queryKey: ["conversations", profileId],
    queryFn: () => listConversations(profileId!),
    enabled: Boolean(profileId),
  });
}

function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1 w-1 animate-bounce rounded-full bg-current"
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
}: {
  typingFrom: Set<string>;
  /** The thread open beside the list, on desktop. */
  activeId?: string;
  /** Tighter padding for the desktop sidebar. */
  dense?: boolean;
}) {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const navigate = useNavigate();
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
      {/* ---- Search + filter ------------------------------------------ */}
      <div className={cn("space-y-2.5 pb-3", pad)}>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition-all focus-within:border-brand-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchChats")}
            aria-label={t("searchChats")}
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
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
        <div className="flex gap-1.5" role="group" aria-label={t("filters")}>
          {(["all", "unread"] as const).map((f) => {
            const selected = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={selected}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
                  selected ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200/70",
                )}
              >
                {f === "all" ? t("filterAll") : t("filterUnread")}
                {f === "unread" && unreadCount > 0 && (
                  <span
                    className={cn(
                      "min-w-4 rounded-full px-1 text-center text-[10px] font-bold leading-4",
                      selected ? "bg-white/25 text-white" : "bg-brand-600 text-white",
                    )}
                  >
                    {formatNumber(unreadCount, lang)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Rows ----------------------------------------------------- */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversations.isLoading ? (
          <ul className={cn("space-y-1", pad)}>
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <div className="skeleton h-12 w-12 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="skeleton h-3.5 w-32" />
                  <div className="skeleton mt-2 h-3 w-48 max-w-full" />
                </div>
              </li>
            ))}
          </ul>
        ) : all.length === 0 ? (
          <div className={cn("flex flex-col items-center py-12 text-center", pad)}>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <MessageCircle className="h-7 w-7" aria-hidden />
            </span>
            <p className="mt-4 font-semibold text-slate-900">{t("noChatsYet")}</p>
            <p className="mt-1 max-w-xs text-sm text-slate-500">{t("noChatsYetHint")}</p>
            <Link
              to="/search"
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
            >
              <Search className="h-4 w-4" aria-hidden />
              {t("findPeople")}
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className={cn("flex flex-col items-center py-12 text-center", pad)}>
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
  onOpen,
}: {
  c: ConversationSummary;
  me?: string;
  online: boolean;
  typing: boolean;
  active: boolean;
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
        "relative flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-colors duration-150",
        active ? "bg-brand-50 ring-1 ring-brand-200" : c.unread ? "bg-brand-50/50 hover:bg-brand-50" : "hover:bg-slate-50",
      )}
    >
      {active && <span className="absolute inset-y-3 left-0 w-1 rounded-full bg-brand-600" aria-hidden />}
      <Avatar name={c.otherName} src={c.otherAvatarUrl} size={48} online={online} profileId={c.otherProfileId} />
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1">
              <span
                className={cn(
                  "truncate text-[15px]",
                  c.unread ? "font-bold text-slate-950" : "font-semibold text-slate-900",
                )}
              >
                {c.otherName}
              </span>
              <VerifiedBadge staffRole={c.otherStaffRole} verified={c.otherIsVerified} size={14} />
            </span>
            <span className={cn("shrink-0 text-[11px]", c.unread ? "font-semibold text-brand-700" : "text-slate-400")}>
              {relativeTime(c.lastCreatedAt, lang)}
            </span>
          </span>

          {typing ? (
            <span className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-brand-700">
              <TypingDots />
              {t("typingIndicator")}
            </span>
          ) : (
            <span
              className={cn(
                "mt-0.5 flex items-center gap-1 text-sm",
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
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600 ring-4 ring-brand-100" aria-hidden />
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

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {showDivisions && (
        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1" role="tablist" aria-label={t("chatsTitle")}>
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
                    "inline-flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition-all duration-200",
                    selected ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  <Icon className={cn("h-4 w-4", selected ? "text-brand-700" : "")} aria-hidden />
                  {d === "chats" ? t("navChats") : t("myFriends")}
                  {d === "chats" && unread > 0 && (
                    <span className="min-w-5 rounded-full bg-brand-600 px-1.5 text-center text-[11px] font-bold leading-5 text-white">
                      {formatNumber(unread, lang)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showDivisions && division === "friends" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <FriendsPanel />
        </div>
      ) : (
        <ConversationList typingFrom={typingFrom} activeId={activeId} dense={!showDivisions} />
      )}
    </div>
  );
}
