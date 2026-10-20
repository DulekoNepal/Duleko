import { Link } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { ArrowUp, ArrowUpRight, Globe, Mail, MapPin } from "lucide-react";
import { useI18n, type StringKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CONTACT_EMAIL, NEPALI_TAGLINE, PLAY_STORE_URL, mailto, useSiteActions } from "./actions";
import type { SitePath } from "./nav";
import { Brand, Container, GooglePlayBadge } from "./ui";

type FooterLink =
  | { labelKey: StringKey; to: SitePath; hash?: string }
  | { labelKey: StringKey; href: string; external?: boolean }
  | { labelKey: StringKey; action: "explore" | "create" | "signin" };

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
      { labelKey: "registrationPolicyShort", to: "/registration-policy" },
      { labelKey: "footerReportIssue", href: mailto("Report an issue") },
    ],
  },
];

const IS_NATIVE_APP = Capacitor.isNativePlatform();

const linkClass =
  "group inline-flex min-h-9 items-center gap-1 text-left text-[15px] text-teal-50/70 transition-colors hover:text-white sm:min-h-0 sm:py-0.5 sm:text-sm";

const pillClass =
  "inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-full bg-white/10 px-4 text-sm text-white/90 ring-1 ring-white/15 sm:justify-start";

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

/** A titled column of links: two to a row on phones, four across from 640px. */
function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-white sm:mb-4">{title}</h3>
      <ul className="sm:space-y-2.5">
        {links.map((link) => (
          <FooterLinkRow key={link.labelKey} link={link} />
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const { t, lang } = useI18n();
  return (
    <footer className="band relative overflow-hidden bg-teal-800 text-white">
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

      <Container className="relative pt-12 sm:pt-16">
        {/*
          Phones: brand, contact, then the links two to a row.
          Tablets (md): brand left, contact right; the four groups in one row below.
          Laptops (lg): brand column beside the four link columns.
        */}
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="md:grid md:grid-cols-2 md:items-end md:gap-10 lg:col-span-4 lg:block">
            <div>
              <Link to="/" aria-label={t("siteHomeAria")} className="inline-block">
                <Brand inverted />
              </Link>
              <p className="font-display mt-5 max-w-xs text-2xl font-semibold leading-tight text-white">
                {t("siteTagline")}
              </p>
              <p lang="ne" className="mt-2 text-base font-semibold text-brand-300">
                {NEPALI_TAGLINE}
              </p>
            </div>

            <div className="mt-6 space-y-4 md:mt-0 lg:mt-6">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap md:ml-auto md:grid md:max-w-sm lg:ml-0 lg:flex lg:max-w-none">
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
              {!IS_NATIVE_APP && (
                <div className="flex justify-center sm:justify-start md:justify-end lg:justify-start">
                  <GooglePlayBadge href={PLAY_STORE_URL} lang={lang} label={t("playStoreTitle")} height={40} />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-7 border-t border-white/10 pt-8 sm:grid-cols-4 sm:gap-x-8 lg:col-span-8 lg:border-0 lg:pt-1">
            {COLUMNS.map((column) => (
              <FooterColumn key={column.id} title={t(column.titleKey)} links={column.links} />
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 border-t border-white/10 pb-[calc(var(--sab)+1.25rem)] pt-6 sm:mt-14 lg:flex-row lg:justify-between">
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[13px] leading-relaxed text-teal-50/60 sm:text-sm lg:justify-start lg:text-left">
            <span className="basis-full sm:basis-auto">{t("footerRights", { year: new Date().getFullYear() })}</span>
            <span className="hidden text-white/20 sm:inline" aria-hidden>
              ·
            </span>
            <span>{t("footerMadeIn")}</span>
            <span className="text-white/20" aria-hidden>
              ·
            </span>
            <span>
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
          <div className="flex shrink-0 items-center gap-5 text-sm">
            <Link to="/privacy" className="text-teal-50/60 transition-colors hover:text-white">
              {t("footerPrivacy")}
            </Link>
            <Link to="/terms" className="text-teal-50/60 transition-colors hover:text-white">
              {t("footerTerms")}
            </Link>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition-all hover:-translate-y-0.5 hover:bg-white/20 sm:ml-1"
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
