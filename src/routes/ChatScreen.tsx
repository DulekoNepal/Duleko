import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowLeft,
  Check,
  CornerUpLeft,
  Pencil,
  Send,
  Smile,
  UserRound,
  X,
} from "lucide-react";
import { PAGE_GUTTER, PAGE_WIDTH } from "@/components/duleko/Layout";
import { ALL_REACTIONS, ChatBubble, type BubblePanel } from "@/components/duleko/ChatBubble";
import { TypingDots, useConversationsLive } from "@/components/duleko/ConversationList";
import { ChatsPane } from "@/routes/ChatsScreen";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { VerifiedBadge } from "@/components/duleko/VerifiedBadge";
import { Avatar } from "@/components/ui/avatar";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { useTypingFrom, useTypingSender } from "@/hooks/use-typing";
import {
  MESSAGES_PAGE,
  attachReplies,
  chatPairKey,
  shapeMessage,
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
import { CHAT_SPLIT_QUERY, useMediaQuery } from "@/hooks/use-media-query";
import { clearChatAlert } from "@/lib/phone-alerts";
import { supabase, errorMessage } from "@/lib/supabase";
import { cn, containsPhoneNumber, formatDayLabel, relativeTime, sameMinuteWindow, toDateKey } from "@/lib/utils";
import type { ChatMessage, ConversationSummary } from "@/lib/types";

const TYPING_BROADCAST_THROTTLE_MS = 1500;
const TYPING_STOP_AFTER_MS = 3000;
const HIGHLIGHT_MS = 1600;
/** Within this many pixels of the end counts as "reading the latest". */
const NEAR_BOTTOM_PX = 80;

/**
 * A full-page direct-message thread with one other profile: live typing,
 * a "Seen" receipt, emoji reactions, quoted replies, edit and unsend, and
 * swipe-to-reply on touch. No calling, groups, or media. On a desktop the
 * conversation list sits beside it, Messenger-style.
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const lastTypingSentAt = useRef(0);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const landedOn = useRef<string | null>(null);
  const newestId = useRef<string | null>(null);
  // Distance from the bottom, stashed while an older page loads in.
  const anchorFromBottom = useRef<number | null>(null);

  const other = useQuery({ queryKey: ["profile", otherId], queryFn: () => getProfile(otherId) });
  // The Chats list already has their name and photo, so the thread opens
  // straight away with those while the full profile loads behind it.
  const summary = me
    ? queryClient
        .getQueryData<ConversationSummary[]>(["conversations", me.id])
        ?.find((c) => c.otherProfileId === otherId)
    : undefined;

  const typingFrom = useTypingFrom(me?.id);
  const otherTyping = typingFrom.has(otherId);
  const notifyTyping = useTypingSender(me?.id, otherId);
  const onlineMap = usePresence([otherId]);
  const split = useMediaQuery(CHAT_SPLIT_QUERY);
  // The list beside the thread needs its own live updates - only mounted on
  // desktop, so only subscribe there.
  useConversationsLive(split ? me?.id : undefined);

  const pairKey = me ? chatPairKey(me.id, otherId) : null;

  const messages = useQuery({
    queryKey: ["messages", pairKey, limit],
    queryFn: () => listMessages(me!.id, otherId, limit),
    enabled: Boolean(me && pairKey),
    // "Load older" asks for a bigger window under a new key; keep showing
    // the messages already here until it lands, instead of a blank list.
    placeholderData: keepPreviousData,
  });

  // A full page came back, so there is probably more history behind it.
  const mayHaveOlder = (messages.data?.length ?? 0) >= limit;

  // One channel per thread for live message and reaction changes. Typing
  // rides a separate per-person channel (see use-typing) so the Chats list
  // can show it too without opening a channel per conversation.
  //
  // Changes are applied straight into what's on screen - a new message
  // appears the instant it arrives, with no round trip to fetch the thread
  // again. Only reactions (which arrive without their message) refetch,
  // and only when they belong to this thread.
  useEffect(() => {
    if (!pairKey) return;
    const update = (fn: (list: ChatMessage[]) => ChatMessage[]) =>
      queryClient.setQueriesData<ChatMessage[]>({ queryKey: ["messages", pairKey] }, (old) =>
        old ? attachReplies(fn(old)) : old,
      );
    const channel = supabase
      .channel(`messages:${pairKey}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `pair_key=eq.${pairKey}` },
        ({ new: row }) => {
          const incoming = shapeMessage(row);
          update((list) => {
            if (list.some((x) => x.id === incoming.id)) return list;
            // My own message, back before the send call answered: it takes
            // the place of its "sending" copy rather than doubling up.
            const tempIndex = list.findIndex((x) => x.pending && x.body === incoming.body);
            const rest = tempIndex >= 0 ? list.filter((_, i) => i !== tempIndex) : list;
            return [...rest, incoming];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `pair_key=eq.${pairKey}` },
        ({ new: row }) => {
          const changed = row as Partial<ChatMessage> & { id: string };
          update((list) =>
            list.map((x) =>
              x.id === changed.id
                ? {
                    ...x,
                    body: changed.body ?? x.body,
                    read_at: changed.read_at ?? null,
                    edited_at: changed.edited_at ?? null,
                    deleted_at: changed.deleted_at ?? null,
                  }
                : x,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `pair_key=eq.${pairKey}` },
        ({ old: row }) => update((list) => list.filter((x) => x.id !== (row as { id?: string }).id)),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, (payload) => {
        const messageId =
          (payload.new as { message_id?: string })?.message_id ?? (payload.old as { message_id?: string })?.message_id;
        const inThread = queryClient
          .getQueriesData<ChatMessage[]>({ queryKey: ["messages", pairKey] })
          .some(([, list]) => list?.some((x) => x.id === messageId));
        if (!messageId || inThread) queryClient.invalidateQueries({ queryKey: ["messages", pairKey] });
      })
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

  // The other person's newest unread message - a new one arriving while the
  // thread is open has to be marked too, or it keeps the Chats badge at 1.
  const newestUnreadId =
    (messages.data ?? []).filter((m) => m.sender_profile_id !== me?.id && !m.read_at).pop()?.id ?? null;

  // Opening this thread marks the other person's messages seen, and clears
  // this sender's contribution to the Chats badge. Waits while the app is in
  // the background so the other side doesn't get a false "Seen".
  useEffect(() => {
    if (!me) return;
    const markRead = () => {
      if (document.visibilityState === "hidden") return;
      clearChatAlert(otherId);
      Promise.all([markThreadRead(me.id, otherId), markMessageNotificationsRead(me.id, otherId)])
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["unread-messages", me.id] });
          // The Chats list's unread bolding is stale otherwise - it isn't
          // watching this thread directly.
          queryClient.invalidateQueries({ queryKey: ["conversations", me.id] });
        })
        .catch(() => {
          // Best-effort - a failed read-receipt shouldn't block the chat itself.
        });
    };
    markRead();
    document.addEventListener("visibilitychange", markRead);
    return () => document.removeEventListener("visibilitychange", markRead);
    // Re-run per thread and per new incoming message, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id, otherId, newestUnreadId]);

  const refreshThread = () => {
    queryClient.invalidateQueries({ queryKey: ["messages", pairKey] });
    if (me) queryClient.invalidateQueries({ queryKey: ["conversations", me.id] });
  };

  // Sending feels instant: the message joins the thread the moment it's
  // sent, with a clock in its corner, and turns into the real one when the
  // server answers. A failure takes it back out and returns the text to
  // the box so nothing typed is lost.
  const messagesKey = ["messages", pairKey, limit] as const;
  const send = useMutation({
    mutationFn: ({ body, replyToId }: { body: string; replyToId: string | null; tempId: string }) =>
      sendMessage(me!.id, otherId, body, replyToId),
    onMutate: async ({ body, replyToId, tempId }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey });
      const [profile_a, profile_b] = me!.id < otherId ? [me!.id, otherId] : [otherId, me!.id];
      const quoted = replyToId ? (messages.data ?? []).find((x) => x.id === replyToId) : null;
      const temp: ChatMessage = {
        id: tempId,
        profile_a,
        profile_b,
        sender_profile_id: me!.id,
        body,
        created_at: new Date().toISOString(),
        read_at: null,
        deleted_at: null,
        edited_at: null,
        reply_to_id: replyToId,
        reply_to: quoted
          ? { id: quoted.id, body: quoted.body, sender_profile_id: quoted.sender_profile_id, deleted_at: quoted.deleted_at }
          : null,
        message_reactions: [],
        pending: true,
      };
      queryClient.setQueryData<ChatMessage[]>(messagesKey, (old) => [...(old ?? []), temp]);
    },
    onSuccess: (saved, { tempId }) => {
      queryClient.setQueryData<ChatMessage[]>(messagesKey, (old) => {
        const list = (old ?? []).filter((x) => x.id !== tempId);
        // Realtime may have brought it in already.
        if (!list.some((x) => x.id === saved.id)) list.push({ ...saved, reply_to: null });
        return attachReplies(list);
      });
      queryClient.invalidateQueries({ queryKey: ["conversations", me!.id] });
    },
    onError: (error, { body, tempId }) => {
      queryClient.setQueryData<ChatMessage[]>(messagesKey, (old) => (old ?? []).filter((x) => x.id !== tempId));
      setDraft((current) => (current.trim() ? current : body));
      toast(errorMessage(error), "error");
    },
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

  // A reaction shows the moment it's tapped (one per person per message,
  // so it replaces any earlier one of mine); a failure puts it back.
  const react = useMutation({
    mutationFn: ({ messageId, emoji, mine }: { messageId: string; emoji: string; mine: boolean }) =>
      mine ? removeReaction(messageId, me!.id) : setReaction(messageId, me!.id, emoji),
    onMutate: ({ messageId, emoji, mine }) => {
      closePanels();
      queryClient.setQueriesData<ChatMessage[]>({ queryKey: ["messages", pairKey] }, (old) =>
        old?.map((x) => {
          if (x.id !== messageId) return x;
          const others = x.message_reactions.filter((r) => r.profile_id !== me!.id);
          return { ...x, message_reactions: mine ? others : [...others, { profile_id: me!.id, emoji }] };
        }),
      );
    },
    onError: (error) => {
      toast(errorMessage(error), "error");
      queryClient.invalidateQueries({ queryKey: ["messages", pairKey] });
    },
    onSuccess: () => {
      if (me) queryClient.invalidateQueries({ queryKey: ["conversations", me.id] });
    },
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

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [draft]);

  // The emoji palette closes on a tap anywhere outside it, or Escape.
  useEffect(() => {
    if (!emojiOpen) return;
    function onPointerDownAnywhere(e: PointerEvent) {
      if ((e.target as HTMLElement | null)?.closest("[data-chat-emoji]")) return;
      setEmojiOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setEmojiOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDownAnywhere, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownAnywhere, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [emojiOpen]);

  /** Drops an emoji in at the caret and keeps the palette open for more. */
  function insertEmoji(emoji: string) {
    const el = inputRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    onDraftChange(draft.slice(0, start) + emoji + draft.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + emoji.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  /** Tells the other side I've stopped typing - once, not on every call. */
  function stopTyping() {
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = null;
    if (lastTypingSentAt.current === 0) return;
    lastTypingSentAt.current = 0;
    notifyTyping(false);
  }

  function onDraftChange(value: string) {
    setDraft(value);
    // Editing an old message shouldn't read as "typing" to the other side.
    if (editing) return;
    // Cleared the box: they should stop seeing "typing…" right away.
    if (!value.trim()) {
      stopTyping();
      return;
    }
    const now = Date.now();
    if (now - lastTypingSentAt.current > TYPING_BROADCAST_THROTTLE_MS) {
      lastTypingSentAt.current = now;
      notifyTyping(true);
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(stopTyping, TYPING_STOP_AFTER_MS);
  }

  function submit() {
    const body = draft.trim();
    if (!body) return;
    if (containsPhoneNumber(body)) {
      toast(t("phoneNumberBlocked"), "error");
      return;
    }
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
    send.mutate({ body, replyToId: replyTo?.id ?? null, tempId: `pending-${Date.now()}` });
    // Clear at once, and tell the other side the typing has stopped - the
    // message itself is what they see next.
    setDraft("");
    setReplyTo(null);
    stopTyping();
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

  if (!me) return <SignInRequiredScreen title={other.data?.full_name ?? summary?.otherName ?? t("chat")} />;

  const items = messages.data ?? [];
  const lastMessage = items[items.length - 1];
  const showSeen = lastMessage && !lastMessage.pending && lastMessage.sender_profile_id === me.id && Boolean(lastMessage.read_at);
  const otherName = other.data?.full_name ?? summary?.otherName ?? "";
  const otherAvatar = other.data?.avatar_url ?? summary?.otherAvatarUrl ?? null;
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

  const starters = [t("chatStarter1"), t("chatStarter2"), t("chatStarter3"), t("chatStarter4")];
  const showJump = !atBottom || unreadBelow;

  return (
    // h-dvh, not min-h-dvh: the thread itself has to be the scroller, and a
    // wrapper that can grow past the viewport would hand scrolling to the
    // page instead - which silently breaks opening on the newest message.
    // The tab bar hides itself on /chat/, so the full height is ours - less
    // the top bar from md up.
    // From md up the chat sits in a card with the same width and gutters as
    // every other screen (PAGE_WIDTH/PAGE_GUTTER), 1.5rem under the top bar.
    // Phones stay edge to edge.
    <div className="h-dvh md:h-[calc(100dvh-4rem-1px-var(--sat))] lg:h-[calc(100dvh-72px-1px-var(--sat))] md:py-4">
      <div className={cn("mx-auto h-full w-full max-md:px-0", PAGE_WIDTH, PAGE_GUTTER)}>
      <div className="flex h-full overflow-hidden bg-surface md:rounded-2xl md:border md:border-slate-200 md:shadow-sm">
      {split && <ChatsPane typingFrom={typingFrom} activeId={otherId} showDivisions={false} />}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ---- Thread header ------------------------------------------- */}
        <header className="z-20 border-b border-slate-200 bg-surface/95 pt-[var(--sat)] backdrop-blur md:pt-0">
          <div className="flex h-14 items-center gap-1.5 px-2 sm:h-16 sm:gap-3 sm:px-4">
            {!split && (
              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors duration-200 hover:bg-slate-100"
                aria-label={t("back")}
              >
                <ArrowLeft className="h-5 w-5" aria-hidden />
              </button>
            )}

            <Link
              to="/worker/$workerId"
              params={{ workerId: otherId }}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 transition-colors hover:bg-slate-50"
            >
              <Avatar name={otherName || "?"} src={otherAvatar} size={40} online={isOnline} />
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-1.5">
                  {otherName ? (
                    <span className="truncate text-[15px] font-semibold leading-tight text-slate-900">{otherName}</span>
                  ) : (
                    <span className="skeleton h-4 w-32 rounded" aria-hidden />
                  )}
                  <VerifiedBadge
                    staffRole={other.data?.staff_role ?? summary?.otherStaffRole}
                    verified={other.data?.is_verified ?? summary?.otherIsVerified}
                    size={15}
                  />
                </span>
                <span className="mt-0.5 block truncate text-xs leading-tight">
                  {otherTyping ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-brand-700">
                      {t("typingIndicator")}
                    </span>
                  ) : isOnline ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-green-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
                      {t("online")}
                    </span>
                  ) : other.data?.is_official ? (
                    <span className="text-slate-500">✓ {t("officialAccount")}</span>
                  ) : (
                    <span className="text-slate-400">{t("viewProfile")}</span>
                  )}
                </span>
              </span>
            </Link>

            <Link
              to="/worker/$workerId"
              params={{ workerId: otherId }}
              className="hidden h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-800 sm:inline-flex"
            >
              <UserRound className="h-3.5 w-3.5" aria-hidden />
              {t("viewProfile")}
            </Link>
          </div>
        </header>

        {/* ---- Messages ------------------------------------------------- */}
        <div className="relative min-h-0 flex-1 bg-slate-50">
          <div
            ref={listRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
              setAtBottom(near);
              if (near) setUnreadBelow(false);
            }}
            className="relative h-full overflow-y-auto overflow-x-hidden overscroll-contain"
          >
            {/* justify-end: a short conversation sits at the bottom, by the
                box you type in, the way every messenger does it. */}
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end px-3 pb-2 pt-4 sm:px-6">
              {messages.isLoading ? (
                <div className="space-y-3 py-4" aria-label={t("loading")}>
                  {[48, 64, 40, 56].map((w, i) => (
                    <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
                      <div className="skeleton h-10 rounded-2xl" style={{ width: `${w}%` }} />
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                // An empty thread gets a proper welcome - who you're talking
                // to, and a few one-tap openers.
                <div className="m-auto flex max-w-sm flex-col items-center py-10 text-center">
                  <Avatar name={otherName || "?"} src={otherAvatar} size={64} online={isOnline} className="ring-4 ring-surface shadow-md" />
                  <p className="mt-3 text-base font-bold text-slate-900">{t("sayHelloTo", { name: otherName })}</p>
                  <p className="mt-1 text-xs text-slate-500">{t("chatStarterHint")}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {starters.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          onDraftChange(s);
                          inputRef.current?.focus();
                        }}
                        className="rounded-full border border-brand-200 bg-surface px-3 py-1.5 text-[13px] font-medium text-brand-800 shadow-sm transition-colors hover:border-brand-400 hover:bg-brand-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {mayHaveOlder && (
                    <div className="flex justify-center pb-3">
                      <button
                        type="button"
                        onClick={() => {
                          const el = listRef.current;
                          anchorFromBottom.current = el ? el.scrollHeight - el.scrollTop : null;
                          setLimit((n) => n + MESSAGES_PAGE);
                        }}
                        className="rounded-full border border-slate-200 bg-surface px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors duration-200 hover:bg-slate-50"
                      >
                        {t("loadOlderMessages")}
                      </button>
                    </div>
                  )}
                  {rows.map(({ m, newDay, firstInRun, lastInRun }) => (
                    <div key={m.id}>
                      {newDay && (
                        <div className="my-4 flex justify-center first:mt-0" role="separator">
                          <span className="rounded-full bg-slate-200/70 px-3 py-1 text-[11px] font-medium text-slate-600">
                            {formatDayLabel(m.created_at, lang)}
                          </span>
                        </div>
                      )}
                      <ChatBubble
                        message={m}
                        mine={m.sender_profile_id === me.id}
                        myProfileId={me.id}
                        otherName={otherName}
                        otherAvatarUrl={otherAvatar}
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

              {showSeen && !otherTyping && (
                <p className="-mt-1.5 mb-1 pr-1 text-right text-[11px] text-slate-400">
                  {t("seenLabel")} {relativeTime(lastMessage.read_at!, lang)}
                </p>
              )}

              {/* Where their next message will land: their avatar and a
                  bubble the shape of a short message, so nothing jumps when
                  the real one replaces it. */}
              {otherTyping && (
                <div className="animate-message-in mb-2.5 flex items-end gap-1.5" role="status">
                  <Avatar name={otherName || "?"} src={otherAvatar} size={28} profileId={otherId} />
                  <span className="flex h-[34px] items-center rounded-[18px] rounded-bl-[6px] bg-surface px-3.5 text-slate-400 shadow-sm ring-1 ring-slate-200/70">
                    <TypingDots size="md" />
                    <span className="sr-only">
                      {otherName} {t("typingIndicator")}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Reading history shouldn't be interrupted, so new messages raise
              this instead of dragging the thread down under the finger. */}
          {showJump && items.length > 0 && (
            <button
              type="button"
              onClick={() => scrollToEnd("smooth")}
              aria-label={unreadBelow ? t("newMessages") : t("jumpToLatest")}
              className={cn(
                "absolute bottom-4 z-20 inline-flex items-center gap-1.5 rounded-full shadow-lg transition-all duration-200",
                unreadBelow
                  ? "left-1/2 -translate-x-1/2 bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
                  : "right-4 h-9 w-9 justify-center bg-surface text-slate-600 ring-1 ring-slate-200 hover:text-brand-700",
              )}
            >
              <ArrowDown className="h-4 w-4" aria-hidden />
              {unreadBelow && t("newMessages")}
            </button>
          )}
        </div>

        {/* ---- Composer ------------------------------------------------- */}
        <form
          className="border-t border-slate-200 bg-surface px-2.5 pb-[calc(0.5rem+var(--sab))] pt-2 sm:px-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="mx-auto w-full max-w-3xl">
            {(replyTo || editing) && (
              <div className="animate-in-up mb-2 flex items-start gap-2.5 rounded-2xl border border-brand-200 bg-brand-50/70 px-3 py-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface text-brand-700 ring-1 ring-brand-200" aria-hidden>
                  {editing ? <Pencil className="h-3.5 w-3.5" /> : <CornerUpLeft className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1 border-l-2 border-brand-500 pl-2.5">
                  <span className="block text-xs font-semibold text-brand-900">
                    {editing
                      ? t("editingMessage")
                      : t("replyingTo", {
                          name: replyTo!.sender_profile_id === me.id ? t("youLabel") : (other.data?.full_name ?? ""),
                        })}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{(editing ?? replyTo)!.body}</span>
                </span>
                <button
                  type="button"
                  onClick={cancelComposer}
                  aria-label={t("cancel")}
                  className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors duration-200 hover:bg-surface hover:text-slate-600"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            )}

            <div className="relative flex items-end gap-2">
              <div className="flex min-w-0 flex-1 items-end gap-0.5 rounded-[22px] border border-slate-200 bg-slate-50 py-[3px] pl-1 pr-3 transition-colors focus-within:border-brand-400 focus-within:bg-surface">
                <button
                  type="button"
                  data-chat-emoji
                  onClick={() => setEmojiOpen((v) => !v)}
                  aria-expanded={emojiOpen}
                  aria-label={t("addEmoji")}
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                    emojiOpen ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100 hover:text-brand-700",
                  )}
                >
                  <Smile className="h-4.5 w-4.5" aria-hidden />
                </button>
                {/* Deliberately not autofocused: on a phone the keyboard would
                    spring up and resize the viewport just as the thread is
                    settling on its newest message. */}
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  onBlur={stopTyping}
                  enterKeyHint="send"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    } else if (e.key === "Escape" && (replyTo || editing)) {
                      cancelComposer();
                    }
                  }}
                  placeholder={editing ? t("editMessagePlaceholder") : t("chatPlaceholder")}
                  maxLength={1000}
                  aria-label={t("chatPlaceholder")}
                  className="max-h-32 min-h-9 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!draft.trim() || saveEdit.isPending}
                aria-label={editing ? t("save") : t("send")}
                // Tapping send must not take focus from the box: on a phone
                // that would drop the keyboard after every message.
                onPointerDown={(e) => e.preventDefault()}
                className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-brand-700 text-white transition-all duration-200 hover:bg-brand-800 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {editing ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  <Send className="h-4 w-4 -translate-x-px translate-y-px" aria-hidden />
                )}
              </button>

              {emojiOpen && (
                <div
                  data-chat-emoji
                  className="animate-in-up absolute bottom-full left-0 z-30 mb-2 w-[min(21rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-surface p-2 shadow-xl"
                >
                  <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto">
                    {ALL_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="rounded-lg py-1.5 text-xl transition-transform duration-150 hover:scale-125 hover:bg-slate-50"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
      </div>
      </div>
    </div>
  );
}
