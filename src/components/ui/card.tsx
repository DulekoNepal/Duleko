import { cn } from "@/lib/utils";

type CardTone = "default" | "primary" | "success" | "warning" | "danger";

const cardTones: Record<CardTone, string> = {
  default: "border-slate-200 bg-white",
  primary: "border-brand-200 bg-brand-50/30",
  success: "border-green-200 bg-green-50/50",
  warning: "border-amber-200 bg-amber-50/60",
  danger: "border-red-200 bg-red-50/50",
};

export function Card({
  className,
  tone = "default",
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  /** Semantic colour, so screens stop hand-rolling their own tinted borders. */
  tone?: CardTone;
  /**
   * Only for cards that are themselves a link or button. A hover lift on a
   * card nothing happens when you click is a false affordance, so this is
   * opt-in rather than the default.
   */
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border shadow-sm",
        cardTones[tone],
        interactive &&
          "transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-base font-semibold text-slate-900">{children}</h2>
      {action}
    </div>
  );
}

/** A small icon badge that gives a section a consistent, scannable identity - pair with SectionTitle. */
export function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
}
