import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "./map.css";
import type { MapBounds } from "@/lib/queries";

/**
 * Duleko's map: Leaflet on OpenStreetMap's tiles, styled the way FLITO's
 * map is (toned-down tiles, an inverted night map, drop pins with a white
 * glyph, rounded controls, a scale bar) in Duleko's green.
 *
 * Pins are people (green; grey when busy) and work requests (orange),
 * gathered into numbered clusters when zoomed out. Guests see areas
 * instead of people: a green disc with how many are there. Your own
 * position is a blue dot with its accuracy ring.
 *
 * `gestures`:
 *   none        a picture of the map - Home's card; the whole thing is a tap target
 *   cooperative inside a scrolling page: two fingers move it, one scrolls past
 *   greedy      the map has the screen to itself (/map)
 */

export const KATHMANDU = { lat: 27.7172, lng: 85.324 };

export interface MapPin {
  id: string;
  kind: "person" | "job" | "area";
  lat: number;
  lng: number;
  /** Shown in the pin's tooltip. */
  label: string;
  /** People only: free to take work now (green) or not (grey). */
  available?: boolean;
  /** Areas only: how many people are there. */
  count?: number;
}

export interface MapMe {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface DulekoMapHandle {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  bounds: () => MapBounds | null;
  center: () => { lat: number; lng: number } | null;
}

const GLYPH = {
  // A person, head and shoulders.
  person:
    '<circle cx="16" cy="13.4" r="2.6" fill="none" stroke="C" stroke-width="1.7"/>' +
    '<path d="M11.4 20.6c.6-2.6 2.4-4 4.6-4s4 1.4 4.6 4" fill="none" stroke="C" stroke-width="1.7" stroke-linecap="round"/>',
  // A briefcase.
  job:
    '<rect x="11" y="13" width="10" height="7.6" rx="1.6" fill="none" stroke="C" stroke-width="1.6"/>' +
    '<path d="M13.8 13v-1.3c0-.6.4-1 1-1h2.4c.6 0 1 .4 1 1V13M11 16.3h10" fill="none" stroke="C" stroke-width="1.6"/>',
};

function pinColour(pin: MapPin): string {
  if (pin.kind === "job") return "#ea580c";
  return pin.available === false ? "#64748b" : "#15803d";
}

/** An area: a disc with its head count, a little bigger for more people. */
function areaIcon(pin: MapPin, selected: boolean): L.DivIcon {
  const count = pin.count ?? 1;
  const size = (count < 10 ? 34 : count < 50 ? 40 : 46) + (selected ? 6 : 0);
  return L.divIcon({
    className: "",
    html: `<div class="dk-area${selected ? " selected" : ""}" style="width:${size}px;height:${size}px"><span>${count}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, -size / 2],
  });
}

function pinIcon(pin: MapPin, selected: boolean, small = false): L.DivIcon {
  if (pin.kind === "area") return areaIcon(pin, selected);
  const colour = pinColour(pin);
  const scale = selected ? 1.25 : small ? 0.72 : 1;
  const w = Math.round(32 * scale);
  const h = Math.round(42 * scale);
  return L.divIcon({
    className: "",
    html:
      `<div class="dk-pin${selected ? " selected" : ""}">` +
      `<svg width="${w}" height="${h}" viewBox="0 0 32 42">` +
      `<path d="M16 1C7.7 1 1 7.6 1 15.8 1 26.9 16 41 16 41s15-14.1 15-25.2C31 7.6 24.3 1 16 1z" fill="${colour}" stroke="#fff" stroke-width="2"/>` +
      `<circle cx="16" cy="15.8" r="8.6" fill="#fff"/>` +
      GLYPH[pin.kind].split('"C"').join(`"${colour}"`) +
      `</svg></div>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h - 1],
    tooltipAnchor: [0, -h + 4],
  });
}

const meIcon = L.divIcon({
  className: "",
  html: '<div class="dk-me"><span class="dk-me-halo"></span><span class="dk-me-dot"></span></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function clusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const markers = cluster.getAllChildMarkers();
  // An area stands for its head count; every other pin for one.
  const weight = (m: L.Marker) => (m.options as { count?: number }).count ?? 1;
  const jobs = markers.filter((m) => (m.options as { kind?: string }).kind === "job").length;
  const count = markers.reduce((sum, m) => sum + weight(m), 0);
  const size = count < 10 ? 36 : count < 50 ? 42 : 48;
  const tone = jobs === count ? "jobs" : jobs > 0 ? "mixed" : "people";
  // A mixed cluster's ring shows its share of people (green) and work (orange).
  const share = Math.round(((count - jobs) / count) * 100);
  const mix = tone === "mixed" ? `background:conic-gradient(#15803d 0 ${share}%, #ea580c ${share}% 100%);` : "";
  return L.divIcon({
    className: "",
    html: `<div class="dk-cluster ${tone}" style="width:${size}px;height:${size}px;${mix}"><span>${count}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function isDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

export const DulekoMap = forwardRef<
  DulekoMapHandle,
  {
    pins: MapPin[];
    me?: MapMe | null;
    center?: { lat: number; lng: number };
    zoom?: number;
    gestures?: "none" | "cooperative" | "greedy";
    selectedId?: string | null;
    onSelect?: (pin: MapPin) => void;
    onMapTap?: () => void;
    onBoundsChange?: (bounds: MapBounds) => void;
    /** Draw Leaflet's own scale bar (the full map). */
    scale?: boolean;
    /** Frame the view around the pins whenever they change (Home's card). */
    fitPins?: boolean;
    hints?: { twoFingers: string; clickToZoom: string };
    className?: string;
  }
>(function DulekoMap(
  {
    pins,
    me,
    center,
    zoom = 14,
    gestures = "cooperative",
    selectedId,
    onSelect,
    onMapTap,
    onBoundsChange,
    scale = false,
    fitPins = false,
    hints,
    className,
  },
  ref,
) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const meRef = useRef<{ dot: L.Marker; ring: L.Circle } | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);
  // Callbacks change identity every render; the map's listeners read them here.
  const cb = useRef({ onSelect, onMapTap, onBoundsChange });
  cb.current = { onSelect, onMapTap, onBoundsChange };

  const start = center ?? me ?? KATHMANDU;

  // ---- The map itself, once -------------------------------------------
  useEffect(() => {
    if (!el.current) return;
    const still = gestures === "none";
    const map = L.map(el.current, {
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0.5,
      dragging: !still,
      touchZoom: !still,
      doubleClickZoom: !still,
      scrollWheelZoom: gestures === "greedy",
      boxZoom: false,
      keyboard: !still,
    }).setView([start.lat, start.lng], zoom);

    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);
    if (scale) L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

    // Fetched once panning stops, one ring kept beyond the screen: fewer
    // downloads on a phone's data plan, less load on OSM's free servers.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      keepBuffer: 1,
      updateWhenIdle: true,
      updateWhenZooming: false,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 48,
      // A still picture (Home's card) shows every pin; it can't be tapped
      // open the way a cluster on the real map can.
      disableClusteringAtZoom: still ? 0 : undefined,
      iconCreateFunction: clusterIcon,
    });
    map.addLayer(cluster);

    // Two fingers to move it inside a page; one finger scrolls the page.
    if (gestures === "cooperative") {
      const coarse = window.matchMedia?.("(pointer: coarse)").matches;
      if (coarse) map.dragging.disable();
      const hint = document.createElement("div");
      hint.className = "dk-hint";
      hint.innerHTML = "<span></span>";
      el.current.appendChild(hint);
      hintRef.current = hint;
      let timer: number | undefined;
      const show = (text?: string) => {
        if (!text) return;
        hint.firstElementChild!.textContent = text;
        hint.classList.add("on");
        window.clearTimeout(timer);
        timer = window.setTimeout(() => hint.classList.remove("on"), 1500);
      };
      const container = map.getContainer();
      container.addEventListener(
        "touchstart",
        (e) => {
          if (!coarse) return;
          if (e.touches.length > 1) map.dragging.enable();
          else map.dragging.disable();
        },
        { passive: true },
      );
      container.addEventListener(
        "touchmove",
        (e) => {
          if (coarse && e.touches.length === 1) show(hints?.twoFingers);
        },
        { passive: true },
      );
      container.addEventListener("wheel", () => {
        if (!map.scrollWheelZoom.enabled()) show(hints?.clickToZoom);
      }, { passive: true });
      map.on("click", () => map.scrollWheelZoom.enable());
      map.on("mouseout", () => map.scrollWheelZoom.disable());
    }

    map.on("click", () => cb.current.onMapTap?.());
    const report = () => {
      const b = map.getBounds();
      cb.current.onBoundsChange?.({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() });
    };
    map.on("moveend", report);
    map.whenReady(report);

    // Follow the app's light/dark switch.
    const applyTheme = () => el.current?.classList.toggle("dk-map-dark", isDark());
    applyTheme();
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    // The container can change size (a sheet opening, rotation).
    const resize = new ResizeObserver(() => {
      map.invalidateSize();
      fitRef.current();
    });
    resize.observe(el.current);

    mapRef.current = map;
    clusterRef.current = cluster;
    return () => {
      observer.disconnect();
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
      meRef.current = null;
    };
    // The map is built once; later changes arrive through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Pins -----------------------------------------------------------
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();
    const markers = pins.map((pin) => {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: pinIcon(pin, pin.id === selectedId, gestures === "none"),
        keyboard: gestures !== "none",
        interactive: gestures !== "none",
        zIndexOffset: pin.id === selectedId ? 1000 : 0,
        // Read back by clusterIcon: work requests colour it, areas add their head count.
        kind: pin.kind,
        count: pin.count,
      } as L.MarkerOptions & { kind: string; count?: number });
      if (gestures !== "none") {
        marker.bindTooltip(pin.label, { direction: "top", className: "dk-label", offset: [0, -2] });
        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          cb.current.onSelect?.(pin);
        });
      }
      return marker;
    });
    cluster.addLayers(markers);
  }, [pins, selectedId, gestures]);

  // Framing the pins - again whenever the box changes size, since a fit
  // worked out for the wrong size leaves them off to one side.
  const fitRef = useRef<() => void>(() => {});
  fitRef.current = () => {
    const map = mapRef.current;
    if (!map || !fitPins || pins.length === 0) return;
    const points = pins.map((p) => L.latLng(p.lat, p.lng));
    if (me) points.push(L.latLng(me.lat, me.lng));
    map.invalidateSize({ pan: false });
    // Pins stand up from their point, so leave their height free above.
    map.fitBounds(L.latLngBounds(points), {
      paddingTopLeft: [24, 40],
      paddingBottomRight: [24, 14],
      maxZoom: 14,
      animate: false,
    });
  };
  useEffect(() => fitRef.current(), [fitPins, pins]);

  // ---- You ------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!me) {
      meRef.current?.dot.remove();
      meRef.current?.ring.remove();
      meRef.current = null;
      return;
    }
    const radius = Math.min(me.accuracy ?? 0, 2000);
    if (!meRef.current) {
      const ring = L.circle([me.lat, me.lng], {
        radius,
        color: "#2563eb",
        weight: 1,
        opacity: 0.35,
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(map);
      const dot = L.marker([me.lat, me.lng], { icon: meIcon, interactive: false, zIndexOffset: 2000 }).addTo(map);
      meRef.current = { dot, ring };
    } else {
      meRef.current.dot.setLatLng([me.lat, me.lng]);
      meRef.current.ring.setLatLng([me.lat, me.lng]).setRadius(radius);
    }
  }, [me?.lat, me?.lng, me?.accuracy]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, z) => mapRef.current?.flyTo([lat, lng], z ?? Math.max(mapRef.current.getZoom(), 15), { duration: 0.6 }),
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    bounds: () => {
      const b = mapRef.current?.getBounds();
      return b ? { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() } : null;
    },
    center: () => {
      const c = mapRef.current?.getCenter();
      return c ? { lat: c.lat, lng: c.lng } : null;
    },
  }));

  return <div ref={el} className={className ? `dk-map ${className}` : "dk-map"} />;
});
