import { useEffect, useMemo, useState } from "react";
import { Camera, Check, ChevronDown, ImageUp, Landmark, QrCode, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { BankLogo } from "./BankLogo";
import { PaymentCard } from "./PaymentCard";
import { BANKS, OTHER_BANK, PAYMENT_KINDS, WALLETS, methodTitle, searchKey } from "@/lib/banks";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { MAX_PHOTO_INPUT_BYTES } from "@/lib/image";
import { cn } from "@/lib/utils";
import type { PaymentKind, PaymentMethod, PaymentMethodDraft } from "@/lib/types";

const KIND_LABEL: Record<PaymentKind, StringKey> = {
  bank: "payKindBank",
  esewa: "payKindEsewa",
  khalti: "payKindKhalti",
};

const ACCOUNT_NUMBER_RE = /^[0-9A-Za-z][0-9A-Za-z-]{3,39}$/;
const WALLET_RE = /^9[678]\d{8}$/;

function emptyDraft(kind: PaymentKind): PaymentMethodDraft {
  return { kind, bank_code: null, bank_name: null, branch: null, account_number: null, account_name: "", wallet_id: null };
}

/** Digits only, without a +977 in front - the form eSewa and Khalti IDs take. */
function walletDigits(value: string | null): string {
  return (value ?? "").replace(/\D/g, "").replace(/^977(?=9)/, "");
}

/** What the form hands back: the fields, a new QR photo if one was picked, and whether to drop the old one. */
export interface PaymentFormResult {
  draft: PaymentMethodDraft;
  qr: File | null;
  removeQr: boolean;
  /** A local preview of `qr`, for showing a draft before it is saved. */
  qrPreview: string | null;
}

/**
 * Adding or editing one bank account or wallet. `existing` is the one being
 * edited (its type can't change), or null to add one of `initialKind`.
 */
export function PaymentMethodForm({
  open,
  existing,
  initialKind = "bank",
  saving = false,
  onClose,
  onSubmit,
}: {
  open: boolean;
  existing: Pick<PaymentMethod, keyof PaymentMethodDraft | "qr_url"> | null;
  initialKind?: PaymentKind;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (result: PaymentFormResult) => void;
}) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [draft, setDraft] = useState<PaymentMethodDraft>(emptyDraft(initialKind));
  const [qr, setQr] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [removeQr, setRemoveQr] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  // A fresh form every time it opens.
  useEffect(() => {
    if (!open) return;
    setDraft(
      existing
        ? {
            kind: existing.kind,
            bank_code: existing.bank_code,
            bank_name: existing.bank_name,
            branch: existing.branch,
            account_number: existing.account_number,
            account_name: existing.account_name,
            wallet_id: existing.wallet_id,
          }
        : emptyDraft(initialKind),
    );
    setQr(null);
    setQrPreview(null);
    setRemoveQr(false);
    setErrors({});
    setPickerOpen(!existing && initialKind === "bank");
    setQuery("");
  }, [open, existing, initialKind]);

  const isBank = draft.kind === "bank";
  const wallet = draft.kind === "bank" ? "" : WALLETS[draft.kind].name;
  const shownQr = qrPreview ?? (removeQr ? null : (existing?.qr_url ?? null));

  const banks = useMemo(() => {
    const needle = searchKey(query);
    if (!needle) return BANKS;
    return BANKS.filter((b) => searchKey(`${b.name} ${b.short} ${b.nameNe}`).includes(needle));
  }, [query]);

  function set<K extends keyof PaymentMethodDraft>(key: K, value: PaymentMethodDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function chooseBank(code: string) {
    set("bank_code", code);
    setPickerOpen(false);
    setQuery("");
  }

  function pickQr(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_PHOTO_INPUT_BYTES) {
      toast(t("photoTooBig"), "error");
      return;
    }
    setQr(file);
    setQrPreview(URL.createObjectURL(file));
    setRemoveQr(false);
    setErrors((e) => ({ ...e, qr: "" }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    const number = (draft.account_number ?? "").replace(/\s+/g, "");
    if (isBank) {
      if (!draft.bank_code) next.bank_code = t("payNeedBank");
      if (draft.bank_code === OTHER_BANK && (draft.bank_name ?? "").trim().length < 2) next.bank_name = t("payNeedBankName");
      if (number && !ACCOUNT_NUMBER_RE.test(number)) next.account_number = t("payBadNumber");
      if (!number && !shownQr) next.qr = t("payNeedNumberOrQr");
    } else if (!WALLET_RE.test(walletDigits(draft.wallet_id))) {
      next.wallet_id = t("payBadWallet");
    }
    if (draft.account_name.trim().length < 2) next.account_name = t("payNeedName");
    setErrors(next);
    return Object.values(next).every((v) => !v);
  }

  function submit() {
    if (!validate()) return;
    onSubmit({
      draft: { ...draft, wallet_id: isBank ? null : walletDigits(draft.wallet_id) },
      qr,
      removeQr: removeQr && !qr,
      qrPreview: shownQr,
    });
  }

  const chosen = BANKS.find((b) => b.code === draft.bank_code);
  const editingTitle = existing ? methodTitle(existing, lang) || t("payKindBank") : "";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={existing ? t("payFormEditTitle", { name: editingTitle }) : t("payFormAddTitle")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={saving} onClick={submit}>
            <Check className="h-4 w-4" aria-hidden />
            {t("payFormSave")}
          </Button>
        </>
      }
    >
      {!existing && (
        <div className="mb-4">
          <p className="mb-1.5 text-[13px] font-medium text-slate-700">{t("payFormKind")}</p>
          <div role="radiogroup" className="grid grid-cols-3 gap-2">
            {PAYMENT_KINDS.map((kind) => {
              const selected = draft.kind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setDraft((d) => ({ ...emptyDraft(kind), account_name: d.account_name }));
                    setErrors({});
                    setPickerOpen(kind === "bank");
                  }}
                  className={cn(
                    "flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-1 py-2 text-xs font-semibold transition-colors",
                    selected ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-200 bg-surface text-slate-700 hover:border-slate-300",
                  )}
                >
                  {kind === "bank" ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Landmark className="h-4.5 w-4.5" aria-hidden />
                    </span>
                  ) : (
                    <BankLogo kind={kind} size={30} />
                  )}
                  {t(KIND_LABEL[kind])}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isBank && (
        <div className="mb-3.5">
          <p className="mb-1 text-[13px] font-medium text-slate-700">{t("payFormBank")}</p>
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-expanded={pickerOpen}
            className={cn(
              "flex min-h-12 w-full items-center gap-3 rounded-xl border bg-surface px-3 py-2 text-left transition-colors hover:bg-slate-50",
              errors.bank_code ? "border-red-400" : "border-slate-300",
            )}
          >
            {draft.bank_code ? (
              <BankLogo kind="bank" bankCode={draft.bank_code} size={28} />
            ) : (
              <Landmark className="h-5 w-5 text-slate-400" aria-hidden />
            )}
            <span className={cn("min-w-0 flex-1 truncate text-sm", draft.bank_code ? "font-medium text-slate-900" : "text-slate-400")}>
              {chosen?.name ?? (draft.bank_code === OTHER_BANK ? t("payOtherBank") : t("payFormChooseBank"))}
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", pickerOpen && "rotate-180")} aria-hidden />
          </button>
          {errors.bank_code && <p className="mt-1 text-xs text-red-600">{errors.bank_code}</p>}

          {pickerOpen && (
            <div className="mt-2 rounded-xl border border-slate-200 bg-surface">
              <div className="relative border-b border-slate-100 p-2">
                <Search className="pointer-events-none absolute left-4.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("payFormSearchBank")}
                  aria-label={t("payFormSearchBank")}
                  className="h-9 pl-8 text-sm"
                  autoComplete="off"
                />
              </div>
              <ul className="max-h-64 overflow-y-auto py-1" role="listbox" aria-label={t("payFormChooseBank")}>
                {banks.map((b) => (
                  <li key={b.code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={draft.bank_code === b.code}
                      onClick={() => chooseBank(b.code)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50",
                        draft.bank_code === b.code && "bg-brand-50",
                      )}
                    >
                      <span className="flex w-20 shrink-0 justify-start">
                        <BankLogo kind="bank" bankCode={b.code} size={28} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{lang === "ne" ? b.nameNe : b.name}</span>
                        <span className="block text-[11px] text-slate-500">{lang === "ne" ? b.name : b.short}</span>
                      </span>
                      {draft.bank_code === b.code && <Check className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />}
                    </button>
                  </li>
                ))}
                {banks.length === 0 && <li className="px-3 py-2 text-xs text-slate-500">{t("payFormNoBank")}</li>}
                <li className="border-t border-slate-100">
                  <button
                    type="button"
                    role="option"
                    aria-selected={draft.bank_code === OTHER_BANK}
                    onClick={() => chooseBank(OTHER_BANK)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50"
                  >
                    <span className="flex w-20 shrink-0 justify-start">
                      <BankLogo kind="bank" bankCode={OTHER_BANK} size={28} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900">{t("payOtherBank")}</span>
                      <span className="block text-[11px] text-slate-500">{t("payOtherBankHint")}</span>
                    </span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      )}

      {isBank && draft.bank_code === OTHER_BANK && (
        <Field label={t("payFormBankName")} error={errors.bank_name}>
          <Input
            value={draft.bank_name ?? ""}
            onChange={(e) => set("bank_name", e.target.value)}
            placeholder={t("payFormBankNamePlaceholder")}
            maxLength={100}
          />
        </Field>
      )}

      {!isBank && (
        <Field label={t("payWalletId", { wallet })} hint={t("payFormWalletHint", { wallet })} error={errors.wallet_id}>
          <Input
            value={draft.wallet_id ?? ""}
            onChange={(e) => set("wallet_id", e.target.value)}
            placeholder="98XXXXXXXX"
            inputMode="tel"
            autoComplete="off"
          />
        </Field>
      )}

      <Field label={t("payAccountName")} hint={t("payFormAccountNameHint")} error={errors.account_name}>
        <Input
          value={draft.account_name}
          onChange={(e) => set("account_name", e.target.value)}
          autoComplete="name"
          maxLength={80}
        />
      </Field>

      {isBank && (
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <Field label={`${t("payAccountNumber")} (${t("optional")})`} hint={t("payFormAccountNumberHint")} error={errors.account_number}>
            <Input
              value={draft.account_number ?? ""}
              onChange={(e) => set("account_number", e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              maxLength={48}
            />
          </Field>
          <Field label={`${t("payBranch")} (${t("optional")})`}>
            <Input value={draft.branch ?? ""} onChange={(e) => set("branch", e.target.value)} maxLength={80} />
          </Field>
        </div>
      )}

      <div className="mb-3.5">
        <p className="text-[13px] font-medium text-slate-700">
          {t("payFormQr")} {isBank && <span className="font-normal text-slate-400">({t("optional")})</span>}
        </p>
        <p className="mb-2 mt-0.5 text-xs text-slate-500">
          {isBank ? t("payFormQrHintBank") : t("payFormQrHintWallet", { wallet })}
        </p>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-white",
              errors.qr ? "border-red-400" : "border-slate-300",
            )}
          >
            {shownQr ? (
              <img src={shownQr} alt="" className="h-full w-full object-contain p-1" />
            ) : (
              <QrCode className="h-10 w-10 text-slate-300" aria-hidden />
            )}
          </span>
          <div className="flex flex-col items-start gap-1.5">
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-surface px-3 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50">
              <ImageUp className="h-4 w-4" aria-hidden />
              {t("payFormUploadQr")}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { pickQr(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
              <Camera className="h-4 w-4" aria-hidden />
              {t("payFormTakePhoto")}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { pickQr(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {shownQr && (
              <button
                type="button"
                onClick={() => {
                  setQr(null);
                  setQrPreview(null);
                  setRemoveQr(Boolean(existing?.qr_url));
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                {t("payFormRemoveQr")}
              </button>
            )}
          </div>
        </div>
        {errors.qr && <p className="mt-1 text-xs text-red-600">{errors.qr}</p>}
      </div>

      {(draft.bank_code || !isBank) && (
        <div className="border-t border-slate-100 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("payFormPreview")}</p>
          <PaymentCard
            compact
            preview
            method={{
              ...draft,
              account_name: draft.account_name.trim() || "—",
              wallet_id: isBank ? null : walletDigits(draft.wallet_id) || null,
              account_number: isBank ? (draft.account_number ?? "").replace(/\s+/g, "") || null : null,
              qr_url: shownQr,
              is_primary: false,
            }}
          />
        </div>
      )}
    </Dialog>
  );
}
