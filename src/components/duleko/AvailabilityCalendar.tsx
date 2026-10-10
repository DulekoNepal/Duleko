import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, addDays, toDateKey, formatNumber } from "@/lib/utils";
import { addBsMonths, adToBs, bsToAd, BS_MONTH_NAMES, BS_MONTH_SHORT } from "@/lib/bs-calendar";
import { useI18n } from "@/lib/i18n";
import type { AvailabilityDay } from "@/lib/types";

const WEEKDAYS_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAYS_NE = ["आइ", "सो", "मं", "बु", "बि", "शु", "श"];

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_NAMES_NE = [
  "जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन",
  "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर",
];
const MONTH_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Where a day sits in whichever calendar is showing - BS (Nepal's, the
 * default) or AD. The cells themselves are always AD days underneath.
 */
interface DayParts {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
}

/**
 * Two shapes in one component:
 *  - a rolling N-week strip (default) - good for "is he free this/next week"
 *    and for the work-date picker, where a short range is all that matters.
 *  - a flippable month grid (monthView) - lets someone mark a whole year of
 *    busy days, one month at a time, like "I'm busy on 15 Mangsir".
 * Both follow the calendar chosen in Settings: Nepali months and day
 * numbers by default, AD for anyone who picked it.
 */
export function AvailabilityCalendar({
  days,
  onToggle,
  editable = false,
  weeks = 4,
  selectedDay,
  onSelectDay,
  monthView = false,
}: {
  days: AvailabilityDay[];
  onToggle?: (day: string, nextStatus: "available" | "booked") => void;
  editable?: boolean;
  weeks?: number;
  /** Currently picked day, when used as a date picker (see onSelectDay). */
  selectedDay?: string;
  /**
   * Turns the strip into a date picker: tapping a free, non-past day calls
   * this instead of toggling availability. Booked/past days stay disabled
   * either way, so a booked day can never be picked.
   */
  onSelectDay?: (day: string) => void;
  /** Render a flippable month grid (a full year, one month at a time) instead of a rolling strip. */
  monthView?: boolean;
}) {
  const { t, lang, calendar } = useI18n();
  const weekdays = lang === "ne" ? WEEKDAYS_NE : WEEKDAYS_EN;
  const todayStr = toDateKey(new Date());
  // BS unless chosen otherwise - or if today is somehow past the BS table.
  const bsMode = calendar === "bs" && adToBs(todayStr) != null;

  const partsOf = (date: Date): DayParts => {
    const bs = bsMode ? adToBs(toDateKey(date)) : null;
    return bs ?? { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
  };
  const monthName = (month: number) =>
    (bsMode ? BS_MONTH_NAMES[lang] : lang === "ne" ? MONTH_NAMES_NE : MONTH_NAMES_EN)[month - 1];
  const monthShort = (month: number) =>
    (bsMode ? BS_MONTH_SHORT[lang] : lang === "ne" ? MONTH_NAMES_NE : MONTH_SHORT_EN)[month - 1];

  const byDay = useMemo(() => {
    const map = new Map<string, AvailabilityDay>();
    for (const d of days) map.set(d.day, d);
    return map;
  }, [days]);

  // Months on from this one: 0 is this month, 11 the last of the year ahead.
  // Counted, not stored as a date, so switching calendars keeps its place.
  const [offset, setOffset] = useState(0);
  const today = partsOf(new Date());
  const view = bsMode
    ? addBsMonths(today.year, today.month, offset)
    : { year: today.year + Math.floor((today.month - 1 + offset) / 12), month: ((today.month - 1 + offset) % 12) + 1 };

  const start = useMemo(() => {
    if (monthView) {
      const firstKey = bsMode ? bsToAd({ year: view.year, month: view.month, day: 1 }) : null;
      const first = firstKey ? new Date(`${firstKey}T00:00:00`) : new Date(view.year, view.month - 1, 1);
      // Back up to the Sunday on/before the 1st, so the grid always fills full weeks.
      return addDays(first, -first.getDay());
    }
    const now = new Date();
    return addDays(now, -now.getDay()); // back to Sunday
  }, [monthView, bsMode, view.year, view.month]);

  const cellCount = monthView ? 42 : weeks * 7; // 6 full weeks always covers a month

  const cells = useMemo(
    () => Array.from({ length: cellCount }, (_, i) => addDays(start, i)),
    [start, cellCount],
  );

  return (
    <div>
      {monthView && (
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setOffset((o) => o - 1)}
            disabled={offset <= 0}
            aria-label={t("previousMonth")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <p className="text-sm font-semibold text-slate-800">
            {monthName(view.month)} {formatNumber(view.year, lang)}
          </p>
          <button
            type="button"
            onClick={() => setOffset((o) => o + 1)}
            disabled={offset >= 11}
            aria-label={t("nextMonth")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
      <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
        {weekdays.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          const key = toDateKey(date);
          const parts = partsOf(date);
          const record = byDay.get(key);
          const booked = record?.status === "booked";
          const lockedByJob = Boolean(record?.engagement_id);
          const past = key < todayStr;
          const isToday = key === todayStr;
          const isSelected = selectedDay === key;
          const outsideMonth = monthView && (parts.month !== view.month || parts.year !== view.year);
          const clickable = onSelectDay ? !past && !booked : editable && !past && !lockedByJob;
          // The strip has no month heading, so it names the month where one starts.
          const monthTag = !monthView && (index === 0 || parts.day === 1) ? monthShort(parts.month) : null;

          function handleClick() {
            if (onSelectDay) {
              if (!past && !booked) onSelectDay(key);
              return;
            }
            onToggle?.(key, booked ? "available" : "booked");
          }

          return (
            <button
              key={key}
              type="button"
              disabled={!clickable}
              onClick={handleClick}
              title={booked ? t("bookedDay") : t("freeDay")}
              className={cn(
                "flex aspect-square flex-col items-center justify-center text-sm transition-colors duration-200",
                monthView
                  ? // Month view (Profile): minimal - open days are plain numbers,
                    // only busy and job days get a fill.
                    cn(
                      "mx-auto w-full max-w-11 rounded-full",
                      outsideMonth && "opacity-40",
                      past && "cursor-default text-slate-300",
                      !past && !booked && "text-slate-800",
                      !past && booked && !lockedByJob && "bg-slate-800 font-medium text-surface",
                      lockedByJob && "bg-amber-100 font-medium text-amber-900",
                      isToday && !booked && "font-semibold text-brand-700 ring-1 ring-brand-600",
                      clickable && !booked && "hover:bg-slate-100",
                      clickable && booked && !lockedByJob && "hover:bg-slate-700",
                    )
                  : cn(
                      "rounded-lg",
                      past && "cursor-default text-slate-300",
                      !past && !booked && "bg-brand-50 text-brand-800",
                      !past && booked && "bg-slate-200 text-slate-500 line-through",
                      lockedByJob && "bg-amber-100 text-amber-800 no-underline",
                      isToday && !isSelected && "ring-2 ring-brand-600 ring-offset-1",
                      isSelected && "ring-2 ring-brand-700 ring-offset-1 bg-brand-600 text-white",
                      clickable && "hover:brightness-95",
                    ),
              )}
            >
              {formatNumber(parts.day, lang)}
              {monthTag && <span className="-mt-0.5 text-[9px] font-medium leading-none opacity-75">{monthTag}</span>}
            </button>
          );
        })}
      </div>
      {monthView ? (
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full ring-1 ring-slate-300" /> {t("freeDay")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full bg-slate-800" /> {t("bookedDay")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full bg-amber-200" /> {t("statusConfirmed")}
          </span>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <i className="h-2.5 w-2.5 rounded-sm bg-brand-100" /> {t("freeDay")}
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-2.5 w-2.5 rounded-sm bg-slate-300" /> {t("bookedDay")}
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-2.5 w-2.5 rounded-sm bg-amber-200" /> {t("statusConfirmed")}
          </span>
        </div>
      )}
    </div>
  );
}
