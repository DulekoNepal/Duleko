import { ChevronRight, type LucideIcon } from "lucide-react";
import { SectionIcon } from "@/components/ui/card";
import { BrandWatermark } from "@/components/duleko/site/ui";
import { useI18n } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";

/**
 * The cover, the titled card and the stat tile - used by both profile pages
 * (see profile/ProfileUI.tsx for the rest) and the fee screens.
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
