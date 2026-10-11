import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, LocateFixed, Store, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { DulekoMap, type DulekoMapHandle } from "./DulekoMap";
import { useMapView } from "./use-map-view";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useMyLocation } from "@/hooks/use-my-location";
import { useToast } from "@/hooks/use-toast";
import { getCurrentPosition } from "@/lib/geolocation";
import { removeWorkArea, saveWorkArea } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";

/**
 * "Your work area": the map moves under a fixed pin, and Save keeps the
 * point under it (6100). Picked once and changed only here - Duleko never
 * re-shares the phone's position on its own. Others see the ~1 km square
 * around it; ticking "shop or workshop" shows the spot itself instead.
 *
 * "Go to where I am now" only moves the map: nothing is kept until Save.
 */
export function WorkAreaPicker({
  open,
  onClose,
}: {
  open: boolean;
  /** `changed` when the area was saved or removed, not just closed. */
  onClose: (changed: boolean) => void;
}) {
  const { t } = useI18n();
  const { profile, refreshProfile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const saved = useMyLocation();
  const view = useMapView(profile?.district ?? null);
  const mapRef = useRef<DulekoMapHandle>(null);
  const [isShop, setIsShop] = useState<boolean | null>(null);
  const [locating, setLocating] = useState(false);
  const shop = isShop ?? saved?.is_shop ?? false;

  async function done(message: string) {
    queryClient.invalidateQueries({ queryKey: ["my-location"] });
    queryClient.invalidateQueries({ queryKey: ["map"] });
    await refreshProfile();
    toast(message);
    close(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const centre = mapRef.current?.center();
      if (!profile || !centre) throw new Error(t("somethingWrong"));
      await saveWorkArea(profile.id, centre.lat, centre.lng, shop);
    },
    onSuccess: () => done(t("workAreaSaved")),
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const remove = useMutation({
    mutationFn: () => removeWorkArea(profile!.id),
    onSuccess: () => done(t("workAreaRemoved")),
    onError: (error) => toast(errorMessage(error), "error"),
  });

  function goToMe() {
    setLocating(true);
    getCurrentPosition(
      (pos) => {
        setLocating(false);
        mapRef.current?.flyTo(pos.coords.latitude, pos.coords.longitude, 16);
      },
      () => {
        setLocating(false);
        toast(t("mapLocationDenied"), "error");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function close(changed = false) {
    setIsShop(null);
    onClose(changed);
  }

  const busy = save.isPending || remove.isPending;
  // Your saved point, closer in than the district view useMapView gives.
  const start = saved ? { lat: saved.lat, lng: saved.lng, zoom: 15 } : view;

  return (
    <Dialog
      open={open}
      onClose={() => close()}
      title={t("workAreaTitle")}
      footer={
        <>
          {saved && (
            <Button
              variant="ghost"
              className="mr-auto text-slate-500 hover:bg-red-50 hover:text-red-600"
              loading={remove.isPending}
              disabled={busy}
              onClick={() => remove.mutate()}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {t("workAreaRemove")}
            </Button>
          )}
          <Button variant="outline" onClick={() => close()} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button loading={save.isPending} disabled={busy || !view.ready} onClick={() => save.mutate()}>
            <Check className="h-4 w-4" aria-hidden />
            {t("save")}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600">{t("workAreaPickerHint")}</p>

      <div className="relative h-72 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-80">
        {open && view.ready && (
          <DulekoMap
            ref={mapRef}
            // Starts again at your saved point once it has loaded.
            key={saved ? "saved" : "area"}
            center={start}
            zoom={start.zoom}
            gestures="greedy"
            scale
            pins={[]}
            className="absolute inset-0 h-full w-full"
          />
        )}
        {/* The point that will be saved: whatever is under this pin. */}
        <svg
          width="34"
          height="44"
          viewBox="0 0 32 42"
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-full drop-shadow-md"
        >
          <path
            d="M16 1C7.7 1 1 7.6 1 15.8 1 26.9 16 41 16 41s15-14.1 15-25.2C31 7.6 24.3 1 16 1z"
            fill={shop ? "#ea580c" : "#15803d"}
            stroke="#fff"
            strokeWidth="2"
          />
          <circle cx="16" cy="15.8" r="6" fill="#fff" />
        </svg>
        <button
          type="button"
          onClick={goToMe}
          disabled={locating}
          className="absolute bottom-3 left-1/2 z-[1000] inline-flex h-9 -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface px-3.5 text-xs font-semibold text-slate-700 shadow-md transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          <LocateFixed className="h-4 w-4 text-blue-600" aria-hidden />
          {t("workAreaUseGps")}
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-500">{shop ? t("workAreaShopHint") : t("workAreaAreaNote")}</p>

      <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
        <Store className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <span className="min-w-0 flex-1 text-sm font-medium text-slate-900">{t("workAreaShop")}</span>
        <Switch size="sm" checked={shop} onChange={setIsShop} aria-label={t("workAreaShop")} />
      </div>
    </Dialog>
  );
}
