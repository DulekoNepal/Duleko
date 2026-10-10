import { Link } from "@tanstack/react-router";
import { ChevronRight, Clock, TriangleAlert } from "lucide-react";
import { useFeeAccount } from "@/hooks/use-fee-account";
import { standingOf } from "@/lib/fees";
import { useI18n } from "@/lib/i18n";
import { cn, formatDate, formatMoney } from "@/lib/utils";

/**
 * A one-line nudge on Home and Work when Duleko's fees are due or past due,
 * leading to the fees page. Says nothing otherwise.
 */
export function FeeReminder({ className }: { className?: string }) {
  const { t, lang } = useI18n();
  const account = useFeeAccount();
  if (!account.data) return null;

  const standing = standingOf(account.data);
  if (standing !== "overdue" && standing !== "due") return null;
  const overdue = standing === "overdue";
  const amount = formatMoney(
    overdue ? account.data.overdue - account.data.awaiting : account.data.payable_now - account.data.awaiting,
    lang,
  );

  return (
    <Link
      to="/fees"
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-colors",
        overdue ? "border-red-200 bg-red-50 hover:bg-red-100/70" : "border-amber-200 bg-amber-50 hover:bg-amber-100/70",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          overdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800",
        )}
      >
        {overdue ? <TriangleAlert className="h-4.5 w-4.5" aria-hidden /> : <Clock className="h-4.5 w-4.5" aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-semibold", overdue ? "text-red-900" : "text-amber-900")}>
          {overdue
            ? t("feeReminderOverdue", { amount })
            : t("feeReminderDue", { amount, date: account.data.due_on ? formatDate(account.data.due_on, lang) : "" })}
        </span>
        {overdue && <span className="block text-xs text-red-800/80">{t("feeReminderOverdueHint")}</span>}
      </span>
      <ChevronRight className={cn("h-4 w-4 shrink-0", overdue ? "text-red-400" : "text-amber-500")} aria-hidden />
    </Link>
  );
}
