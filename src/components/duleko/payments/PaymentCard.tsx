import { useState } from "react";
import { Copy, QrCode, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { BankLogo } from "./BankLogo";
import { cardStyleOf, groupDigits, methodTitle, shade, WALLETS } from "@/lib/banks";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { copyLink } from "@/lib/share";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/types";

/** What the card needs - a saved account, or a draft still being typed. */
export type PaymentCardData = Pick<
  PaymentMethod,
  "kind" | "bank_code" | "bank_name" | "branch" | "account_number" | "account_name" | "wallet_id" | "qr_url" | "is_primary"
>;

/** A QR only scans dark-on-white, so it always sits on a white panel. */
function QrPanel({ src, size }: { src: string; size: number }) {
  return (
    <span className="block rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-black/10">
      <img src={src} alt="" style={{ width: size, height: size }} className="object-contain" />
    </span>
  );
}

/**
 * One bank account or eSewa/Khalti wallet, drawn like the card in a bank
 * app: the bank's or wallet's own colour behind it, its official logo,
 * the name and number a payer types in (with a copy button), and the QR
 * to scan. `actions` (edit, make main, remove) sit under the card.
 * `preview` draws it inert, for the form's "how it will look".
 */
export function PaymentCard({
  method,
  actions,
  compact = false,
  preview = false,
  className,
}: {
  method: PaymentCardData;
  actions?: React.ReactNode;
  compact?: boolean;
  preview?: boolean;
  className?: string;
}) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [qrOpen, setQrOpen] = useState(false);
  const style = cardStyleOf(method);
  const light = style.ink === "light";
  const title = methodTitle(method, lang) || t("payKindBank");
  const wallet = method.kind === "bank" ? null : WALLETS[method.kind].name;
  const number = method.kind === "bank" ? method.account_number : method.wallet_id;

  async function copy(value: string) {
    const result = await copyLink(value);
    toast(result === "copied" || result === "shared" ? t("payCopied") : t("copyFailed"), result === "failed" ? "error" : undefined);
  }

  return (
    <div className={className}>
      <article
        className={cn(
          "relative overflow-hidden rounded-2xl shadow-md shadow-slate-900/10",
          light ? "text-white" : "text-[#1B1F2A]",
        )}
        style={{ background: `linear-gradient(135deg, ${style.color} 0%, ${shade(style.color, light ? 0.22 : 0.12)} 100%)` }}
        aria-label={`${title}, ${method.account_name}`}
      >
        {/* A bank card's sheen - two soft rings, nothing that competes with the text. */}
        <span className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/12" aria-hidden />
        <span className="pointer-events-none absolute -bottom-20 right-16 h-40 w-40 rounded-full bg-black/6" aria-hidden />

        <div className={cn("relative", compact ? "p-3" : "p-4")}>
          <div className="flex items-center gap-2.5">
            <BankLogo kind={method.kind} bankCode={method.bank_code} size={compact ? 30 : 36} />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate font-bold leading-tight", compact ? "text-sm" : "text-[15px]")}>{title}</p>
              <p className={cn("truncate text-xs", light ? "text-white/80" : "text-black/65")}>
                {method.kind === "bank" ? method.branch || t("payKindBank") : t("payWalletId", { wallet: wallet ?? "" })}
              </p>
            </div>
            {method.is_primary && !compact && (
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  light ? "bg-white/20 text-white" : "bg-black/10 text-[#1B1F2A]",
                )}
              >
                <Star className="h-3 w-3 fill-current" aria-hidden />
                {t("payPrimary")}
              </span>
            )}
          </div>

          <div className={cn("flex items-end gap-3", compact ? "mt-2.5" : "mt-4")}>
            <dl className="min-w-0 flex-1 space-y-2">
              <div>
                <dt className={cn("text-[10px] font-semibold uppercase tracking-wider", light ? "text-white/70" : "text-black/55")}>
                  {t("payAccountName")}
                </dt>
                <dd className="break-words text-sm font-semibold">{method.account_name}</dd>
              </div>
              <div>
                <dt className={cn("text-[10px] font-semibold uppercase tracking-wider", light ? "text-white/70" : "text-black/55")}>
                  {method.kind === "bank" ? t("payAccountNumber") : t("payWalletId", { wallet: wallet ?? "" })}
                </dt>
                {number ? (
                  <dd className="flex items-center gap-1.5">
                    <span className={cn("select-all break-all font-mono font-semibold tabular-nums tracking-wider", compact ? "text-[15px]" : "text-lg")}>
                      {method.kind === "bank" ? groupDigits(number) : number}
                    </span>
                    {!preview && (
                      <button
                        type="button"
                        onClick={() => void copy(number)}
                        className={cn(
                          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                          light ? "bg-white/15 hover:bg-white/25" : "bg-black/10 hover:bg-black/15",
                        )}
                        aria-label={t("payCopy")}
                        title={t("payCopy")}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    )}
                  </dd>
                ) : (
                  <dd className="text-sm font-medium">{t("payQrOnly")}</dd>
                )}
              </div>
            </dl>

            {method.qr_url && preview && <QrPanel src={method.qr_url} size={60} />}
            {method.qr_url && !preview && (
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                className="group shrink-0 text-center"
                aria-label={t("payQrTitle", { name: title })}
              >
                <QrPanel src={method.qr_url} size={compact ? 60 : 76} />
                <span className={cn("mt-1 inline-flex items-center gap-1 text-[10px] font-medium", light ? "text-white/85" : "text-black/65")}>
                  <QrCode className="h-3 w-3" aria-hidden />
                  {t("payTapQr")}
                </span>
              </button>
            )}
          </div>
        </div>
      </article>

      {actions && <div className="mt-2 flex flex-wrap items-center gap-1.5">{actions}</div>}

      {method.qr_url && !preview && (
        <Dialog open={qrOpen} onClose={() => setQrOpen(false)} title={t("payQrTitle", { name: title })}>
          <div className="flex flex-col items-center gap-3 pb-1 text-center">
            <BankLogo kind={method.kind} bankCode={method.bank_code} size={36} />
            <QrPanel src={method.qr_url} size={260} />
            <p className="text-base font-semibold text-slate-900">{method.account_name}</p>
            {number && (
              <p className="font-mono text-sm font-semibold tabular-nums tracking-wider text-slate-700">
                {method.kind === "bank" ? groupDigits(number) : number}
              </p>
            )}
            <p className="max-w-xs text-xs leading-relaxed text-slate-500">{t("payQrHint", { name: method.account_name })}</p>
            <Button variant="outline" size="sm" onClick={() => setQrOpen(false)}>
              {t("close")}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
