import { useState, type CSSProperties } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Briefcase,
  Camera,
  ChevronRight,
  Clock,
  FileText,
  LayoutGrid,
  LogIn,
  MapPin,
  MessageCircle,
  Pin,
  Search,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { EmergencyContactsSection } from "@/components/duleko/EmergencyContacts";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { NoticeRow } from "@/components/duleko/NoticeParts";
import { SkillCategoryBrowser, groupSkillsByCategory } from "@/components/duleko/SkillGrid";
import { SkillIcon } from "@/components/duleko/SkillIcon";
import { VerifiedBadge } from "@/components/duleko/VerifiedBadge";
import { WorkerList, WorkerListSkeleton, WorkerRow } from "@/components/duleko/WorkerList";
import { RequestWorkDialog } from "@/components/duleko/RequestWorkDialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardBody, SectionIcon } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useGuestMode } from "@/hooks/use-guest-mode";
import { usePresence } from "@/hooks/use-presence";
import {
  countPendingForMe,
  countUnreadMessages,
  listNotices,
  listSkills,
  searchWorkers,
  skillCounts,
} from "@/lib/queries";
import { districtLabel } from "@/lib/nepal";
import { cn, formatNumber, locationLine, skillName, todayKey } from "@/lib/utils";
import type { Profile, Skill, WorkerCardData } from "@/lib/types";
import dulekoMark from "@/assets/duleko-mark.webp";

// One orange accent for "tap for more" (the section "See all" links),
// used nowhere else on the page, so every such link reads as one family.
const seeAllLinkClass =
  "inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-accent-600 hover:text-accent-700";

// How long a new notice stays on Home. After that it is old news, and
// lives on the board (Alerts → Notice board) only.
const NOTICE_FRESH_MS = 14 * 24 * 60 * 60_000;

function timeGreetingKey(): StringKey {
  const hour = new Date().getHours();
  if (hour < 12) return "goodMorning";
  if (hour < 17) return "goodAfternoon";
  return "goodEvening";
}

/** Section heading shared by every block below the hero. */
function SectionHeader({
  icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <h2 className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900 md:text-base">
        <SectionIcon icon={icon} />
        <span className="truncate">{title}</span>
        {children}
      </h2>
      {action}
    </div>
  );
}

export function HomeScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const { isGuest, requestSignIn } = useGuestMode();

  const skills = useQuery({ queryKey: ["skills"], queryFn: listSkills, staleTime: 30 * 60_000 });
  const skillsByCategory = groupSkillsByCategory(skills.data ?? []);

  // Total workers per skill across the whole database, not just this district
  // - a district filter only makes sense once someone actually opens the list.
  // Available to guests too - browsing the directory needs no account.
  const counts = useQuery({ queryKey: ["skill-counts"], queryFn: () => skillCounts(null) });

  const nearby = useQuery({
    queryKey: ["workers", "home", profile?.district, profile?.municipality],
    queryFn: () =>
      searchWorkers({
        district: profile?.district ?? null,
        municipality: null,
        day: todayKey(),
        availableOnly: true,
        sort: "relevance",
        limit: 6,
      }),
  });

  const online = usePresence((nearby.data ?? []).map((w) => w.id));

  // "Request" on a row opens the same request form as the worker's profile.
  const [requestFor, setRequestFor] = useState<WorkerCardData | null>(null);

  const pending = useQuery({
    queryKey: ["pending-for-me", profile?.id],
    queryFn: () => countPendingForMe(profile!.id),
    enabled: Boolean(profile?.id),
    refetchInterval: 120_000,
  });

  // The newest notice, while it is still news. Guests see it too.
  const latestNotice = useQuery({
    queryKey: ["notices", "latest"],
    queryFn: () => listNotices(0, 1),
    staleTime: 5 * 60_000,
  });
  const freshNotice = (latestNotice.data ?? []).find(
    (n) => Date.now() - new Date(n.created_at).getTime() < NOTICE_FRESH_MS,
  );

  // Same key as the nav badge, so react-query serves both from one request.
  const unreadMessages = useQuery({
    queryKey: ["unread-messages", profile?.id],
    queryFn: () => countUnreadMessages(profile!.id),
    enabled: Boolean(profile?.id),
    refetchInterval: 60_000,
  });

  // The five skills with the most people behind them, as one-tap chips
  // under the search bar. "Others" is a catch-all, not something to suggest.
  const popular = (skills.data ?? [])
    .filter((skill) => skill.id !== "other" && (counts.data?.[skill.id] ?? 0) > 0)
    .sort((a, b) => (counts.data?.[b.id] ?? 0) - (counts.data?.[a.id] ?? 0))
    .slice(0, 5);

  const pendingCount = pending.data ?? 0;
  const workersToday = nearby.data?.length ?? 0;

  return (
    <>
      <AppHeader title={t("appName")} logo />

      {/* No title row on desktop (the top bar has the logo), so the content
          starts where other screens' titles do. */}
      <PageContainer className="space-y-4 md:space-y-6 md:pt-5">
        {profile ? (
          <MemberHero profile={profile} popular={popular} />
        ) : (
          <GuestHero popular={popular} showSignIn={isGuest} onSignIn={requestSignIn} />
        )}

        {pendingCount > 0 && (
          <Link to="/work" className="group animate-in-up block">
            <Card
              tone="warning"
              interactive
              className="bg-gradient-to-r from-amber-50 to-orange-50 hover:border-amber-300"
            >
              <CardBody className="flex items-center gap-3 py-2.5">
                <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Clock className="h-4 w-4" aria-hidden />
                  <span className="absolute right-0 top-0 h-2.5 w-2.5 animate-ping rounded-full bg-amber-500" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-amber-900">{t("yourWorkToday")}</p>
                  <p className="truncate text-xs text-amber-800">
                    {t("pendingRequests", { count: formatNumber(pendingCount, lang) })}
                  </p>
                </div>
                <Badge tone="warning">{formatNumber(pendingCount, lang)}</Badge>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-amber-600 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </CardBody>
            </Card>
          </Link>
        )}

        <QuickActions pending={pendingCount} unreadMessages={unreadMessages.data ?? 0} />

        {freshNotice && (
          <section className="animate-in-up" style={{ "--delay": "45ms" } as CSSProperties}>
            <SectionHeader
              icon={Pin}
              title={t("noticeBoard")}
              action={
                <Link to="/notices" className={seeAllLinkClass}>
                  {t("seeAll")}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              }
            />
            <NoticeRow notice={freshNotice} />
          </section>
        )}

        {profile && <ProfileProgress profile={profile} />}

        <section
          className="animate-in-up"
          aria-label={t("browseSkills")}
          style={{ "--delay": "60ms" } as CSSProperties}
        >
          <SectionHeader
            icon={LayoutGrid}
            title={t("browseSkills")}
            action={
              <Link to="/search" className={seeAllLinkClass}>
                {t("seeAll")}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          {skills.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-surface shadow-sm">
                  <div className="px-4 pt-3.5">
                    <div className="skeleton h-4 w-40 rounded" />
                  </div>
                  <div className="grid grid-cols-4 gap-1 px-2 pb-2 pt-1 sm:grid-cols-6 lg:grid-cols-8">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <div key={j} className="flex flex-col items-center gap-1.5 py-3">
                        <div className="skeleton h-6 w-6 rounded-md" />
                        <div className="skeleton h-2.5 w-10 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <SkillCategoryBrowser skillsByCategory={skillsByCategory} counts={counts.data} />
          )}
        </section>

        {/* No outer card here - each person is already their own card, and
            nesting a card of cards just doubles the borders. */}
        <section className="animate-in-up" style={{ "--delay": "90ms" } as CSSProperties}>
          <div className="mb-2.5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900 md:text-base">
                <SectionIcon icon={Users} />
                <span className="truncate">{t("availableToday")}</span>
                {workersToday > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    <span className="relative flex h-2 w-2" aria-hidden>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
                    </span>
                    {formatNumber(workersToday, lang)}
                  </span>
                )}
              </h2>
              <p className="mt-0.5 truncate pl-9 text-xs text-slate-500">
                {profile?.district
                  ? t("availableTodayNear", { place: districtLabel(profile.district, lang) })
                  : t("availableTodayHint")}
              </p>
            </div>
          </div>

          {nearby.isLoading ? (
            <WorkerListSkeleton />
          ) : workersToday === 0 ? (
            <NoWorkersYet signedIn={Boolean(profile)} onSignIn={requestSignIn} />
          ) : (
            <WorkerList
              footer={
                <Link
                  to="/search"
                  search={{ available: true }}
                  className="group flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
                >
                  {t("seeEveryoneAvailable")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              }
            >
              {(nearby.data ?? []).map((worker) => (
                <WorkerRow
                  key={worker.id}
                  worker={worker}
                  online={online[worker.id]}
                  onRequest={
                    worker.id === profile?.id
                      ? undefined
                      : () => (profile ? setRequestFor(worker) : requestSignIn())
                  }
                />
              ))}
            </WorkerList>
          )}
        </section>

        {/* Safety information last - always one tap away, never in the way
            of browsing. */}
        <section className="animate-in-up" style={{ "--delay": "120ms" } as CSSProperties}>
          <EmergencyContactsSection />
        </section>
      </PageContainer>

      {profile && requestFor && (
        <RequestWorkDialog
          key={requestFor.id}
          open
          onClose={() => setRequestFor(null)}
          worker={{ id: requestFor.id, full_name: requestFor.full_name }}
          employerProfileId={profile.id}
          defaultLocation={locationLine(profile, lang)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

/**
 * One plain white card, three rows: who you are and the question, the
 * search, then popular skills. No gradients or colour blocks - green is
 * kept to the search button and the availability dot, so the skills and
 * workers below stay what draws the eye.
 */
function HeroShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="animate-in-up rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm sm:p-5">
      {children}
    </section>
  );
}

/** Small line over the question - the greeting, or the tagline for a guest. */
function HeroHeading({ eyebrow, title }: { eyebrow: React.ReactNode; title: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="flex min-w-0 items-center gap-1 text-xs text-slate-500">{eyebrow}</p>
      <h2 className="mt-0.5 text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-lg">{title}</h2>
    </div>
  );
}

function HeroSearch({ popular }: { popular: Skill[] }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  return (
    <div className="mt-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/search", search: { q: query.trim() || undefined } });
        }}
        role="search"
      >
        {/* The question above is the visible prompt; this names the field. */}
        <label htmlFor="home-search" className="sr-only">
          {t("homeHeroPrompt")}
        </label>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 transition-colors focus-within:border-brand-400 focus-within:bg-surface focus-within:ring-4 focus-within:ring-brand-100">
          <Search className="ml-2.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <input
            id="home-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-700 text-sm font-semibold text-white transition-colors hover:bg-brand-800 sm:w-auto sm:px-4"
            aria-label={t("search")}
          >
            <ArrowRight className="h-4 w-4 sm:hidden" aria-hidden />
            <span className="hidden sm:inline">{t("search")}</span>
          </button>
        </div>
      </form>

      {popular.length > 0 && (
        // Swipes sideways on a phone rather than wrapping into a tall block.
        <div className="no-scrollbar -mx-4 mt-3 flex items-center gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <span className="mr-0.5 shrink-0 text-xs text-slate-400">{t("popularSkills")}</span>
          {popular.map((skill) => (
            <Link
              key={skill.id}
              to="/search"
              search={{ skill: skill.id }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
            >
              <SkillIcon skillId={skill.id} category={skill.category} className="h-3 w-3" />
              {skillName(skill, lang)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MemberHero({ profile, popular }: { profile: Profile; popular: Skill[] }) {
  const { t } = useI18n();
  const firstName = profile.full_name?.split(/\s+/)[0] ?? "";

  return (
    <HeroShell>
      <div className="flex items-center gap-3">
        <Link
          to="/profile"
          aria-label={t("myProfile")}
          className="relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        >
          <Avatar name={profile.full_name} src={profile.avatar_url} size={44} />
          <span
            className={cn(
              "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface",
              profile.is_available ? "bg-brand-500" : "bg-slate-300",
            )}
            aria-hidden
          />
        </Link>

        <HeroHeading
          eyebrow={
            <>
              <span className="truncate">
                {t(timeGreetingKey())}, <span className="font-semibold text-slate-700">{firstName}</span>
              </span>
              <VerifiedBadge staffRole={profile.staff_role} verified={profile.is_verified} size={13} />
            </>
          }
          title={t("homeHeroPrompt")}
        />

        {/* Your work status, one tap from changing it on Profile. */}
        <Link
          to="/profile"
          className={cn(
            "hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors sm:inline-flex",
            profile.is_available
              ? "bg-brand-50 text-brand-800 hover:bg-brand-100"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200",
          )}
        >
          <span
            className={cn("h-1.5 w-1.5 rounded-full", profile.is_available ? "bg-brand-500" : "bg-slate-400")}
            aria-hidden
          />
          {profile.is_available ? t("availableForWork") : t("notAvailable")}
        </Link>
      </div>

      <HeroSearch popular={popular} />
    </HeroShell>
  );
}

function GuestHero({
  popular,
  showSignIn,
  onSignIn,
}: {
  popular: Skill[];
  showSignIn: boolean;
  onSignIn: () => void;
}) {
  const { t } = useI18n();
  return (
    <HeroShell>
      <div className="flex items-center gap-3">
        <img src={dulekoMark} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
        <HeroHeading eyebrow={<span className="truncate">{t("tagline")}</span>} title={t("guestHeroTitle")} />
        {showSignIn && (
          <Button size="sm" onClick={onSignIn} className="hidden shrink-0 sm:inline-flex">
            <LogIn className="h-4 w-4" aria-hidden />
            {t("signUpOrLogIn")}
          </Button>
        )}
      </div>
      {showSignIn && (
        <Button size="sm" onClick={onSignIn} className="mt-3 w-full sm:hidden">
          <LogIn className="h-4 w-4" aria-hidden />
          {t("signUpOrLogIn")}
        </Button>
      )}
      <HeroSearch popular={popular} />
    </HeroShell>
  );
}

/* ------------------------------------------------------------------ */
/* Quick actions                                                       */
/* ------------------------------------------------------------------ */

/**
 * Four shortcuts in one plain card, split by hairlines: icon over label on
 * a phone, icon beside label and hint from sm up. Hover is just a faint
 * grey - nothing fills with colour.
 */
function QuickActions({ pending, unreadMessages }: { pending: number; unreadMessages: number }) {
  const { t, lang } = useI18n();

  const actions: {
    to: "/search" | "/work" | "/chats" | "/friends";
    icon: LucideIcon;
    label: string;
    hint: string;
    badge?: number;
  }[] = [
    { to: "/search", icon: Search, label: t("quickFindWorkers"), hint: t("quickFindWorkersHint") },
    { to: "/work", icon: Briefcase, label: t("myWork"), hint: t("quickWorkHint"), badge: pending },
    { to: "/chats", icon: MessageCircle, label: t("chatsTitle"), hint: t("quickChatsHint"), badge: unreadMessages },
    { to: "/friends", icon: Users, label: t("callFriends"), hint: t("quickFriendsHint") },
  ];

  return (
    <nav
      aria-label={t("quickActions")}
      className="animate-in-up grid grid-cols-4 divide-x divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm"
      style={{ "--delay": "30ms" } as CSSProperties}
    >
      {actions.map(({ to, icon: Icon, label, hint, badge }) => (
        <Link
          key={to}
          to={to}
          className="flex min-w-0 flex-col items-center gap-1.5 px-1 py-3 text-center transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none sm:flex-row sm:gap-3 sm:px-4 sm:text-left"
        >
          <span className="relative shrink-0 text-brand-700">
            <Icon className="h-5 w-5" aria-hidden />
            {badge ? (
              <span className="absolute -right-2.5 -top-2 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white ring-2 ring-surface">
                {formatNumber(badge > 9 ? "9+" : badge, lang)}
              </span>
            ) : null}
          </span>
          <span className="w-full min-w-0 sm:flex-1">
            <span className="block truncate text-xs font-medium text-slate-800 sm:text-sm sm:font-semibold sm:text-slate-900">
              {label}
            </span>
            <span className="hidden truncate text-xs text-slate-500 sm:block">{hint}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Profile progress                                                    */
/* ------------------------------------------------------------------ */

/** A nudge until the basics people look for are filled in; hidden after. */
function ProfileProgress({ profile }: { profile: Profile }) {
  const { t, lang } = useI18n();

  const checks: { done: boolean; label: string; icon: LucideIcon }[] = [
    { done: Boolean(profile.avatar_url), label: t("profileItemPhoto"), icon: Camera },
    { done: Boolean(profile.about?.trim() || profile.bio?.trim()), label: t("profileItemAbout"), icon: FileText },
    { done: Boolean(profile.district), label: t("profileItemLocation"), icon: MapPin },
  ];
  const doneCount = checks.filter((c) => c.done).length;
  if (doneCount === checks.length) return null;

  const percent = Math.round(((doneCount + 1) / (checks.length + 1)) * 100); // having an account counts
  const radius = 26;
  const circumference = 2 * Math.PI * radius;

  return (
    <Card tone="primary" className="animate-in-up overflow-hidden" style={{ "--delay": "45ms" } as CSSProperties}>
      <CardBody className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-3 sm:contents">
          <div className="relative h-12 w-12 shrink-0" aria-hidden>
            <svg viewBox="0 0 64 64" className="h-12 w-12 -rotate-90">
              <circle cx="32" cy="32" r={radius} className="fill-none stroke-brand-100" strokeWidth="6" />
              <circle
                cx="32"
                cy="32"
                r={radius}
                className="fill-none stroke-brand-600 transition-[stroke-dashoffset] duration-700"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - percent / 100)}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-brand-800">
              {formatNumber(percent, lang)}%
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              {t("profileCompleteTitle", { percent: formatNumber(percent, lang) })}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">{t("profileCompleteHint")}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {checks
                .filter((c) => !c.done)
                .map(({ label, icon: Icon }) => (
                  <li
                    key={label}
                    className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-surface px-2 py-0.5 text-[11px] font-medium text-brand-800"
                  >
                    <Icon className="h-3 w-3" aria-hidden />
                    {label}
                  </li>
                ))}
            </ul>
          </div>
        </div>
        <Link
          to="/profile"
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg bg-brand-700 ml-15 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 sm:ml-0 sm:self-auto"
        >
          <UserRound className="h-3.5 w-3.5" aria-hidden />
          {t("completeProfile")}
        </Link>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

function NoWorkersYet({ signedIn, onSignIn }: { signedIn: boolean; onSignIn: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={<Users className="h-8 w-8" />}
      title={t("noWorkersYet")}
      hint={t("noWorkersHint")}
      action={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="sm" onClick={() => (signedIn ? navigate({ to: "/profile" }) : onSignIn())}>
            {t("addYourSkills")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate({ to: "/search" })}>
            {t("browseWorkers")}
          </Button>
        </div>
      }
    />
  );
}
