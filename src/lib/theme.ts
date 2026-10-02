import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { setStatusBarTheme } from "@/lib/native-android";

/**
 * Light / dark mode, chosen in Settings > Appearance. "system" follows the
 * phone's own setting and is the default. The choice lives on this device
 * only (like the language), and index.html applies it before first paint so
 * a dark-mode user never sees a white flash.
 */
export type ThemeChoice = "system" | "light" | "dark";

const THEME_KEY = "duleko.theme";
const darkQuery = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
const listeners = new Set<() => void>();

function readChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage blocked - fall back to the system setting.
  }
  return "system";
}

let choice: ThemeChoice = typeof window !== "undefined" ? readChoice() : "system";

function isDark(): boolean {
  return choice === "dark" || (choice === "system" && !!darkQuery?.matches);
}

function apply(): void {
  const dark = isDark();
  document.documentElement.classList.toggle("dark", dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0b1220" : "#15803d");
  setStatusBarTheme(dark);
}

function commit(next: ThemeChoice): void {
  choice = next;
  try {
    if (next === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, next);
  } catch {
    // Still applies for this visit.
  }
  apply();
  listeners.forEach((l) => l());
}

/**
 * Switch theme. Pass the point that was tapped and, where the browser can
 * (Chrome / Android WebView), the new look spreads out from it in a circle;
 * elsewhere, or with reduced motion on, it simply swaps.
 */
export function setThemeChoice(next: ThemeChoice, from?: { x: number; y: number }): void {
  if (next === choice) return;
  const willBeDark = next === "dark" || (next === "system" && !!darkQuery?.matches);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!from || willBeDark === isDark() || reduceMotion || !document.startViewTransition) {
    commit(next);
    return;
  }

  const transition = document.startViewTransition(() => flushSync(() => commit(next)));
  transition.ready
    .then(() => {
      const radius = Math.hypot(
        Math.max(from.x, window.innerWidth - from.x),
        Math.max(from.y, window.innerHeight - from.y),
      );
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${from.x}px ${from.y}px)`, `circle(${radius}px at ${from.x}px ${from.y}px)`] },
        { duration: 500, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
}

/** Call once at startup: applies the saved choice and tracks the system setting. */
export function setupTheme(): void {
  apply();
  darkQuery?.addEventListener("change", () => {
    if (choice !== "system") return;
    apply();
    listeners.forEach((l) => l());
  });
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useThemeChoice(): [ThemeChoice, typeof setThemeChoice] {
  const current = useSyncExternalStore(subscribe, () => choice, () => "system" as const);
  return [current, setThemeChoice];
}

/** Whether the app is dark right now, whatever the reason (choice or phone). */
export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, isDark, () => false);
}
