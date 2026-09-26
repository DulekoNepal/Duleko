import { Building2, Info, Landmark, Lightbulb, UserRound, Users } from "lucide-react";

export type SitePath =
  | "/"
  | "/mission"
  | "/individuals"
  | "/businesses"
  | "/partners"
  | "/about"
  | "/safety"
  | "/motivation"
  | "/privacy"
  | "/terms";

export interface NavItem {
  to: SitePath;
  hash?: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export type NavEntry =
  | { kind: "link"; to: SitePath; label: string }
  | { kind: "group"; id: "audiences" | "about"; label: string; items: NavItem[] };

export const NAV: NavEntry[] = [
  { kind: "link", to: "/mission", label: "Mission" },
  {
    kind: "group",
    id: "audiences",
    label: "Who it's for",
    items: [
      {
        to: "/individuals",
        label: "For Individuals",
        description: "Turn your skills into opportunities.",
        icon: UserRound,
      },
      {
        to: "/businesses",
        label: "For Businesses",
        description: "Find the skills your business needs.",
        icon: Building2,
      },
      {
        to: "/partners",
        label: "Municipalities & Training Providers",
        description: "From skill training to skill utilization.",
        icon: Landmark,
      },
    ],
  },
  {
    kind: "group",
    id: "about",
    label: "About",
    items: [
      { to: "/about", label: "About Duleko", description: "Why we built Duleko.", icon: Info },
      { to: "/about", hash: "team", label: "Our Team", description: "The people behind Duleko.", icon: Users },
      { to: "/motivation", label: "Our Motivation", description: "What keeps us building.", icon: Lightbulb },
    ],
  },
  { kind: "link", to: "/safety", label: "Trust & Safety" },
];

/**
 * The website read as one story, in order - each page ends by handing the
 * reader to the next chapter (see StoryNav).
 */
export type StoryKey = "home" | "mission" | "individuals" | "businesses" | "partners" | "safety" | "about";

export interface StoryChapter {
  key: StoryKey;
  to: SitePath;
  title: string;
  teaser: string;
  /** Breadcrumb parent, matching the navbar group the page sits in. */
  group?: string;
}

export const STORY: StoryChapter[] = [
  { key: "home", to: "/", title: "Home", teaser: "Your skills deserve an opportunity." },
  {
    key: "mission",
    to: "/mission",
    title: "Our Mission",
    teaser: "A skill should not need a shop to become a business.",
  },
  {
    key: "individuals",
    to: "/individuals",
    title: "For Individuals",
    teaser: "Turn your skills into opportunities.",
    group: "Who it's for",
  },
  {
    key: "businesses",
    to: "/businesses",
    title: "For Businesses",
    teaser: "Find the skills your business needs.",
    group: "Who it's for",
  },
  {
    key: "partners",
    to: "/partners",
    title: "For Municipalities & Training Providers",
    teaser: "From skill training to skill utilization.",
    group: "Who it's for",
  },
  {
    key: "safety",
    to: "/safety",
    title: "Trust & Safety",
    teaser: "Built for connection. Designed with safety in mind.",
  },
  {
    key: "about",
    to: "/about",
    title: "About Duleko",
    teaser: "Why we built Duleko, and the people behind it.",
    group: "About",
  },
];
