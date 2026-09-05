import { useMemo } from "react";
import { cn, addDays, toDateKey, formatNumber } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { AvailabilityDay } from "@/lib/types";

const WEEKDAYS_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAYS_NE = ["आइ", "सो", "मं", "बु", "बि", "शु", "श"];

/**
 * A rolling 4-week strip rather than a month grid: the questions people actually
 * ask are "is he free this week / next week", and a strip is far easier to tap.
 */
export function AvailabilityCalendar({
  days,
  onToggle,
  editable = false,
  weeks = 4,
}: {
  days: AvailabilityDay[];
  onToggle?: (day: string, nextStatus: "available" | "booked") => void;
  editable?: boolean;
  weeks?: number;
}) {
  const { t, lang } = useI18n();
  const weekdays = lang === "ne" ? WEEKDAYS_NE : WEEKDAYS_EN;

  const byDay = useMemo(() => {
    const map = new Map<string, AvailabilityDay>();
    for (const d of days) map.set(d.day, d);
    return map;
  }, [days]);

  const start = useMemo(() => {
    const today = new Date();
    return addDays(today, -today.getDay()); // back to Sunday
  }, []);

  const cells = useMemo(
    () => Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i)),
    [start, weeks],
  );

  const todayStr = toDateKey(new Date());

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
        {weekdays.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date) => {
          const key = toDateKey(date);
          const record = byDay.get(key);
          const booked = record?.status === "booked";
          const lockedByJob = Boolean(record?.engagement_id);
          const past = key < todayStr;
          const isToday = key === todayStr;
          const clickable = editable && !past && !lockedByJob;

          return (
            <button
              key={key}
              type="button"
              disabled={!clickable}
              onClick={() => onToggle?.(key, booked ? "available" : "booked")}
              title={booked ? t("bookedDay") : t("availableNow")}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors",
                past && "cursor-default text-slate-300",
                !past && !booked && "bg-brand-50 text-brand-800",
                !past && booked && "bg-slate-200 text-slate-500 line-through",
                lockedByJob && "bg-amber-100 text-amber-800 no-underline",
                isToday && "ring-2 ring-brand-600 ring-offset-1",
                clickable && "hover:brightness-95",
              )}
            >
              {formatNumber(date.getDate(), lang)}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <i className="h-2.5 w-2.5 rounded-sm bg-brand-100" /> {t("availableNow")}
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="h-2.5 w-2.5 rounded-sm bg-slate-300" /> {t("bookedDay")}
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="h-2.5 w-2.5 rounded-sm bg-amber-200" /> {t("statusConfirmed")}
        </span>
      </div>
    </div>
  );
}
