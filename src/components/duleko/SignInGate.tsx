import { Link } from "@tanstack/react-router";
import { LogIn, Sparkles } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AppHeader, PageContainer } from "./Layout";
import { useI18n } from "@/lib/i18n";
import { useGuestMode } from "@/hooks/use-guest-mode";

/**
 * The prompt a guest sees the instant they tap a gated action - add friend,
 * call, chat, request work, review, upload a certificate, share location,
 * or a phone number. Nothing they were doing is lost; there's simply
 * nothing to do until they have an account.
 */
export function SignInPromptDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { requestSignIn } = useGuestMode();

  return (
    <Dialog open={open} onClose={onClose} title={t("signInRequiredTitle")}>
      <div className="flex flex-col items-center py-2 text-center">
        <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Sparkles className="h-6 w-6" aria-hidden />
        </span>
        <p className="text-sm leading-relaxed text-slate-600">{t("signInRequiredBody")}</p>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        <Button size="lg" onClick={requestSignIn}>
          <LogIn className="h-4 w-4" aria-hidden />
          {t("signUpOrLogIn")}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          {t("notNow")}
        </Button>
      </div>
    </Dialog>
  );
}

/**
 * Shown instead of a whole screen (Work, Chats, Notifications, Profile,
 * Friends) when a guest reaches it directly - via the bottom nav or a
 * direct link - rather than through one specific action.
 */
export function SignInRequiredScreen({ title }: { title: string }) {
  const { t } = useI18n();
  const { requestSignIn } = useGuestMode();

  return (
    <>
      <AppHeader title={title} />
      <PageContainer>
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <LogIn className="h-6 w-6" aria-hidden />
          </span>
          <p className="font-medium text-slate-800">{t("signInRequiredTitle")}</p>
          <p className="mt-1 max-w-xs text-sm text-slate-500">{t("signInRequiredBody")}</p>
          <div className="mt-5 flex w-full max-w-xs flex-col gap-2">
            <Button size="lg" onClick={requestSignIn}>
              {t("signUpOrLogIn")}
            </Button>
            <Link
              to="/"
              className="inline-flex h-11 items-center justify-center rounded-xl text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              {t("keepExploring")}
            </Link>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
