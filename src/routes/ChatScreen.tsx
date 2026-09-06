import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { ArrowLeft, Send } from "lucide-react";
import { AppHeader } from "@/components/duleko/Layout";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/ui/states";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import {
  chatPairKey,
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

const REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];
const TYPING_BROADCAST_THROTTLE_MS = 1500;
const TYPING_STOP_AFTER_MS = 3000;

/**
 * A full-page direct-message thread with one other profile. Deliberately
 * scoped to a handful of Messenger-style basics: a live typing indicator,
 * a "Seen" read receipt on your last message, tap-to-react emoji, and
 * unsend for your own messages — no calling, groups, or media.
 */
export function ChatScreen() {
  const { t, lang } = useI18n();
  const { profile: me } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { otherId } = useParams({ from: "/chat/$otherId" });
  const [draft, setDraft] = useState("");
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [confirmUnsendId, setConfirmUnsendId] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSentAt = useRef(0);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherTypingClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const other = useQuery({ queryKey: ["profile", otherId], queryFn: () => getProfile(otherId) });

  const pairKey = me ? chatPairKey(me.id, otherId) : null;

  const messages = useQuery({
    queryKey: ["messages", pairKey],
    queryFn: () => listMessages(me!.id, otherId),
    enabled: Boolean(me && pairKey),
  });

  // One channel per thread: live new messages, live read/unsend/reaction
  // updates, and a typing broadcast that never touches the database.
  useEffect(() => {
    if (!pairKey) return;
    const channel = supabase
      .channel(`messages:${pairKey}`, { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `pair_key=eq.${pairKey}` },
        () => queryClient.invalidateQueries({ queryKey: ["messages", pairKey] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () =>
        queryClient.invalidateQueries({ queryKey: ["messages", pairKey] }),
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        setOtherTyping(Boolean((payload as { typing?: boolean })?.typing));
        if (otherTypingClearTimer.current) clearTimeout(otherTypingClearTimer.current);
        if (payload?.typing) {
          otherTypingClearTimer.current = setTimeout(() => setOtherTyping(false), TYPING_STOP_AFTER_MS + 1000);
        }
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      if (otherTypingClearTimer.current) clearTimeout(otherTypingClearTimer.current);
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
      })
      .catch(() => {
        // Best-effort — a failed read-receipt shouldn't block the chat itself.
      });
    // Only re-run when the thread identity changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id, otherId]);

  const send = useMutation({
    mutationFn: (body: string) => sendMessage(me!.id, otherId, body),
    onSuccess: () => {
      setDraft("");
      broadcastTyping(false);
      queryClient.invalidateQueries({ queryKey: ["messages", pairKey] });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const react = useMutation({
    mutationFn: ({ messageId, emoji, mine }: { messageId: string; emoji: string; mine: boolean }) =>
      mine ? removeReaction(messageId, me!.id) : setReaction(messageId, me!.id, emoji),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", pairKey] }),
    onError: (error) => toast(errorMessage(error), "error"),
    onSettled: () => setActiveMessageId(null),
  });

  const unsend = useMutation({
    mutationFn: (messageId: string) => unsendMessage(messageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", pairKey] }),
    onError: (error) => toast(errorMessage(error), "error"),
    onSettled: () => {
      setActiveMessageId(null);
      setConfirmUnsendId(null);
    },
  });

  function broadcastTyping(typing: boolean) {
    channelRef.current?.send({ type: "broadcast", event: "typing", payload: { typing } });
  }

  function onDraftChange(value: string) {
    setDraft(value);
    const now = Date.now();
    if (value.trim() && now - lastTypingSentAt.current > TYPING_BROADCAST_THROTTLE_MS) {
      lastTypingSentAt.current = now;
      broadcastTyping(true);
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => broadcastTyping(false), TYPING_STOP_AFTER_MS);
  }

  function submit() {
    const body = draft.trim();
    if (!body || send.isPending) return;
    send.mutate(body);
  }

  function reactionCounts(m: ChatMessage) {
    const byEmoji = new Map<string, { count: number; mine: boolean }>();
    for (const r of m.message_reactions) {
      const entry = byEmoji.get(r.emoji) ?? { count: 0, mine: false };
      entry.count += 1;
      if (r.profile_id === me?.id) entry.mine = true;
      byEmoji.set(r.emoji, entry);
    }
    return [...byEmoji.entries()];
  }

  if (!me || other.isLoading) return <FullPageLoader label={t("loading")} />;

  const items = messages.data ?? [];
  const lastMessage = items[items.length - 1];
  const showSeen = lastMessage && lastMessage.sender_profile_id === me.id && Boolean(lastMessage.read_at);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        title={other.data?.full_name ?? ""}
        subtitle={otherTyping ? `${other.data?.full_name ?? ""} ${t("typingIndicator")}` : undefined}
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
          items.map((m) => {
            const mine = m.sender_profile_id === me.id;
            const removed = Boolean(m.deleted_at);
            const active = activeMessageId === m.id;
            const counts = reactionCounts(m);
            return (
              <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                <button
                  type="button"
                  disabled={removed}
                  onClick={() => {
                    setActiveMessageId(active ? null : m.id);
                    setConfirmUnsendId(null);
                  }}
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-left text-sm",
                    removed
                      ? "italic text-slate-400 bg-slate-50"
                      : mine
                        ? "bg-brand-700 text-white"
                        : "bg-slate-100 text-slate-900",
                  )}
                >
                  {removed ? t("messageRemoved") : m.body}
                </button>

                {counts.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {counts.map(([emoji, { count, mine: myReaction }]) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => react.mutate({ messageId: m.id, emoji, mine: myReaction })}
                        className={cn(
                          "rounded-full border px-1.5 py-0.5 text-xs",
                          myReaction ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white",
                        )}
                      >
                        {emoji} {count}
                      </button>
                    ))}
                  </div>
                )}

                {active && !removed && confirmUnsendId !== m.id && (
                  <div className="mt-1 flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() =>
                          react.mutate({
                            messageId: m.id,
                            emoji,
                            mine: m.message_reactions.some((r) => r.profile_id === me.id && r.emoji === emoji),
                          })
                        }
                        className="rounded-lg px-1.5 py-1 text-base hover:bg-slate-100"
                      >
                        {emoji}
                      </button>
                    ))}
                    {mine && (
                      <button
                        type="button"
                        onClick={() => setConfirmUnsendId(m.id)}
                        className="ml-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        {t("unsend")}
                      </button>
                    )}
                  </div>
                )}

                {/* In-app confirmation — no native browser confirm() dialog. */}
                {active && confirmUnsendId === m.id && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2 shadow-sm">
                    <span className="text-xs text-red-800">{t("unsendConfirm")}</span>
                    <button
                      type="button"
                      disabled={unsend.isPending}
                      onClick={() => unsend.mutate(m.id)}
                      className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {t("unsend")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmUnsendId(null)}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
        {showSeen && (
          <p className="pt-1 text-right text-xs text-slate-400">
            {t("seenLabel")} · {relativeTime(lastMessage.read_at!, lang)}
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
        <div className="mx-auto flex w-full max-w-3xl gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={t("chatPlaceholder")}
            maxLength={1000}
            className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-brand-600/30"
          />
          <Button type="submit" size="icon" loading={send.isPending} disabled={!draft.trim()} aria-label={t("send")}>
            <Send className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </form>
    </div>
  );
}
