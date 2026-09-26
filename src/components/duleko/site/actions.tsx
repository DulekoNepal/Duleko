import { createContext, useContext } from "react";

export const CONTACT_EMAIL = "dulekonepal@gmail.com";
export const NEPALI_TAGLINE = "सीपलाई अवसरमा बदलौँ।";

export function mailto(subject: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

export interface SiteActions {
  /** Open the app to browse, as a guest if not signed in. */
  explore: (to?: "/" | "/search") => void;
  /** Sign-up for visitors, their own profile for members. */
  createProfile: () => void;
  /** The sign-in screen for visitors who already have an account. */
  signIn: () => void;
  signedIn: boolean;
  /**
   * Opened from inside the app (signed in, exploring as a guest, or the
   * Android app) rather than as a website visitor - the header then shows a
   * back button, since there's no bottom nav on these pages.
   */
  inApp: boolean;
  /** Back to wherever they came from; Profile (or Home) on a cold open. */
  back: () => void;
}

// Only reached if a website button renders outside AppShell's provider -
// which would make it silently do nothing, so say so in development.
function missingProvider(action: string) {
  return () => {
    if (import.meta.env.DEV) console.warn(`[Duleko] "${action}" clicked outside SiteActionsProvider - nothing happened.`);
  };
}

// AppShell owns guest mode and the sign-in screen, so it supplies the real
// implementation - see App.tsx. Kept across hot reloads (import.meta.hot):
// a fresh context object after an edit to this file would leave already-
// mounted buttons reading the no-op default above, so Log in / Create
// profile would stop responding until a full page reload.
const SiteActionsContext: React.Context<SiteActions> =
  import.meta.hot?.data.siteActionsContext ??
  createContext<SiteActions>({
    explore: missingProvider("explore"),
    createProfile: missingProvider("createProfile"),
    signIn: missingProvider("signIn"),
    signedIn: false,
    inApp: false,
    back: missingProvider("back"),
  });
if (import.meta.hot) import.meta.hot.data.siteActionsContext = SiteActionsContext;

export const SiteActionsProvider = SiteActionsContext.Provider;

export function useSiteActions(): SiteActions {
  return useContext(SiteActionsContext);
}
