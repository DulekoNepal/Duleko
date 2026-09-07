import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Check, CheckCheck, MessageCircle } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { FriendsPanel } from "@/components/duleko/FriendsPanel";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { Avatar } from "@/components/ui/avatar";
import { CardSkeleton, EmptyState } from "@/components/ui/states";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useTypingFrom } from "@/hooks/use-typing";
import { listConversations } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { cn, relativeTime } from "@/lib/utils";

type Division = "chats" | "friends";

/**
 * The Chat tab: two separate divisions in one screen - Chats (all your
 * conversations, Messenger-style) and Friends (requests + friends list) -
 * switchable but never mixed into one combined list.
 */
export function ChatsScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [division, setDivision] = useState<Division>("chats");

  // One channel for the whole list - every row can show "typing…" without
  // opening a subscription per conversation.
  const typingFrom = useTypingFrom(profile?.id);

  const conversations = useQuery({
    queryKey: ["conversations", profile?.id],
    queryFn: () => listConversations(profile!.id),
    enabled: Boolean(profile?.id),
  });

  // Live updates from anywhere the app has a channel open. Listening to
  // every event, not just INSERT, is what keeps the Seen tick and the
  // "removed" preview current without opening the thread; reactions come
  // from their own table, so they need a second listener.
  useEffect(() => {
    if (!profile?.id) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["conversations", profile.id] });
    const channel = supabase
      .channel(`conversations:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `profile_a=eq.${profile.id}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `profile_b=eq.${profile.id}` },
        refresh,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  const items = conversations.data ?? [];

  if (!profile) return <SignInRequiredScreen title={t("chatsTitle")} />;

  return (
    <>
      <AppHeader title={t("chatsTitle")} />
      <PageContainer>
        <div
          className="mb-4 inline-flex w-full rounded-full bg-slate-100 p-0.5 text-sm font-medium"
          role="group"
          aria-label={t("chatsTitle")}
        >
          {(["chats", "friends"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDivision(d)}
              aria-pressed={division === d}
              className={cn(
                "flex-1 rounded-full py-2 transition-colors duration-200",
                division === d ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
              )}
            >
              {d === "chats" ? t("navChats") : t("myFriends")}
            </button>
          ))}
        </div>

        {division === "friends" ? (
          <FriendsPanel />
        ) : conversations.isLoading ? (
          <CardSkeleton count={4} />
        ) : items.length === 0 ? (
          <EmptyState icon={<MessageCircle className="h-8 w-8" />} title={t("noChatsYet")} hint={t("noChatsYetHint")} />
        ) : (
          // In each row the avatar is a sibling of the button, not inside
          // it: the face opens that person's profile while the rest of the
          // row opens the thread, and a link nested in a button would be
          // invalid markup with both firing at once.
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {items.map((c) => (
              <li
                key={c.otherProfileId}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-slate-50",
                  c.unread && "bg-brand-50/60",
                )}
              >
                <Avatar name={c.otherName} src={c.otherAvatarUrl} size={44} profileId={c.otherProfileId} />
                <button
                  type="button"
                  onClick={() => navigate({ to: "/chat/$otherId", params: { otherId: c.otherProfileId } })}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className={cn("truncate", c.unread ? "font-bold text-slate-950" : "font-medium text-slate-900")}>
                          {c.otherName}
                        </span>
                        {c.otherIsOfficial && (
                          <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" aria-label={t("officialAccount")} />
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {relativeTime(c.lastCreatedAt, lang)}
                      </span>
                    </span>
                    {typingFrom.has(c.otherProfileId) ? (
                      <span className="mt-0.5 block truncate text-sm italic text-brand-700">
                        {t("typingIndicator")}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "mt-0.5 flex items-center gap-1 text-sm",
                          c.unread ? "font-semibold text-brand-800" : "text-slate-500",
                        )}
                      >
                        {/* Seen tick sits on my own last message, like Messenger. */}
                        {c.lastSenderProfileId === profile?.id &&
                          (c.lastReadAt ? (
                            <CheckCheck className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-label={t("seenLabel")} />
                          ) : (
                            <Check className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                          ))}
                        <span className="truncate">
                          {c.lastSenderProfileId === profile?.id ? t("youPrefix") : ""}
                          {c.lastDeleted ? t("messageRemoved") : c.lastBody}
                        </span>
                        {c.lastReaction && <span className="shrink-0">{c.lastReaction}</span>}
                      </span>
                    )}
                  </span>
                  {c.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </>
  );
}
