import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { chatPairKey, listMessages, sendMessage } from "@/lib/queries";
import { supabase, errorMessage } from "@/lib/supabase";
import { cn } from "@/lib/utils";

/**
 * A minimal direct-message thread between the signed-in user and one other
 * profile. Deliberately basic: no typing indicators, no read receipts, no
 * attachments — just messages, sent and received live over Supabase Realtime.
 */
export function ChatDialog({
  open,
  onClose,
  myProfileId,
  otherProfileId,
  otherName,
}: {
  open: boolean;
  onClose: () => void;
  myProfileId: string;
  otherProfileId: string;
  otherName: string;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const pairKey = chatPairKey(myProfileId, otherProfileId);

  const messages = useQuery({
    queryKey: ["messages", pairKey],
    queryFn: () => listMessages(myProfileId, otherProfileId),
    enabled: open,
  });

  // Live delivery while the thread is open.
  useEffect(() => {
    if (!open) return;
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
  }, [open, pairKey, queryClient]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.data]);

  const send = useMutation({
    mutationFn: (body: string) => sendMessage(myProfileId, otherProfileId, body),
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={otherName}
      footer={
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("chatPlaceholder")}
            maxLength={1000}
            className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-brand-600/30"
          />
          <Button
            type="submit"
            size="icon"
            loading={send.isPending}
            disabled={!draft.trim()}
            aria-label={t("send")}
          >
            <Send className="h-4 w-4" aria-hidden />
          </Button>
        </form>
      }
    >
      <div ref={listRef} className="flex max-h-[50vh] min-h-[30vh] flex-col gap-2 overflow-y-auto">
        {messages.isLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">{t("loading")}</p>
        ) : (messages.data?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{t("chatEmpty")}</p>
        ) : (
          (messages.data ?? []).map((m) => {
            const mine = m.sender_profile_id === myProfileId;
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
    </Dialog>
  );
}
