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
  signedIn: boolean;
}

// AppShell owns guest mode and the sign-in screen, so it supplies the real
// implementation - see App.tsx.
const SiteActionsContext = createContext<SiteActions>({
  explore: () => {},
  createProfile: () => {},
  signedIn: false,
});

export const SiteActionsProvider = SiteActionsContext.Provider;

export function useSiteActions(): SiteActions {
  return useContext(SiteActionsContext);
}
