import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  CalendarDays,
  CircleCheck,
  Clock,
  Hourglass,
  Info,
  Percent,
  Receipt,
  Sparkles,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { SectionCard, StatTile } from "@/components/duleko/ProfileParts";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { PaymentCard } from "@/components/duleko/payments/PaymentCard";
import { paymentMethodsKey } from "@/components/duleko/payments/PaymentMethodsManager";
import { RecordFeePaymentDialog } from "@/components/duleko/payments/RecordFeePaymentDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState } from "@/components/ui/states";
import { feeAccountKey, useFeeAccount } from "@/hooks/use-fee-account";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { feeFor, formatBsMonth, standingOf, tierBands, type FeeStanding } from "@/lib/fees";
import { useI18n, type StringKey } from "@/lib/i18n";
import {
  listFeeCharges,
  listFeePayments,
  listPaymentMethods,
  recordFeePayment,
  withdrawFeePayment,
  type FeePaymentInput,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { cn, formatDate, formatMoney, formatNumber } from "@/lib/utils";
import type { FeeAccount, FeePayment, FeePaymentStatus, FeePeriodStatus, FeeRules } from "@/lib/types";

const MONTH_STATUS: Record<FeePeriodStatus, { label: StringKey; tone: "brand" | "warning" | "danger" | "success" }> = {
  open: { label: "feesMonthOpen", tone: "brand" },
  due: { label: "feesMonthDue", tone: "warning" },
  overdue: { label: "feesMonthOverdue", tone: "danger" },
  paid: { label: "feesMonthPaid", tone: "success" },
};

const PAYMENT_STATUS: Record<FeePaymentStatus, { label: StringKey; tone: "warning" | "success" | "danger" }> = {
  reported: { label: "feesPaymentReported", tone: "warning" },
  confirmed: { label: "feesPaymentConfirmed", tone: "success" },
  rejected: { label: "feesPaymentRejected", tone: "danger" },
};

const STANDING: Record<FeeStanding, { icon: LucideIcon; box: string; iconBox: string; title: string }> = {
  overdue: { icon: TriangleAlert, box: "border-red-200 bg-red-50", iconBox: "bg-red-100 text-red-700", title: "text-red-900" },
  due: { icon: Clock, box: "border-amber-200 bg-amber-50", iconBox: "bg-amber-100 text-amber-800", title: "text-amber-900" },
  awaiting: { icon: Hourglass, box: "border-sky-200 bg-sky-50", iconBox: "bg-sky-100 text-sky-800", title: "text-sky-900" },
  clear: { icon: CircleCheck, box: "border-brand-200 bg-brand-50", iconBox: "bg-brand-100 text-brand-800", title: "text-brand-900" },
};

/**
 * A worker's Duleko fees: where they stand, how the fee works, Duleko's
 * accounts to pay into, and their monthly bills, jobs and payments.
 */
export function FeesScreen() {
  const { t, lang } = useI18n();
  const { profile, user } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState(false);

  const account = useFeeAccount();
  const charges = useQuery({
    queryKey: ["fee-charges", profile?.id],
    queryFn: () => listFeeCharges(profile!.id),
    enabled: Boolean(profile?.id),
  });
  const payments = useQuery({
    queryKey: ["fee-payments", profile?.id],
    queryFn: () => listFeePayments(profile!.id),
    enabled: Boolean(profile?.id),
  });
  const dulekoAccounts = useQuery({
    queryKey: paymentMethodsKey(null),
    queryFn: () => listPaymentMethods(null),
    enabled: Boolean(profile?.id),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: feeAccountKey(profile?.id) });
    void queryClient.invalidateQueries({ queryKey: ["fee-payments", profile?.id] });
  }

  const record = useMutation({
    mutationFn: ({ input, proof }: { input: FeePaymentInput; proof: File | null }) =>
      recordFeePayment(user!.id, profile!.id, input, proof),
    onSuccess: () => {
      refresh();
      setPaying(false);
      toast(t("feesSentTitle"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const withdraw = useMutation({
    mutationFn: (payment: FeePayment) => withdrawFeePayment(payment),
    onSuccess: () => {
      refresh();
      toast(t("feesPaymentWithdrawn"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  if (!profile) return <SignInRequiredScreen title={t("feesTitle")} />;

  const a = account.data;
  return (
    <>
      <AppHeader title={t("feesTitle")} subtitle={t("feesSubtitle")} />
      <PageContainer className="space-y-3 md:space-y-4">
        {account.isError ? (
          <ErrorState message={t("feesLoadFailed")} onRetry={() => account.refetch()} retryLabel={t("retry")} />
        ) : !a ? (
          <CardSkeleton count={3} />
        ) : (
          <>
            <StandingBanner
              account={a}
              onPay={() => document.getElementById("pay-duleko")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />

            <div className="@container">
              <div className="grid grid-cols-3 gap-2 @xl:gap-2.5">
                <StatTile icon={Wallet} label={t("feesOwedNow")} value={formatMoney(Math.max(0, a.payable_now - a.awaiting), lang)} />
                <StatTile
                  icon={CalendarDays}
                  label={t("feesThisMonth")}
                  value={formatMoney(a.periods.find((p) => p.period === a.current_period)?.amount ?? 0, lang)}
                />
                <StatTile
                  icon={a.awaiting > 0 ? Hourglass : CircleCheck}
                  label={a.awaiting > 0 ? t("feesWaiting") : t("feesPaidTotal")}
                  value={formatMoney(a.awaiting > 0 ? a.awaiting : a.paid, lang)}
                />
              </div>
            </div>

            <div className="@container">
              <div className="grid grid-cols-1 gap-3 md:gap-4 @3xl:grid-cols-2 @3xl:items-start">
                <div className="min-w-0 space-y-3 md:space-y-4">
                  <SectionCard compact icon={Wallet} title={t("feesPayTitle")}>
                    <div id="pay-duleko" className="scroll-mt-24" />
                    {dulekoAccounts.data && dulekoAccounts.data.length > 0 ? (
                      <>
                        <p className="mb-3 text-xs leading-relaxed text-slate-500">{t("feesPayHint")}</p>
                        <div className="space-y-3">
                          {dulekoAccounts.data.map((m) => (
                            <PaymentCard key={m.id} method={m} />
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs leading-relaxed text-slate-500">{t("feesNoAccounts")}</p>
                    )}
                    {a.max_payment > 0 && (
                      <Button size="lg" className="mt-4 w-full" onClick={() => setPaying(true)}>
                        <Receipt className="h-4 w-4" aria-hidden />
                        {t("feesIPaid")}
                      </Button>
                    )}
                  </SectionCard>

                  <HowItWorks rules={a.rules} welcomeLeft={a.welcome_left} />
                </div>

                <div className="min-w-0 space-y-3 md:space-y-4">
                  <SectionCard compact icon={CalendarDays} title={t("feesMonthsTitle")}>
                    {a.periods.length === 0 ? (
                      <p className="text-xs text-slate-500">{t("feesNoMonths")}</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {a.periods.map((p) => (
                          <li key={p.period} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900">{formatBsMonth(p.period, lang)}</p>
                              <p className="text-xs text-slate-500">
                                {[
                                  t("feesMonthJobs", { jobs: formatNumber(p.jobs, lang), amount: formatMoney(p.amount, lang) }),
                                  p.paid > 0 && p.left > 0 ? t("feesMonthPaidPart", { amount: formatMoney(p.paid, lang) }) : null,
                                  p.left > 0 && p.status !== "open" ? t("feesMonthDueBy", { date: formatDate(p.due_on, lang) }) : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                            <Badge tone={MONTH_STATUS[p.status].tone}>{t(MONTH_STATUS[p.status].label)}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>

                  <SectionCard compact icon={Receipt} title={t("feesPaymentsTitle")} badge={payments.data?.length || undefined}>
                    {!payments.data?.length ? (
                      <p className="text-xs text-slate-500">{t("feesNoPayments")}</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {payments.data.map((p) => (
                          <li key={p.id} className="py-2.5 first:pt-0 last:pb-0">
                            <div className="flex items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900">{formatMoney(p.amount, lang)}</p>
                                <p className="break-words text-xs text-slate-500">
                                  {[p.paid_to_label ?? t("payKindCash"), formatDate(p.created_at.slice(0, 10), lang)].join(" · ")}
                                </p>
                                {p.transaction_id && (
                                  <p className="text-xs text-slate-500">{t("feesTxn", { id: p.transaction_id })}</p>
                                )}
                                {p.status === "rejected" && p.rejection_reason && (
                                  <p className="mt-1 text-xs text-red-700">{p.rejection_reason}</p>
                                )}
                                <div className="mt-1 flex flex-wrap items-center gap-3">
                                  {p.proof_url && (
                                    <a
                                      href={p.proof_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs font-medium text-brand-700 hover:underline"
                                    >
                                      {t("feesPaymentProof")}
                                    </a>
                                  )}
                                  {p.status === "reported" && (
                                    <button
                                      type="button"
                                      disabled={withdraw.isPending}
                                      onClick={() => withdraw.mutate(p)}
                                      className="text-xs font-medium text-slate-500 hover:text-red-600"
                                    >
                                      {t("feesPaymentWithdraw")}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <Badge tone={PAYMENT_STATUS[p.status].tone}>{t(PAYMENT_STATUS[p.status].label)}</Badge>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>

                  <SectionCard compact icon={Briefcase} title={t("feesJobsTitle")} badge={charges.data?.length || undefined}>
                    {!charges.data?.length ? (
                      <p className="text-xs text-slate-500">{t("feesNoMonths")}</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {charges.data.map((c) => (
                          <li key={c.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">{c.job_title}</p>
                              <p className="text-xs text-slate-500">
                                {t("feesJobLine", { price: formatMoney(c.price, lang), date: formatDate(c.completed_on, lang) })}
                              </p>
                            </div>
                            {c.welcome || c.amount === 0 ? (
                              <Badge tone="success">
                                <Sparkles className="h-3 w-3" aria-hidden />
                                {t("feesFree")}
                              </Badge>
                            ) : (
                              <span className="shrink-0 text-sm font-semibold text-slate-900">{formatMoney(c.amount, lang)}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>
                </div>
              </div>
            </div>

            <RecordFeePaymentDialog
              open={paying}
              suggested={Math.max(0, Math.min(a.max_payment, a.payable_now - a.awaiting)) || a.max_payment}
              max={a.max_payment}
              accounts={dulekoAccounts.data ?? []}
              saving={record.isPending}
              onClose={() => setPaying(false)}
              onSubmit={(input, proof) => record.mutate({ input, proof })}
            />
          </>
        )}
      </PageContainer>
    </>
  );

}

/** The rule, plainly: the bands, three worked examples, when it's due, and the free first jobs. */
function HowItWorks({ rules, welcomeLeft }: { rules: FeeRules; welcomeLeft: number }) {
  const { t, lang } = useI18n();
  const money = (n: number) => formatMoney(n, lang);
  const pct = (n: number) => formatNumber(n, lang);
  const example = (price: number) => t("feesExample", { price: money(price), fee: money(feeFor(price, rules.tiers)) });

  return (
    <SectionCard compact icon={Percent} title={t("feesHowTitle")}>
      <p className="text-xs leading-relaxed text-slate-600">{t("feesHowIntro")}</p>
      <ul className="mt-2.5 space-y-1.5">
        {tierBands(rules.tiers).map((band, i, all) => (
          <li key={i} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-800 ring-1 ring-slate-200/70">
            <span className="flex h-7 min-w-11 items-center justify-center rounded-lg bg-brand-600 px-1.5 text-xs font-bold text-white">
              {pct(band.percent)}%
            </span>
            <span>
              {i === 0
                ? t("feesBandFirst", { percent: pct(band.percent), to: money(band.to ?? 0) })
                : i === all.length - 1
                  ? t("feesBandLast", { percent: pct(band.percent), from: money(band.from) })
                  : t("feesBandMiddle", { percent: pct(band.percent), from: money(band.from), to: money(band.to ?? 0) })}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
        {t("feesExamples", { a: example(1000), b: example(10000), c: example(50000) })}
      </p>

      <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
        <li className="flex gap-2">
          <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          {t("feesMonthly", { day: pct(rules.due_day) })}
        </li>
        <li className="flex gap-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          {t("feesStarts", { date: formatDate(rules.starts_on, lang) })}
        </li>
        {rules.welcome_jobs > 0 && (
          <li className="flex gap-2 font-medium text-green-800">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" aria-hidden />
            {welcomeLeft === rules.welcome_jobs
              ? t("feesWelcomeAll", { total: pct(rules.welcome_jobs) })
              : welcomeLeft > 0
                ? t("feesWelcomeLeft", { count: pct(welcomeLeft), total: pct(rules.welcome_jobs) })
                : t("feesWelcomeUsed", { total: pct(rules.welcome_jobs) })}
          </li>
        )}
      </ul>
    </SectionCard>
  );
}

/** Where the worker stands, in one banner: past due, due, being checked, or all paid up. */
function StandingBanner({ account: a, onPay }: { account: FeeAccount; onPay: () => void }) {
  const { t, lang } = useI18n();
  const standing = standingOf(a);
  const look = STANDING[standing];
  const Icon = look.icon;
  const title = {
    overdue: t("feesOverdueTitle", { amount: formatMoney(a.overdue - a.awaiting, lang) }),
    due: t("feesDueTitle", {
      amount: formatMoney(a.payable_now - a.awaiting, lang),
      date: a.due_on ? formatDate(a.due_on, lang) : "",
    }),
    awaiting: t("feesAwaitingTitle"),
    clear: t("feesClearTitle"),
  }[standing];
  const text = {
    overdue: t("feesOverdueText"),
    due: t("feesDueText"),
    awaiting: t("feesAwaitingText", { amount: formatMoney(a.awaiting, lang) }),
    clear: t("feesClearText"),
  }[standing];
  return (
    <section className={cn("flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center", look.box)}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", look.iconBox)}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className={cn("text-base font-bold leading-snug", look.title)}>{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{text}</p>
        </div>
      </div>
      {(standing === "overdue" || standing === "due") && (
        <Button className="shrink-0" onClick={onPay}>
          <Wallet className="h-4 w-4" aria-hidden />
          {t("feesPayNow")}
        </Button>
      )}
    </section>
  );
}
