import { Receipt, ShieldCheck, Wallet } from "lucide-react";
import { FeeReminder } from "@/components/duleko/payments/FeeReminder";
import { PaymentMethodsManager } from "@/components/duleko/payments/PaymentMethodsManager";
import { SectionCard } from "@/components/duleko/ProfileParts";
import { ListGroup, ListRow } from "@/components/duleko/SettingsList";
import { useFeeAccount } from "@/hooks/use-fee-account";
import { useSession } from "@/hooks/use-session";
import { standingOf } from "@/lib/fees";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatMoney } from "@/lib/utils";

/**
 * How people pay you, and where you stand with Duleko's fees. A fee that
 * is due or past due leads the tab, above everything else.
 */
export function PaymentsTab() {
  const { t, lang } = useI18n();
  const { profile, user } = useSession();
  const feeAccount = useFeeAccount();
  if (!profile || !user) return null;

  /** The Duleko fees row's hint: where you stand, once it's known. */
  function feeHint(): string {
    const a = feeAccount.data;
    if (!a) return t("feesShortcutHint");
    const standing = standingOf(a);
    if (standing === "overdue") return t("feesOverdueTitle", { amount: formatMoney(a.overdue - a.awaiting, lang) });
    if (standing === "due") {
      return t("feesDueTitle", {
        amount: formatMoney(a.payable_now - a.awaiting, lang),
        date: a.due_on ? formatDate(a.due_on, lang) : "",
      });
    }
    if (standing === "awaiting") return t("feesAwaitingTitle");
    return t("feesShortcutHint");
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <FeeReminder />

      <div className="grid grid-cols-1 gap-3 md:gap-4 @3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @3xl:items-start">
        <SectionCard compact icon={Wallet} title={t("payDetailsTitle")}>
          <p className="mb-3 text-xs leading-relaxed text-slate-500">{t("payDetailsHint")}</p>
          <div className="@container">
            <PaymentMethodsManager owner={profile.id} folder={user.id} />
          </div>
        </SectionCard>

        <div className="min-w-0 space-y-3 md:space-y-4">
          <ListGroup title={t("feesTitle")}>
            <ListRow icon={Receipt} title={t("feesShortcut")} hint={feeHint()} to="/fees" />
            {profile.staff_role && (
              <ListRow icon={Wallet} title={t("staffFeesShortcut")} hint={t("staffFeesShortcutHint")} to="/staff/fees" />
            )}
          </ListGroup>

          <p className="flex gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900">
            <ShieldCheck className="mt-px h-4 w-4 shrink-0" aria-hidden />
            {t("paySafety")}
          </p>
        </div>
      </div>
    </div>
  );
}
