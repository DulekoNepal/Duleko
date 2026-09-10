import { useEffect, useRef, useState } from "react";
import { LocationConsentDialog } from "./LocationConsentDialog";
import { useSession } from "@/hooks/use-session";
import { setLocationConsent, shareLocation } from "@/lib/queries";

/**
 * Location sharing, asked once and then silent for good - no button, no
 * re-asking. The moment a profile first has no decision on file, they
 * get Duleko's own explanation, exactly once. Whatever they choose is
 * saved on the profile itself:
 *   granted  - a fresh location is shared silently on this and every
 *              future login, no dialog, no button
 *   declined - never shared, never asked again
 *
 * Mounted once, near the root, alongside every other signed-in screen -
 * so the one ask can happen regardless of which screen someone lands on
 * after logging in.
 */
export function AutoShareLocation() {
  const { profile, refreshProfile } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const askedRef = useRef(false);
  const sharedRef = useRef(false);
  const allowedJustNowRef = useRef(false);

  useEffect(() => {
    if (!profile) return;

    if (profile.location_consent == null && !askedRef.current) {
      askedRef.current = true;
      setDialogOpen(true);
      return;
    }

    if (profile.location_consent === "granted" && !sharedRef.current && navigator.geolocation) {
      sharedRef.current = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          shareLocation(profile.id, pos.coords.latitude, pos.coords.longitude).catch(() => {});
        },
        () => {
          // The browser's own permission was revoked after the fact, or a
          // one-off failure - fail quietly. This never nags about it; the
          // next login just tries again.
        },
        { enableHighAccuracy: true, timeout: 10_000 },
      );
    }
  }, [profile]);

  if (!profile) return null;

  return (
    <LocationConsentDialog
      open={dialogOpen}
      onAllow={() => {
        allowedJustNowRef.current = true;
        setLocationConsent(profile.id, "granted")
          .then(() => refreshProfile())
          .catch(() => {});
      }}
      onClose={() => {
        setDialogOpen(false);
        // onAllow already fired (and already set the consent) when this
        // close comes right after tapping Allow - only "Not now"/backdrop/
        // Escape reach here needing their own write.
        if (allowedJustNowRef.current) {
          allowedJustNowRef.current = false;
          return;
        }
        setLocationConsent(profile.id, "declined")
          .then(() => refreshProfile())
          .catch(() => {});
      }}
    />
  );
}
