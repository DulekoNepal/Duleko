import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getMyProfile, touchPresence } from "@/lib/queries";
import { persistGuestMode } from "@/hooks/use-guest-mode";
import type { Profile } from "@/lib/types";

const PRESENCE_HEARTBEAT_MS = 60_000;

interface SessionValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** Auth state still resolving from storage. */
  loadingSession: boolean;
  /** Signed in, but we do not yet know whether a profile exists. */
  loadingProfile: boolean;
  /**
   * A recovery code was just verified, which signs the person in - but
   * "signed in" is not the point of that code, choosing a new password is.
   * AppShell checks this to keep showing the auth screen's password step
   * instead of routing straight into the app the instant a session appears.
   */
  isPasswordRecovery: boolean;
  /** Called once the new password is actually set, to resume normal routing. */
  clearPasswordRecovery: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoadingSession(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession((prev) => {
        // A different user must never see the previous user's cached data.
        // A token refresh is not a user change, so the cache survives it.
        if (prev?.user?.id !== next?.user?.id) queryClient.clear();
        return next;
      });
      setLoadingSession(false);
      // Supabase fires this the moment a recovery code (or link) verifies,
      // regardless of which path got there - the one signal both need.
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      if (event === "SIGNED_OUT") setIsPasswordRecovery(false);
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

  // A live "online" dot on the avatar: a quiet heartbeat while a profile is
  // open, on its own schedule - no user action should ever wait on this.
  const myProfileId = profileQuery.data?.id ?? null;
  useEffect(() => {
    if (!myProfileId) return;
    let cancelled = false;
    const beat = () => {
      if (!cancelled) touchPresence(myProfileId).catch(() => {});
    };
    beat();
    const interval = setInterval(beat, PRESENCE_HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [myProfileId]);

  const value = useMemo<SessionValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile: profileQuery.data ?? null,
      loadingSession,
      loadingProfile: Boolean(userId) && profileQuery.isLoading,
      isPasswordRecovery,
      clearPasswordRecovery: () => setIsPasswordRecovery(false),
      refreshProfile: async () => {
        await profileQuery.refetch();
      },
      signOut: async () => {
        await supabase.auth.signOut();
        queryClient.clear();
        // A deliberate sign-out should land back on the welcome choice, not
        // silently drop them into guest browsing.
        persistGuestMode(false);
      },
    }),
    [session, profileQuery, loadingSession, userId, queryClient, isPasswordRecovery],
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
