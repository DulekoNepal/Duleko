import { createContext, useContext } from "react";

const GUEST_MODE_KEY = "duleko_guest_mode";

/** Whether "Explore Duleko" was chosen on a previous visit - persisted so a refresh mid-browse doesn't bounce back to the welcome choice. */
export function readGuestMode(): boolean {
  try {
    return window.localStorage.getItem(GUEST_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistGuestMode(value: boolean): void {
  try {
    window.localStorage.setItem(GUEST_MODE_KEY, value ? "1" : "0");
  } catch {
    // No storage - guest mode just won't survive a refresh. Not worth blocking on.
  }
}

export interface GuestModeValue {
  /** True while browsing Duleko without an account (chose "Explore"). */
  isGuest: boolean;
  /**
   * Call this the moment a guest taps something that needs an account -
   * add friend, call, chat, request work, write a review, create a
   * profile, upload a certificate, share location, or see a phone number.
   * It swaps the guest's view for the sign-in screen; there is nothing to
   * undo, since nothing they were doing needed saving.
   */
  requestSignIn: () => void;
}

// Signed-in users never read this - every screen behind the auth gate
// already assumes a profile exists - so a no-op default is enough here.
const GuestModeContext = createContext<GuestModeValue>({
  isGuest: false,
  requestSignIn: () => {},
});

export const GuestModeProvider = GuestModeContext.Provider;

export function useGuestMode(): GuestModeValue {
  return useContext(GuestModeContext);
}
