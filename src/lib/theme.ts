import { useSyncExternalStore } from "react";
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

function apply(): void {
  const dark = choice === "dark" || (choice === "system" && !!darkQuery?.matches);
  document.documentElement.classList.toggle("dark", dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0b1220" : "#15803d");
  setStatusBarTheme(dark);
}

export function setThemeChoice(next: ThemeChoice): void {
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

/** Call once at startup: applies the saved choice and tracks the system setting. */
export function setupTheme(): void {
  apply();
  darkQuery?.addEventListener("change", () => {
    if (choice === "system") apply();
  });
}

export function useThemeChoice(): [ThemeChoice, (next: ThemeChoice) => void] {
  const current = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => choice,
    () => "system" as const,
  );
  return [current, setThemeChoice];
}
