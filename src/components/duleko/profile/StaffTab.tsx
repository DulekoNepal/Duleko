import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Segmented } from "@/components/ui/segmented";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Flag,
  Handshake,
  IdCard,
  Pin,
  ShieldCheck,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { ListGroup, ListRow } from "@/components/duleko/SettingsList";
import { StatTile } from "@/components/duleko/ProfileParts";
import { useSession } from "@/hooks/use-session";
import { ACTIVITY_ROWS } from "@/lib/activity";
import { useI18n, type StringKey } from "@/lib/i18n";
import {
  countKycQueue,
  countNewInvestorInterests,
  getActivityStats,
  getFeeOverview,
  listOpenReports,
  listPaymentsToCheck,
} from "@/lib/queries";
import { cn, formatMoney, formatNumber } from "@/lib/utils";
import type { StaffRole } from "@/lib/types";

const ROLE_LABEL: Record<StaffRole, StringKey> = {
  moderator: "moderatorRoleLabel",
  admin: "adminRoleLabel",
  technical_admin: "technicalAdminRoleLabel",
};

/** The numbers worth a glance every day; the rest live on Activity. */
const GLANCE_KEYS = ["active", "verified", "completed", "calls", "deals_npr"] as const;

/**
 * Profile > Staff: one place to start a shift. What's waiting on staff
 * (each count opens the screen that clears it), how Duleko is doing over
 * the last 30 days, and every staff tool with a line on what it's for.
 * The queries share their keys with those screens, so whatever was
 * loaded here is already there when they open, and the other way round.
 */
export function StaffTab() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const navigate = useNavigate();
  const isStaff = Boolean(profile?.staff_role);
  const [range, setRange] = useState<"last_30_days" | "all_time">("last_30_days");

  const kyc = useQuery({ queryKey: ["kyc-queue-count"], queryFn: countKycQueue, enabled: isStaff });
  const reports = useQuery({ queryKey: ["open-reports"], queryFn: listOpenReports, enabled: isStaff });
  const payments = useQuery({ queryKey: ["fee-payments-to-check"], queryFn: listPaymentsToCheck, enabled: isStaff });
  const stats = useQuery({ queryKey: ["activity-stats"], queryFn: getActivityStats, enabled: isStaff });
  const fees = useQuery({ queryKey: ["fee-overview"], queryFn: getFeeOverview, enabled: isStaff });
  const investors = useQuery({ queryKey: ["investor-interests-new"], queryFn: countNewInvestorInterests, enabled: isStaff });

  if (!profile?.staff_role) return null;

  const numbers = stats.data?.[range];
  const disputed = stats.data?.disputed_deals ?? 0;
  const waitingDeals = stats.data?.waiting_deals ?? 0;

  const queue: {
    key: string;
    icon: LucideIcon;
    label: string;
    count: number | undefined;
    hint: string;
    to: "/staff/verify" | "/moderation" | "/staff/fees" | "/staff/deals";
  }[] = [
    {
      key: "kyc",
      icon: IdCard,
      label: t("staffQueueKyc"),
      count: kyc.data,
      hint: t("staffQueueKycHint"),
      to: "/staff/verify",
    },
    {
      key: "reports",
      icon: Flag,
      label: t("staffQueueReports"),
      count: reports.data?.length,
      hint: t("staffQueueReportsHint"),
      to: "/moderation",
    },
    {
      key: "payments",
      icon: Wallet,
      label: t("staffQueuePayments"),
      count: payments.data?.length,
      hint: t("staffQueuePaymentsHint"),
      to: "/staff/fees",
    },
    {
      key: "deals",
      icon: Handshake,
      label: t("staffQueueDeals"),
      // Only disputes nobody has settled yet (8400) - this can reach "All clear".
      count: stats.data ? disputed : undefined,
      hint: t("staffQueueDealsHint"),
      to: "/staff/deals",
    },
  ];
  const loaded = queue.every((q) => q.count !== undefined);
  const waiting = queue.reduce((sum, q) => sum + (q.count ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Who you are here, and how much is waiting. */}
      <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-surface p-3 shadow-sm sm:gap-3 sm:rounded-2xl sm:p-3.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 sm:h-10 sm:w-10 sm:rounded-xl">
          <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-900 sm:text-sm">{t("staffDashboard")}</p>
          <p className="text-[11px] leading-snug text-slate-500 sm:text-xs">
            {t("staffSignedInAs", { role: t(ROLE_LABEL[profile.staff_role]) })}
          </p>
        </div>
        {loaded && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs",
              waiting > 0 ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800",
            )}
          >
            {waiting > 0 ? t("staffWaitingTotal", { count: formatNumber(waiting, lang) }) : t("staffAllClear")}
          </span>
        )}
      </div>

      {/* ---- 1. What's waiting on staff ---------------------------------- */}
      <section>
        <h3 className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {t("staffNeedsAttention")}
        </h3>
        <div className="grid grid-cols-2 gap-2 @2xl:grid-cols-4">
          {queue.map(({ key, icon: Icon, label, count, hint, to }) => {
            const busy = (count ?? 0) > 0;
            return (
              <Link
                key={key}
                to={to}
                className={cn(
                  "group flex min-w-0 flex-col rounded-xl border p-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:rounded-2xl sm:p-3",
                  busy ? "border-amber-200 bg-amber-50/60 hover:border-amber-300" : "border-slate-200 bg-surface hover:border-brand-300",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8",
                      busy ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                  </span>
                  <ChevronRight
                    className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 sm:h-4 sm:w-4"
                    aria-hidden
                  />
                </span>
                <span className="mt-2 flex items-baseline gap-1.5 sm:mt-2.5">
                  {count === undefined ? (
                    <span className="skeleton h-5 w-7 rounded sm:h-6 sm:w-8" aria-hidden />
                  ) : busy ? (
                    <span className="text-xl font-bold tabular-nums leading-none text-slate-900 sm:text-2xl">
                      {formatNumber(count, lang)}
                    </span>
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" aria-label={t("staffAllClear")} />
                  )}
                </span>
                <span className="mt-1.5 text-[13px] font-semibold leading-snug text-slate-900 sm:text-sm">{label}</span>
                <span className="mt-0.5 text-[11px] leading-snug text-slate-500">{busy ? hint : t("staffAllClear")}</span>
                {/* Deals still waiting on the worker aren't staff's to do - just worth knowing. */}
                {key === "deals" && waitingDeals > 0 && (
                  <span className="mt-1 text-[10px] font-medium leading-snug text-amber-700 sm:text-[11px]">
                    {t("staffQueueDealsWaiting", { count: formatNumber(waitingDeals, lang) })}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---- 2. How Duleko is doing ---------------------------------------- */}
      <section>
        <div className="flex items-center justify-between gap-3 px-1 pb-1.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t("siteStatsEyebrow")}
          </h3>
          <div className="flex items-center gap-2">
            <Segmented
              label={t("activityTitle")}
              options={[
                { value: "last_30_days", label: t("activityLast30") },
                { value: "all_time", label: t("activityAllTime") },
              ]}
              value={range}
              onChange={(next) => setRange(next)}
            />
            <Link
              to="/staff/activity"
              className="hidden text-xs font-semibold text-brand-700 hover:text-brand-800 @md:inline"
            >
              {t("seeAll")}
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 @xl:grid-cols-3 @2xl:grid-cols-6">
          {GLANCE_KEYS.map((key) => {
            const row = ACTIVITY_ROWS.find((r) => r.key === key)!;
            const value = numbers?.[key];
            return (
              <StatTile
                key={key}
                icon={row.icon}
                label={t(row.label)}
                value={
                  value == null ? "…" : row.money ? formatMoney(value, lang) : formatNumber(value, lang)
                }
                onClick={() =>
                  navigate({
                    to: "/staff/activity/$kind",
                    params: { kind: key },
                    search: range === "last_30_days" ? { range } : {},
                  })
                }
              />
            );
          })}
          <StatTile
            icon={Wallet}
            label={t("staffFeesOverdue")}
            value={fees.data ? formatMoney(fees.data.overdue, lang) : "…"}
            onClick={() => navigate({ to: "/staff/fees" })}
          />
        </div>
        <div className="flex items-center justify-between gap-3 px-1 pt-1.5">
          <p className="text-[11px] text-slate-500">{t("staffAtAGlanceHint")}</p>
          {/* On a phone the header has no room for it. */}
          <Link to="/staff/activity" className="shrink-0 text-xs font-semibold text-brand-700 hover:text-brand-800 @md:hidden">
            {t("seeAll")}
          </Link>
        </div>
      </section>

      {/* ---- 3. Every staff tool ------------------------------------------- */}
      <ListGroup title={t("staffTools")}>
        <ListRow icon={ShieldCheck} title={t("moderation")} hint={t("staffToolModerationHint")} to="/moderation" />
        <ListRow icon={IdCard} title={t("kycQueueTitle")} hint={t("kycQueueSubtitle")} to="/staff/verify" />
        <ListRow icon={Handshake} title={t("dealsTitle")} hint={t("staffToolDealsHint")} to="/staff/deals" />
        <ListRow
          icon={TrendingUp}
          title={t("investorsTitle")}
          hint={t("staffToolInvestorsHint")}
          to="/staff/investors"
          trailing={
            investors.data ? (
              <span className="flex items-center gap-1">
                <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold tabular-nums leading-[18px] text-amber-800">
                  {formatNumber(investors.data, lang)}
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden />
              </span>
            ) : undefined
          }
        />
        <ListRow icon={Wallet} title={t("staffFeesShortcut")} hint={t("staffFeesShortcutHint")} to="/staff/fees" />
        <ListRow icon={Activity} title={t("activityShortcut")} hint={t("staffToolActivityHint")} to="/staff/activity" />
        <ListRow icon={Pin} title={t("noticeBoard")} hint={t("staffToolNoticesHint")} to="/notices" />
      </ListGroup>
    </div>
  );
}
