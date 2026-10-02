import { ChevronRight, CircleDot, type LucideIcon } from "lucide-react";
import { SectionIcon } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { BrandWatermark } from "@/components/duleko/site/ui";
import { useI18n } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";

/**
 * Building blocks shared by your own Profile and someone else's (the worker
 * page), so the two read as the same design.
 */

/** Cover banner: the photo when there is one, a soft patterned wash when not. */
export function ProfileCover({
  src,
  className,
  children,
}: {
  src?: string | null;
  /** Height override - defaults to growing with the screen. */
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("relative", className ?? "h-32 sm:h-44 lg:h-52")}>
      <div className="absolute inset-0 bg-gradient-to-br from-brand-100 via-brand-50 to-cream-50" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(21_128_61/0.14)_1px,transparent_0)] [background-size:18px_18px]"
        aria-hidden
      />
      <BrandWatermark tone="light" className="inset-y-3 right-6 aspect-square" />
      {src && (
        <>
          <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" aria-hidden />
        </>
      )}
      {children}
    </div>
  );
}

/** A titled white card - every block on a profile page is one of these. */
export function SectionCard({
  icon,
  title,
  badge,
  action,
  compact = false,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  badge?: number;
  action?: React.ReactNode;
  /** Tighter padding and a smaller heading - your own Profile, where cards sit densely. */
  compact?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { lang } = useI18n();
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-surface shadow-sm",
        compact ? "p-3.5 sm:p-4" : "p-4 sm:p-5",
        className,
      )}
    >
      <div className={cn("flex items-center justify-between gap-3", compact ? "mb-3" : "mb-4")}>
        <h3
          className={cn(
            "flex min-w-0 items-center gap-2.5 font-semibold text-slate-900",
            compact ? "text-sm" : "text-base",
          )}
        >
          <SectionIcon icon={icon} />
          <span className="truncate">{title}</span>
          {badge != null && (
            <span className="rounded-full bg-slate-100 px-2 text-xs font-semibold leading-5 text-slate-600">
              {formatNumber(badge, lang)}
            </span>
          )}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Icon, label and value - one fact in a Details list. Use inside a <dl>. */
export function DetailRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200/70">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="break-words text-sm font-semibold text-slate-800">{value}</dd>
      </div>
    </div>
  );
}

/**
 * Available for work or not, as the lead card. On your own Profile it carries
 * the switch; on someone else's page (no onChange) it only says where they stand.
 */
export function AvailabilityCard({
  on,
  hint,
  pending = false,
  onChange,
}: {
  on: boolean;
  hint: string;
  pending?: boolean;
  onChange?: (next: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <section className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-surface p-3.5 shadow-sm transition-colors">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          on ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-400",
        )}
      >
        <CircleDot className="h-4.5 w-4.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-slate-900">{on ? t("availableForWork") : t("notAvailable")}</h3>
        <p className="mt-0.5 text-xs leading-snug text-slate-500">{hint}</p>
      </div>
      {onChange && (
        <Switch size="sm" checked={on} disabled={pending} onChange={onChange} aria-label={t("availableForWork")} />
      )}
    </section>
  );
}

/** One number on the stats row; pass onClick to make it a shortcut. */
export function StatTile({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="mt-2 truncate text-lg font-bold tabular-nums leading-none text-slate-900">{value}</span>
      <span className="mt-1 flex items-center gap-0.5 truncate text-[11px] font-medium text-slate-500 @xl:text-xs">
        {label}
        {onClick && <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-slate-400 @xl:block" aria-hidden />}
      </span>
    </>
  );
  const box = "flex min-w-0 flex-col rounded-xl border border-slate-200 bg-surface p-2.5 text-left shadow-sm @xl:rounded-2xl @xl:p-3";
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={cn(box, "transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md")}
    >
      {body}
    </button>
  ) : (
    <div className={box}>{body}</div>
  );
}
