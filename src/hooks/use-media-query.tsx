import { useEffect, useState } from "react";

/**
 * Whether a CSS media query currently matches. For layouts that must render
 * one branch or the other - not just hide one - e.g. so a component that
 * opens a realtime channel is never mounted twice.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** The split chat layout (list beside thread) kicks in here. */
export const CHAT_SPLIT_QUERY = "(min-width: 1024px)";
