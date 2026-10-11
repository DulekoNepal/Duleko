import { Building2, GraduationCap } from "lucide-react";
import type { StringKey } from "@/lib/i18n";
import sunilImage from "@/assets/sunil.webp";
import sanjayImage from "@/assets/sanjay.webp";
import dipendraImage from "@/assets/dipendra.webp";

/** The three people behind Duleko - shared by About, each member's page, Motivation and Home. */
export interface Member {
  id: string;
  /** Their own page: /about/<slug>. */
  slug: string;
  nameKey: StringKey;
  roleKey: StringKey;
  affiliationKey: StringKey;
  affiliationIcon: React.ComponentType<{ className?: string }>;
  quoteKey: StringKey;
  bioKey: StringKey;
  skillKeys: StringKey[];
  phone: string;
  profileUrl: string;
  portfolioUrl?: string;
  image: string;
}

export const TEAM: Member[] = [
  {
    id: "sunil",
    slug: "sunil-k-chaudhary",
    nameKey: "sunilName",
    roleKey: "sunilRole",
    affiliationKey: "sunilUniversity",
    affiliationIcon: GraduationCap,
    quoteKey: "sunilQuote",
    bioKey: "sunilBio",
    skillKeys: ["sunilSkill1", "sunilSkill2", "sunilSkill3"],
    phone: "+977 9819447220",
    profileUrl: "/worker/fc5757c4-cd73-4dc0-b3d6-441c4c1dad00",
    image: sunilImage,
  },
  {
    id: "sanjay",
    slug: "sanjay-gupta",
    nameKey: "sanjayName",
    roleKey: "sanjayRole",
    affiliationKey: "sanjayLocation",
    affiliationIcon: GraduationCap,
    quoteKey: "sanjayQuote",
    bioKey: "sanjayBio",
    skillKeys: ["sanjaySkill1", "sanjaySkill2", "sanjaySkill3"],
    phone: "+977 9766382090",
    profileUrl: "/worker/b7bc1f68-7f04-4eb4-addd-df5d71db8e98",
    portfolioUrl: "https://guptasanjay.com.np",
    image: sanjayImage,
  },
  {
    id: "dipendra",
    slug: "dipendra-chaudhary",
    nameKey: "dipendraName",
    roleKey: "dipendraRole",
    affiliationKey: "dipendraLocation",
    affiliationIcon: Building2,
    quoteKey: "dipendraQuote",
    bioKey: "dipendraBio",
    skillKeys: ["dipendraSkill1", "dipendraSkill2", "dipendraSkill3"],
    phone: "+977 9867503930",
    profileUrl: "/worker/541bf85d-3b39-465f-b14d-f0267ab09b10",
    image: dipendraImage,
  },
];

export function teamMember(id: string): Member {
  const member = TEAM.find((m) => m.id === id);
  if (!member) throw new Error(`[Duleko] unknown team member "${id}"`);
  return member;
}

/** Bios open with the member's quote, which the pages show on its own. */
export function bioParagraphs(bio: string): string[] {
  const parts = bio
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts[0]?.startsWith('"') ? parts.slice(1) : parts;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}
