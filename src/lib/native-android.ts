import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Badge } from "@capawesome/capacitor-badge";

/**
 * Native-Android-only wiring with no web equivalent, so none of this runs
 * outside the Capacitor Android build:
 *
 * - Hardware/gesture back button: Capacitor's default is to exit the app
 *   from any screen. Wire it to real back-navigation instead, using the
 *   `canGoBack` Capacitor itself reports on the event - it reflects the
 *   WebView's actual navigation stack (what `window.history` sees), which
 *   TanStack Router's browser history is built on top of. The router's own
 *   `history.canGoBack()` tracks a separate internal index that can drift
 *   from that real stack (e.g. after a hard reload resets it to zero while
 *   the WebView itself still has entries to go back to), so it isn't used
 *   here as the source of truth.
 * - Status bar: dark icons/text on the app's white background, matching
 *   the site's own light chrome instead of the OS default.
 */
export function setupNativeAndroid(): void {
  if (Capacitor.getPlatform() !== "android") return;

  CapacitorApp.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      // window.history.back(), not router.history.back(): TanStack's
      // history wrapper is a thin layer over the browser's own, and going
      // through the browser API directly keeps this in step with whatever
      // canGoBack actually measured.
      window.history.back();
    } else {
      CapacitorApp.exitApp();
    }
  });

  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  StatusBar.setBackgroundColor({ color: "#ffffff" }).catch(() => {});
}

/**
 * Unread count on the launcher icon (the small red number, like Messenger).
 * Android has no badge API of its own, so the plugin uses each launcher's
 * vendor support (Samsung, Xiaomi, Huawei, OnePlus, ...); launchers with no
 * support simply ignore it. Zero clears the badge.
 */
export function setAppBadge(count: number): void {
  if (Capacitor.getPlatform() !== "android") return;
  const n = Math.max(0, Math.floor(count));
  Badge.isSupported()
    .then(({ isSupported }) => {
      if (!isSupported) return;
      return Badge.requestPermissions().then(() => (n > 0 ? Badge.set({ count: n }) : Badge.clear()));
    })
    .catch(() => {});
}
