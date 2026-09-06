import { useState } from "react";
import { ArrowRight, Check, Handshake, RefreshCw } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n";
import { cn, formatMoney } from "@/lib/utils";
import type { Bid } from "@/lib/types";

/**
 * The price-negotiation thread on a pending work request: current offer,
 * a short trail of how it got there, and — for whoever didn't make the
 * latest move — the choice to counter it or (worker only) accept it.
 */
export function NegotiationPanel({
  bids,
  myProfileId,
  otherName,
  otherAvatarUrl,
  currentAmount,
  canAccept,
  onAccept,
  accepting,
  onCounter,
  countering: submittingCounter,
}: {
  bids: Bid[];
  myProfileId: string;
  otherName: string;
  otherAvatarUrl: string | null;
  currentAmount: number | null;
  /** Only the worker can finalize a job by accepting a price. */
  canAccept: boolean;
  onAccept: () => void;
  accepting: boolean;
  onCounter: (amount: number) => void;
  countering: boolean;
}) {
  const { t, lang } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const latest = bids[bids.length - 1];
  const latestIsMine = latest?.bidder_profile_id === myProfileId;
  const myTurn = Boolean(latest) && !latestIsMine;

  function startCounter() {
    setDraft(currentAmount != null ? String(currentAmount) : "");
    setEditing(true);
  }

  function submit() {
    const amount = Number(draft);
    if (amount > 0) onCounter(amount);
  }

  return (
    <div
      className={cn(
        "mt-3 overflow-hidden rounded-2xl border",
        myTurn ? "border-brand-200 bg-brand-50/40" : "border-slate-200 bg-slate-50",
      )}
    >
      <div className="flex items-center gap-2 border-b border-black/5 px-3.5 py-2">
        <Handshake className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
        <span className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("negotiation")}
        </span>
        <Badge tone={myTurn ? "brand" : "muted"} className="ml-auto shrink-0">
          {myTurn ? t("yourTurn") : t("theirTurn")}
        </Badge>
      </div>

      <div className="px-3.5 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={otherName} src={otherAvatarUrl} size={32} />
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-500">
              {latestIsMine ? t("yourOffer") : t("offerFrom", { name: otherName })}
            </p>
            <p className="text-xl font-bold leading-tight text-slate-900">
              {formatMoney(currentAmount, lang)}
            </p>
          </div>
        </div>

        {bids.length > 1 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-400">
            {bids.map((b, i) => (
              <span key={b.id} className="inline-flex items-center gap-1.5">
                {i > 0 && <ArrowRight className="h-3 w-3 shrink-0" aria-hidden />}
                <span className={i === bids.length - 1 ? "font-semibold text-slate-600" : undefined}>
                  {formatMoney(b.amount, lang)}
                </span>
              </span>
            ))}
          </div>
        )}

        <div className="mt-3">
          {editing ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white pl-3 pr-1 focus-within:border-brand-600 focus-within:outline focus-within:outline-2 focus-within:outline-brand-600/30">
                <span className="text-sm text-slate-500">{lang === "ne" ? "रु" : "Rs"}</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                  className="h-8 w-24 border-0 p-0 shadow-none focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" loading={submittingCounter} onClick={submit}>
                  {t("submitCounter")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </div>
          ) : myTurn ? (
            <div className="flex flex-wrap gap-2">
              {canAccept && (
                <Button size="sm" loading={accepting} onClick={onAccept}>
                  <Check className="h-4 w-4" aria-hidden />
                  {t("acceptAtPrice", { amount: formatMoney(currentAmount, lang) })}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={startCounter}>
                <RefreshCw className="h-4 w-4" aria-hidden />
                {t("counterOffer")}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">{t("waitingForResponse", { name: otherName })}</p>
          )}
        </div>
      </div>
    </div>
  );
}
