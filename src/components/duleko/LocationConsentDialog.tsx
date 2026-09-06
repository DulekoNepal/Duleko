import { MapPin } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

/**
 * Duleko's own explanation, shown before the browser's native location
 * prompt - only at the moment a feature actually needs a device location
 * (sharing a live location, sorting search results by distance). Consent
 * is never folded into the general Terms/Privacy agreement at sign-up.
 */
export function LocationConsentDialog({
  open,
  onClose,
  onAllow,
}: {
  open: boolean;
  onClose: () => void;
  onAllow: () => void;
}) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onClose={onClose} title={t("locationConsentTitle")}>
      <div className="flex flex-col items-center py-2 text-center">
        <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <MapPin className="h-6 w-6" aria-hidden />
        </span>
        <p className="text-sm leading-relaxed text-slate-600">{t("locationConsentBody")}</p>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        <Button
          size="lg"
          onClick={() => {
            onAllow();
            onClose();
          }}
        >
          {t("allowLocation")}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          {t("notNow")}
        </Button>
      </div>
    </Dialog>
  );
}
