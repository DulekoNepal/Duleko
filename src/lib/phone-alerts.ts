import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { translateIn, type StringKey } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import type { Lang } from "@/lib/types";

/**
 * Phone alerts - Android only, with no push service. A new chat message,
 * work request, friend request or notice shows in the phone's
 * notification bar with the app closed, and the launcher icon shows the
 * unread total.
 *
 * Without a push service the phone asks rather than being told: a
 * background job (android/.../PhoneAlertsWorker.java) calls Supabase's
 * device_alerts() every 15 minutes - Android's shortest interval - and 2
 * and 6 minutes after the app is left (migration 5300). So an alert can
 * show up well after it was sent; inside the app everything stays live.
 *
 * The job has no sign-in session, so each phone gets its own random key,
 * registered while signed in and dropped on sign-out.
 */

export type AlertTap = { notificationId?: string; kind?: string };

interface PhoneAlertsPlugin {
  requestPermission(): Promise<{ granted: boolean }>;
  start(options: { url: string; anonKey: string; deviceKey: string; channels: Record<string, string> }): Promise<void>;
  stop(): Promise<void>;
  clear(options: { all?: boolean; tag?: string; prefix?: string }): Promise<void>;
  checkNow(): Promise<void>;
  addListener(event: "alertTap", listener: (tap: AlertTap) => void): Promise<PluginListenerHandle>;
}

export const PhoneAlerts = registerPlugin<PhoneAlertsPlugin>("PhoneAlerts");

export const IS_ANDROID = Capacitor.getPlatform() === "android";
const DEVICE_KEY = "duleko.alertDevice";

/** Android lists these under Settings > Apps > Duleko > Notifications. Ids match PhoneAlertsWorker. */
const CHANNELS: Record<string, StringKey> = {
  messages: "alertChannelMessages",
  work: "alertChannelWork",
  friends: "alertChannelFriends",
  updates: "alertChannelUpdates",
};

function readKey(): string | null {
  try {
    return window.localStorage.getItem(DEVICE_KEY);
  } catch {
    return null;
  }
}

function deviceKey(): string {
  const existing = readKey();
  if (existing) return existing;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const key = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  try {
    window.localStorage.setItem(DEVICE_KEY, key);
  } catch {
    // Lasts this visit; a new key is registered next time.
  }
  return key;
}

/** After sign-in, and again on a language switch (renames the categories). */
export async function startPhoneAlerts(lang: Lang): Promise<void> {
  if (!IS_ANDROID) return;
  const key = deviceKey();
  const { error } = await supabase.rpc("register_alert_device", { p_key: key });
  if (error) throw error;

  // Android 13+ asks once; without it the icon's number still updates on
  // launchers that take it directly.
  await PhoneAlerts.requestPermission();
  const channels = Object.fromEntries(Object.entries(CHANNELS).map(([id, name]) => [id, translateIn(lang, name)]));
  await PhoneAlerts.start({
    url: import.meta.env.VITE_SUPABASE_URL as string,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    deviceKey: key,
    channels,
  });
}

/** Before signing out: this phone stops getting the account's alerts, and the bar is cleared. */
export async function stopPhoneAlerts(): Promise<void> {
  if (!IS_ANDROID) return;
  const key = readKey();
  if (key) {
    await supabase.rpc("unregister_alert_device", { p_key: key });
    try {
      window.localStorage.removeItem(DEVICE_KEY);
    } catch {
      // The server side is already gone; a stale key just gets replaced.
    }
  }
  await PhoneAlerts.stop();
}

/** Everything read: the notification bar has nothing left to say. */
export function clearAllAlerts(): void {
  if (IS_ANDROID) PhoneAlerts.clear({ all: true }).catch(() => {});
}

/** Opening a chat clears that person's notification, like Messenger. */
export function clearChatAlert(otherProfileId: string): void {
  if (IS_ANDROID) PhoneAlerts.clear({ tag: `chat-${otherProfileId}` }).catch(() => {});
}

/** An alert read in the app (or every alert, with no id). */
export function clearAlert(notificationId?: string): void {
  if (!IS_ANDROID) return;
  PhoneAlerts.clear(notificationId ? { tag: `alert-${notificationId}` } : { prefix: "alert-" }).catch(() => {});
}
