import { useState } from "react";
import { ArrowRight, Handshake, RefreshCw, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n";
import { cn, formatMoney } from "@/lib/utils";
import type { Bid } from "@/lib/types";

/**
 * The price on a pending work request: the offer on the table and who
 * made it, the trail of how it got there, and - for whoever didn't make
 * the latest move - offering another price.
 *
 * Saying yes to the price (the worker accepting, the hirer agreeing) is
 * the job sheet's main action, pinned to its foot, so it isn't repeated
 * here.
 */
export function NegotiationPanel({
  bids,
  myProfileId,
  otherName,
  currentAmount,
  myTurn,
  onCounter,
  countering,
}: {
  bids: Bid[];
  myProfileId: string;
  otherName: string;
  currentAmount: number | null;
  myTurn: boolean;
  /** Resolves once the new price is in, which closes the form. */
  onCounter: (amount: number) => Promise<unknown>;
  countering: boolean;
}) {
  const { t, lang } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const latest = bids[bids.length - 1];
  const latestIsMine = latest?.bidder_profile_id === myProfileId;

  function startCounter() {
    setDraft(currentAmount != null ? String(Math.round(currentAmount)) : "");
    setError("");
    setEditing(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(draft);
    if (!(amount > 0)) {
      setError(t("errJobBadAmount"));
      return;
    }
    try {
      await onCounter(amount);
      setEditing(false);
    } catch {
      // The sheet shows the error; keep the form open to try again.
    }
  }

  return (
    <section
      className={cn(
        "rounded-2xl border px-3.5 py-3",
        myTurn ? "border-brand-200 bg-brand-50/50" : "border-slate-200 bg-slate-50/70",
      )}
      aria-label={t("negotiation")}
    >
      <div className="flex items-center gap-2">
        <Handshake className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
        <h3 className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{t("sheetOfferedPrice")}</h3>
        <Badge tone={myTurn ? "brand" : "muted"} className="shrink-0">
          {myTurn ? t("yourTurn") : t("theirTurn")}
        </Badge>
      </div>

      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
        <p className="text-xl font-bold tabular-nums text-slate-900">{formatMoney(currentAmount, lang)}</p>
        {latest && (
          <p className="text-xs text-slate-500">{latestIsMine ? t("yourOffer") : t("offerFrom", { name: otherName })}</p>
        )}
      </div>

      {bids.length > 1 && (
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-400" aria-label={t("priceTrail")}>
          {bids.map((b, i) => (
            <span key={b.id} className="inline-flex items-center gap-1.5">
              {i > 0 && <ArrowRight className="h-3 w-3 shrink-0" aria-hidden />}
              <span className={cn("tabular-nums", i === bids.length - 1 && "font-semibold text-slate-600")}>
                {formatMoney(b.amount, lang)}
              </span>
            </span>
          ))}
        </p>
      )}

      {myTurn ? (
        editing ? (
          <form onSubmit={submit} className="mt-3">
            <div className="flex items-center gap-2">
              <label className="flex h-10 min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-slate-300 bg-surface pl-3 pr-1 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/25">
                <span className="text-sm text-slate-500">{lang === "ne" ? "रु" : "Rs"}</span>
                <span className="sr-only">{t("offerAnotherPrice")}</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setError("");
                  }}
                  autoFocus
                  className="h-8 min-w-0 flex-1 border-0 p-0 shadow-none focus:outline-none focus:ring-0"
                />
              </label>
              <Button type="submit" size="sm" loading={countering} className="h-10">
                <Send className="h-4 w-4" aria-hidden />
                {t("submitCounter")}
              </Button>
            </div>
            {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="mt-2 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              {t("cancel")}
            </button>
          </form>
        ) : (
          <Button size="sm" variant="outline" onClick={startCounter} className="mt-3">
            <RefreshCw className="h-4 w-4" aria-hidden />
            {t("offerAnotherPrice")}
          </Button>
        )
      ) : (
        <p className="mt-2 text-xs text-slate-500">{t("waitingForResponse", { name: otherName })}</p>
      )}
    </section>
  );
}
