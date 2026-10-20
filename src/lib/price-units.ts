import type { StringKey } from "./i18n";

/**
 * What a post's price is for (8000). No unit (null) means the whole job -
 * every post before this, and still the usual case. Kept in step with the
 * job_posts.price_unit check and job_price_unit_text() in the database.
 */
export const PRICE_UNITS = ["hour", "day", "month", "km", "litre", "kg", "piece", "sqft"] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

/** The tap-button label in the post form: "Hour", "Km"... */
export const PRICE_UNIT_LABEL: Record<PriceUnit, StringKey> = {
  hour: "priceUnitHour",
  day: "priceUnitDay",
  month: "priceUnitMonth",
  km: "priceUnitKm",
  litre: "priceUnitLitre",
  kg: "priceUnitKg",
  piece: "priceUnitPiece",
  sqft: "priceUnitSqft",
};

/** After an amount: " / hr", " / day". */
export const PRICE_UNIT_SUFFIX: Record<PriceUnit, StringKey> = {
  hour: "priceUnitPerHour",
  day: "priceUnitPerDay",
  month: "priceUnitPerMonth",
  km: "priceUnitPerKm",
  litre: "priceUnitPerLitre",
  kg: "priceUnitPerKg",
  piece: "priceUnitPerPiece",
  sqft: "priceUnitPerSqft",
};
