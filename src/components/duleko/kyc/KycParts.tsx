import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookUser, Car, FileBadge, Hourglass, IdCard, ShieldAlert, ShieldCheck, type LucideIcon } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useI18n, type StringKey } from "@/lib/i18n";
import { getMyKyc } from "@/lib/queries";
import type { KycDocType, KycRejectionCode } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Shared bits of ID checks (6300_kyc_verification.sql): names and icons
 * for each document, the rejection reasons, the member's own latest
 * check, and the card on their profile that leads to Get verified.
 */

export const KYC_DOC_LABEL: Record<KycDocType, StringKey> = {
  citizenship: "kycDocCitizenship",
  national_id: "kycDocNationalId",
  driving_license: "kycDocDrivingLicense",
  passport: "kycDocPassport",
};

export const KYC_DOC_ICON: Record<KycDocType, LucideIcon> = {
  citizenship: FileBadge,
  national_id: IdCard,
  driving_license: Car,
  passport: BookUser,
};

export const KYC_REJECTION_CODES: KycRejectionCode[] = ["unclear", "name_mismatch", "incomplete", "not_valid", "other"];

/** What staff pick from. */
export const KYC_REASON_SHORT: Record<KycRejectionCode, StringKey> = {
  unclear: "kycReasonShortUnclear",
  name_mismatch: "kycReasonShortNameMismatch",
  incomplete: "kycReasonShortIncomplete",
  not_valid: "kycReasonShortNotValid",
  other: "kycReasonShortOther",
};

/** What the member reads. "Other" has no sentence of its own - its note is the reason. */
const KYC_REASON_TEXT: Record<KycRejectionCode, StringKey | null> = {
  unclear: "kycReasonUnclear",
  name_mismatch: "kycReasonNameMismatch",
  incomplete: "kycReasonIncomplete",
  not_valid: "kycReasonNotValid",
  other: null,
};

/** Why an ID was turned down, as the member reads it: the reason, then the reviewer's note. */
export function useRejectionText() {
  const { t } = useI18n();
  return (code: KycRejectionCode | null, note: string | null) => {
    const reason = code ? KYC_REASON_TEXT[code] : null;
    return [reason ? t(reason) : null, note?.trim() || null].filter(Boolean).join(" ");
  };
}

/** Your latest ID check. Staff never have one, so it isn't fetched for them. */
export function useMyKyc() {
  const { profile } = useSession();
  return useQuery({
    queryKey: ["my-kyc", profile?.id],
    queryFn: () => getMyKyc(profile!.id),
    enabled: Boolean(profile && !profile.staff_role),
  });
}

/**
 * On your own profile, until you're verified: get the badge, the check
 * is under way, or it wasn't accepted and why. Staff never see it -
 * their staff badge already stands for "verified".
 */
export function KycProfileCard({ className }: { className?: string }) {
  const { t } = useI18n();
  const { profile } = useSession();
  const kyc = useMyKyc();
  const rejectionText = useRejectionText();
  if (!profile || profile.staff_role || profile.is_verified || !kyc.isSuccess) return null;

  const latest = kyc.data;
  const state = latest?.status === "pending" ? "pending" : latest?.status === "rejected" ? "rejected" : "start";
  const Icon = state === "pending" ? Hourglass : state === "rejected" ? ShieldAlert : ShieldCheck;
  const title = state === "pending" ? t("kycCardPending") : state === "rejected" ? t("kycCardRejected") : t("kycCardTitle");
  const body =
    state === "pending"
      ? t("kycCardPendingBody")
      : state === "rejected"
        ? rejectionText(latest!.rejection_code, latest!.rejection_note)
        : t("kycCardBody");
  const cta = state === "pending" ? t("kycCardView") : state === "rejected" ? t("kycCardTryAgain") : t("kycTitle");

  return (
    <section
      className={cn(
        "animate-in-up flex flex-wrap items-center gap-x-3.5 gap-y-3 rounded-2xl border p-3.5 shadow-sm sm:flex-nowrap sm:p-4",
        state === "rejected"
          ? "border-amber-200 bg-amber-50/60"
          : "border-brand-200 bg-gradient-to-br from-brand-50/80 via-surface to-surface",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          state === "rejected" ? "bg-amber-100 text-amber-700" : "bg-brand-100 text-brand-700",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 basis-48">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-xs leading-snug text-slate-600">{body}</p>
      </div>
      <Link
        to="/verify"
        className={cn(
          "inline-flex h-9 shrink-0 items-center justify-center rounded-xl px-3.5 text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2",
          state === "pending"
            ? "border border-slate-300 bg-surface text-slate-800 hover:bg-slate-50"
            : "bg-brand-700 text-white hover:bg-brand-800",
        )}
      >
        {cta}
      </Link>
    </section>
  );
}
