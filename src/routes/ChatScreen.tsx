import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, CornerUpLeft, Pencil, Send, X } from "lucide-react";
import { AppHeader } from "@/components/duleko/Layout";
import { ChatBubble, type BubblePanel } from "@/components/duleko/ChatBubble";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/ui/states";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { useTypingFrom, useTypingSender } from "@/hooks/use-typing";
import {
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
import { supabase, errorMessage } from "@/lib/supabase";
import { cn, relativeTime } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

const TYPING_BROADCAST_THROTTLE_MS = 1500;
const TYPING_STOP_AFTER_MS = 3000;
const HIGHLIGHT_MS = 1600;

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
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTypingSentAt = useRef(0);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const other = useQuery({ queryKey: ["profile", otherId], queryFn: () => getProfile(otherId) });

  const typingFrom = useTypingFrom(me?.id);
  const otherTyping = typingFrom.has(otherId);
  const notifyTyping = useTypingSender(me?.id, otherId);

  const pairKey = me ? chatPairKey(me.id, otherId) : null;

  const messages = useQuery({
    queryKey: ["messages", pairKey],
    queryFn: () => listMessages(me!.id, otherId),
    enabled: Boolean(me && pairKey),
  });

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

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.data]);

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

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        title={other.data?.full_name ?? ""}
        subtitle={
          otherTyping
            ? `${other.data?.full_name ?? ""} ${t("typingIndicator")}`
            : other.data?.is_official
              ? `✓ ${t("officialAccount")}`
              : undefined
        }
        back={
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label={t("back")}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
        }
        right={<Avatar name={other.data?.full_name ?? "?"} src={other.data?.avatar_url} size={32} />}
      />

      <div ref={listRef} className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-1 overflow-y-auto px-4 py-4">
        {messages.isLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">{t("loading")}</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{t("chatEmpty")}</p>
        ) : (
          items.map((m) => (
            <ChatBubble
              key={m.id}
              message={m}
              mine={m.sender_profile_id === me.id}
              myProfileId={me.id}
              otherName={other.data?.full_name ?? ""}
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
          ))
        )}
        {showSeen && (
          <p className="pt-1 text-right text-xs text-slate-400">
            {t("seenLabel")} · {relativeTime(lastMessage.read_at!, lang)}
          </p>
        )}
        {otherTyping && (
          <p className="pt-1 text-left text-xs italic text-slate-400">
            {other.data?.full_name} {t("typingIndicator")}
          </p>
        )}
      </div>

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
            <input
              ref={inputRef}
              autoFocus
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
