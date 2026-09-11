import { Geolocation } from "@capacitor/geolocation";

/**
 * Thin wrapper around @capacitor/geolocation, kept call-compatible with
 * navigator.geolocation.getCurrentPosition so call sites only needed their
 * import swapped, not their shape. On the web this plugin is a direct pass-
 * through to the browser's own geolocation API (same prompt, same
 * behavior); inside the Android app it goes through native location
 * services instead - including the native permission dialog - without any
 * extra code at the call site.
 */
export function getCurrentPosition(
  onSuccess: (pos: { coords: { latitude: number; longitude: number } }) => void,
  onError: () => void,
  options?: { enableHighAccuracy?: boolean; timeout?: number },
): void {
  Geolocation.getCurrentPosition(options).then(onSuccess, onError);
}
