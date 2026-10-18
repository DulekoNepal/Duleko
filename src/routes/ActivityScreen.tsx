import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Globe2, Handshake, ShieldCheck } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { SectionCard, StatTile } from "@/components/duleko/ProfileParts";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { useI18n, type StringKey } from "@/lib/i18n";
import {
  getActivityStats,
  listRecentCallDeals,
  removeCallDeal,
  setPublicStats,
  type StaffCallDeal,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { ACTIVITY_ROWS } from "@/lib/activity";
import { formatDate, formatMoney, formatNumber } from "@/lib/utils";


const DEAL_STATUS: Record<StaffCallDeal["status"], { label: StringKey; tone: "warning" | "success" | "danger" | "muted" }> = {
  reported: { label: "dealStatusReported", tone: "warning" },
  confirmed: { label: "dealStatusConfirmed", tone: "success" },
  disputed: { label: "dealStatusDisputed", tone: "danger" },
  removed: { label: "dealStatusRemoved", tone: "muted" },
};

/**
 * Staff: how Duleko is being used (6900) - calls, accepted requests, jobs
 * done (including deals agreed over a call), reviews, repeat customers,
 * active members and the money in it all. Admins choose whether the
 * rounded numbers show on the website. The data is gated by the RPCs.
 */
export function ActivityScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [range, setRange] = useState<"all_time" | "last_30_days">("all_time");
  const [removing, setRemoving] = useState<StaffCallDeal | null>(null);

  const isStaff = Boolean(profile?.staff_role);
  const isAdmin = profile?.staff_role === "admin" || profile?.staff_role === "technical_admin";

  const stats = useQuery({ queryKey: ["activity-stats"], queryFn: getActivityStats, enabled: isStaff });
  const deals = useQuery({ queryKey: ["call-deals", "recent"], queryFn: listRecentCallDeals, enabled: isStaff });

  const toggle = useMutation({
    mutationFn: setPublicStats,
    onSuccess: (_, visible) => {
      toast(t(visible ? "activityWebsiteOn" : "activityWebsiteOff"));
      void queryClient.invalidateQueries({ queryKey: ["activity-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["public-activity"] });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const remove = useMutation({
    mutationFn: (deal: StaffCallDeal) => removeCallDeal(deal.deal_id),
    onSuccess: () => {
      toast(t("activityRemoved"));
      setRemoving(null);
      void queryClient.invalidateQueries({ queryKey: ["activity-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["call-deals"] });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  if (!profile) return <SignInRequiredScreen title={t("activityTitle")} />;

  const numbers = stats.data?.[range];

  return (
    <>
      <AppHeader title={t("activityTitle")} subtitle={t("activitySubtitle")} />
      <PageContainer className="space-y-3 md:space-y-4">
        {!isStaff ? (
          <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title={t("activitySubtitle")} />
        ) : stats.isError ? (
          <ErrorState message={errorMessage(stats.error)} onRetry={() => stats.refetch()} retryLabel={t("retry")} />
        ) : (
          <>
            <Segmented
              label={t("activityTitle")}
              options={[
                { value: "all_time", label: t("activityAllTime") },
                { value: "last_30_days", label: t("activityLast30") },
              ]}
              value={range}
              onChange={(next) => setRange(next)}
            />

            <div className="@container">
              <div className="grid grid-cols-2 gap-2 @xl:grid-cols-4 @xl:gap-2.5">
                {ACTIVITY_ROWS.map(({ key, label, icon, money }) => (
                  <StatTile
                    key={key}
                    icon={icon}
                    label={t(label)}
                    value={
                      stats.isPending
                        ? "…"
                        : money
                          ? formatMoney(numbers?.[key] ?? 0, lang)
                          : formatNumber(numbers?.[key] ?? 0, lang)
                    }
                  />
                ))}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">{t("activityHowCounted")}</p>

            <SectionCard compact icon={Globe2} title={t("activityWebsite")}>
              <div className="flex items-start gap-3">
                <p className="min-w-0 flex-1 text-xs leading-relaxed text-slate-500">
                  {t("activityWebsiteHint")}
                  {!isAdmin && <span className="mt-1 block font-medium">{t("activityWebsiteAdminsOnly")}</span>}
                </p>
                <Switch
                  checked={Boolean(stats.data?.public_visible)}
                  onChange={(next) => toggle.mutate(next)}
                  disabled={!isAdmin || stats.isPending || toggle.isPending}
                  aria-label={t("activityWebsite")}
                />
              </div>
            </SectionCard>

            <SectionCard compact icon={Handshake} title={t("activityDealsTitle")}>
              {stats.data && (stats.data.waiting_deals > 0 || stats.data.disputed_deals > 0) && (
                <p className="mb-2.5 text-xs text-slate-500">
                  {[
                    stats.data.waiting_deals > 0 &&
                      t("activityDealsWaiting", { count: formatNumber(stats.data.waiting_deals, lang) }),
                    stats.data.disputed_deals > 0 &&
                      t("activityDealsDisputed", { count: formatNumber(stats.data.disputed_deals, lang) }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {deals.isPending ? (
                <CardSkeleton count={2} />
              ) : deals.isError ? (
                <ErrorState message={errorMessage(deals.error)} onRetry={() => deals.refetch()} retryLabel={t("retry")} />
              ) : !deals.data.length ? (
                <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">{t("activityDealsEmpty")}</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {deals.data.map((deal) => {
                    const status = DEAL_STATUS[deal.status];
                    return (
                      <li key={deal.deal_id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-800">
                            <Link to="/worker/$workerId" params={{ workerId: deal.hirer_id }} className="font-semibold hover:underline">
                              {deal.hirer_name}
                            </Link>
                            {" → "}
                            <Link to="/worker/$workerId" params={{ workerId: deal.worker_id }} className="font-semibold hover:underline">
                              {deal.worker_name}
                            </Link>
                          </p>
                          <p className="text-xs text-slate-500">
                            {[deal.amount != null ? formatMoney(deal.amount, lang) : null, formatDate(deal.deal_date, lang)]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge tone={status.tone}>{t(status.label)}</Badge>
                          {deal.status !== "removed" && (
                            <button
                              type="button"
                              onClick={() => setRemoving(deal)}
                              className="rounded-md px-1 text-xs font-semibold text-red-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                            >
                              {t("activityRemoveDeal")}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          </>
        )}
      </PageContainer>

      <Dialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={t("activityRemoveTitle")}
        footer={
          <>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              {t("cancel")}
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => removing && remove.mutate(removing)}>
              {t("activityRemoveDeal")}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-700">{t("activityRemoveBody")}</p>
      </Dialog>
    </>
  );
}
