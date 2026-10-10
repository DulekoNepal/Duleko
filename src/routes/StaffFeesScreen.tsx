import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, CircleCheck, Hourglass, Landmark, Receipt, ShieldCheck, TriangleAlert, Users, Wallet, X } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { SectionCard, StatTile } from "@/components/duleko/ProfileParts";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { PaymentMethodsManager } from "@/components/duleko/payments/PaymentMethodsManager";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import {
  DULEKO_PAYMENTS_FOLDER,
  getFeeOverview,
  listPaymentsToCheck,
  reviewFeePayment,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { formatDate, formatMoney, relativeTime } from "@/lib/utils";
import type { FeePayment } from "@/lib/types";

/**
 * Staff: Duleko's fees at a glance. Payments workers have recorded wait
 * here to be checked against Duleko's bank and wallet statements; admins
 * confirm them or say they never arrived, and keep Duleko's own accounts
 * (with the official QR) up to date. Moderators can look but not change.
 * The data is gated by RLS and the RPCs, not by this screen.
 */
export function StaffFeesScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState<FeePayment | null>(null);
  const [reason, setReason] = useState("");

  const isStaff = Boolean(profile?.staff_role);
  const isAdmin = profile?.staff_role === "admin" || profile?.staff_role === "technical_admin";

  const overview = useQuery({ queryKey: ["fee-overview"], queryFn: getFeeOverview, enabled: isStaff });
  const toCheck = useQuery({ queryKey: ["fee-payments-to-check"], queryFn: listPaymentsToCheck, enabled: isStaff });

  const review = useMutation({
    mutationFn: ({ payment, accept, why }: { payment: FeePayment; accept: boolean; why?: string }) =>
      reviewFeePayment(payment.id, accept, why),
    onSuccess: (_, { accept }) => {
      void queryClient.invalidateQueries({ queryKey: ["fee-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["fee-payments-to-check"] });
      setRejecting(null);
      toast(t(accept ? "staffConfirmed" : "staffRejected"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  if (!profile) return <SignInRequiredScreen title={t("staffFeesTitle")} />;

  return (
    <>
      <AppHeader title={t("staffFeesTitle")} subtitle={t("staffFeesSubtitle")} />
      <PageContainer className="space-y-3 md:space-y-4">
        {!isStaff ? (
          <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title={t("staffFeesSubtitle")} />
        ) : (
          <>
            {overview.isError ? (
              <ErrorState message={errorMessage(overview.error)} onRetry={() => overview.refetch()} retryLabel={t("retry")} />
            ) : (
              <div className="@container">
                <div className="grid grid-cols-2 gap-2 @xl:grid-cols-4 @xl:gap-2.5">
                  <StatTile icon={Receipt} label={t("staffFeesCharged")} value={formatMoney(overview.data?.charged ?? 0, lang)} />
                  <StatTile icon={CircleCheck} label={t("feesPaidTotal")} value={formatMoney(overview.data?.paid ?? 0, lang)} />
                  <StatTile icon={Wallet} label={t("staffFeesOwed")} value={formatMoney(overview.data?.balance ?? 0, lang)} />
                  <StatTile icon={TriangleAlert} label={t("staffFeesOverdue")} value={formatMoney(overview.data?.overdue ?? 0, lang)} />
                </div>
              </div>
            )}

            {!isAdmin && (
              <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                {t("staffAdminsOnly")}
              </p>
            )}

            <div className="@container">
              <div className="grid grid-cols-1 gap-3 md:gap-4 @3xl:grid-cols-2 @3xl:items-start">
                <SectionCard compact icon={Hourglass} title={t("staffToCheck")} badge={toCheck.data?.length || undefined}>
                  <p className="mb-3 text-xs leading-relaxed text-slate-500">{t("staffToCheckHint")}</p>
                  {toCheck.isPending ? (
                    <CardSkeleton count={2} />
                  ) : !toCheck.data?.length ? (
                    <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">{t("staffToCheckEmpty")}</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {toCheck.data.map((p) => (
                        <li key={p.id} className="rounded-xl border border-slate-200 bg-surface p-3">
                          <div className="flex items-start gap-3">
                            {p.worker && <Avatar name={p.worker.full_name} src={p.worker.avatar_url} size={36} profileId={p.worker.id} />}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                {p.worker ? (
                                  <Link
                                    to="/worker/$workerId"
                                    params={{ workerId: p.worker.id }}
                                    className="truncate text-sm font-semibold text-slate-900 hover:text-brand-700"
                                  >
                                    {p.worker.full_name}
                                  </Link>
                                ) : (
                                  <span />
                                )}
                                <span className="shrink-0 text-base font-bold text-slate-900">{formatMoney(p.amount, lang)}</span>
                              </div>
                              <p className="text-xs text-slate-500">
                                {[p.worker?.member_no, relativeTime(p.created_at, lang)].filter(Boolean).join(" · ")}
                              </p>
                              <p className="mt-1.5 break-words text-xs text-slate-700">
                                {p.paid_to_label ? t("staffPaidTo", { label: p.paid_to_label }) : t("payKindCash")}
                              </p>
                              {p.transaction_id && <p className="text-xs text-slate-700">{t("feesTxn", { id: p.transaction_id })}</p>}
                              {p.note && <p className="mt-1 whitespace-pre-line text-xs text-slate-500">{p.note}</p>}
                              {p.proof_url && (
                                <a href={p.proof_url} target="_blank" rel="noreferrer" className="mt-2 inline-block">
                                  <img
                                    src={p.proof_url}
                                    alt={t("feesPaymentProof")}
                                    className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200"
                                  />
                                </a>
                              )}
                              {isAdmin && (
                                <div className="mt-2.5 flex gap-2">
                                  <Button
                                    size="sm"
                                    loading={review.isPending && review.variables?.payment.id === p.id && review.variables.accept}
                                    onClick={() => review.mutate({ payment: p, accept: true })}
                                  >
                                    <Check className="h-3.5 w-3.5" aria-hidden />
                                    {t("staffConfirm")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setReason("");
                                      setRejecting(p);
                                    }}
                                  >
                                    <X className="h-3.5 w-3.5" aria-hidden />
                                    {t("staffReject")}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>

                <div className="min-w-0 space-y-3 md:space-y-4">
                  <SectionCard compact icon={Landmark} title={t("staffDulekoAccounts")}>
                    <p className="mb-3 text-xs leading-relaxed text-slate-500">{t("staffDulekoAccountsHint")}</p>
                    <div className="@container">
                      <PaymentMethodsManager
                        owner={null}
                        folder={DULEKO_PAYMENTS_FOLDER}
                        canEdit={isAdmin}
                        emptyTitle={t("staffDulekoEmpty")}
                        emptyText={t("staffDulekoEmptyText")}
                      />
                    </div>
                  </SectionCard>

                  <SectionCard compact icon={Users} title={t("staffWorkers")} badge={overview.data?.workers.length || undefined}>
                    {!overview.data?.workers.length ? (
                      <p className="text-xs text-slate-500">{t("staffWorkersEmpty")}</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {overview.data.workers.map((w) => (
                          <li key={w.profile_id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                            <Avatar name={w.full_name} src={w.avatar_url} size={32} profileId={w.profile_id} />
                            <div className="min-w-0 flex-1">
                              <Link
                                to="/worker/$workerId"
                                params={{ workerId: w.profile_id }}
                                className="block truncate text-sm font-semibold text-slate-900 hover:text-brand-700"
                              >
                                {w.full_name}
                              </Link>
                              <p className="text-xs text-slate-500">
                                {t("staffWorkerLine", { balance: formatMoney(w.balance, lang), paid: formatMoney(w.paid, lang) })}
                                {w.due_on && w.balance > 0 ? ` · ${t("feesMonthDueBy", { date: formatDate(w.due_on, lang) })}` : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              {w.overdue > 0 && <Badge tone="danger">{formatMoney(w.overdue, lang)}</Badge>}
                              {w.blocked && <Badge tone="muted">{t("staffPaused")}</Badge>}
                              {w.awaiting > 0 && <Badge tone="warning">{t("feesWaiting")}</Badge>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>
                </div>
              </div>
            </div>
          </>
        )}
      </PageContainer>

      <Dialog
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title={t("staffReject")}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="danger"
              loading={review.isPending}
              onClick={() => rejecting && review.mutate({ payment: rejecting, accept: false, why: reason })}
            >
              {t("staffRejectSend")}
            </Button>
          </>
        }
      >
        {rejecting && (
          <p className="mb-3 text-sm text-slate-600">
            {rejecting.worker?.full_name} · {formatMoney(rejecting.amount, lang)}
          </p>
        )}
        <Field label={t("staffRejectReason")} className="mb-0">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} />
        </Field>
      </Dialog>
    </>
  );
}
