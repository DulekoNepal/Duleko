import { addBsMonths, BS_MONTH_NAMES } from "./bs-calendar";
import { formatNumber } from "./utils";
import type { FeeAccount, FeeTier, Lang } from "./types";

/**
 * Display helpers for Duleko's fees. The database decides every fee (see
 * duleko_fee_for() in 5600_payment_details_and_fees.sql); this only
 * estimates one before a job is done, from the tiers it sends. Fees are
 * billed by Nepali month whichever calendar is chosen in Settings.
 */

/** "2083-08" -> "Mangsir 2083" / "मंसिर २०८३". */
export function formatBsMonth(period: string, lang: Lang): string {
  const [year, month] = period.split("-").map(Number);
  const name = BS_MONTH_NAMES[lang][month - 1];
  return name ? `${name} ${formatNumber(year, lang)}` : period;
}

/** The day a month's fees are due, in Nepali dates: Kartik's -> "15 Mangsir 2083". */
export function bsDueDay(period: string, dueDay: number, lang: Lang): string {
  const [year, month] = period.split("-").map(Number);
  const next = addBsMonths(year, month, 1);
  return `${formatNumber(dueDay, lang)} ${BS_MONTH_NAMES[lang][next.month - 1]} ${formatNumber(next.year, lang)}`;
}

/** Duleko's fee on a price, band by band - the same rule as duleko_fee_for(). */
export function feeFor(price: number, tiers: FeeTier[]): number {
  let fee = 0;
  let floor = 0;
  for (const tier of tiers) {
    const top = tier.up_to ?? Infinity;
    if (price > floor) fee += (Math.min(price, top) - floor) * (tier.percent / 100);
    floor = top;
  }
  return Math.round(fee);
}

/** The rule's bands - "5% of the first Rs 5,000" and so on. */
export function tierBands(tiers: FeeTier[]): { from: number; to: number | null; percent: number }[] {
  let from = 0;
  return tiers.map((tier) => {
    const band = { from, to: tier.up_to, percent: tier.percent };
    from = tier.up_to ?? from;
    return band;
  });
}

export type FeeStanding = "overdue" | "due" | "awaiting" | "clear";

/** Where a worker stands, in one word: past due, due, being checked, or clear. */
export function standingOf(account: FeeAccount): FeeStanding {
  if (account.overdue - account.awaiting > 0) return "overdue";
  if (account.payable_now - account.awaiting > 0) return "due";
  if (account.awaiting > 0) return "awaiting";
  return "clear";
}

/** The day in Nepal (UTC+5:45) a moment falls on, as a "2026-10-10" key - how the server dates fees. */
export function nepalDayOf(iso: string): string {
  return new Date(new Date(iso).getTime() + (5 * 60 + 45) * 60_000).toISOString().slice(0, 10);
}
