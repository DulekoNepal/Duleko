import { Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";

export function RatingStars({
  value,
  count,
  size = 14,
  showCount = true,
  className,
}: {
  value: number;
  count?: number;
  size?: number;
  showCount?: boolean;
  className?: string;
}) {
  const { t, lang } = useI18n();
  const rounded = Math.round(value * 2) / 2;

  if (!count) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs text-slate-500", className)}>
        <Star className="text-slate-300" style={{ width: size, height: size }} aria-hidden />
        {t("newProfile")}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-slate-600", className)}>
      <span className="inline-flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={cn(
              i <= rounded ? "fill-sun-400 text-sun-400" : "text-slate-300",
              i - 0.5 === rounded && "fill-sun-400/50 text-sun-400",
            )}
          />
        ))}
      </span>
      <span className="font-medium text-slate-700">{formatNumber(value.toFixed(1), lang)}</span>
      {showCount && <span className="text-slate-400">({formatNumber(count, lang)})</span>}
    </span>
  );
}

export function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const labels = [t("star1"), t("star2"), t("star3"), t("star4"), t("star5")];

  return (
    <div>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onChange(i)}
            aria-label={`${i} — ${labels[i - 1]}`}
            aria-pressed={value === i}
            className="rounded-lg p-1 transition-transform hover:scale-110 disabled:opacity-50"
          >
            <Star
              className={cn("h-9 w-9", i <= value ? "fill-sun-400 text-sun-400" : "text-slate-300")}
            />
          </button>
        ))}
      </div>
      <p className="mt-1 h-5 text-sm font-medium text-slate-600">{value ? labels[value - 1] : ""}</p>
    </div>
  );
}
