import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Share } from "@capacitor/share";
import { Copy, Gift, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/states";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { applyReferral, getMyReferral } from "@/lib/queries";
import {
  cleanReferralCode,
  looksLikeReferralCode,
  referralErrorKey,
  referralLink,
} from "@/lib/referral";
import { copyLink } from "@/lib/share";
import { errorMessage } from "@/lib/supabase";
import { formatNumber } from "@/lib/utils";

/**
 * Profile > Settings > Invite friends: my code to share, how many joined
 * with it, and - in a new member's first week - a place to add the code
 * they were given if they skipped it while creating their profile.
 */
export function InviteFriendsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [entered, setEntered] = useState("");
  const [enterError, setEnterError] = useState<string | null>(null);

  const referral = useQuery({ queryKey: ["my-referral"], queryFn: getMyReferral, enabled: open });
  const code = referral.data?.code ?? null;

  const apply = useMutation({
    mutationFn: (value: string) => applyReferral(value),
    onSuccess: ({ referrer_name }) => {
      toast(t("referralApplied", { name: referrer_name }));
      setEntered("");
      void queryClient.invalidateQueries({ queryKey: ["my-referral"] });
      void queryClient.invalidateQueries({ queryKey: ["fee-account"] });
    },
    onError: (error) => {
      const key = referralErrorKey(error);
      setEnterError(key ? t(key) : errorMessage(error));
    },
  });

  function submitCode() {
    const value = cleanReferralCode(entered);
    if (!looksLikeReferralCode(value)) {
      setEnterError(t("referralErrFormat"));
      return;
    }
    setEnterError(null);
    apply.mutate(value);
  }

  async function copyCode() {
    if (!code) return;
    const result = await copyLink(code);
    toast(result === "copied" ? t("referralCopied") : t("copyFailed"), result === "copied" ? "success" : "error");
  }

  async function shareInvite() {
    if (!code) return;
    const url = referralLink(code);
    const text = t("referralShareText", { code });
    try {
      await Share.share({ title: t("referralInvite"), text, url });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
    // No share sheet (most computers): copy the message and the link instead.
    const result = await copyLink(`${text}\n${url}`);
    toast(result === "copied" ? t("referralCopied") : t("copyFailed"), result === "copied" ? "success" : "error");
  }

  const joined = referral.data?.joined ?? 0;

  return (
    <Dialog open={open} onClose={onClose} title={t("referralInvite")}>
      {referral.isError ? (
        <ErrorState message={errorMessage(referral.error)} onRetry={() => referral.refetch()} retryLabel={t("retry")} />
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-4 text-center">
            <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <Gift className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-800">{t("referralYourCode")}</p>
            {code ? (
              <p className="mt-1 select-all font-mono text-3xl font-bold tracking-[0.2em] text-brand-900">{code}</p>
            ) : (
              <div className="skeleton mx-auto mt-2 h-9 w-40 rounded-lg" aria-hidden />
            )}
            <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-brand-900/80">{t("referralHow")}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={copyCode} disabled={!code}>
              <Copy className="h-4 w-4" aria-hidden />
              {t("referralCopy")}
            </Button>
            <Button onClick={shareInvite} disabled={!code}>
              <Share2 className="h-4 w-4" aria-hidden />
              {t("referralShare")}
            </Button>
          </div>

          {referral.data && (
            <p className="text-center text-sm text-slate-600">
              {joined > 0 ? t("referralJoined", { count: formatNumber(joined, lang) }) : t("referralJoinedNone")}
            </p>
          )}

          {referral.data?.referred_by && (
            <p className="text-center text-xs text-slate-500">
              {t("referralInvitedBy", { name: referral.data.referred_by })}
            </p>
          )}

          {referral.data?.can_enter && (
            <div className="border-t border-slate-100 pt-4">
              <Field label={t("referralEnterTitle")} hint={t("referralEnterHint")} error={enterError ?? undefined} className="mb-2">
                <Input
                  value={entered}
                  onChange={(e) => {
                    setEntered(e.target.value.toUpperCase());
                    setEnterError(null);
                  }}
                  placeholder="SANJ42"
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={16}
                  className="font-mono tracking-widest"
                />
              </Field>
              <Button variant="outline" className="w-full" loading={apply.isPending} disabled={!entered.trim()} onClick={submitCode}>
                {t("referralApply")}
              </Button>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
