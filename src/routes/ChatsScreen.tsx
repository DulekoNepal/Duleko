import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { Avatar } from "@/components/ui/avatar";
import { CardSkeleton, EmptyState } from "@/components/ui/states";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { listConversations } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { relativeTime } from "@/lib/utils";

/** The "all my chats" list — a plain, simple inbox, like Messenger's home tab. */
export function ChatsScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const conversations = useQuery({
    queryKey: ["conversations", profile?.id],
    queryFn: () => listConversations(profile!.id),
    enabled: Boolean(profile?.id),
  });

  // Live updates: a message either direction refreshes the list and its
  // ordering, from anywhere the app has a live channel open.
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`conversations:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `profile_a=eq.${profile.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["conversations", profile.id] }),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `profile_b=eq.${profile.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["conversations", profile.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  const items = conversations.data ?? [];

  return (
    <>
      <AppHeader title={t("chatsTitle")} />
      <PageContainer>
        {conversations.isLoading ? (
          <CardSkeleton count={4} />
        ) : items.length === 0 ? (
          <EmptyState icon={<MessageCircle className="h-8 w-8" />} title={t("noChatsYet")} hint={t("noChatsYetHint")} />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {items.map((c) => (
              <li key={c.otherProfileId}>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/chat/$otherId", params: { otherId: c.otherProfileId } })}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <Avatar name={c.otherName} src={c.otherAvatarUrl} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium text-slate-900">{c.otherName}</span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {relativeTime(c.lastCreatedAt, lang)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-slate-500">
                      {c.lastSenderProfileId === profile?.id ? t("youPrefix") : ""}
                      {c.lastBody}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </>
  );
}
