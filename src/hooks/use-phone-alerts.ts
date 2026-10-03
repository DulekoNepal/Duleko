import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { useI18n } from "@/lib/i18n";
import { openNotification } from "@/lib/notification-target";
import { IS_ANDROID, PhoneAlerts, startPhoneAlerts, type AlertTap } from "@/lib/phone-alerts";
import { markNotificationRead } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import type { AppNotification } from "@/lib/types";

/** The app's half of phone alerts - see lib/phone-alerts.ts. Mount once, in AppShell. */
export function usePhoneAlerts(): void {
  const { profile } = useSession();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profileId = profile?.id;

  useEffect(() => {
    if (!IS_ANDROID || !profileId) return;
    startPhoneAlerts(lang).catch((err) => console.warn("Phone alerts not started:", err));
  }, [profileId, lang]);

  // A tap that launched the app is held by the plugin until this listener
  // exists, so it still opens the right screen once the profile has loaded.
  useEffect(() => {
    if (!IS_ANDROID || !profileId) return;
    const handle = PhoneAlerts.addListener("alertTap", (tap) => {
      void openTapped(tap, navigate, profileId, () => {
        queryClient.invalidateQueries({ queryKey: ["unread", profileId] });
        queryClient.invalidateQueries({ queryKey: ["notifications", profileId] });
      });
    });
    return () => {
      void handle.then((h) => h.remove());
    };
  }, [profileId, navigate, queryClient]);
}

async function openTapped(
  tap: AlertTap,
  navigate: ReturnType<typeof useNavigate>,
  myProfileId: string,
  onRead: () => void,
): Promise<void> {
  const fallback = tap.kind === "message" ? "/chats" : "/notifications";
  const { data } = tap.notificationId
    ? await supabase.from("notifications").select("*").eq("id", tap.notificationId).maybeSingle()
    : { data: null };
  const n = data as AppNotification | null;
  if (!n) {
    void navigate({ to: fallback });
    return;
  }
  // Same as tapping it in Alerts. Chat alerts aren't listed there - opening
  // the chat marks its messages read instead.
  if (!n.is_read && n.kind !== "message") {
    await markNotificationRead(n.id).catch(() => {});
    onRead();
  }
  await openNotification(n, navigate, myProfileId);
}
