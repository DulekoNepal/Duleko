import { useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  /** Shown as text, or - with `icon` - read out and shown on hover. */
  label: string;
  icon?: LucideIcon;
  /** For a label in another script, so it's read out in that language. */
  lang?: string;
};

/**
 * A small pill of two or three choices that sits at the end of a settings
 * row. A radio group: arrows move and select, like the phone's own pickers.
 * `iconOnly` shows just the icons, with the labels kept for screen readers.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  iconOnly,
}: {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T, from: HTMLElement) => void;
  iconOnly?: boolean;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + options.length) % options.length;
    const el = buttons.current[next];
    if (!el) return;
    el.focus();
    onChange(options[next].value, el);
  }

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 rounded-lg bg-slate-100 p-0.5">
      {options.map(({ value: v, label: optionLabel, icon: Icon, lang }, i) => {
        const selected = v === value;
        return (
          <button
            key={v}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={iconOnly ? optionLabel : undefined}
            title={iconOnly ? optionLabel : undefined}
            lang={lang}
            tabIndex={selected ? 0 : -1}
            onClick={(e) => !selected && onChange(v, e.currentTarget)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "inline-flex h-7 items-center justify-center rounded-md text-xs transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40",
              iconOnly ? "w-8" : "px-2.5",
              selected
                ? "bg-surface font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "font-medium text-slate-500 hover:text-slate-800",
            )}
          >
            {Icon && iconOnly ? (
              <Icon className={cn("h-3.5 w-3.5", selected && "text-brand-600")} aria-hidden />
            ) : (
              optionLabel
            )}
          </button>
        );
      })}
    </div>
  );
}
