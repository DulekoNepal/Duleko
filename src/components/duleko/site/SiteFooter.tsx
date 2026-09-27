import { Link } from "@tanstack/react-router";
import { ArrowUp, ArrowUpRight, Globe, Mail, MapPin } from "lucide-react";
import { useI18n, type StringKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CONTACT_EMAIL, NEPALI_TAGLINE, mailto, useSiteActions } from "./actions";
import type { SitePath } from "./nav";
import { Brand, Container } from "./ui";

type FooterLink =
  | { labelKey: StringKey; to: SitePath; hash?: string }
  | { labelKey: StringKey; href: string; external?: boolean }
  | { labelKey: StringKey; action: "explore" | "create" | "signin" };

// Links shown as a literal (the domain) use a key whose text is the same in both languages.
const COLUMNS: { id: string; titleKey: StringKey; links: FooterLink[] }[] = [
  {
    id: "platform",
    titleKey: "footerPlatform",
    links: [
      { labelKey: "footerExploreSkills", action: "explore" },
      { labelKey: "footerCreateProfile", action: "create" },
      { labelKey: "siteLogIn", action: "signin" },
      { labelKey: "footerFindWork", to: "/individuals" },
    ],
  },
  {
    id: "about",
    titleKey: "navAbout",
    links: [
      { labelKey: "ourMission", to: "/mission" },
      { labelKey: "navAboutDuleko", to: "/about" },
      { labelKey: "navOurTeam", to: "/about", hash: "team" },
      { labelKey: "motivationEyebrow", to: "/motivation" },
    ],
  },
  {
    id: "partnerships",
    titleKey: "footerPartnerships",
    links: [
      { labelKey: "navForBusinesses", to: "/businesses" },
      { labelKey: "footerForMunicipalities", to: "/partners" },
      { labelKey: "footerTrainingProviders", to: "/partners" },
    ],
  },
  {
    id: "trust",
    titleKey: "siteTrust",
    links: [
      { labelKey: "footerSafety", to: "/safety" },
      { labelKey: "privacyPolicy", to: "/privacy" },
      { labelKey: "termsOfService", to: "/terms" },
      { labelKey: "registrationPolicyShort", to: "/registration-policy" },
      { labelKey: "footerReportIssue", href: mailto("Report an issue") },
    ],
  },
  {
    id: "contact",
    titleKey: "contactUs",
    links: [
      { labelKey: "footerContactUs", href: mailto("Hello Duleko") },
      { labelKey: "footerSupport", href: mailto("Support request") },
      { labelKey: "footerDomain", href: "https://www.duleko.com", external: true },
    ],
  },
];

const linkClass =
  "group inline-flex items-center gap-1 py-0.5 text-left text-sm text-teal-50/70 transition-colors hover:text-white sm:py-0";

const pillClass =
  "inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-sm text-white/90 ring-1 ring-white/15 sm:justify-start";

function FooterLinkItem({ link }: { link: FooterLink }) {
  const { explore, createProfile, signIn } = useSiteActions();
  const { t } = useI18n();
  const underline = (
    <span className="bg-gradient-to-r from-brand-300 to-brand-300 bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">
      {t(link.labelKey)}
    </span>
  );

  if ("action" in link) {
    return (
      <button
        type="button"
        className={linkClass}
        onClick={() =>
          link.action === "explore" ? explore("/search") : link.action === "signin" ? signIn() : createProfile()
        }
      >
        {underline}
      </button>
    );
  }
  if ("href" in link) {
    return (
      <a
        href={link.href}
        className={linkClass}
        {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {underline}
        {link.external && <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden />}
      </a>
    );
  }
  return (
    <Link to={link.to} hash={link.hash} className={linkClass}>
      {underline}
    </Link>
  );
}

/** One footer link; "Log in" is left out for people already signed in. */
function FooterLinkRow({ link }: { link: FooterLink }) {
  const { signedIn } = useSiteActions();
  if (signedIn && "action" in link && link.action === "signin") return null;
  return (
    <li>
      <FooterLinkItem link={link} />
    </li>
  );
}

/**
 * A titled column of links. Phones show every column open, two to a row;
 * the `wide` one (Contact) spans the row and lays its links out side by side.
 */
function FooterColumn({ title, links, wide = false }: { title: string; links: FooterLink[]; wide?: boolean }) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2 sm:col-span-1")}>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-white sm:mb-4">{title}</h3>
      <ul className={cn(wide ? "flex flex-wrap gap-x-5 gap-y-2 sm:block sm:space-y-2.5" : "space-y-2 sm:space-y-2.5")}>
        {links.map((link) => (
          <FooterLinkRow key={link.labelKey} link={link} />
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="relative overflow-hidden bg-teal-800 text-white">
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-500/15 blur-3xl"
        aria-hidden
      />
      <span
        lang="ne"
        className="pointer-events-none absolute -bottom-6 right-0 select-none text-[7rem] font-bold leading-none text-white/[0.035] sm:-bottom-10 sm:text-[12rem] lg:text-[15rem]"
        aria-hidden
      >
        डुलेको
      </span>

      <Container className="relative pt-10 sm:pt-14">
        <div className="grid gap-6 sm:gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <Link to="/" aria-label={t("siteHomeAria")} className="inline-block">
              <Brand inverted />
            </Link>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-teal-50/75">
              {t("siteTagline")}
            </p>
            <p lang="ne" className="mt-1.5 text-[15px] font-semibold text-brand-300">
              {NEPALI_TAGLINE}
            </p>

            {/* Phones: email across the top, Nepal and the site side by side. */}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className={cn(pillClass, "col-span-2 transition-colors hover:bg-white/15")}
              >
                <Mail className="h-4 w-4 shrink-0 text-brand-300" aria-hidden />
                <span className="truncate">{CONTACT_EMAIL}</span>
              </a>
              <span className={pillClass}>
                <MapPin className="h-4 w-4 shrink-0 text-brand-300" aria-hidden />
                {t("footerNepal")}
              </span>
              <a href="https://www.duleko.com" className={cn(pillClass, "transition-colors hover:bg-white/15")}>
                <Globe className="h-4 w-4 shrink-0 text-brand-300" aria-hidden />
                duleko.com
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-7 border-t border-white/10 pt-7 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-8 sm:border-0 sm:pt-0 lg:col-span-8 lg:grid-cols-5 lg:gap-x-6">
            {COLUMNS.map((column) => (
              <FooterColumn
                key={column.id}
                title={t(column.titleKey)}
                links={column.links}
                wide={column.id === "contact"}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 border-t border-white/10 pb-[calc(var(--sab)+1.25rem)] pt-5 sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-center text-[13px] leading-relaxed text-teal-50/60 sm:text-left sm:text-sm">
            <span className="block sm:inline">{t("footerRights", { year: new Date().getFullYear() })}</span>
            <span className="mx-2 hidden text-white/20 sm:inline" aria-hidden>
              ·
            </span>
            <span className="inline-block">{t("footerMadeIn")}</span>
            <span className="mx-2 text-white/20" aria-hidden>
              ·
            </span>
            <span className="inline-block">
              {t("footerBuiltBy")}{" "}
              <a
                href="https://guptasanjay.com.np"
                target="_blank"
                rel="noopener"
                className="font-medium text-teal-50/80 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                Sanjay Gupta
              </a>
            </span>
          </p>
          <div className="flex items-center gap-5 text-sm">
            <Link to="/privacy" className="text-teal-50/60 transition-colors hover:text-white">
              {t("footerPrivacy")}
            </Link>
            <Link to="/terms" className="text-teal-50/60 transition-colors hover:text-white">
              {t("footerTerms")}
            </Link>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition-all hover:-translate-y-0.5 hover:bg-white/20 sm:ml-2"
              aria-label={t("footerBackToTop")}
            >
              <ArrowUp className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </Container>
    </footer>
  );
}
