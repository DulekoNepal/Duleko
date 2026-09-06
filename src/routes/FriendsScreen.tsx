import { ArrowLeft } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { FriendsPanel } from "@/components/duleko/FriendsPanel";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";

export function FriendsScreen() {
  const { t } = useI18n();
  const { profile } = useSession();

  if (!profile) return <SignInRequiredScreen title={t("myFriends")} />;

  return (
    <>
      <AppHeader
        title={t("myFriends")}
        back={
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label={t("back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        }
      />
      <PageContainer>
        <FriendsPanel />
      </PageContainer>
    </>
  );
}
