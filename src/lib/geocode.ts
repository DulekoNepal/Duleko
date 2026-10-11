import { ALL_DISTRICTS, districtLabel, municipalitiesOf, municipalityLabel } from "./nepal";
import type { Lang } from "./types";

/**
 * Where a district is, for centring the map on the area Home is showing.
 * Asked of OpenStreetMap's Nominatim once per district per device and
 * kept in localStorage - district centres don't move - so the shared free
 * service sees at most one request per new district.
 */
const CACHE_KEY = "duleko.districtCentres";

type Centre = { lat: number; lng: number };

function readCache(): Record<string, Centre> {
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "{}") as Record<string, Centre>;
  } catch {
    return {};
  }
}

export async function districtCentre(district: string): Promise<Centre | null> {
  const cache = readCache();
  if (cache[district]) return cache[district];
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=np&q=" +
    encodeURIComponent(`${district} District, Nepal`);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  if (!hit) return null;
  const centre = { lat: Number(hit.lat), lng: Number(hit.lon) };
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...readCache(), [district]: centre }));
  } catch {
    // No storage: it's asked again next time. Rare, and harmless.
  }
  return centre;
}

/**
 * The place a point on the map is in - "Butwal", in Rupandehi - for naming
 * a guest's map area by where it really is rather than by what the people
 * in it wrote on their profiles.
 *
 * Nominatim's own names are matched to Duleko's lists (nepal.ts) where they
 * can be, so the district is one the app knows (the "See the list" link)
 * and the name has its proper Nepali form. Otherwise OpenStreetMap's own
 * English and Nepali names are used.
 *
 * Areas sit at fixed points, so each is asked about once per device, ever
 * (misses too), and only when someone opens one - one request at a time,
 * over a second apart, as the free service asks.
 */
export interface MapPlace {
  /** One of ALL_DISTRICTS (English), or null if OpenStreetMap's didn't match. */
  district: string | null;
  /** One of that district's municipalities in nepal.ts, when it matched. */
  municipality: string | null;
  /** OpenStreetMap's English and Nepali names, for a place nepal.ts doesn't list. */
  name: string | null;
  nameNe: string | null;
}

const PLACE_CACHE_KEY = "duleko.mapPlaces.v1";
let memoryPlaces: Record<string, MapPlace | null> = {};

function placeKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function readPlaces(): Record<string, MapPlace | null> {
  try {
    return { ...memoryPlaces, ...JSON.parse(window.localStorage.getItem(PLACE_CACHE_KEY) ?? "{}") };
  } catch {
    return memoryPlaces;
  }
}

function keepPlace(key: string, place: MapPlace | null) {
  memoryPlaces = { ...memoryPlaces, [key]: place };
  try {
    window.localStorage.setItem(PLACE_CACHE_KEY, JSON.stringify({ ...readPlaces(), [key]: place }));
  } catch {
    // No storage: kept for this visit only.
  }
}

/** Already known on this device? undefined means "not asked yet". */
export function cachedMapPlace(lat: number, lng: number): MapPlace | null | undefined {
  return readPlaces()[placeKey(lat, lng)];
}

/**
 * Spelling-proof comparison: "Kapilbastu" and "Kapilvastu Municipality",
 * "Butwal" and "Butwal Sub-Metropolitan City" come out the same.
 */
function plain(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(sub-metropolitan city|metropolitan city|rural municipality|municipality|district|city|nagarpalika|gaunpalika)\b/g, "")
    .replace(/[^a-z]/g, "")
    .replace(/[vw]/g, "b")
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/sh/g, "s");
}

// One Nominatim request at a time, at least 1.1 s apart.
let queue: Promise<unknown> = Promise.resolve();
let lastAsked = 0;

export function mapPlaceAt(lat: number, lng: number): Promise<MapPlace | null> {
  const key = placeKey(lat, lng);
  const known = cachedMapPlace(lat, lng);
  if (known !== undefined) return Promise.resolve(known);

  const ask = queue.then(async () => {
    const again = cachedMapPlace(lat, lng);
    if (again !== undefined) return again;
    const wait = lastAsked + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastAsked = Date.now();
    const url =
      "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&namedetails=1" +
      `&accept-language=en&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const hit = (await res.json()) as {
      name?: string;
      address?: { county?: string; city?: string; town?: string; municipality?: string; village?: string };
      namedetails?: Record<string, string>;
      error?: string;
    };
    if (hit.error) {
      keepPlace(key, null);
      return null;
    }
    const county = plain(hit.address?.county ?? "");
    const district = (county && ALL_DISTRICTS.find((d) => plain(d.en) === county)?.en) || null;
    const name = hit.name || hit.address?.city || hit.address?.town || hit.address?.municipality || hit.address?.village || null;
    const plainName = name ? plain(name) : "";
    const municipality =
      (plainName && district && municipalitiesOf(district).find((m) => plain(m.en) === plainName)?.en) || null;
    const place: MapPlace = { district, municipality, name, nameNe: hit.namedetails?.["name:ne"] ?? null };
    keepPlace(key, place);
    return place;
  });
  // A failed request mustn't stop the next one.
  queue = ask.catch(() => undefined);
  return ask;
}

/** "Butwal Sub-Metropolitan City" / "बुटवल उपमहानगरपालिका", or the district, or "". */
export function mapPlaceLabel(place: MapPlace, lang: Lang): string {
  if (place.municipality) return municipalityLabel(place.district, place.municipality, lang);
  if (place.name) return (lang === "ne" && place.nameNe) || place.name;
  return districtLabel(place.district, lang);
}
