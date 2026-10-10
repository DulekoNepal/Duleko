import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { getFeeAccount } from "@/lib/queries";

/** The react-query key for a worker's fee account. */
export function feeAccountKey(profileId: string | null | undefined) {
  return ["fee-account", profileId] as const;
}

/**
 * The signed-in member's standing with Duleko's fees - shared by the fees
 * page, the reminders on Home and Work, and the fee shown on a job. A
 * failure (say, before the fees migration is applied) just means no
 * reminder, never a broken screen.
 */
export function useFeeAccount(enabled = true) {
  const { profile } = useSession();
  return useQuery({
    queryKey: feeAccountKey(profile?.id),
    queryFn: () => getFeeAccount(),
    enabled: enabled && Boolean(profile?.id),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
