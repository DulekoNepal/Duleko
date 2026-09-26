import { MessageCircle } from "lucide-react";
import { AppHeader, LanguageToggleButton, PageContainer } from "@/components/duleko/Layout";
import { ChatSidebar, useConversationsLive } from "@/components/duleko/ConversationList";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useTypingFrom } from "@/hooks/use-typing";
import { CHAT_SPLIT_QUERY, useMediaQuery } from "@/hooks/use-media-query";

/**
 * The Chat tab: two separate divisions in one screen - Chats (all your
 * conversations, Messenger-style) and Friends (requests + friends list) -
 * switchable but never mixed into one combined list. On a desktop it is the
 * left half of a split view, with the open thread beside it.
 */
export function ChatsScreen() {
  const { t } = useI18n();
  const { profile } = useSession();
  const split = useMediaQuery(CHAT_SPLIT_QUERY);

  // Opened once here - the typing channel and the live list can't be
  // subscribed twice on the same screen.
  const typingFrom = useTypingFrom(profile?.id);
  useConversationsLive(profile?.id);

  if (!profile) return <SignInRequiredScreen title={t("chatsTitle")} />;

  if (!split) {
    return (
      <>
        <AppHeader title={t("chatsTitle")} />
        <PageContainer className="px-0 pt-4">
          <ChatSidebar typingFrom={typingFrom} />
        </PageContainer>
      </>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-cream-50">
      <ChatsPane typingFrom={typingFrom} />
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center p-8 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-brand-700 shadow-sm ring-1 ring-slate-200">
          <MessageCircle className="h-9 w-9" aria-hidden />
        </span>
        <h2 className="mt-5 text-xl font-bold text-slate-900">{t("selectConversation")}</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">{t("selectConversationHint")}</p>
      </main>
    </div>
  );
}

/** The desktop left pane: title bar over the sidebar. Shared with the thread view. */
export function ChatsPane({
  typingFrom,
  activeId,
  showDivisions = true,
}: {
  typingFrom: Set<string>;
  activeId?: string;
  showDivisions?: boolean;
}) {
  const { t } = useI18n();
  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-r border-slate-200 bg-white pt-[var(--sat)] xl:w-[380px]">
      <div className="flex h-[72px] items-center justify-between gap-3 px-4">
        <h1 className="text-xl font-bold text-slate-900">{t("chatsTitle")}</h1>
        <LanguageToggleButton />
      </div>
      <ChatSidebar typingFrom={typingFrom} activeId={activeId} showDivisions={showDivisions} className="flex-1" />
    </aside>
  );
}
