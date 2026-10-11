import { useMemo, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Maximize2, Minus, Plus } from "lucide-react";
import { DulekoMap, type DulekoMapHandle, type MapPin } from "./DulekoMap";
import { NEPAL, useMapView } from "./use-map-view";
import { useI18n } from "@/lib/i18n";
import { useMyLocation } from "@/hooks/use-my-location";
import { mapPeople, type MapBounds } from "@/lib/queries";
import { districtLabel } from "@/lib/nepal";
import { cn, formatNumber } from "@/lib/utils";

const ZOOM_BUTTON =
  "flex h-9 w-9 items-center justify-center bg-surface text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600";

/**
 * Home's map of the skilled people in the area (green pins, grey when
 * busy) with you as the blue dot. `className` sets its height where it is
 * placed.
 *
 * On a phone it is a still picture and the whole card opens /map. Where
 * there's room (`interactive`, tablets and up) it is a real map: drag it
 * (two fingers on a touch screen, so one still scrolls the page), click
 * it to zoom with the wheel, click a pin for that person's profile, and
 * "Open full map" for /map.
 */
export function HomeMapCard({
  area,
  interactive = false,
  className,
}: {
  area: string | null;
  interactive?: boolean;
  className?: string;
}) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const mapRef = useRef<DulekoMapHandle>(null);
  const view = useMapView(area);
  const me = useMyLocation();
  // The phone card is a thin strip, so it looks wider than it shows -
  // about 10 km around the area (all of Nepal for "All Nepal") - and then
  // frames whoever it found.
  const box: MapBounds =
    view.zoom <= NEPAL.zoom
      ? { south: 26.3, west: 80, north: 30.5, east: 88.3 }
      : { south: view.lat - 0.09, west: view.lng - 0.11, north: view.lat + 0.09, east: view.lng + 0.11 };

  const people = useQuery({
    queryKey: ["map", "people", "home", roundBounds(box)],
    queryFn: () => mapPeople(box),
    enabled: view.ready,
    staleTime: 2 * 60_000,
  });

  const pins = useMemo<MapPin[]>(
    () =>
      (people.data ?? []).map((p) => ({
        id: p.id,
        kind: "person",
        lat: p.lat,
        lng: p.lng,
        label: p.full_name,
        available: p.is_available,
      })),
    [people.data],
  );

  const place = area ? districtLabel(area, lang) : t("homeLocationAll");
  const frame = cn(
    "animate-in-up relative block h-32 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm sm:h-40",
    className,
  );
  const style = { "--delay": "75ms" } as React.CSSProperties;

  if (!interactive) {
    return (
      <Link
        to="/map"
        aria-label={t("mapOpen")}
        className={cn(frame, "group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600")}
        style={style}
      >
        {view.ready && (
          <DulekoMap
            // A new area re-centres by starting a fresh picture.
            key={`${view.lat},${view.lng},${view.zoom}`}
            center={view}
            zoom={view.zoom}
            gestures="none"
            pins={pins}
            me={me}
            fitPins
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        )}

        <span className="absolute left-2.5 top-2.5 z-[1000] rounded-xl bg-surface/95 px-2.5 py-1.5 shadow-sm">
          <span className="block text-xs font-semibold leading-tight text-slate-900">{t("mapLocalServices")}</span>
          <span className="block text-[11px] leading-tight text-slate-500">{t("mapNearYou")}</span>
        </span>
        <span className="absolute right-2.5 top-2.5 z-[1000] flex h-7 w-7 items-center justify-center rounded-lg bg-surface/95 text-slate-600 shadow-sm transition-colors group-hover:text-brand-700">
          <Maximize2 className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="absolute bottom-2 right-2.5 z-[1000] rounded-md bg-surface/80 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
          {place}
        </span>
      </Link>
    );
  }

  const count = people.data?.length ?? 0;

  return (
    <section aria-label={t("mapLocalServices")} className={frame} style={style}>
      {view.ready && (
        <DulekoMap
          ref={mapRef}
          key={`${view.lat},${view.lng},${view.zoom}`}
          center={view}
          zoom={view.zoom}
          gestures="cooperative"
          hints={{ twoFingers: t("mapTwoFingers"), clickToZoom: t("mapClickToZoom") }}
          pins={pins}
          me={me}
          fitPins
          onSelect={(pin) => navigate({ to: "/worker/$workerId", params: { workerId: pin.id } })}
          className="absolute inset-0 h-full w-full"
        />
      )}

      {/* What this is, how many, and what the colours mean. */}
      <div className="pointer-events-none absolute left-3 top-3 z-[1000] max-w-[calc(100%-5rem)] rounded-xl bg-surface/95 px-3 py-2 shadow-md backdrop-blur">
        <p className="truncate text-sm font-semibold leading-tight text-slate-900">
          {t("mapLocalServices")} · {t("mapNearYou")}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {people.isLoading
            ? t("mapLoading")
            : `${count === 1 ? t("mapPeopleCountOne") : t("mapPeopleCount", { count: formatNumber(count, lang) })} · ${place}`}
        </p>
        <p className="mt-1.5 flex items-center gap-3 text-[11px] font-medium text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-brand-700" aria-hidden />
            {t("availableShort")}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-500" aria-hidden />
            {t("busyShort")}
          </span>
        </p>
      </div>

      <div className="absolute right-3 top-3 z-[1000] flex flex-col divide-y divide-slate-100 overflow-hidden rounded-xl shadow-md">
        <button type="button" className={ZOOM_BUTTON} onClick={() => mapRef.current?.zoomIn()} aria-label={t("mapZoomIn")}>
          <Plus className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" className={ZOOM_BUTTON} onClick={() => mapRef.current?.zoomOut()} aria-label={t("mapZoomOut")}>
          <Minus className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <Link
        to="/map"
        className="absolute bottom-3 right-3 z-[1000] inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-700 px-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
      >
        <Maximize2 className="h-4 w-4" aria-hidden />
        {t("mapOpenFull")}
      </Link>
    </section>
  );
}

/** Small moves of the same view share one request. */
function roundBounds(b: MapBounds): string {
  const r = (v: number) => v.toFixed(2);
  return [r(b.south), r(b.west), r(b.north), r(b.east)].join(",");
}
