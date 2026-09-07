import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Typing indicators, addressed to a person rather than to a thread.
 *
 * Each profile listens on one channel of its own (`typing:<my profile id>`)
 * and senders broadcast into the recipient's channel. Scoping it that way
 * means the Chats list can show "typing…" on every row at once from a
 * single subscription, instead of opening one channel per conversation.
 *
 * Nothing is written to the database - these are ephemeral broadcasts, so
 * a missed one costs nothing and they leave no history behind.
 */

const TYPING_TTL_MS = 4000;

interface TypingPayload {
  from?: unknown;
  typing?: unknown;
}

/** The set of profile ids currently typing to me. */
export function useTypingFrom(myProfileId: string | null | undefined): Set<string> {
  const [typing, setTyping] = useState<Set<string>>(() => new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    if (!myProfileId) return;
    const currentTimers = timers.current;

    const stop = (from: string) => {
      setTyping((prev) => {
        if (!prev.has(from)) return prev;
        const next = new Set(prev);
        next.delete(from);
        return next;
      });
      const timer = currentTimers.get(from);
      if (timer) clearTimeout(timer);
      currentTimers.delete(from);
    };

    const channel = supabase
      .channel(`typing:${myProfileId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { from, typing: isTyping } = (payload ?? {}) as TypingPayload;
        if (typeof from !== "string") return;

        if (!isTyping) {
          stop(from);
          return;
        }

        setTyping((prev) => (prev.has(from) ? prev : new Set(prev).add(from)));
        const existing = currentTimers.get(from);
        if (existing) clearTimeout(existing);
        // Self-expiring, so a sender that closes the tab mid-word doesn't
        // leave the indicator stuck on forever.
        currentTimers.set(from, setTimeout(() => stop(from), TYPING_TTL_MS));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      currentTimers.forEach(clearTimeout);
      currentTimers.clear();
    };
  }, [myProfileId]);

  return typing;
}

/** Returns a `notify(typing)` for telling one specific person I am typing. */
export function useTypingSender(
  myProfileId: string | null | undefined,
  otherProfileId: string | null | undefined,
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!otherProfileId) return;
    const channel = supabase
      .channel(`typing:${otherProfileId}`, { config: { broadcast: { self: false } } })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [otherProfileId]);

  return useCallback(
    (typing: boolean) => {
      if (!myProfileId) return;
      channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { from: myProfileId, typing },
      });
    },
    [myProfileId],
  );
}
