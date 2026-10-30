import { Suspense, lazy, useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  LogIn,
  MapPin,
  Megaphone,
  Plus,
  Search,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { EmergencyContactsSection } from "@/components/duleko/EmergencyContacts";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { FeeReminder } from "@/components/duleko/payments/FeeReminder";
import { CallDealsToConfirm } from "@/components/duleko/calls/CallDealParts";
import { NoticeRow } from "@/components/duleko/NoticeParts";
import {
  SKILL_CATEGORY_ICON,
  SKILL_CATEGORY_LABEL,
  SKILL_CATEGORY_ORDER,
  groupSkillsByCategory,
} from "@/components/duleko/SkillGrid";
import { SkillIcon } from "@/components/duleko/SkillIcon";
import { VerifiedBadge } from "@/components/duleko/VerifiedBadge";
import { BrandWatermark } from "@/components/duleko/site/ui";
import { siteSkill, siteSkillName } from "@/components/duleko/site/skills";
import { AreaPickerDialog, JobCard, JobCardSkeleton } from "@/components/duleko/jobs/JobParts";
import { PostJobDialog } from "@/components/duleko/jobs/PostJobDialog";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useGuestMode } from "@/hooks/use-guest-mode";
import { useHomeArea } from "@/hooks/use-home-area";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useMyLocation } from "@/hooks/use-my-location";
import { countPendingForMe, listJobPosts, listNotices, listSkills, searchWorkers, skillCounts } from "@/lib/queries";
import { districtLabel, municipalityLabel } from "@/lib/nepal";
import { cn, formatNumber, initials, skillName, todayKey } from "@/lib/utils";
import type { JobPostKind, Profile, Skill, SkillCategory, WorkerCardData } from "@/lib/types";

// Leaflet and its tiles load after the rest of Home, not with it.
const HomeMapCard = lazy(() =>
  import("@/components/duleko/map/HomeMapCard").then((m) => ({ default: m.HomeMapCard })),
);

// How long a new notice stays on Home. After that it is old news, and
// lives on the board (Alerts → Notice board) only.
const NOTICE_FRESH_MS = 14 * 24 * 60 * 60_000;

/** Popular's tie-break while few skills have anyone behind them yet - and the banner's shortcuts. */
const DEFAULT_SHORTCUTS = ["auto_rickshaw", "electrician", "plumber", "mechanic", "tutor", "carpenter", "cleaner", "driver"];

/** Popular is a fixed pick of five, in this order, one row on every screen. */
const POPULAR = ["auto_rickshaw", "veterinary", "tutor", "electrician", "it_computer"];

/**
 * From tablets up the map is a big, movable one; on phones a small
 * picture that opens the full map.
 */
const BIG_MAP_QUERY = "(min-width: 768px)";

/** The pale wash behind each skill icon, in its category's colour. */
const TILE_WASH: Record<SkillCategory, string> = {
  trades: "bg-accent-50",
  professional: "bg-navy-50",
  personal: "bg-brand-50",
};

type SkillSection = "popular" | SkillCategory;

function timeGreetingKey(): StringKey {
  const hour = new Date().getHours();
  if (hour < 12) return "goodMorning";
  if (hour < 17) return "goodAfternoon";
  return "goodEvening";
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

/** A Home section: a bold title, a quiet line of context, and its action on the right. */
function HomeSection({
  title,
  subtitle,
  action,
  children,
  className,
  delay,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Entrance stagger, in ms. */
  delay?: number;
}) {
  return (
    <section
      className={cn("animate-in-up min-w-0", className)}
      style={delay ? ({ "--delay": `${delay}ms` } as CSSProperties) : undefined}
    >
      <div className="mb-2.5 flex items-center justify-between gap-3 md:mb-3">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold tracking-tight text-slate-900 md:text-lg">{title}</h2>
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function SeeAll({ to, search }: { to: "/search" | "/jobs" | "/notices"; search?: Record<string, unknown> }) {
  const { t } = useI18n();
  return (
    <Link
      to={to}
      search={search as never}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-lg py-1 text-xs font-semibold text-accent-600 hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
    >
      {t("seeAll")}
      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* The screen                                                          */
/* ------------------------------------------------------------------ */

export function HomeScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const { isGuest, requestSignIn } = useGuestMode();
  const [area, setArea] = useHomeArea();
  const [pickingArea, setPickingArea] = useState(false);
  // Which kind of post the form is open on, or null while it's closed.
  const [posting, setPosting] = useState<JobPostKind | null>(null);
  const bigMap = useMediaQuery(BIG_MAP_QUERY);

  const pending = useQuery({
    queryKey: ["pending-for-me", profile?.id],
    queryFn: () => countPendingForMe(profile!.id),
    enabled: Boolean(profile?.id),
    refetchInterval: 120_000,
  });
  const pendingCount = pending.data ?? 0;

  // The newest notice, while it is still news. Guests see it too.
  const latestNotice = useQuery({
    queryKey: ["notices", "latest"],
    queryFn: () => listNotices(0, 1),
    staleTime: 5 * 60_000,
  });
  const freshNotice = (latestNotice.data ?? []).find(
    (n) => Date.now() - new Date(n.created_at).getTime() < NOTICE_FRESH_MS,
  );

  function postJob(kind: JobPostKind = "hire") {
    if (profile) setPosting(kind);
    else requestSignIn();
  }

  const place = area ? districtLabel(area, lang) : t("homeLocationAll");
  // "In Butwal" / "Across Nepal" under the sections that follow the area.
  const where = area ? t("homeInPlace", { place }) : t("homeAcrossNepal");

  return (
    <>
      <AppHeader title={t("appName")} logo />

      <PageContainer className="space-y-5 pt-2 md:space-y-6 md:pt-5">
        <HomeHero
          profile={profile}
          place={place}
          onPickArea={() => setPickingArea(true)}
          onPost={() => postJob("hire")}
          area={area}
        />

        {/* ---- Things waiting on you: one strip, only what applies ---- */}
        <div className="grid gap-2.5 empty:hidden md:grid-cols-2 md:[&>:last-child:nth-child(odd)]:col-span-2">
          {isGuest && !profile && <JoinCard onJoin={requestSignIn} />}
          {pendingCount > 0 && (
            <AttentionRow
              to="/work"
              icon={Clock}
              tone="amber"
              pulse
              title={t("yourWorkToday")}
              hint={t("pendingRequests", { count: formatNumber(pendingCount, lang) })}
              badge={formatNumber(pendingCount > 9 ? "9+" : pendingCount, lang)}
            />
          )}
          {profile && <CallDealsToConfirm className="animate-in-up" />}
          {profile && <FeeReminder className="animate-in-up" />}
          {profile && <ProfileProgress profile={profile} />}
        </div>

        {/* One column on phones and tablets, in this order. From lg the side
            column (notices, safety) sits beside the skills, and people, the
            map and work requests run the full width below them. */}
        <div className="grid gap-5 md:gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-x-7">
          <HomeSkills />

          <div className="min-w-0 lg:col-span-2">
            <NearbyPeople area={area} where={where} />
          </div>

          <div className="min-w-0 lg:col-span-2">
            <Suspense fallback={<div className="skeleton h-36 w-full rounded-2xl sm:h-44 md:h-[22rem] lg:h-[26rem]" />}>
              <HomeMapCard
                // Crossing the breakpoint builds the other kind of map.
                key={bigMap ? "big" : "small"}
                area={area}
                interactive={bigMap}
                className="h-36 sm:h-44 md:h-[22rem] lg:h-[26rem]"
              />
            </Suspense>
          </div>

          {/* The two boards side by side from lg, each its own column, so a
              short list doesn't leave half the row empty. */}
          <div className="grid min-w-0 gap-5 md:gap-6 lg:col-span-2 lg:grid-cols-2 lg:items-start lg:gap-x-7">
            <RecentPosts kind="hire" area={area} where={where} onPost={() => postJob("hire")} delay={90} />
            <RecentPosts kind="offer" area={area} where={where} onPost={() => postJob("offer")} delay={105} />
          </div>

          <aside className="min-w-0 space-y-5 md:space-y-6 lg:col-start-2 lg:row-start-1">
            {freshNotice && (
              <HomeSection title={t("noticeBoard")} action={<SeeAll to="/notices" />} delay={135}>
                <NoticeRow notice={freshNotice} />
              </HomeSection>
            )}

            {/* Safety last - always one tap away, never in the way of browsing. */}
            <section className="animate-in-up" style={{ "--delay": "150ms" } as CSSProperties}>
              {/* One number per row beside the skills, so the column runs
                  about as tall as they do instead of stopping short. */}
              <EmergencyContactsSection gridClassName="md:grid-cols-2 lg:grid-cols-1" />
            </section>
          </aside>
        </div>
      </PageContainer>

      <AreaPickerDialog
        open={pickingArea}
        onClose={() => setPickingArea(false)}
        value={area}
        onChange={setArea}
        myDistrict={profile?.district}
      />

      {profile && posting && (
        <PostJobDialog
          open
          onClose={() => setPosting(null)}
          profile={profile}
          defaultDistrict={area}
          defaultKind={posting}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hero: where, what, and the two ways in                              */
/* ------------------------------------------------------------------ */

function HomeHero({
  profile,
  place,
  area,
  onPickArea,
  onPost,
}: {
  profile: Profile | null;
  place: string;
  area: string | null;
  onPickArea: () => void;
  onPost: () => void;
}) {
  const { t, lang } = useI18n();
  const firstName = profile?.full_name.trim().split(/\s+/)[0];
  const greeting = firstName ? `${t(timeGreetingKey())}, ${firstName}` : t(timeGreetingKey());

  return (
    <section className="band animate-in-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-teal-800 p-4 text-white shadow-[0_18px_40px_-22px_rgba(21,128,61,0.7)] sm:p-6 md:p-8">
      {/* Depth: a faint dot grid on the right, two soft glows, the mark. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(90deg,transparent_35%,#000_100%)]"
      />
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-brand-300/20 blur-3xl"
        aria-hidden
      />
      <BrandWatermark className="-bottom-10 -right-10 h-40 w-40 sm:h-48 sm:w-48 md:-right-6 md:h-64 md:w-64" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[13px] font-medium text-brand-100 md:text-sm">{greeting}</p>
          <button
            type="button"
            onClick={onPickArea}
            aria-label={t("homeLocationAria", { place })}
            className="inline-flex min-w-0 max-w-[60%] shrink-0 items-center gap-1.5 rounded-full bg-white/15 py-1.5 pl-2.5 pr-3 text-xs font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{place}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        <h2 className="mt-1.5 max-w-xl text-balance text-[22px] font-bold leading-tight tracking-tight sm:text-[26px] md:mt-2 md:text-[32px]">
          {t("homeHeroPrompt")}
        </h2>

        <div className="mt-4 flex flex-col gap-2.5 md:mt-6 md:max-w-3xl md:flex-row md:items-center">
          <HomeSearch />
          <div className="grid grid-cols-2 gap-2.5 md:flex md:shrink-0">
            <button
              type="button"
              onClick={onPost}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-white px-4 text-sm font-semibold text-[#166534] shadow-sm transition-all hover:bg-[#f0fdf4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700 active:scale-[0.98] md:px-5"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              {t("postJob")}
            </button>
            <Link
              to="/jobs"
              search={area ? { district: area } : {}}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-inset ring-white/30 backdrop-blur-sm transition-all hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98] md:px-5"
            >
              <Briefcase className="h-4 w-4" aria-hidden />
              {t("homeFindWork")}
            </Link>
          </div>
        </div>

        {/* One-tap shortcuts to the everyday skills. */}
        <div className="-mx-4 mt-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:mx-0 md:mt-5 md:flex-wrap md:overflow-visible md:px-0">
          <span className="shrink-0 text-xs font-medium text-brand-100">{t("popularSkills")}:</span>
          {DEFAULT_SHORTCUTS.slice(0, 6).map((id) => (
            <Link
              key={id}
              to="/search"
              search={{ skill: id }}
              className="inline-flex shrink-0 items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {siteSkillName(siteSkill(id), lang)}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeSearch() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  return (
    <form
      role="search"
      className="md:min-w-0 md:flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        navigate({ to: "/search", search: { q: query.trim() || undefined } });
      }}
    >
      <label className="flex h-12 items-center gap-2.5 rounded-2xl bg-surface px-4 shadow-sm ring-1 ring-black/5 transition-shadow focus-within:ring-4 focus-within:ring-white/40">
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <span className="sr-only">{t("search")}</span>
        <input
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("homeSearchPlaceholder")}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </label>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Attention strip                                                     */
/* ------------------------------------------------------------------ */

const ATTENTION_TONE = {
  brand: {
    row: "border-brand-200 bg-brand-50/60 hover:bg-brand-50",
    chip: "bg-brand-100 text-brand-700",
    hint: "text-slate-600",
    badge: "bg-brand-600 text-white",
  },
  amber: {
    row: "border-amber-200 bg-amber-50 hover:bg-amber-100/70",
    chip: "bg-amber-100 text-amber-700",
    hint: "text-amber-800",
    badge: "bg-amber-500 text-white",
  },
} as const;

/** One line that needs you: an icon, what it is, and where it leads. */
function AttentionRow({
  to,
  onClick,
  icon: Icon,
  tone,
  title,
  hint,
  badge,
  pulse = false,
}: {
  to?: "/work";
  onClick?: () => void;
  icon: LucideIcon;
  tone: keyof typeof ATTENTION_TONE;
  title: string;
  hint: string;
  badge?: string;
  pulse?: boolean;
}) {
  const style = ATTENTION_TONE[tone];
  const className = cn(
    "group animate-in-up flex w-full min-w-0 items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
    style.row,
  );
  const body = (
    <>
      <span className={cn("relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", style.chip)}>
        <Icon className="h-4 w-4" aria-hidden />
        {pulse && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full bg-amber-500" aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">{title}</span>
        <span className={cn("block truncate text-xs", style.hint)}>{hint}</span>
      </span>
      {badge && (
        <span className={cn("min-w-6 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-bold", style.badge)}>
          {badge}
        </span>
      )}
      <ChevronRight
        className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden
      />
    </>
  );
  // Requests waiting on you are always ones you'd do: open that side.
  return to ? (
    <Link to={to} search={{ role: "worker" }} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}

/**
 * For visitors browsing without an account: what joining gets them, and
 * one clear button. The whole card is the button on phones.
 */
function JoinCard({ onJoin }: { onJoin: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onJoin}
      className="group animate-in-up relative flex w-full min-w-0 items-center gap-3.5 overflow-hidden rounded-2xl border border-slate-200 bg-surface px-4 py-3.5 text-left shadow-sm transition-colors hover:border-brand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 md:px-5"
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-brand-600" aria-hidden />
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <LogIn className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900 md:text-[15px]">{t("homeJoinTitle")}</span>
        <span className="block truncate text-xs text-slate-500 md:text-[13px]">{t("signUpOrLogInHint")}</span>
      </span>
      <span className="hidden h-9 shrink-0 items-center gap-1 rounded-full bg-brand-700 px-4 text-sm font-semibold text-white transition-colors group-hover:bg-brand-800 sm:inline-flex">
        {t("signUpOrLogIn")}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 sm:hidden" aria-hidden />
    </button>
  );
}

/** A nudge until the basics people look for are filled in; hidden after. */
function ProfileProgress({ profile }: { profile: Profile }) {
  const { t, lang } = useI18n();

  const checks: { done: boolean; label: string }[] = [
    { done: Boolean(profile.avatar_url), label: t("profileItemPhoto") },
    { done: Boolean(profile.about?.trim() || profile.bio?.trim()), label: t("profileItemAbout") },
    { done: Boolean(profile.district), label: t("profileItemLocation") },
  ];
  const missing = checks.filter((c) => !c.done);
  if (missing.length === 0) return null;

  // Having an account counts as the first step.
  const percent = Math.round(((checks.length - missing.length + 1) / (checks.length + 1)) * 100);
  const radius = 15;
  const circumference = 2 * Math.PI * radius;

  return (
    <Link
      to="/profile"
      className="group animate-in-up flex min-w-0 items-center gap-3 rounded-2xl border border-brand-200 bg-surface px-3.5 py-3 transition-colors hover:border-brand-300 hover:bg-brand-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      <span className="relative h-9 w-9 shrink-0" aria-hidden>
        <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
          <circle cx="18" cy="18" r={radius} className="fill-none stroke-brand-100" strokeWidth="3.5" />
          <circle
            cx="18"
            cy="18"
            r={radius}
            className="fill-none stroke-brand-600 transition-[stroke-dashoffset] duration-700"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - percent / 100)}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-brand-800">
          {formatNumber(percent, lang)}%
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">
          {t("profileCompleteTitle", { percent: formatNumber(percent, lang) })}
        </span>
        <span className="block truncate text-xs text-slate-500">{missing.map((c) => c.label).join(" · ")}</span>
      </span>
      <span className="hidden h-8 shrink-0 items-center rounded-lg bg-brand-700 px-3 text-xs font-semibold text-white transition-colors group-hover:bg-brand-800 sm:inline-flex">
        {t("completeProfile")}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 sm:hidden" aria-hidden />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Skills: Popular and the three categories, one row each              */
/* ------------------------------------------------------------------ */

/** Skills a row shows before "See all": four on phones, six from sm. */
const ROW_PREVIEW_PHONE = 4;
const ROW_PREVIEW = 6;

function HomeSkills() {
  const { t } = useI18n();

  const skills = useQuery({ queryKey: ["skills"], queryFn: listSkills, staleTime: 30 * 60_000 });
  // Total workers per skill across the whole database - available to
  // guests too, browsing the directory needs no account.
  const counts = useQuery({ queryKey: ["skill-counts"], queryFn: () => skillCounts(null) });

  // Most people first, the everyday ones first among equals - in every
  // row, so it opens on its most popular skills. "Others" is a catch-all,
  // not a suggestion.
  const byPopularity = (skills.data ?? [])
    .filter((skill) => skill.id !== "other")
    .sort((a, b) => {
      const byCount = (counts.data?.[b.id] ?? 0) - (counts.data?.[a.id] ?? 0);
      if (byCount !== 0) return byCount;
      const rank = (s: Skill) => (DEFAULT_SHORTCUTS.indexOf(s.id) + 1 || 99) * 1000 + (s.sort_order ?? 100);
      return rank(a) - rank(b);
    });
  const byCategory = groupSkillsByCategory(byPopularity);
  const popular = POPULAR.flatMap((id) => byPopularity.filter((s) => s.id === id));
  const sections: { id: SkillSection; skills: Skill[] }[] = [
    { id: "popular" as SkillSection, skills: popular },
    ...SKILL_CATEGORY_ORDER.map((id) => ({ id: id as SkillSection, skills: byCategory[id] })),
  ].filter((entry) => entry.skills.length > 0);

  return (
    <HomeSection title={t("browseSkills")} action={<SeeAll to="/search" />} delay={30}>
      <div className="space-y-2.5">
        {skills.isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-surface p-3 shadow-sm">
                <div className="skeleton h-5 w-44 rounded" />
                <div className="mt-3 grid grid-cols-4 gap-1 sm:grid-cols-6">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className={cn("flex flex-col items-center gap-2 py-1", j >= 4 && "hidden sm:flex")}>
                      <div className="skeleton h-11 w-11 rounded-2xl" />
                      <div className="skeleton h-3 w-14 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))
          : sections.map((section) => (
              <SkillRow key={section.id} section={section.id} skills={section.skills} counts={counts.data} />
            ))}
      </div>
    </HomeSection>
  );
}

/** One row of Home's skills: its most popular first, "See all" opens the rest here. */
function SkillRow({
  section,
  skills,
  counts,
}: {
  section: SkillSection;
  skills: Skill[];
  counts?: Record<string, number>;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const popular = section === "popular";
  const Icon = popular ? Flame : SKILL_CATEGORY_ICON[section];
  const title = t(popular ? "popularSkills" : SKILL_CATEGORY_LABEL[section]);
  // Popular shows all five at once, nothing to open.
  const shown = expanded || popular ? skills : skills.slice(0, ROW_PREVIEW);

  return (
    <section aria-labelledby={`home-skills-${section}`} className="rounded-2xl border border-slate-200 bg-surface shadow-sm">
      <div className="flex items-center gap-2.5 px-3.5 pt-3 sm:px-4">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            section === "popular" ? "bg-accent-50 text-accent-600" : "bg-brand-50 text-brand-700",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <h3 id={`home-skills-${section}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
          {title}
        </h3>
        {!popular && skills.length > ROW_PREVIEW_PHONE && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 rounded-lg py-1 pl-2 text-xs font-semibold text-accent-600 transition-colors hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500",
              // From sm a row already shows six: nothing more to open.
              skills.length <= ROW_PREVIEW && "sm:hidden",
            )}
          >
            {expanded ? t("showLess") : t("seeAll")}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded && "rotate-180")} aria-hidden />
          </button>
        )}
      </div>

      <div className={cn("grid gap-1 p-2 sm:px-3", popular ? "grid-cols-5" : "grid-cols-4 sm:grid-cols-6")}>
        {shown.map((skill, i) => (
          <SkillTile
            key={skill.id}
            skill={skill}
            count={counts?.[skill.id] ?? 0}
            big={popular}
            late={i >= ROW_PREVIEW}
            className={!popular && !expanded && i >= ROW_PREVIEW_PHONE ? "hidden sm:flex" : undefined}
          />
        ))}
      </div>
    </section>
  );
}

/** One skill: its icon on a soft tile, its name, and how many people offer it. */
function SkillTile({
  skill,
  count,
  big = false,
  late,
  className,
}: {
  skill: Skill;
  count: number;
  /** Popular's tiles: a larger icon than the category rows. */
  big?: boolean;
  late: boolean;
  className?: string;
}) {
  const { lang } = useI18n();
  return (
    <Link
      to="/search"
      // No area filter: everyone with the skill, nearest first (6500).
      search={{ skill: skill.id }}
      className={cn(
        "group flex min-w-0 flex-col items-center gap-1.5 rounded-xl py-2.5 text-center transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
        big ? "px-0" : "px-1",
        late && "animate-[fade-in-up_0.25s_ease-out]",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-2xl transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-95",
          big ? "h-14 w-14" : "h-11 w-11",
          TILE_WASH[skill.category] ?? "bg-navy-50",
        )}
      >
        <SkillIcon skillId={skill.id} category={skill.category} className={big ? "h-7 w-7" : "h-5 w-5"} />
      </span>
      <span
        className={cn(
          "line-clamp-2 w-full font-medium leading-tight text-slate-800",
          // Five across on a phone: small enough that "Electrician" fits whole.
          big ? "text-[10.5px] font-semibold tracking-tight sm:text-[13px] sm:tracking-normal" : "text-[11px] sm:text-xs",
        )}
      >
        {skillName(skill, lang)}
      </span>
      {count > 0 && (
        <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold tabular-nums leading-4 text-slate-500">
          {formatNumber(count, lang)}
        </span>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Nearby skilled people                                               */
/* ------------------------------------------------------------------ */

/**
 * The row's card width, as a share of the row: about two and a third
 * cards on a phone, three and a bit on a big phone, four and a bit from
 * md, five and a bit across a desktop - always a peek of the next one, so
 * the row says "swipe".
 */
const PERSON_CARD_WIDTH = "w-[42%] sm:w-[30%] md:w-[23%] lg:w-[18%]";

/** How many verified people the row shows, and how far it looks for them. */
const NEARBY_COUNT = 10;
const VERIFIED_PAGE_SIZE = 30;
const VERIFIED_MAX_PAGES = 4;

function NearbyPeople({ area, where }: { area: string | null; where: string }) {
  const { t } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  // Distances need your own shared location; without it, place names do.
  const me = useMyLocation();
  const lat = me?.lat ?? null;
  const lng = me?.lng ?? null;

  // Verified people only (the badge: checked by Duleko, or staff).
  // search_workers can't filter on that, so read it a page at a time
  // until there are enough of them or no one is left.
  const people = useQuery({
    queryKey: ["workers", "home", "verified", area, lat, lng],
    queryFn: async () => {
      const found: WorkerCardData[] = [];
      for (let page = 0; page < VERIFIED_MAX_PAGES && found.length < NEARBY_COUNT; page++) {
        const batch = await searchWorkers({
          district: area,
          day: todayKey(),
          availableOnly: false,
          sort: "relevance",
          limit: VERIFIED_PAGE_SIZE,
          offset: page * VERIFIED_PAGE_SIZE,
          lat,
          lng,
        });
        found.push(...batch.filter((w) => w.is_verified || w.skill_verified || w.staff_role));
        if (batch.length < VERIFIED_PAGE_SIZE) break;
      }
      return found.slice(0, NEARBY_COUNT);
    },
  });
  const items = people.data ?? [];

  // Whether there is more of the row either way - for the arrow buttons.
  function measure() {
    const el = scroller.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }
  useEffect(measure, [items.length]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  function page(direction: 1 | -1) {
    const el = scroller.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  const arrowClass =
    "hidden h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-surface text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 md:inline-flex";

  return (
    <HomeSection
      title={t("homeNearbyTitle")}
      subtitle={`${t("homeNearbyVerified")} · ${where}`}
      delay={60}
      action={
        <>
          {!(edges.start && edges.end) && (
            <>
              <button type="button" onClick={() => page(-1)} disabled={edges.start} aria-label={t("homeScrollBack")} className={arrowClass}>
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button type="button" onClick={() => page(1)} disabled={edges.end} aria-label={t("homeScrollForward")} className={arrowClass}>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </>
          )}
          <SeeAll to="/search" search={{ district: area ?? undefined, available: true }} />
        </>
      }
    >
      {people.isLoading ? (
        <div className="-mx-4 flex gap-3 overflow-hidden px-4 md:mx-0 md:px-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={cn("shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-surface", PERSON_CARD_WIDTH)}>
              <div className="skeleton aspect-[4/3] w-full rounded-none" />
              <div className="space-y-2 p-2.5">
                <div className="skeleton h-4 w-4/5" />
                <div className="skeleton h-3 w-3/5" />
                <div className="skeleton h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-surface p-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <Users className="h-5 w-5" aria-hidden />
          </span>
          <p className="min-w-0 flex-1 text-sm text-slate-600">{t("homeNearbyEmptyVerified")}</p>
          <Link to="/search" className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800">
            {t("browseWorkers")}
          </Link>
        </div>
      ) : (
        <div
          ref={scroller}
          onScroll={measure}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1.5 pt-0.5 md:mx-0 md:scroll-px-0 md:px-0"
        >
          {items.map((worker) => (
            <PersonCard key={worker.id} worker={worker} />
          ))}
        </div>
      )}
    </HomeSection>
  );
}

function PersonPhoto({ worker }: { worker: WorkerCardData }) {
  const [failed, setFailed] = useState(false);
  if (worker.avatar_url && !failed) {
    return (
      <img
        src={worker.avatar_url}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
      />
    );
  }
  return (
    <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50 text-2xl font-bold text-brand-700">
      {initials(worker.full_name)}
    </span>
  );
}

function PersonCard({ worker }: { worker: WorkerCardData }) {
  const { t, lang } = useI18n();
  const skill = worker.skills?.[0];
  const near =
    worker.distance_km != null
      ? t("distanceAway", { km: formatNumber(worker.distance_km, lang) })
      : worker.locality ||
        municipalityLabel(worker.district, worker.municipality, lang) ||
        districtLabel(worker.district, lang);
  const available = worker.is_available && worker.free_on_day;

  return (
    <Link
      to="/worker/$workerId"
      params={{ workerId: worker.id }}
      className={cn(
        "group flex shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm transition-all duration-200 hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
        PERSON_CARD_WIDTH,
      )}
    >
      <span className="relative block aspect-[4/3] w-full overflow-hidden bg-brand-50">
        <PersonPhoto worker={worker} />
        <span
          className={cn(
            "absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-semibold shadow-sm backdrop-blur",
            available ? "text-brand-800" : "text-slate-600",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", available ? "bg-brand-500" : "bg-slate-400")} aria-hidden />
          {available ? t("availableShort") : t("busyShort")}
        </span>
      </span>

      <span className="flex flex-1 flex-col p-2.5">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate text-sm font-semibold leading-tight text-slate-900">{worker.full_name}</span>
          <VerifiedBadge
            staffRole={worker.staff_role}
            verified={worker.is_verified}
            skillVerified={worker.skill_verified}
            size={13}
            className="shrink-0"
          />
        </span>
        {skill && (
          <span className="mt-1 flex min-w-0 items-center gap-1 text-xs text-slate-600">
            <SkillIcon skillId={skill.id} category={skill.category} className="h-3.5 w-3.5" />
            <span className="truncate">{skillName(skill, lang)}</span>
          </span>
        )}
        <span className="mt-auto flex items-center justify-between gap-2 pt-1.5 text-[11px] text-slate-500">
          {near ? (
            <span className="flex min-w-0 items-center gap-0.5">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{near}</span>
            </span>
          ) : (
            <span />
          )}
          {worker.rating_count > 0 && (
            <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-slate-700">
              <Star className="h-3 w-3 fill-sun-400 text-sun-400" aria-hidden />
              {formatNumber(worker.rating.toFixed(1), lang)}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Recent work requests                                                */
/* ------------------------------------------------------------------ */

/** Home's two lists of board posts (6700): people hiring, and services offered. */
const POST_LIST_COPY: Record<
  JobPostKind,
  { title: StringKey; empty: StringKey; emptyHint: StringKey; elsewhere: StringKey; cta: StringKey; icon: LucideIcon }
> = {
  hire: {
    title: "homeRequestsTitle",
    empty: "homeRequestsEmpty",
    emptyHint: "homeRequestsEmptyHint",
    elsewhere: "homeRequestsElsewhere",
    cta: "postJob",
    icon: Briefcase,
  },
  offer: {
    title: "homeOffersTitle",
    empty: "homeOffersEmpty",
    emptyHint: "homeOffersEmptyHint",
    elsewhere: "homeOffersElsewhere",
    cta: "offerYourService",
    icon: Megaphone,
  },
};

function RecentPosts({
  kind,
  area,
  where,
  onPost,
  delay,
}: {
  kind: JobPostKind;
  area: string | null;
  where: string;
  onPost: () => void;
  delay: number;
}) {
  const { t, lang } = useI18n();
  const copy = POST_LIST_COPY[kind];
  const Icon = copy.icon;

  // The newest in this area; with nothing here yet, the newest anywhere,
  // so Home never shows an empty board while posts exist elsewhere.
  const posts = useQuery({
    queryKey: ["jobs", "home", kind, area],
    queryFn: async () => {
      const here = await listJobPosts({ kind, district: area, pageSize: 3 });
      if (here.length > 0 || !area) return { items: here, elsewhere: false };
      const anywhere = await listJobPosts({ kind, pageSize: 3 });
      return { items: anywhere, elsewhere: anywhere.length > 0 };
    },
  });
  const items = posts.data?.items ?? [];
  const elsewhere = Boolean(posts.data?.elsewhere && area);
  const boardSearch = {
    ...(kind === "offer" ? { kind } : {}),
    ...(posts.data?.elsewhere ? { district: "all" } : {}),
  };

  return (
    <HomeSection
      title={t(copy.title)}
      subtitle={elsewhere && area ? t(copy.elsewhere, { place: districtLabel(area, lang) }) : where}
      action={<SeeAll to="/jobs" search={boardSearch} />}
      delay={delay}
    >
      {posts.isLoading ? (
        <JobCardSkeleton count={2} />
      ) : items.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-surface p-3.5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-800">{t(copy.empty)}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{t(copy.emptyHint)}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onPost}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg bg-brand-700 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-brand-800"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t(copy.cta)}
          </button>
        </div>
      ) : (
        // As many columns as fit at ~20rem, and one post fills the row
        // rather than sitting in a third of it.
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-2.5">
          {items.map((post) => (
            <JobCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </HomeSection>
  );
}
