import { cn } from "@/lib/utils";

/** The floating panel itself - anchor it inside a `relative` wrapper. */
export function MenuPanel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="menu"
      className={cn(
        "absolute right-0 top-full z-30 mt-1.5 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg",
        className,
      )}
      {...props}
    />
  );
}

/**
 * One row in a MenuPanel - icon, label, and the one action it takes.
 * `tone="danger"` is for anything destructive/irreversible-ish (suspend,
 * delete) so it reads as a different weight of action at a glance,
 * without a whole separate confirm-styled component for every menu.
 */
export function MenuItem({
  icon: Icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium transition-colors duration-200",
        tone === "danger" ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", tone === "danger" ? "text-red-500" : "text-slate-500")} aria-hidden />
      {label}
    </button>
  );
}

/**
 * A thin divider between groups of MenuItems in the same panel - e.g.
 * separating ordinary actions from a staff-only section below them.
 */
export function MenuDivider() {
  return <div role="separator" className="my-1 border-t border-slate-100" />;
}

/**
 * A small uppercase label above a group of MenuItems, so a mixed menu
 * (say, everyday actions plus a staff-only section) reads as two
 * clearly labelled groups instead of one undifferentiated list.
 */
export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-3.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{children}</p>;
}
