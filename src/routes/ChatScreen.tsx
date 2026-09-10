import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { ArrowLeft, ArrowDown, Check, CornerUpLeft, Pencil, Send, X } from "lucide-react";
import { AppHeader } from "@/components/duleko/Layout";
import { ChatBubble, type BubblePanel } from "@/components/duleko/ChatBubble";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { VerifiedBadge } from "@/components/duleko/VerifiedBadge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/ui/states";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { useTypingFrom, useTypingSender } from "@/hooks/use-typing";
import {
  MESSAGES_PAGE,
  chatPairKey,
  editMessage,
  getProfile,
  listMessages,
  markMessageNotificationsRead,
  markThreadRead,
  removeReaction,
  sendMessage,
  setReaction,
  unsendMessage,
} from "@/lib/queries";
import { usePresence } from "@/hooks/use-presence";
import { supabase, errorMessage } from "@/lib/supabase";
import { cn, formatDayLabel, relativeTime, sameMinuteWindow, toDateKey } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

const TYPING_BROADCAST_THROTTLE_MS = 1500;
const TYPING_STOP_AFTER_MS = 3000;
const HIGHLIGHT_MS = 1600;
/** Within this many pixels of the end counts as "reading the latest". */
const NEAR_BOTTOM_PX = 80;

/**
 * A full-page direct-message thread with one other profile: live typing,
 * a "Seen" receipt, emoji reactions, quoted replies, edit and unsend, and
 * swipe-to-reply on touch. No calling, groups, or media.
 */
export function ChatScreen() {
  const { t, lang } = useI18n();
  const { profile: me } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { otherId } = useParams({ from: "/chat/$otherId" });
  const [draft, setDraft] = useState("");
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<BubblePanel | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unreadBelow, setUnreadBelow] = useState(false);
  // Grows when "load older" is tapped; the query always fetches the most
  // recent `limit` messages, so realtime updates keep working unchanged.
  const [limit, setLimit] = useState(MESSAGES_PAGE);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTypingSentAt = useRef(0);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const landedOn = useRef<string | null>(null);
  const newestId = useRef<string | null>(null);
  // Distance from the bottom, stashed while an older page loads in.
  const anchorFromBottom = useRef<number | null>(null);

  const other = useQuery({ queryKey: ["profile", otherId], queryFn: () => getProfile(otherId) });

  const typingFrom = useTypingFrom(me?.id);
  const otherTyping = typingFrom.has(otherId);
  const notifyTyping = useTypingSender(me?.id, otherId);
  const onlineMap = usePresence([otherId]);

  const pairKey = me ? chatPairKey(me.id, otherId) : null;

  const messages = useQuery({
    queryKey: ["messages", pairKey, limit],
    queryFn: () => listMessages(me!.id, otherId, limit),
    enabled: Boolean(me && pairKey),
  });

  // A full page came back, so there is probably more history behind it.
  const mayHaveOlder = (messages.data?.length ?? 0) >= limit;

  // One channel per thread for live message and reaction changes. Typing
  // rides a separate per-person channel (see use-typing) so the Chats list
  // can show it too without opening a channel per conversation.
  useEffect(() => {
    if (!pairKey) return;
    const channel = supabase
      .channel(`messages:${pairKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `pair_key=eq.${pairKey}` },
        () => queryClient.invalidateQueries({ queryKey: ["messages", pairKey] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () =>
        queryClient.invalidateQueries({ queryKey: ["messages", pairKey] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    };
  }, [pairKey, queryClient]);

  function scrollToEnd(behavior: ScrollBehavior = "auto") {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setUnreadBelow(false);
  }

  // Opening a thread lands on the newest message, before the browser
  // paints, so there is no visible jump from the top. The second pass on
  // the next frame catches late layout - fonts, and the reply stubs that
  // change a bubble's height once they render.
  useLayoutEffect(() => {
    if (!pairKey || !messages.data || landedOn.current === pairKey) return;
    landedOn.current = pairKey;
    newestId.current = messages.data[messages.data.length - 1]?.id ?? null;
    scrollToEnd("auto");
    requestAnimationFrame(() => scrollToEnd("auto"));
  }, [pairKey, messages.data]);

  // Loading older messages makes the list longer without anything new
  // arriving, so this watches the newest id rather than the count -
  // otherwise reading back through history would snap you to the bottom.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || anchorFromBottom.current == null) return;
    el.scrollTop = el.scrollHeight - anchorFromBottom.current;
    anchorFromBottom.current = null;
  }, [messages.data]);

  // Otherwise: follow new messages when the person is already at the end,
  // and raise the pill when they are not.
  useEffect(() => {
    const items = messages.data;
    if (!items?.length || landedOn.current !== pairKey) return;
    const newest = items[items.length - 1];
    if (newest.id === newestId.current) return;
    newestId.current = newest.id;
    if (atBottom || newest.sender_profile_id === me?.id) scrollToEnd("smooth");
    else setUnreadBelow(true);
  }, [messages.data, pairKey, atBottom, me?.id]);

  // Keep the typing bubble in view too, when it appears at the end.
  useEffect(() => {
    if (otherTyping && atBottom) scrollToEnd("smooth");
  }, [otherTyping, atBottom]);

  // Opening this thread marks the other person's messages seen, and clears
  // this sender's contribution to the Chats badge.
  useEffect(() => {
    if (!me) return;
    Promise.all([markThreadRead(me.id, otherId), markMessageNotificationsRead(me.id, otherId)])
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["unread-messages", me.id] });
        queryClient.invalidateQueries({ queryKey: ["messages", pairKey] });
        // The Chats list's unread bolding is stale otherwise - it isn't
        // watching this thread directly.
        queryClient.invalidateQueries({ queryKey: ["conversations", me.id] });
      })
      .catch(() => {
        // Best-effort - a failed read-receipt shouldn't block the chat itself.
      });
    // Only re-run when the thread identity changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id, otherId]);

  const refreshThread = () => {
    queryClient.invalidateQueries({ queryKey: ["messages", pairKey] });
    if (me) queryClient.invalidateQueries({ queryKey: ["conversations", me.id] });
  };

  const send = useMutation({
    mutationFn: ({ body, replyToId }: { body: string; replyToId: string | null }) =>
      sendMessage(me!.id, otherId, body, replyToId),
    onSuccess: () => {
      setDraft("");
      setReplyTo(null);
      notifyTyping(false);
      refreshThread();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const saveEdit = useMutation({
    mutationFn: ({ messageId, body }: { messageId: string; body: string }) =>
      editMessage(messageId, body),
    onSuccess: () => {
      setDraft("");
      setEditing(null);
      refreshThread();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const react = useMutation({
    mutationFn: ({ messageId, emoji, mine }: { messageId: string; emoji: string; mine: boolean }) =>
      mine ? removeReaction(messageId, me!.id) : setReaction(messageId, me!.id, emoji),
    onSuccess: refreshThread,
    onError: (error) => toast(errorMessage(error), "error"),
    onSettled: closePanels,
  });

  const unsend = useMutation({
    mutationFn: (messageId: string) => unsendMessage(messageId),
    onSuccess: refreshThread,
    onError: (error) => toast(errorMessage(error), "error"),
    onSettled: closePanels,
  });

  function closePanels() {
    setActiveMessageId(null);
    setActivePanel(null);
  }

  // With no ⋯ button to toggle, tapping anywhere else (or pressing Escape)
  // is the only way out of an open message menu.
  useEffect(() => {
    if (!activePanel) return;
    function onPointerDownAnywhere(e: PointerEvent) {
      if ((e.target as HTMLElement | null)?.closest("[data-chat-popover]")) return;
      closePanels();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closePanels();
    }
    document.addEventListener("pointerdown", onPointerDownAnywhere, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownAnywhere, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [activePanel]);

  function onDraftChange(value: string) {
    setDraft(value);
    // Editing an old message shouldn't read as "typing" to the other side.
    if (editing) return;
    const now = Date.now();
    if (value.trim() && now - lastTypingSentAt.current > TYPING_BROADCAST_THROTTLE_MS) {
      lastTypingSentAt.current = now;
      notifyTyping(true);
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => notifyTyping(false), TYPING_STOP_AFTER_MS);
  }

  function submit() {
    const body = draft.trim();
    if (!body) return;
    if (editing) {
      if (saveEdit.isPending) return;
      if (body === editing.body) {
        setEditing(null);
        setDraft("");
        return;
      }
      saveEdit.mutate({ messageId: editing.id, body });
      return;
    }
    if (send.isPending) return;
    send.mutate({ body, replyToId: replyTo?.id ?? null });
  }

  function startReply(m: ChatMessage) {
    setEditing(null);
    setReplyTo(m);
    setDraft("");
    closePanels();
    inputRef.current?.focus();
  }

  function startEdit(m: ChatMessage) {
    setReplyTo(null);
    setEditing(m);
    setDraft(m.body);
    inputRef.current?.focus();
  }

  function cancelComposer() {
    setReplyTo(null);
    setEditing(null);
    setDraft("");
  }

  /** Scroll a quoted message into view and ring it briefly. */
  function jumpTo(messageId: string) {
    document.getElementById(`msg-${messageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(messageId);
    window.setTimeout(() => setHighlightId((id) => (id === messageId ? null : id)), HIGHLIGHT_MS);
  }

  if (!me) return <SignInRequiredScreen title={other.data?.full_name ?? t("chat")} />;
  if (other.isLoading) return <FullPageLoader label={t("loading")} />;

  const items = messages.data ?? [];
  const lastMessage = items[items.length - 1];
  const showSeen = lastMessage && lastMessage.sender_profile_id === me.id && Boolean(lastMessage.read_at);
  const otherName = other.data?.full_name ?? "";
  const isOnline = Boolean(onlineMap[otherId]);

  // A run is consecutive messages from one person within a few minutes:
  // they stack tightly and share a single timestamp and avatar.
  const rows = items.map((m, i) => {
    const prev = items[i - 1];
    const next = items[i + 1];
    const newDay = !prev || toDateKey(new Date(prev.created_at)) !== toDateKey(new Date(m.created_at));
    // A reply always starts its own run: grouped against the message above,
    // its quote stub would look like it belonged to that one instead.
    const joinsPrev =
      !newDay &&
      !m.reply_to_id &&
      prev?.sender_profile_id === m.sender_profile_id &&
      sameMinuteWindow(prev.created_at, m.created_at);
    const joinsNext =
      next &&
      !next.reply_to_id &&
      toDateKey(new Date(next.created_at)) === toDateKey(new Date(m.created_at)) &&
      next.sender_profile_id === m.sender_profile_id &&
      sameMinuteWindow(m.created_at, next.created_at);
    return { m, newDay, firstInRun: !joinsPrev, lastInRun: !joinsNext };
  });

  return (
    // h-dvh, not min-h-dvh: the thread itself has to be the scroller, and a
    // wrapper that can grow past the viewport would hand scrolling to the
    // page instead - which silently breaks opening on the newest message.
    // The tab bar hides itself on /chat/, so the full height is ours.
    <div className="flex h-dvh flex-col overflow-hidden bg-white">
      <AppHeader
        title={
          // The parent <h1> (AppHeader) applies its own `truncate`, which
          // only works cleanly on plain text - so truncation is handled
          // here instead, on the name span alone, with the badge (already
          // shrink-0) sitting safely outside the truncated part.
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate">{otherName}</span>
            <VerifiedBadge staffRole={other.data?.staff_role} verified={other.data?.is_verified} size={15} />
          </span>
        }
        subtitle={
          otherTyping ? (
            <span className="text-brand-700">{t("typingIndicator")}</span>
          ) : isOnline ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
              {t("online")}
            </span>
          ) : other.data?.is_official ? (
            `✓ ${t("officialAccount")}`
          ) : undefined
        }
        back={
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-lg p-1.5 text-slate-500 transition-colors duration-200 hover:bg-slate-100"
            aria-label={t("back")}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
        }
        leading={<Avatar name={otherName || "?"} src={other.data?.avatar_url} size={36} profileId={otherId} />}
      />

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
          setAtBottom(near);
          if (near) setUnreadBelow(false);
        }}
        // min-h-0 lets this flex child shrink below its content height;
        // without it the default min-height:auto keeps it as tall as the
        // thread and overflow-y-auto never engages.
        className="mx-auto flex w-full min-h-0 max-w-3xl flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 py-4"
      >
        {messages.isLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">{t("loading")}</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{t("chatEmpty")}</p>
        ) : (
          <>
            {mayHaveOlder && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={() => {
                    const el = listRef.current;
                    anchorFromBottom.current = el ? el.scrollHeight - el.scrollTop : null;
                    setLimit((n) => n + MESSAGES_PAGE);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50"
                >
                  {t("loadOlderMessages")}
                </button>
              </div>
            )}
            {rows.map(({ m, newDay, firstInRun, lastInRun }) => (
            <div key={m.id}>
              {newDay && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
                    {formatDayLabel(m.created_at, lang)}
                  </span>
                </div>
              )}
              <ChatBubble
                message={m}
                mine={m.sender_profile_id === me.id}
                myProfileId={me.id}
                otherName={otherName}
                otherAvatarUrl={other.data?.avatar_url ?? null}
                otherProfileId={otherId}
                firstInRun={firstInRun}
                lastInRun={lastInRun}
                panel={activeMessageId === m.id ? activePanel : null}
                onPanel={(panel) => {
                  setActiveMessageId(panel ? m.id : null);
                  setActivePanel(panel);
                }}
                onReply={startReply}
                onEdit={startEdit}
                onUnsend={(msg) => unsend.mutate(msg.id)}
                onReact={(msg, emoji) =>
                  react.mutate({
                    messageId: msg.id,
                    emoji,
                    mine: msg.message_reactions.some((r) => r.profile_id === me.id && r.emoji === emoji),
                  })
                }
                onJumpTo={jumpTo}
                highlighted={highlightId === m.id}
              />
            </div>
            ))}
          </>
        )}

        {showSeen && (
          <p className="pt-0.5 text-right text-[11px] text-slate-400">
            {t("seenLabel")} · {relativeTime(lastMessage.read_at!, lang)}
          </p>
        )}

        {otherTyping && (
          <div className="mt-1 flex items-end gap-1.5">
            <Avatar name={otherName || "?"} src={other.data?.avatar_url} size={28} profileId={otherId} />
            <span className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-3">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
              <span className="sr-only">
                {otherName} {t("typingIndicator")}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Reading history shouldn't be interrupted, so new messages raise
          this instead of dragging the thread down under the finger. */}
      {unreadBelow && (
        <div className="pointer-events-none sticky bottom-2 z-20 flex justify-center">
          <button
            type="button"
            onClick={() => scrollToEnd("smooth")}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-3.5 py-2 text-xs font-medium text-white shadow-lg transition-colors duration-200 hover:bg-brand-800"
          >
            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
            {t("newMessages")}
          </button>
        </div>
      )}

      <form
        className="sticky bottom-0 border-t border-slate-200 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="mx-auto w-full max-w-3xl">
          {(replyTo || editing) && (
            <div className="mb-2 flex items-start gap-2 rounded-xl border-l-2 border-brand-500 bg-brand-50/70 px-3 py-2">
              <span className="mt-0.5 shrink-0 text-brand-700" aria-hidden>
                {editing ? <Pencil className="h-3.5 w-3.5" /> : <CornerUpLeft className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-brand-900">
                  {editing
                    ? t("editingMessage")
                    : t("replyingTo", {
                        name:
                          replyTo!.sender_profile_id === me.id
                            ? t("youLabel")
                            : (other.data?.full_name ?? ""),
                      })}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {(editing ?? replyTo)!.body}
                </span>
              </span>
              <button
                type="button"
                onClick={cancelComposer}
                aria-label={t("cancel")}
                className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors duration-200 hover:bg-white hover:text-slate-600"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            {/* Deliberately not autofocused: on a phone the keyboard would
                spring up and resize the viewport just as the thread is
                settling on its newest message. */}
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                } else if (e.key === "Escape" && (replyTo || editing)) {
                  cancelComposer();
                }
              }}
              placeholder={editing ? t("editMessagePlaceholder") : t("chatPlaceholder")}
              maxLength={1000}
              className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-brand-600/30"
            />
            <Button
              type="submit"
              size="icon"
              loading={send.isPending || saveEdit.isPending}
              disabled={!draft.trim()}
              aria-label={editing ? t("save") : t("send")}
            >
              {editing ? <Check className="h-4 w-4" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
