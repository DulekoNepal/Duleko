import {
  Building2,
  ClipboardCheck,
  FileText,
  Info,
  Landmark,
  Lightbulb,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ListGroup, ListRow } from "@/components/duleko/SettingsList";
import { CONTACT_EMAIL } from "@/components/duleko/site/actions";
import type { SitePath } from "@/components/duleko/site/nav";
import { useI18n, type StringKey } from "@/lib/i18n";

interface HubPage {
  to: SitePath;
  hash?: string;
  icon: LucideIcon;
  titleKey: StringKey;
}

/** Every page of the Duleko website, grouped the way the site's own navigation is. */
const GROUPS: { id: string; titleKey: StringKey; pages: HubPage[] }[] = [
  {
    id: "know",
    titleKey: "hubKnowDuleko",
    pages: [
      { to: "/welcome", icon: Sparkles, titleKey: "hubWelcome" },
      { to: "/about", icon: Info, titleKey: "navAboutDuleko" },
      { to: "/about", hash: "team", icon: Users, titleKey: "navOurTeam" },
      { to: "/mission", icon: Target, titleKey: "ourMission" },
      { to: "/motivation", icon: Lightbulb, titleKey: "motivationEyebrow" },
    ],
  },
  {
    id: "audiences",
    titleKey: "navWhoFor",
    pages: [
      { to: "/individuals", icon: UserRound, titleKey: "navForIndividuals" },
      { to: "/businesses", icon: Building2, titleKey: "navForBusinesses" },
      { to: "/partners", icon: Landmark, titleKey: "navForPartners" },
    ],
  },
  {
    id: "trust",
    titleKey: "hubTrustLegal",
    pages: [
      { to: "/safety", icon: ShieldCheck, titleKey: "trustAndSafety" },
      { to: "/privacy", icon: Lock, titleKey: "privacyPolicy" },
      { to: "/terms", icon: FileText, titleKey: "termsOfService" },
      { to: "/registration-policy", icon: ClipboardCheck, titleKey: "registrationPolicyShort" },
    ],
  },
];

/**
 * The whole Duleko website, one tap away from Profile - a plain list of
 * links. Each page opens in the website layout with a back button that
 * returns here, and Android's hardware back does the same.
 */
export function DulekoPagesHub() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <p className="px-1 text-sm leading-relaxed text-slate-500">{t("hubHint")}</p>

      {GROUPS.map((group) => (
        <ListGroup key={group.id} title={t(group.titleKey)}>
          {group.pages.map((page) => (
            <ListRow
              key={`${page.to}${page.hash ?? ""}`}
              icon={page.icon}
              title={t(page.titleKey)}
              to={page.to}
              hash={page.hash}
            />
          ))}
        </ListGroup>
      ))}

      <ListGroup title={t("contactUs")}>
        <ListRow icon={Mail} title={t("footerContactUs")} hint={CONTACT_EMAIL} href={`mailto:${CONTACT_EMAIL}`} />
      </ListGroup>

      <p className="px-1 text-center text-xs text-slate-400">{t("footerMadeIn")}</p>
    </div>
  );
}
