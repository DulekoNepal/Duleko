import { useQuery } from "@tanstack/react-query";
import { getOnlineMap } from "@/lib/queries";

/**
 * Who, among these profiles, currently has the app open. Polled rather than
 * realtime - a dot that's a few seconds stale is fine, and this keeps a
 * worker grid to one query instead of one subscription per card.
 */
export function usePresence(profileIds: (string | null | undefined)[]): Record<string, boolean> {
  const ids = [...new Set(profileIds.filter((id): id is string => Boolean(id)))].sort();
  const query = useQuery({
    queryKey: ["presence", ids],
    queryFn: () => getOnlineMap(ids),
    enabled: ids.length > 0,
    refetchInterval: 45_000,
    staleTime: 15_000,
  });
  return query.data ?? {};
}
