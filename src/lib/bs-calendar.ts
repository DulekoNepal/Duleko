/**
 * The Bikram Sambat (BS) calendar - Nepal's own, and the dates Duleko shows
 * by default. Dates are still stored and sent as AD day keys ("2026-10-10");
 * only what people read changes.
 *
 * Month lengths for BS 2070-2090 (April 2013 - April 2034), the same table
 * FLITO uses and the same months as public.bs_months in
 * 5600_payment_details_and_fees.sql. Outside it, dates fall back to AD.
 */

const BS_MIN_YEAR = 2070;
const MONTH_DAYS: number[][] = [
  [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30], // 2070
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2075
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], // 2080
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2085
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], // 2090
];
const BS_MAX_YEAR = BS_MIN_YEAR + MONTH_DAYS.length - 1;

// 1 Baisakh 2070 fell on 14 April 2013.
const EPOCH = Date.UTC(2013, 3, 14);
const DAY_MS = 86_400_000;

export const BS_MONTH_NAMES = {
  en: ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"],
  ne: ["वैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कात्तिक", "मंसिर", "पुस", "माघ", "फागुन", "चैत"],
} as const;

/** Short forms for tight spots, like a date strip. */
export const BS_MONTH_SHORT = {
  en: ["Bai", "Jes", "Asa", "Shr", "Bha", "Ash", "Kar", "Man", "Pou", "Mag", "Fal", "Cha"],
  ne: BS_MONTH_NAMES.ne,
} as const;

export interface BsDate {
  year: number;
  /** 1 = Baisakh. */
  month: number;
  day: number;
}

export function daysInBsMonth(year: number, month: number): number | null {
  return MONTH_DAYS[year - BS_MIN_YEAR]?.[month - 1] ?? null;
}

function parseKey(key: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** The BS date of an AD day key, or null outside 2070-2090. */
export function adToBs(key: string): BsDate | null {
  const ms = parseKey(key);
  if (ms === null) return null;
  let left = Math.round((ms - EPOCH) / DAY_MS);
  if (left < 0) return null;
  for (let year = BS_MIN_YEAR; year <= BS_MAX_YEAR; year++) {
    for (let month = 1; month <= 12; month++) {
      const length = MONTH_DAYS[year - BS_MIN_YEAR][month - 1];
      if (left < length) return { year, month, day: left + 1 };
      left -= length;
    }
  }
  return null;
}

/** The AD day key ("2026-10-10") of a BS date, or null if there is no such day. */
export function bsToAd({ year, month, day }: BsDate): string | null {
  const length = daysInBsMonth(year, month);
  if (!length || day < 1 || day > length) return null;
  let days = 0;
  for (let y = BS_MIN_YEAR; y < year; y++) days += MONTH_DAYS[y - BS_MIN_YEAR].reduce((a, b) => a + b, 0);
  for (let m = 1; m < month; m++) days += MONTH_DAYS[year - BS_MIN_YEAR][m - 1];
  return new Date(EPOCH + (days + day - 1) * DAY_MS).toISOString().slice(0, 10);
}

/** The BS month `count` months on from (year, month) - negative goes back. */
export function addBsMonths(year: number, month: number, count: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + count;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

// ---------------------------------------------------------------------
// Which calendar dates are shown in: BS unless someone picks AD.
// ---------------------------------------------------------------------
export type CalendarChoice = "bs" | "ad";

const CALENDAR_KEY = "duleko.calendar";

export function storedCalendar(): CalendarChoice {
  try {
    return window.localStorage.getItem(CALENDAR_KEY) === "ad" ? "ad" : "bs";
  } catch {
    return "bs";
  }
}

export function storeCalendar(choice: CalendarChoice): void {
  try {
    window.localStorage.setItem(CALENDAR_KEY, choice);
  } catch {
    // A private window can refuse storage; the choice then lasts this visit.
  }
}

// Read by formatDate() and friends in utils.ts, which are plain functions
// called all over the app. I18nProvider keeps it in step with the setting,
// and every caller re-renders through useI18n() when it changes.
let activeCalendar: CalendarChoice = typeof window === "undefined" ? "bs" : storedCalendar();

export function getCalendar(): CalendarChoice {
  return activeCalendar;
}

export function setActiveCalendar(choice: CalendarChoice): void {
  activeCalendar = choice;
}
