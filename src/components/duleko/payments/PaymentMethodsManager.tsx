import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/states";
import { BankLogo } from "./BankLogo";
import { PaymentCard } from "./PaymentCard";
import { PaymentMethodForm, type PaymentFormResult } from "./PaymentMethodForm";
import { PAYMENT_KINDS } from "@/lib/banks";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { deletePaymentMethod, listPaymentMethods, makePrimaryPaymentMethod, savePaymentMethod } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { formatNumber } from "@/lib/utils";
import type { PaymentKind, PaymentMethod } from "@/lib/types";

/** Matches the database's limit (payment_methods_before_write). */
export const MAX_PAYMENT_METHODS = 5;

const ADD_LABEL: Record<PaymentKind, StringKey> = {
  bank: "payKindBank",
  esewa: "payKindEsewa",
  khalti: "payKindKhalti",
};

/** The react-query key for someone's accounts - or Duleko's, for null. */
export function paymentMethodsKey(owner: string | null) {
  return ["payment-methods", owner ?? "duleko"] as const;
}

/** One dashed "add" tile per kind: bank, eSewa, Khalti. */
export function AddPaymentTiles({ onAdd }: { onAdd: (kind: PaymentKind) => void }) {
  const { t } = useI18n();
  // Three across once there's room for them, stacked in a narrow column.
  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-2 @md:grid-cols-3">
        {PAYMENT_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => onAdd(kind)}
            aria-label={`${t("payAdd")}: ${t(ADD_LABEL[kind])}`}
            className="flex min-h-14 items-center gap-2.5 rounded-xl border-2 border-dashed border-slate-300 bg-surface px-3 py-2 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/60"
          >
            {kind === "bank" ? (
              <>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Landmark className="h-4.5 w-4.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{t(ADD_LABEL[kind])}</span>
              </>
            ) : (
              // The wallet's own logo already says which it is.
              <span className="min-w-0 flex-1">
                <BankLogo kind={kind} size={30} />
              </span>
            )}
            <Plus className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Someone's bank accounts and wallets, as cards, with everything to change
 * them: add (bank, eSewa or Khalti), edit, make main, remove. `owner` is a
 * profile id, or null for Duleko's own official accounts; `folder` is where
 * their QR photos go. With `canEdit` false it only shows them.
 */
export function PaymentMethodsManager({
  owner,
  folder,
  canEdit = true,
  emptyTitle,
  emptyText,
}: {
  owner: string | null;
  folder: string;
  canEdit?: boolean;
  emptyTitle?: string;
  emptyText?: string;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const key = paymentMethodsKey(owner);
  const [form, setForm] = useState<{ existing: PaymentMethod | null; kind: PaymentKind } | null>(null);
  const [removing, setRemoving] = useState<PaymentMethod | null>(null);

  const methods = useQuery({ queryKey: key, queryFn: () => listPaymentMethods(owner) });

  const save = useMutation({
    mutationFn: (result: PaymentFormResult) =>
      savePaymentMethod({
        folder,
        owner,
        existing: form?.existing ?? null,
        draft: result.draft,
        qr: result.qr,
        removeQr: result.removeQr,
      }),
    onSuccess: (rows) => {
      queryClient.setQueryData(key, rows);
      setForm(null);
      toast(t("paySaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const makePrimary = useMutation({
    mutationFn: (method: PaymentMethod) => makePrimaryPaymentMethod(method.id, owner),
    onSuccess: (rows) => {
      queryClient.setQueryData(key, rows);
      toast(t("payPrimarySet"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const remove = useMutation({
    mutationFn: (method: PaymentMethod) => deletePaymentMethod(method),
    onSuccess: (rows) => {
      queryClient.setQueryData(key, rows);
      setRemoving(null);
      toast(t("payRemoved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  if (methods.isError) {
    return <ErrorState message={errorMessage(methods.error)} onRetry={() => methods.refetch()} retryLabel={t("retry")} />;
  }
  if (methods.isPending) {
    return (
      <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    );
  }

  const rows = methods.data;
  const open = (kind: PaymentKind) => setForm({ existing: null, kind });

  return (
    <>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
          <p className="text-sm font-semibold text-slate-900">{emptyTitle ?? t("payEmptyTitle")}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{emptyText ?? t("payEmptyText")}</p>
          {canEdit && (
            <div className="mt-3">
              <AddPaymentTiles onAdd={open} />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
            {rows.map((method) => (
              <PaymentCard
                key={method.id}
                method={method}
                actions={
                  canEdit ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setForm({ existing: method, kind: method.kind })}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        {t("payEdit")}
                      </Button>
                      {!method.is_primary && (
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={makePrimary.isPending && makePrimary.variables?.id === method.id}
                          onClick={() => makePrimary.mutate(method)}
                        >
                          <Star className="h-3.5 w-3.5" aria-hidden />
                          {t("payMakePrimary")}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => setRemoving(method)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        {t("payRemove")}
                      </Button>
                    </>
                  ) : undefined
                }
              />
            ))}
          </div>

          {canEdit &&
            (rows.length < MAX_PAYMENT_METHODS ? (
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-500">{t("payAddTitle")}</p>
                <AddPaymentTiles onAdd={open} />
              </div>
            ) : (
              <p className="text-xs text-slate-500">{t("payLimitReached")}</p>
            ))}
        </div>
      )}

      {canEdit && (
        <>
          <PaymentMethodForm
            open={Boolean(form)}
            existing={form?.existing ?? null}
            initialKind={form?.kind}
            saving={save.isPending}
            onClose={() => setForm(null)}
            onSubmit={(result) => save.mutate(result)}
          />

          <Dialog
            open={Boolean(removing)}
            onClose={() => setRemoving(null)}
            title={t("payRemoveTitle")}
            footer={
              <>
                <Button variant="outline" onClick={() => setRemoving(null)}>
                  {t("cancel")}
                </Button>
                <Button variant="danger" loading={remove.isPending} onClick={() => removing && remove.mutate(removing)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {t("payRemove")}
                </Button>
              </>
            }
          >
            <p className="text-sm text-slate-600">{t("payRemoveBody")}</p>
            {removing && <PaymentCard className="mt-3" compact preview method={removing} />}
          </Dialog>
        </>
      )}
    </>
  );
}

/**
 * Someone else's accounts, read-only - only what RLS lets you see (a job
 * with them, or their phone rule). Shows nothing while loading, and
 * `empty` when there are none to show. With `limit`, the rest wait behind
 * a "show more" so a job sheet stays short.
 */
export function PaymentMethodsList({
  owner,
  empty = null,
  compact = true,
  limit,
}: {
  owner: string;
  empty?: React.ReactNode;
  compact?: boolean;
  limit?: number;
}) {
  const { t, lang } = useI18n();
  const [all, setAll] = useState(false);
  const methods = useQuery({ queryKey: paymentMethodsKey(owner), queryFn: () => listPaymentMethods(owner), staleTime: 60_000 });
  if (!methods.data) return null;
  if (methods.data.length === 0) return <>{empty}</>;
  const hidden = limit != null && !all ? Math.max(0, methods.data.length - limit) : 0;
  const shown = hidden ? methods.data.slice(0, limit) : methods.data;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
        {shown.map((method) => (
          <PaymentCard key={method.id} method={method} compact={compact} />
        ))}
      </div>
      {(hidden > 0 || (all && limit != null && methods.data.length > limit)) && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline"
        >
          {hidden > 0 ? t("payShowMore", { count: formatNumber(hidden, lang) }) : t("showLess")}
        </button>
      )}
    </div>
  );
}
