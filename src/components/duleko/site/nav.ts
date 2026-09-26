import { Building2, Info, Landmark, Lightbulb, UserRound, Users } from "lucide-react";
import type { StringKey } from "@/lib/i18n";

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
  | "/terms"
  | "/registration-policy"
  | "/welcome";

export interface NavItem {
  to: SitePath;
  hash?: string;
  labelKey: StringKey;
  descriptionKey: StringKey;
  icon: React.ComponentType<{ className?: string }>;
}

export type NavEntry =
  | { kind: "link"; to: SitePath; labelKey: StringKey }
  | { kind: "group"; id: "audiences" | "about"; labelKey: StringKey; items: NavItem[] };

export const NAV: NavEntry[] = [
  { kind: "link", to: "/mission", labelKey: "navMission" },
  {
    kind: "group",
    id: "audiences",
    labelKey: "navWhoFor",
    items: [
      {
        to: "/individuals",
        labelKey: "navForIndividuals",
        descriptionKey: "navForIndividualsDesc",
        icon: UserRound,
      },
      {
        to: "/businesses",
        labelKey: "navForBusinesses",
        descriptionKey: "navForBusinessesDesc",
        icon: Building2,
      },
      {
        to: "/partners",
        labelKey: "navForPartners",
        descriptionKey: "navForPartnersDesc",
        icon: Landmark,
      },
    ],
  },
  {
    kind: "group",
    id: "about",
    labelKey: "navAbout",
    items: [
      { to: "/about", labelKey: "navAboutDuleko", descriptionKey: "navAboutDulekoDesc", icon: Info },
      { to: "/about", hash: "team", labelKey: "navOurTeam", descriptionKey: "navOurTeamDesc", icon: Users },
      {
        to: "/motivation",
        labelKey: "motivationEyebrow",
        descriptionKey: "navOurMotivationDesc",
        icon: Lightbulb,
      },
    ],
  },
  { kind: "link", to: "/safety", labelKey: "trustAndSafety" },
];

/**
 * The website read as one story, in order - each page ends by handing the
 * reader to the next chapter (see StoryNav).
 */
export type StoryKey = "home" | "mission" | "individuals" | "businesses" | "partners" | "safety" | "about";

export interface StoryChapter {
  key: StoryKey;
  to: SitePath;
  titleKey: StringKey;
  teaserKey: StringKey;
  /** Breadcrumb parent, matching the navbar group the page sits in. */
  groupKey?: StringKey;
}

export const STORY: StoryChapter[] = [
  { key: "home", to: "/", titleKey: "siteHome", teaserKey: "homeHeroTitle" },
  { key: "mission", to: "/mission", titleKey: "ourMission", teaserKey: "missionTeaser" },
  {
    key: "individuals",
    to: "/individuals",
    titleKey: "navForIndividuals",
    teaserKey: "navForIndividualsDesc",
    groupKey: "navWhoFor",
  },
  {
    key: "businesses",
    to: "/businesses",
    titleKey: "navForBusinesses",
    teaserKey: "navForBusinessesDesc",
    groupKey: "navWhoFor",
  },
  {
    key: "partners",
    to: "/partners",
    titleKey: "partnersTitle",
    teaserKey: "navForPartnersDesc",
    groupKey: "navWhoFor",
  },
  { key: "safety", to: "/safety", titleKey: "trustAndSafety", teaserKey: "safetyTeaser" },
  { key: "about", to: "/about", titleKey: "navAboutDuleko", teaserKey: "aboutTeaser", groupKey: "navAbout" },
];
