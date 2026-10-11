import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Geolocation } from "@capacitor/geolocation";
import { useSession } from "@/hooks/use-session";
import { getMyLocation, type MyLocation } from "@/lib/queries";

/**
 * Your own saved point (profile_locations - only you can read it), for
 * distances on Home and Search. null until you've shared one.
 */
export function useMyLocation(): MyLocation | null {
  const { profile } = useSession();
  const query = useQuery({
    queryKey: ["my-location", profile?.id],
    queryFn: () => getMyLocation(profile!.id),
    enabled: Boolean(profile?.id && profile.location_shared_at),
    staleTime: 5 * 60_000,
  });
  return query.data ?? null;
}

export interface LivePosition {
  lat: number;
  lng: number;
  /** Metres, as the phone reports it. */
  accuracy: number;
}

/**
 * The phone's live GPS, while `on` - the blue dot on the map. Nothing is
 * sent anywhere; it only draws where you are. Returns null until a fix
 * arrives, and `denied` if the person said no.
 */
export function useLivePosition(on: boolean): { position: LivePosition | null; denied: boolean } {
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!on) return;
    let watchId: string | null = null;
    let cancelled = false;
    Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 }, (pos, err) => {
      if (cancelled) return;
      if (err || !pos) {
        if (err && /denied|permission/i.test(String((err as { message?: string }).message ?? err))) setDenied(true);
        return;
      }
      setDenied(false);
      setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
    })
      .then((id) => {
        if (cancelled) void Geolocation.clearWatch({ id });
        else watchId = id;
      })
      .catch(() => setDenied(true));
    return () => {
      cancelled = true;
      if (watchId) void Geolocation.clearWatch({ id: watchId });
    };
  }, [on]);

  return { position, denied };
}
