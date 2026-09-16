import { cn } from "@/lib/utils";

/** A proper toggle switch - used wherever a plain checkbox was standing in for one. */
export function Switch({
  checked,
  onChange,
  disabled,
  className,
  size = "md",
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
  /** Compact for dense rows (profile availability); default for settings. */
  size?: "sm" | "md";
  "aria-label"?: string;
}) {
  const compact = size === "sm";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        "disabled:cursor-not-allowed disabled:opacity-50",
        compact ? "h-5 w-9" : "h-7 w-12",
        checked ? "bg-brand-600" : "bg-slate-300",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block transform rounded-full bg-white shadow transition-transform duration-200",
          compact ? "h-3.5 w-3.5 translate-x-0.5" : "h-5 w-5 translate-x-1",
          checked && (compact ? "translate-x-[18px]" : "translate-x-6"),
        )}
      />
    </button>
  );
}
