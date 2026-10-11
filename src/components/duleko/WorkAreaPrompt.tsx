import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useSession } from "@/hooks/use-session";
import { useI18n } from "@/lib/i18n";
import { setLocationConsent } from "@/lib/queries";

// The map (Leaflet) loads only for someone who says yes.
const WorkAreaPicker = lazy(() => import("./map/WorkAreaPicker").then((m) => ({ default: m.WorkAreaPicker })));

/**
 * "Where do you work from?", asked once. The answer is kept on the
 * profile (location_consent): a yes is a work area picked on a map, which
 * stays put until its owner changes it in Profile - Duleko never re-shares
 * the phone's position on its own (6100). "Not now", or closing the map
 * without saving, is a no, and it isn't asked again.
 *
 * Mounted once near the root, so it can ask on whichever screen someone
 * lands on after joining.
 */
export function WorkAreaPrompt() {
  const { t } = useI18n();
  const { profile, refreshProfile } = useSession();
  const [askOpen, setAskOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const askedRef = useRef(false);

  useEffect(() => {
    if (profile && profile.location_consent == null && !askedRef.current) {
      askedRef.current = true;
      setAskOpen(true);
    }
  }, [profile]);

  if (!profile) return null;

  function decline() {
    setLocationConsent(profile!.id, "declined")
      .then(() => refreshProfile())
      .catch(() => {});
  }

  return (
    <>
      <Dialog
        open={askOpen}
        onClose={() => {
          setAskOpen(false);
          decline();
        }}
        title={t("workAreaPromptTitle")}
      >
        <div className="flex flex-col items-center py-2 text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <MapPin className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-slate-600">{t("workAreaPromptBody")}</p>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          <Button
            size="lg"
            onClick={() => {
              setAskOpen(false);
              setPickerOpen(true);
            }}
          >
            {t("workAreaPromptPick")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setAskOpen(false);
              decline();
            }}
          >
            {t("notNow")}
          </Button>
        </div>
      </Dialog>

      {pickerOpen && (
        <Suspense fallback={null}>
          <WorkAreaPicker
            open
            onClose={(changed) => {
              setPickerOpen(false);
              if (!changed) decline();
            }}
          />
        </Suspense>
      )}
    </>
  );
}
