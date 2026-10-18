import { logCall } from "./queries";

/**
 * The last tap on a Call button, kept on this device for a few minutes so
 * that coming back to Duleko can tell a real call from a mis-tap (6800).
 */
const KEY = "duleko.lastCall";

export interface CallTap {
  /** Filled in once log_call answers - usually before the dialer opens. */
  id: string | null;
  target: string;
  at: number;
}

/** Back within this long means the dialer was closed again - not a call. */
export const SHORT_CALL_MS = 20_000;

export function readCallTap(): CallTap | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CallTap) : null;
  } catch {
    return null;
  }
}

function writeCallTap(tap: CallTap | null): void {
  try {
    if (tap) window.localStorage.setItem(KEY, JSON.stringify(tap));
    else window.localStorage.removeItem(KEY);
  } catch {
    // No storage: the "did you have a deal?" question still comes, from the
    // server, just without the mis-tap check.
  }
}

export function clearCallTap(): void {
  writeCallTap(null);
}

/**
 * Called as a Call link is tapped, before the dialer takes over. Records
 * the call (interest, not a deal) and remembers when it happened.
 */
export function trackCallTap(target: string): void {
  const tap: CallTap = { id: null, target, at: Date.now() };
  writeCallTap(tap);
  logCall(target)
    .then((id) => {
      const current = readCallTap();
      if (current && current.at === tap.at) writeCallTap({ ...current, id });
    })
    .catch(() => {
      // Not allowed after all (the setting just changed) or offline: the
      // call itself still goes ahead; it just isn't counted.
    });
}
