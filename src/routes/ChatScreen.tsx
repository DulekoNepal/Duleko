import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Send } from "lucide-react";
import { AppHeader } from "@/components/duleko/Layout";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/ui/states";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { chatPairKey, getProfile, listMessages, markMessageNotificationsRead, sendMessage } from "@/lib/queries";
import { supabase, errorMessage } from "@/lib/supabase";
import { cn } from "@/lib/utils";

/**
 * A full-page direct-message thread with one other profile — its own route
 * rather than a modal, so it behaves like a normal chat app screen (back
 * button, own URL, own scroll). Deliberately basic: no typing indicators,
 * no read receipts, no attachments.
 */
export function ChatScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { profile: me } = useSession();
  const queryClient = useQueryClient();
  const { otherId } = useParams({ from: "/chat/$otherId" });
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const other = useQuery({ queryKey: ["profile", otherId], queryFn: () => getProfile(otherId) });

  const pairKey = me ? chatPairKey(me.id, otherId) : null;

  const messages = useQuery({
    queryKey: ["messages", pairKey],
    queryFn: () => listMessages(me!.id, otherId),
    enabled: Boolean(me && pairKey),
  });

  // Live delivery while the thread is open.
  useEffect(() => {
    if (!pairKey) return;
    const channel = supabase
      .channel(`messages:${pairKey}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `pair_key=eq.${pairKey}` },
        () => queryClient.invalidateQueries({ queryKey: ["messages", pairKey] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairKey, queryClient]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.data]);

  // Opening this thread clears the Chats badge contribution from this sender.
  useEffect(() => {
    if (!me) return;
    markMessageNotificationsRead(me.id, otherId)
      .then(() => queryClient.invalidateQueries({ queryKey: ["unread-messages", me.id] }))
      .catch(() => {
        // Best-effort — a failed read-receipt shouldn't block the chat itself.
      });
  }, [me, otherId, queryClient]);

  const send = useMutation({
    mutationFn: (body: string) => sendMessage(me!.id, otherId, body),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["messages", pairKey] });
    },
    onError: (error) => alert(errorMessage(error)),
  });

  function submit() {
    const body = draft.trim();
    if (!body || send.isPending) return;
    send.mutate(body);
  }

  if (!me || other.isLoading) return <FullPageLoader label={t("loading")} />;

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        title={other.data?.full_name ?? ""}
        back={
          <button
            type="button"
            onClick={() => navigate({ to: "/worker/$workerId", params: { workerId: otherId } })}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label={t("back")}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
        }
        right={<Avatar name={other.data?.full_name ?? "?"} src={other.data?.avatar_url} size={32} />}
      />

      <div ref={listRef} className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {messages.isLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">{t("loading")}</p>
        ) : (messages.data?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{t("chatEmpty")}</p>
        ) : (
          (messages.data ?? []).map((m) => {
            const mine = m.sender_profile_id === me.id;
            return (
              <div
                key={m.id}
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                  mine ? "self-end bg-brand-700 text-white" : "self-start bg-slate-100 text-slate-900",
                )}
              >
                {m.body}
              </div>
            );
          })
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
            onChange={(e) => setDraft(e.target.value)}
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
