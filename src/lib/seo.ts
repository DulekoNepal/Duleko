import seo from "./seo-pages.json";

/**
 * Keeps the head tags search engines read in step with the current page.
 * The public pages also get their own static HTML at build time
 * (scripts/seo-build.mjs), so crawlers that don't run JS see the same tags.
 */

type PageMeta = { title: string; description: string };

const PAGES = seo.pages as Record<string, PageMeta>;

// Signed-in screens: nothing here for a search result to show.
const PRIVATE_PREFIXES = [
  "/profile",
  "/work",
  "/notifications",
  "/friends",
  "/chat",
  "/chats",
  "/moderation",
  "/welcome",
];

function isPrivate(pathname: string) {
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

export function syncSeoTags(pathname: string) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  // /welcome is the same landing page as "/", shown to members.
  const url = `${seo.origin}${path === "/welcome" ? "/" : path}`;

  setCanonical(url);
  setMeta("property", "og:url", url);
  setMeta("name", "robots", isPrivate(path) ? "noindex, follow" : "index, follow");

  const page = PAGES[path];
  if (page) {
    setMeta("name", "description", page.description);
    setMeta("property", "og:title", page.title);
    setMeta("property", "og:description", page.description);
    setMeta("name", "twitter:title", page.title);
    setMeta("name", "twitter:description", page.description);
  }
}
