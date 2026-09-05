import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getMyProfile } from "@/lib/queries";
import type { Profile } from "@/lib/types";

interface SessionValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** Auth state still resolving from storage. */
  loadingSession: boolean;
  /** Signed in, but we do not yet know whether a profile exists. */
  loadingProfile: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoadingSession(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession((prev) => {
        // A different user must never see the previous user's cached data.
        // A token refresh is not a user change, so the cache survives it.
        if (prev?.user?.id !== next?.user?.id) queryClient.clear();
        return next;
      });
      setLoadingSession(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user?.id ?? null;

  const profileQuery = useQuery({
    queryKey: ["my-profile", userId],
    queryFn: () => getMyProfile(userId as string),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  const value = useMemo<SessionValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile: profileQuery.data ?? null,
      loadingSession,
      loadingProfile: Boolean(userId) && profileQuery.isLoading,
      refreshProfile: async () => {
        await profileQuery.refetch();
      },
      signOut: async () => {
        await supabase.auth.signOut();
        queryClient.clear();
      },
    }),
    [session, profileQuery, loadingSession, userId, queryClient],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/** Convenience for screens that are only reachable when a profile exists. */
export function useMyProfileId(): string | null {
  return useSession().profile?.id ?? null;
}
