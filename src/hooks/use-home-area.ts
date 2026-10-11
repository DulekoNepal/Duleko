import { useCallback, useSyncExternalStore } from "react";
import { useSession } from "@/hooks/use-session";

/**
 * The area Home is showing - a district, or all of Nepal - picked from
 * the place line under Home's header. Nearby people and work requests on
 * Home, and the job board's first filter, follow it.
 *
 * Until someone picks one it is their profile's district (all of Nepal
 * for a guest). The choice is a browsing preference for this device, so
 * it lives in localStorage, not on the profile: looking at work in
 * another district shouldn't move where you say you live.
 */
const AREA_KEY = "duleko.homeArea";
/** Stored for "All Nepal", so it isn't mistaken for "never chosen". */
const ALL = "*";

const listeners = new Set<() => void>();
/** Used when storage is blocked: the pick then lasts until the page is left. */
let memory: string | null = null;

function read(): string | null {
  try {
    return window.localStorage.getItem(AREA_KEY) ?? memory;
  } catch {
    return memory;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** [district or null for all of Nepal, set it]. */
export function useHomeArea(): [string | null, (district: string | null) => void] {
  const { profile } = useSession();
  const stored = useSyncExternalStore(subscribe, read, () => null);
  const area = stored === null ? (profile?.district ?? null) : stored === ALL ? null : stored;

  const setArea = useCallback((district: string | null) => {
    memory = district ?? ALL;
    try {
      window.localStorage.setItem(AREA_KEY, memory);
    } catch {
      // No storage - `memory` carries it for this visit.
    }
    listeners.forEach((l) => l());
  }, []);

  return [area, setArea];
}
