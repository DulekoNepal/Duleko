import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { useMyLocation } from "@/hooks/use-my-location";
import { districtCentre } from "@/lib/geocode";

/** The middle of Nepal, and a zoom that shows all of it on a phone. */
export const NEPAL = { lat: 28.25, lng: 84.1, zoom: 6.5 };

/**
 * Where a map should open for an area: your own saved point when it's
 * your district (or no district is picked), the district's centre
 * otherwise, all of Nepal for "All Nepal".
 */
export function useMapView(area: string | null): { lat: number; lng: number; zoom: number; ready: boolean } {
  const { profile } = useSession();
  const me = useMyLocation();
  const mine = Boolean(me) && (area === null || area === profile?.district);

  const centre = useQuery({
    queryKey: ["district-centre", area],
    queryFn: () => districtCentre(area!),
    enabled: Boolean(area) && !mine,
    staleTime: Infinity,
    retry: 0,
  });

  if (mine && me) return { lat: me.lat, lng: me.lng, zoom: 14, ready: true };
  if (!area) return { ...NEPAL, ready: true };
  if (centre.data) return { ...centre.data, zoom: 12, ready: true };
  return { ...NEPAL, ready: !centre.isLoading };
}
