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
