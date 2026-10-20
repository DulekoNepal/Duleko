import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Check, Handshake, MessagesSquare, PhoneOff, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { StarPicker } from "@/components/duleko/Rating";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { SHORT_CALL_MS, clearCallTap, readCallTap } from "@/lib/call-tracking";
import { answerCall, getCallToAsk, listCallDealsToConfirm, respondCallDeal, type CallOutcome } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { cn, formatMoney, skillName } from "@/lib/utils";
import type { CallDealToConfirm, CallToAsk } from "@/lib/types";

/** The server asks only about calls at least this old (call_to_ask_about, 6800). */
const ASK_AFTER_MS = 30_000;

/* ------------------------------------------------------------------ */
/* The caller: "Did you have a deal with ...?"                         */
/* ------------------------------------------------------------------ */

/**
 * Asked when someone comes back to Duleko after calling a person from
 * their profile - about that newest call only. It has no close button:
 * "Still discussing" is the way out, and asks again in two days. A return
 * within a few seconds is a mis-tap and is never asked about.
 */
export function CallDealPrompt() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [ask, setAsk] = useState<CallToAsk | null>(null);
  const [step, setStep] = useState<"ask" | "deal">("ask");
  const [skill, setSkill] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const retry = useRef<number | undefined>(undefined);

  const check = useCallback(async () => {
    window.clearTimeout(retry.current);
    const tap = readCallTap();
    if (tap) {
      const away = Date.now() - tap.at;
      if (away < SHORT_CALL_MS) {
        // Straight back: the dialer was closed, not used.
        clearCallTap();
        if (tap.id) await answerCall(tap.id, "short").catch(() => undefined);
        return;
      }
      clearCallTap();
      // Too fresh for the server to ask about yet: look again once it isn't.
      if (away < ASK_AFTER_MS) retry.current = window.setTimeout(() => void check(), ASK_AFTER_MS - away + 1000);
    }
    try {
      const next = await getCallToAsk();
      setAsk((current) => (current && next && current.call_id === next.call_id ? current : next));
    } catch {
      // Offline or the like - ask next time instead.
    }
  }, []);

  useEffect(() => {
    void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    // The Android app also says when it comes back to the front.
    const resume = Capacitor.isNativePlatform() ? CapacitorApp.addListener("resume", () => void check()) : null;
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void resume?.then((handle) => handle.remove());
      window.clearTimeout(retry.current);
    };
  }, [check]);

  // A new call to ask about starts the form afresh.
  useEffect(() => {
    setStep("ask");
    setSkill(ask?.skills.length === 1 ? ask.skills[0].id : null);
    setAmount("");
    setRating(0);
    setComment("");
    setAmountError(null);
  }, [ask?.call_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = useMutation({
    mutationFn: (outcome: CallOutcome) =>
      answerCall(
        ask!.call_id,
        outcome,
        outcome === "deal"
          ? { skill, amount: amount ? Number(amount) : null, rating: rating || null, comment: comment || null }
          : undefined,
      ),
    onSuccess: (_, outcome) => {
      toast(t(outcome === "deal" ? "callDealSaved" : outcome === "discussing" ? "callDiscussingSaved" : "callNoSaved"));
      setAsk(null);
      if (outcome === "deal") void queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (error) => {
      toast(errorMessage(error), "error");
      // Most likely answered already, on another device.
      setAsk(null);
    },
  });

  if (!ask) return null;
  const name = ask.full_name.split(/\s+/)[0] || ask.full_name;

  function saveDeal() {
    const value = amount ? Number(amount) : null;
    if (value != null && !(value > 0 && value <= 500000)) {
      setAmountError(t("errCallBadAmount"));
      return;
    }
    answer.mutate("deal");
  }

  return (
    <Dialog
      open
      dismissible={false}
      onClose={() => undefined}
      title={t(step === "ask" ? "callAskTitle" : "callDealTitle")}
      footer={
        step === "deal" ? (
          <>
            <Button variant="outline" onClick={() => setStep("ask")} disabled={answer.isPending}>
              {t("callDealBack")}
            </Button>
            <Button loading={answer.isPending} onClick={saveDeal}>
              {t("callDealSave")}
            </Button>
          </>
        ) : undefined
      }
    >
      {step === "ask" ? (
        <>
          <div className="flex flex-col items-center text-center">
            <Avatar name={ask.full_name} src={ask.avatar_url} size={64} profileId={ask.person_id} />
            <p className="mt-3 text-lg font-bold leading-snug text-slate-900">{t("callAskQuestion", { name: ask.full_name })}</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">{t("callAskWhy")}</p>
          </div>
          <div className="mt-4 space-y-2">
            <AnswerButton
              icon={Handshake}
              label={t("callAnswerDeal")}
              tone="brand"
              disabled={answer.isPending}
              onClick={() => setStep("deal")}
            />
            <AnswerButton
              icon={MessagesSquare}
              label={t("callAnswerDiscussing")}
              disabled={answer.isPending}
              onClick={() => answer.mutate("discussing")}
            />
            <AnswerButton
              icon={PhoneOff}
              label={t("callAnswerNo")}
              disabled={answer.isPending}
              onClick={() => answer.mutate("no")}
            />
          </div>
        </>
      ) : (
        <>
          {ask.skills.length > 0 && (
            <div className="mb-3.5">
              <p className="mb-1.5 text-[13px] font-medium text-slate-700">{t("callDealSkill")}</p>
              <div role="radiogroup" aria-label={t("callDealSkill")} className="flex flex-wrap gap-1.5">
                {[
                  ...ask.skills.map((s) => ({ id: s.id as string | null, label: s.custom_label || skillName(s, lang) })),
                  { id: null, label: t("callDealSkillOther") },
                ].map((option) => {
                  const selected = skill === option.id;
                  return (
                    <button
                      key={option.id ?? "other"}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setSkill(option.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                        selected
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-300 bg-surface text-slate-700 hover:border-brand-300",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Field label={t("callDealAmount")} hint={t("callDealAmountHint", { name })} error={amountError ?? undefined}>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">{lang === "ne" ? "रु" : "Rs"}</span>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={500000}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAmountError(null);
                }}
              />
            </div>
          </Field>

          <div className="mb-3.5">
            <p className="mb-1 text-[13px] font-medium text-slate-700">{t("callDealRating", { name })}</p>
            <StarPicker value={rating} onChange={setRating} disabled={answer.isPending} />
          </div>

          {rating > 0 && (
            <Field label={t("callDealComment")}>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("callDealCommentPlaceholder")}
                maxLength={500}
                rows={3}
              />
            </Field>
          )}

          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
            {t("callDealReviewNote", { name })}
          </p>
        </>
      )}
    </Dialog>
  );
}

export function AnswerButton({
  icon: Icon,
  label,
  tone = "plain",
  disabled,
  onClick,
}: {
  icon: typeof Handshake;
  label: string;
  tone?: "brand" | "plain";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-12 w-full items-center gap-3 rounded-xl border-2 px-3.5 text-left text-sm font-semibold transition-colors disabled:opacity-60",
        tone === "brand"
          ? "border-brand-600 bg-brand-700 text-white hover:bg-brand-800"
          : "border-slate-200 bg-surface text-slate-800 hover:border-slate-300",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* The worker: "Did you make a deal with ...?"                         */
/* ------------------------------------------------------------------ */

/**
 * Deals people reported after calling me, each with Yes / No. Shown on
 * Home's "things waiting on you" strip; nothing when there are none.
 */
export function CallDealsToConfirm({ className }: { className?: string }) {
  const deals = useQuery({ queryKey: ["call-deals", "to-confirm"], queryFn: listCallDealsToConfirm });
  if (!deals.data?.length) return null;
  return (
    <>
      {deals.data.map((deal) => (
        <CallDealConfirmCard key={deal.deal_id} deal={deal} className={className} />
      ))}
    </>
  );
}

function CallDealConfirmCard({ deal, className }: { deal: CallDealToConfirm; className?: string }) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const name = deal.full_name.split(/\s+/)[0] || deal.full_name;
  const what = [deal.skill ? skillName(deal.skill, lang) : t("callConfirmWork"), deal.amount ? formatMoney(deal.amount, lang) : null]
    .filter(Boolean)
    .join(" · ");

  const respond = useMutation({
    mutationFn: (agree: boolean) => respondCallDeal(deal.deal_id, agree),
    onSuccess: (_, agree) => {
      toast(t(agree ? "callConfirmedToast" : "callDisputedToast"));
      void queryClient.invalidateQueries({ queryKey: ["call-deals"] });
      void queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (error) => {
      toast(errorMessage(error), "error");
      void queryClient.invalidateQueries({ queryKey: ["call-deals"] });
    },
  });

  return (
    <div className={cn("rounded-2xl border border-brand-200 bg-brand-50/60 p-3.5", className)}>
      <div className="flex items-start gap-3">
        <Avatar name={deal.full_name} src={deal.avatar_url} size={36} profileId={deal.person_id} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{t("callConfirmTitle", { name: deal.full_name })}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{t("callConfirmHint", { name, what })}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="sm" loading={respond.isPending && respond.variables} disabled={respond.isPending} onClick={() => respond.mutate(true)}>
          {!(respond.isPending && respond.variables) && <Check className="h-3.5 w-3.5" aria-hidden />}
          {t("callConfirmYes")}
        </Button>
        <Button size="sm" variant="outline" disabled={respond.isPending} onClick={() => respond.mutate(false)}>
          <X className="h-3.5 w-3.5" aria-hidden />
          {t("callConfirmNo")}
        </Button>
      </div>
    </div>
  );
}
