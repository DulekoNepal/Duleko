import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { Card, CardBody, SectionIcon, SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { useI18n, type StringKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Shared shell for fully static, standalone pages (Privacy, About, Mission,
 * Motivation). Built from the same AppHeader/PageContainer/Card primitives
 * as the rest of the app so they read as part of Duleko.
 */
export function StaticPage({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const Icon = icon;
  return (
    <div className="min-h-dvh bg-cream-50">
      <AppHeader
        title={title}
        subtitle={subtitle}
        back={<StaticBackButton />}
        leading={
          <span className="hidden sm:inline-flex">
            <SectionIcon icon={Icon} />
          </span>
        }
      />
      <PageContainer className="max-w-2xl space-y-4 pb-20 sm:space-y-5 md:max-w-3xl md:pb-16">
        {children}
        <StaticPageFooterNav />
      </PageContainer>
    </div>
  );
}

function StaticBackButton() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => {
        // TanStack Router stores an index on history.state. When > 0 we can
        // go back through Profile -> About -> Mission correctly. Cold opens
        // of these public pages fall back to Profile.
        const idx = (window.history.state as { idx?: number } | null)?.idx;
        if (typeof idx === "number" && idx > 0) {
          window.history.back();
          return;
        }
        void navigate({ to: "/profile" });
      }}
      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
      aria-label={t("back")}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

const STATIC_PAGES: { to: "/about" | "/mission" | "/motivation" | "/privacy"; labelKey: StringKey }[] = [
  { to: "/about", labelKey: "navAbout" },
  { to: "/mission", labelKey: "navMission" },
  { to: "/motivation", labelKey: "navMotivation" },
  { to: "/privacy", labelKey: "navPrivacy" },
];

function StaticPageFooterNav() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="mt-2 flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 pt-6 sm:gap-3"
      aria-label={t("staticPagesNav")}
    >
      {STATIC_PAGES.map((page) => {
        const active = pathname === page.to;
        return (
          <Link
            key={page.to}
            to={page.to}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
              active
                ? "bg-brand-50 text-brand-800"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
            )}
            aria-current={active ? "page" : undefined}
          >
            {t(page.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

/** Intro / lead paragraph wrapped in a card for consistent page rhythm. */
export function StaticIntro({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardBody className="p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-slate-700 sm:text-[15px] sm:leading-7">{children}</p>
      </CardBody>
    </Card>
  );
}

export function StaticSection({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardBody className="p-4 sm:p-5">
        <SectionTitle>
          <span className="flex items-center gap-2.5">
            {icon && <SectionIcon icon={icon} />}
            <span className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
              {title}
            </span>
          </span>
        </SectionTitle>
        <div className="space-y-3 text-sm leading-relaxed text-slate-700">{children}</div>
      </CardBody>
    </Card>
  );
}

/** Highlighted creed / mission line used on About, Mission, and Motivation. */
export function CreedCallout({ statement, description }: { statement: string; description?: string }) {
  return (
    <Card tone="primary">
      <CardBody className="p-4 sm:p-6">
        <p className="text-base font-medium leading-snug text-slate-900 sm:text-lg sm:leading-relaxed">
          {statement}
        </p>
        {description ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:mt-4 sm:leading-7">
            {description}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}

/** A small pill matching SkillChip's look, without needing a catalogued skill id. */
export function SkillPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

export function TeamMemberCard({
  name,
  role,
  location,
  university,
  bio,
  skills,
  phone,
  profileUrl,
  imageSrc,
}: {
  name: string;
  role: string;
  location?: string;
  university?: string;
  bio: string;
  skills: string[];
  phone: string;
  profileUrl: string;
  imageSrc?: string;
}) {
  const { t } = useI18n();

  return (
    <Card>
      <CardBody className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
        <Avatar name={name} src={imageSrc} size={80} className={cn("mx-auto shrink-0 sm:mx-0")} />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-1">
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{name}</h3>
            <Badge tone="brand">{role}</Badge>
          </div>
          <div className="mt-1.5 text-sm text-slate-500">{university || location}</div>

          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700 sm:leading-7">
            {bio}
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {skills.map((skill) => (
              <SkillPill key={skill}>{skill}</SkillPill>
            ))}
          </div>

          <div className="mt-4 flex flex-col items-center gap-2 border-t border-slate-100 pt-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1.5 sm:justify-start">
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="font-medium text-brand-700 hover:underline">
              {phone}
            </a>
            <a
              href={profileUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-700 hover:underline"
            >
              {t("viewDulekoProfile")}
            </a>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
