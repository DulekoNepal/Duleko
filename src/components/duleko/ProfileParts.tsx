import type { LucideIcon } from "lucide-react";
import { SectionIcon } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";

/**
 * Building blocks shared by your own Profile and someone else's (the worker
 * page), so the two read as the same design.
 */

/** Cover banner: the photo when there is one, a soft patterned wash when not. */
export function ProfileCover({ src, children }: { src?: string | null; children?: React.ReactNode }) {
  return (
    <div className="relative h-32 sm:h-44 lg:h-52">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-100 via-brand-50 to-cream-50" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(21_128_61/0.14)_1px,transparent_0)] [background-size:18px_18px]"
        aria-hidden
      />
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
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  badge?: number;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const { lang } = useI18n();
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2.5 text-base font-semibold text-slate-900">
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

/** One cell of the stats strip under a profile's identity. Use inside a <dl>. */
export function StatItem({
  icon: Icon,
  label,
  value,
  small = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  /** For a longer value (a date) that shouldn't dwarf its neighbours. */
  small?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 bg-white px-3 py-4 text-center sm:py-5">
      <Icon className="h-4 w-4 text-brand-600" aria-hidden />
      <dt className="order-last text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={cn("font-bold text-slate-900", small ? "text-sm sm:text-base" : "text-lg sm:text-xl")}>
        {value}
      </dd>
    </div>
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
