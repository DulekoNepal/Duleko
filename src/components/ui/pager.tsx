import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";

/**
 * Previous / next under a long list, with where you are - "21-40 of 57".
 * Hidden when everything fits on one page. `page` counts from 0.
 */
export function Pager({
  page,
  pageSize,
  total,
  onChange,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  const { t, lang } = useI18n();
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const button =
    "inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-surface px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 sm:h-9 sm:px-3 sm:text-sm";

  function go(next: number) {
    onChange(next);
    // Back to the top of the list, not stranded at the bottom of the new page.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <nav aria-label={t("pagerLabel")} className={cn("flex items-center justify-between gap-2 pt-1", className)}>
      <button type="button" className={button} disabled={page === 0} onClick={() => go(page - 1)}>
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        {t("pagerPrevious")}
      </button>
      <span className="text-[11px] tabular-nums text-slate-500 sm:text-xs">
        {t("pagerRange", { from: formatNumber(from, lang), to: formatNumber(to, lang), total: formatNumber(total, lang) })}
      </span>
      <button type="button" className={button} disabled={page >= pages - 1} onClick={() => go(page + 1)}>
        {t("pagerNext")}
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </nav>
  );
}
