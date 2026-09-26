import { Link } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A plain grouped list - small heading, then one white card of rows split
 * by hairlines. Used for Profile's Settings and About Duleko so both read
 * like a phone's own settings screen.
 */
export function ListGroup({
  title,
  action,
  footer,
  children,
  className,
}: {
  title?: string;
  /** A small text action beside the heading - "Edit". */
  action?: { label: string; onClick: () => void };
  /** A short note under the card. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {(title || action) && (
        <div className="flex items-end justify-between gap-3 px-1 pb-2">
          {title && <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="-my-1 shrink-0 rounded-md px-1.5 py-1 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {children}
      </div>
      {footer && <p className="px-1 pt-2 text-xs leading-relaxed text-slate-500">{footer}</p>}
    </section>
  );
}

type RowTarget =
  | { to: React.ComponentProps<typeof Link>["to"]; params?: Record<string, string>; hash?: string }
  | { href: string; external?: boolean }
  | { onClick: () => void }
  | object;

/**
 * One row: icon, title, an optional one-line hint, and whatever sits on the
 * right (a switch, a value). Pass `to`, `href` or `onClick` to make the
 * whole row tappable - it then gets a chevron unless `trailing` says
 * otherwise.
 */
export function ListRow({
  icon: Icon,
  title,
  hint,
  trailing,
  tone = "default",
  disabled,
  expanded,
  ...target
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  hint?: React.ReactNode;
  trailing?: React.ReactNode;
  tone?: "default" | "danger";
  disabled?: boolean;
  /** For a row that opens something beneath it. */
  expanded?: boolean;
} & RowTarget) {
  const interactive = "to" in target || "href" in target || "onClick" in target;
  const danger = tone === "danger";

  const body = (
    <>
      <Icon className={cn("h-5 w-5 shrink-0", danger ? "text-red-500" : "text-slate-400")} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[15px] font-medium", danger ? "text-red-600" : "text-slate-900")}>
          {title}
        </span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-slate-500">{hint}</span>}
      </span>
      {trailing ??
        (interactive && !danger && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />)}
    </>
  );

  const className = cn(
    "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left",
    interactive && "transition-colors hover:bg-slate-50 disabled:opacity-60",
  );

  if ("to" in target) {
    return (
      <Link to={target.to} params={target.params as never} hash={target.hash} className={className}>
        {body}
      </Link>
    );
  }
  if ("href" in target) {
    return (
      <a
        href={target.href}
        className={className}
        {...(target.external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {body}
      </a>
    );
  }
  if ("onClick" in target) {
    return (
      <button
        type="button"
        onClick={target.onClick}
        disabled={disabled}
        aria-expanded={expanded}
        className={className}
      >
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}
