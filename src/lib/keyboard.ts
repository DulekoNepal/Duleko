/**
 * The on-screen keyboard, for every screen at once.
 *
 * On a phone the keyboard takes the bottom ~40% of the screen. The app
 * shrinks to fit above it (Android: windowSoftInputMode="adjustResize",
 * and Capacitor's own inset padding on Android 15+), but a web page
 * doesn't know what that space was for. This keeps three things true:
 *
 * - `--app-height` is the height actually visible right now, so full-screen
 *   layouts (the chat thread, bottom sheets) fit above the keyboard instead
 *   of running under it.
 * - `<html data-keyboard="open">` while it's up, so the tab bar can step
 *   aside instead of riding on top of the keyboard over what you type.
 * - The field being typed in stays in view when the space shrinks.
 */

/** Smaller than the tallest height seen by this much = a keyboard, not a toolbar. */
const KEYBOARD_MIN_PX = 140;

export function setupKeyboardViewport(): void {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  const vv = window.visualViewport;
  let tallest = 0;
  let width = window.innerWidth;

  const measure = () => {
    const height = vv?.height ?? window.innerHeight;
    // Turning the phone changes everything; start counting again.
    if (Math.abs(window.innerWidth - width) > 1) {
      width = window.innerWidth;
      tallest = 0;
    }
    tallest = Math.max(tallest, height, window.innerHeight);
    root.style.setProperty("--app-height", `${Math.round(height)}px`);

    const editing = isTextField(document.activeElement);
    const open = editing && tallest - height > KEYBOARD_MIN_PX;
    const wasOpen = root.dataset.keyboard === "open";
    if (open) root.dataset.keyboard = "open";
    else delete root.dataset.keyboard;

    // The space just shrank under the field being typed in: bring it back
    // into view. The chat composer handles its own thread (data-keep-scroll).
    if (open && !wasOpen) {
      const field = document.activeElement as HTMLElement;
      if (!field.closest("[data-keep-scroll]")) {
        setTimeout(() => field.scrollIntoView({ block: "center", behavior: "smooth" }), 60);
      }
    }
  };

  // Measured straight away rather than on the next animation frame: frames
  // pause while the app is in the background, and a keyboard closed then
  // would leave everything sized for it until the next resize.
  const schedule = () => measure();

  vv?.addEventListener("resize", schedule);
  window.addEventListener("resize", schedule);
  // Focus moving between fields (or away) changes "editing" without a resize.
  document.addEventListener("focusin", schedule);
  document.addEventListener("focusout", () => setTimeout(schedule, 50));
  measure();
}

function isTextField(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    return !["button", "checkbox", "radio", "range", "submit", "reset", "file", "color"].includes(el.type);
  }
  return (el as HTMLElement).isContentEditable;
}
