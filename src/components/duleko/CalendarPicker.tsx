import { CalendarDays } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { adToBs, BS_MONTH_NAMES, type CalendarChoice } from "@/lib/bs-calendar";
import { cn, formatNumber, todayKey } from "@/lib/utils";

/**
 * Settings > Dates: Nepali (BS) - the default - or English (AD). Each
 * option shows today's date in that calendar, so the choice is obvious
 * before reading the labels. Sits inside a ListGroup card.
 */
export function CalendarPicker() {
  const { t, lang, calendar, setCalendar } = useI18n();
  const today = todayKey();
  const bs = adToBs(today);
  const samples: Record<CalendarChoice, string> = {
    bs: bs ? `${formatNumber(bs.day, lang)} ${BS_MONTH_NAMES[lang][bs.month - 1]} ${formatNumber(bs.year, lang)}` : "",
    ad: formatNumber(
      new Date(`${today}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      lang,
    ),
  };

  return (
    <div className="px-3.5 py-3">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <span className="min-w-0 flex-1">
          <span id="calendar-title" className="block text-sm font-medium text-slate-900">
            {t("dateCalendarTitle")}
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 sm:text-xs">{t("dateCalendarHint")}</span>
        </span>
      </div>
      <div role="radiogroup" aria-labelledby="calendar-title" className="mt-3 grid max-w-md grid-cols-2 gap-2">
        {(["bs", "ad"] as const).map((choice) => {
          const selected = calendar === choice;
          return (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setCalendar(choice)}
              className={cn(
                "rounded-xl border-2 px-3 py-2 text-left transition-colors",
                selected ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-surface hover:border-slate-300",
              )}
            >
              <span className={cn("block text-sm font-semibold", selected ? "text-brand-800" : "text-slate-800")}>
                {t(choice === "bs" ? "dateCalendarBs" : "dateCalendarAd")}
              </span>
              <span className="block text-xs text-slate-500">{samples[choice]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
