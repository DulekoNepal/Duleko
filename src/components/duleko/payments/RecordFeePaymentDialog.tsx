import { useEffect, useState } from "react";
import { Banknote, Check, CircleCheck, Circle, ImageUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { BankLogo } from "./BankLogo";
import { methodTitle } from "@/lib/banks";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { MAX_PHOTO_INPUT_BYTES } from "@/lib/image";
import { cn, formatMoney } from "@/lib/utils";
import type { FeePaymentInput } from "@/lib/queries";
import type { PaymentMethod } from "@/lib/types";

const CASH = "cash";

/**
 * A worker saying they paid Duleko: how much (up to `max`), which of
 * Duleko's accounts it went into - or cash to a team member - its
 * transaction ID, a note, and a screenshot. An admin then confirms it.
 */
export function RecordFeePaymentDialog({
  open,
  suggested,
  max,
  accounts,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  /** Filled in to start with: what is owed now, or everything recorded so far. */
  suggested: number;
  max: number;
  accounts: PaymentMethod[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: FeePaymentInput, proof: File | null) => void;
}) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState<string>(CASH);
  const [transactionId, setTransactionId] = useState("");
  const [note, setNote] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount(suggested > 0 ? String(suggested) : "");
    setDestination(accounts[0]?.id ?? CASH);
    setTransactionId("");
    setNote("");
    setProof(null);
    setProofPreview(null);
    setError("");
  }, [open, suggested, accounts]);

  const isCash = destination === CASH;
  const account = accounts.find((a) => a.id === destination) ?? null;

  function submit() {
    const value = Number(amount);
    if (!Number.isInteger(value) || value < 1 || value > max) {
      setError(t("feesBadAmount", { amount: formatMoney(max, lang) }));
      return;
    }
    onSubmit(
      {
        amount: value,
        method: account ? account.kind : CASH,
        paid_to_id: account?.id ?? null,
        transaction_id: isCash ? null : transactionId,
        note,
      },
      isCash ? null : proof,
    );
  }

  const options: { id: string; method: PaymentMethod | null; label: string; hint: string }[] = [
    ...accounts.map((a) => ({
      id: a.id,
      method: a,
      label: methodTitle(a, lang),
      hint: [a.kind === "bank" ? a.account_number ?? "QR" : a.wallet_id, a.account_name].filter(Boolean).join(" · "),
    })),
    { id: CASH, method: null, label: t("payKindCash"), hint: t("feesCashHint") },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("feesRecordTitle")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={saving} onClick={submit}>
            <Check className="h-4 w-4" aria-hidden />
            {t("feesSubmit")}
          </Button>
        </>
      }
    >
      <Field label={t("feesAmount")} hint={t("feesAmountHint", { amount: formatMoney(max, lang) })} error={error}>
        <Input
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value.replace(/\D/g, ""));
            setError("");
          }}
          inputMode="numeric"
          className="text-lg font-semibold"
        />
      </Field>

      <p className="mb-1.5 text-[13px] font-medium text-slate-700">{t("feesPaidInto")}</p>
      <div role="radiogroup" className="mb-3.5 space-y-1.5">
        {options.map((o) => {
          const selected = destination === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setDestination(o.id)}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition-colors",
                selected ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-surface hover:border-slate-300",
              )}
            >
              {o.method ? (
                <BankLogo kind={o.method.kind} bankCode={o.method.bank_code} size={30} />
              ) : (
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                  <Banknote className="h-4 w-4" aria-hidden />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">{o.label}</span>
                <span className="block truncate text-xs text-slate-500">{o.hint}</span>
              </span>
              {selected ? (
                <CircleCheck className="h-5 w-5 shrink-0 text-brand-700" aria-hidden />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-slate-300" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      {!isCash && (
        <Field label={`${t("feesReference")} (${t("optional")})`} hint={t("feesReferenceHint")}>
          <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} maxLength={60} autoComplete="off" />
        </Field>
      )}

      <Field label={`${t("feesNote")} (${t("optional")})`}>
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      </Field>

      {!isCash && (
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-slate-700">
            {t("feesScreenshot")} <span className="font-normal text-slate-400">({t("optional")})</span>
          </p>
          <div className="flex items-center gap-3">
            {proofPreview && <img src={proofPreview} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />}
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-surface px-3 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50">
              <ImageUp className="h-4 w-4" aria-hidden />
              {proof ? t("feesChangeScreenshot") : t("feesAddScreenshot")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (file.size > MAX_PHOTO_INPUT_BYTES) {
                    toast(t("photoTooBig"), "error");
                    return;
                  }
                  setProof(file);
                  setProofPreview(URL.createObjectURL(file));
                }}
              />
            </label>
          </div>
        </div>
      )}
    </Dialog>
  );
}
