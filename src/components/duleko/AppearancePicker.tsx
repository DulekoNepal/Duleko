import { useRef } from "react";
import { Check, Moon, Sun, SunMoon, type LucideIcon } from "lucide-react";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useIsDark, useThemeChoice, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { id: ThemeChoice; label: StringKey; icon: LucideIcon }[] = [
  { id: "system", label: "themeSystem", icon: SunMoon },
  { id: "light", label: "themeLight", icon: Sun },
  { id: "dark", label: "themeDark", icon: Moon },
];

/**
 * Settings > Appearance: three little pictures of the app - Auto (half
 * light, half dark), Light, Dark - so the choice is obvious at a glance,
 * even before reading the labels. Sits inside a ListGroup card.
 */
export function AppearancePicker() {
  const { t } = useI18n();
  const [theme, setTheme] = useThemeChoice();
  const dark = useIsDark();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const HeaderIcon = dark ? Moon : Sun;

  function choose(id: ThemeChoice, el: HTMLElement | null) {
    const box = el?.getBoundingClientRect();
    setTheme(id, box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : undefined);
  }

  // Radio-group keys: arrows move and select, like the phone's own pickers.
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + OPTIONS.length) % OPTIONS.length;
    buttons.current[next]?.focus();
    choose(OPTIONS[next].id, buttons.current[next]);
  }

  return (
    <div className="px-3.5 py-3">
      <div className="flex items-center gap-3">
        <HeaderIcon key={String(dark)} className="h-4 w-4 shrink-0 animate-[theme-icon-in_0.4s_ease-out] text-slate-400" aria-hidden />
        <span className="min-w-0 flex-1">
          <span id="appearance-title" className="block text-sm font-medium text-slate-900">
            {t("appearance")}
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 sm:text-xs">{t("appearanceHint")}</span>
        </span>
      </div>

      <div className="mt-3 max-w-md">
        <div role="radiogroup" aria-labelledby="appearance-title" className="grid grid-cols-3 gap-2 sm:gap-3">
          {OPTIONS.map(({ id, label, icon: Icon }, i) => {
            const selected = theme === id;
            return (
              <button
                key={id}
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={(e) => choose(id, e.currentTarget)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className="group min-w-0 rounded-2xl text-center focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "relative block aspect-[4/3] overflow-hidden rounded-xl transition-all duration-200",
                    "group-focus-visible:ring-4 group-focus-visible:ring-brand-600/30",
                    selected
                      ? "ring-2 ring-brand-600 ring-offset-2 ring-offset-surface"
                      : "ring-1 ring-slate-200 group-hover:-translate-y-0.5 group-hover:ring-slate-300 group-hover:shadow-md",
                  )}
                >
                  {id === "system" ? (
                    <>
                      <ThemePreview tone="light" />
                      <span className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">
                        <ThemePreview tone="dark" />
                      </span>
                    </>
                  ) : (
                    <ThemePreview tone={id} />
                  )}
                  <span
                    className={cn(
                      "absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white shadow transition-all duration-200 sm:right-1.5 sm:top-1.5 sm:h-5 sm:w-5",
                      selected ? "scale-100 opacity-100" : "scale-50 opacity-0",
                    )}
                    aria-hidden
                  >
                    <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={3} />
                  </span>
                </span>
                <span
                  className={cn(
                    "mt-1.5 flex items-center justify-center gap-1 text-xs transition-colors sm:text-[13px]",
                    selected ? "font-semibold text-slate-900" : "font-medium text-slate-500 group-hover:text-slate-700",
                  )}
                >
                  <Icon
                    className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-brand-600" : "text-slate-400")}
                    aria-hidden
                  />
                  <span className="truncate">{t(label)}</span>
                </span>
              </button>
            );
          })}
        </div>

        {theme === "system" && (
          <p className="mt-2.5 text-center text-[11px] text-slate-500 sm:text-xs" aria-live="polite">
            {dark ? t("themeSystemNowDark") : t("themeSystemNowLight")}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * A tiny sketch of a Duleko screen - header, a worker card, the green
 * button - in fixed colours, so each tile shows its own look whatever theme
 * the app is in right now.
 */
function ThemePreview({ tone }: { tone: "light" | "dark" }) {
  const light = tone === "light";
  return (
    <span className={cn("absolute inset-0 flex flex-col gap-[7%] p-[9%]", light ? "bg-[#f8f9fa]" : "bg-[#0b1220]")}>
      <span className="flex items-center gap-[6%]">
        <span className="aspect-square w-[12%] rounded-full bg-[#16a34a]" />
        <span className={cn("h-1 w-[38%] rounded-full", light ? "bg-[#cbd5e1]" : "bg-[#3b4a62]")} />
      </span>
      <span
        className={cn(
          "flex flex-1 items-center gap-[8%] rounded-md px-[8%] shadow-sm",
          light ? "bg-white ring-1 ring-[#e2e8f0]" : "bg-[#131c2e] ring-1 ring-[#2a364b]",
        )}
      >
        <span className={cn("aspect-square w-[22%] shrink-0 rounded-full", light ? "bg-[#dcfce7]" : "bg-[#133222]")} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn("h-1 w-[85%] rounded-full", light ? "bg-[#94a3b8]" : "bg-[#a9b6c8]")} />
          <span className={cn("h-1 w-[55%] rounded-full", light ? "bg-[#cbd5e1]" : "bg-[#3b4a62]")} />
        </span>
      </span>
      <span className="h-[16%] rounded-full bg-[#15803d]" />
    </span>
  );
}
