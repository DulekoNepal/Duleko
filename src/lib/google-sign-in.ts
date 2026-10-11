import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { translateStatic } from "./i18n";
import { supabase } from "./supabase";
import { siteOrigin } from "./share";

/**
 * Google sign-in, on the website and in the Android app.
 *
 * The website just hands the page to Google and gets it back on duleko.com.
 * The app can't: Google refuses to sign anyone in inside an app's WebView
 * ("disallowed_useragent"), and a page that did get there would come back
 * to the website, not to the app. So the app opens Google in a Chrome
 * Custom Tab, and Supabase sends it back to APP_AUTH_CALLBACK, which
 * Android hands to the app (the intent filter in AndroidManifest.xml). The
 * app then swaps the one-time code in that address for a session (PKCE -
 * see flowType in supabase.ts - so another app catching the address can't
 * use the code).
 *
 * APP_AUTH_CALLBACK must be on Supabase's Redirect URLs list
 * (Authentication > URL Configuration). If it isn't, Supabase quietly
 * sends people to the website instead, still in the Custom Tab.
 */
export const APP_AUTH_CALLBACK = "com.duleko.app://auth-callback";

const IS_NATIVE_APP = Capacitor.isNativePlatform();

export async function signInWithGoogle(): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // On the web, the real domain, not whatever host happens to be
      // serving this page - visiting the Vercel default URL directly (or a
      // preview deploy) must still bounce back to the live site.
      redirectTo: IS_NATIVE_APP ? APP_AUTH_CALLBACK : siteOrigin(),
      skipBrowserRedirect: IS_NATIVE_APP,
      // Without this, Google silently reuses whatever account is already
      // signed into the browser and bounces straight back - no picker, no
      // chance to pick a different account.
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
  // On the web the page is already on its way to Google.
  if (IS_NATIVE_APP) await Browser.open({ url: data.url });
}

/**
 * Fires when the app is back on screen after the Custom Tab - Google sent
 * it back, or Back closed the tab. (The plugin's own "browserFinished"
 * isn't reliable before Android 14.)
 */
export function onBackFromGoogle(listener: () => void): () => void {
  if (!IS_NATIVE_APP) return () => {};
  const handle = CapacitorApp.addListener("resume", listener);
  return () => void handle.then((h) => h.remove());
}

/**
 * The app's side of coming back from Google: finishes the sign-in when
 * Android opens APP_AUTH_CALLBACK. Started once, in main.tsx, rather than
 * by a screen: the code can only be swapped once, and a screen may well be
 * replaced while that's happening. Also covers a phone that closed the app
 * to free memory while Google was open - the address then starts the app
 * afresh instead.
 */
export function setupGoogleReturn(): void {
  if (!IS_NATIVE_APP) return;
  CapacitorApp.addListener("appUrlOpen", ({ url }) => void finish(url));
  CapacitorApp.getLaunchUrl()
    .then((launch) => {
      if (launch?.url) void finish(launch.url);
    })
    .catch(() => {});
}

interface GoogleReturn {
  /** Swapping the code for a session. */
  finishing: boolean;
  /** Why the last one didn't work, until AppShell has shown it. */
  failure: string | null;
}

let current: GoogleReturn = { finishing: false, failure: null };
const subscribers = new Set<() => void>();

function update(next: GoogleReturn) {
  current = next;
  subscribers.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  return () => {
    subscribers.delete(notify);
  };
}

async function finish(url: string) {
  if (!url.startsWith(APP_AUTH_CALLBACK) || alreadyHandled(url)) return;
  // Android has already closed the tab: bringing the app back to the
  // front clears what was on top of it.
  update({ finishing: true, failure: null });
  const params = new URL(url).searchParams;
  const code = params.get("code");
  let failed = true;
  if (code) {
    try {
      failed = Boolean((await supabase.auth.exchangeCodeForSession(code)).error);
    } catch {
      // Offline, most likely - still failed.
    }
  }
  // Supabase's own wording ("invalid flow state...") means nothing to
  // anyone signing in; turning Google down is the one case worth naming.
  const failure = !failed
    ? null
    : translateStatic(params.get("error") === "access_denied" ? "authGoogleCancelled" : "authGoogleFailed");
  update({ finishing: false, failure });
}

/** For AppShell: a sign-in being finished, and why the last one failed. */
export function useGoogleReturn(): GoogleReturn {
  return useSyncExternalStore(subscribe, () => current);
}

/** The failure has been shown. */
export function clearGoogleFailure(): void {
  if (current.failure) update({ ...current, failure: null });
}

/**
 * A code works once. The launch address stays the app's launch address
 * until it's closed, so without this a reload would try to use it again.
 */
function alreadyHandled(url: string): boolean {
  const key = "duleko.googleReturn";
  try {
    if (window.sessionStorage.getItem(key) === url) return true;
    window.sessionStorage.setItem(key, url);
  } catch {
    // No storage: at worst a reload shows one stale "didn't work".
  }
  return false;
}
