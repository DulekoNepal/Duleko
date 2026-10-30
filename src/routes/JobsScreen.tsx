import { useState } from "react";
import { Link, useCanGoBack, useNavigate, useParams, useRouter, useSearch } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  EyeOff,
  HandCoins,
  LogIn,
  MapPin,
  Megaphone,
  MessageCircle,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  UserSearch,
  Users,
  Wrench,
} from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import {
  AreaPickerDialog,
  JobCard,
  JobCardSkeleton,
  JobKindTag,
  JobStateBadge,
  OFFER_STATUS,
  jobBudgetText,
  jobState,
  offerCountText,
} from "@/components/duleko/jobs/JobParts";
import { LoadMore } from "@/components/duleko/jobs/MyBoardLists";
import { PostJobDialog } from "@/components/duleko/jobs/PostJobDialog";
import { SkillIcon } from "@/components/duleko/SkillIcon";
import { VerifiedBadge } from "@/components/duleko/VerifiedBadge";
import { RatingLine } from "@/components/duleko/WorkerList";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useTextRule } from "@/lib/text-rules";
import { useSession } from "@/hooks/use-session";
import { useGuestMode } from "@/hooks/use-guest-mode";
import { useHomeArea } from "@/hooks/use-home-area";
import { useToast } from "@/hooks/use-toast";
import {
  JOBS_PAGE,
  chooseJobOffer,
  closeJobPost,
  countMyBoardActivity,
  getJobPost,
  getJobPostPlace,
  getMyOffer,
  getUserSkills,
  listJobPosts,
  listOffersForPost,
  listSkills,
  makeJobOffer,
  staffCloseJobPost,
  staffDeleteJobPost,
  staffEditJobPost,
  withdrawJobOffer,
  type StaffPostEdit,
} from "@/lib/queries";
import { districtLabel, municipalityLabel } from "@/lib/nepal";
import { errorMessage } from "@/lib/supabase";
import { cn, formatDate, formatMoney, formatNumber, locationShort, relativeTime, skillName } from "@/lib/utils";
import type { JobOffer, JobPerson, JobPost, JobPostKind, Profile } from "@/lib/types";

/** Back that never strands you: a request opened from an email has no page behind it. */
function BackButton({ fallback }: { fallback: "/home" | "/jobs" }) {
  const { t } = useI18n();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (
    <button
      type="button"
      onClick={() => (canGoBack ? router.history.back() : router.navigate({ to: fallback }))}
      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
      aria-label={t("back")}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

/* ================================================================== */
/* /jobs - the board                                                   */
/* ================================================================== */

export function JobsScreen() {
  const { t } = useI18n();
  const { profile } = useSession();
  const { requestSignIn } = useGuestMode();
  const search = useSearch({ from: "/jobs" });
  const [posting, setPosting] = useState(false);
  const [homeArea] = useHomeArea();
  const kind: JobPostKind = search.kind ?? "hire";

  function postJob() {
    if (profile) setPosting(true);
    else requestSignIn();
  }

  return (
    <>
      <AppHeader
        title={t("jobsTitle")}
        back={<BackButton fallback="/home" />}
      />
      <PageContainer className="space-y-3">
        {profile && <MyBoardShortcuts profileId={profile.id} />}
        <OpenJobs kind={kind} onPost={postJob} />
      </PageContainer>

      {profile && posting && (
        <PostJobDialog
          open
          onClose={() => setPosting(false)}
          profile={profile}
          defaultDistrict={homeArea}
          defaultSkill={kind === "hire" ? search.skill : undefined}
          defaultKind={kind}
        />
      )}
    </>
  );
}

/**
 * The board is for browsing; what's yours on it - offers you sent, posts
 * you made - is tracked in My Work. Two shortcuts there, with what's live.
 */
function MyBoardShortcuts({ profileId }: { profileId: string }) {
  const { t, lang } = useI18n();
  const activity = useQuery({
    queryKey: ["jobs", "activity", profileId],
    queryFn: () => countMyBoardActivity(profileId),
  });
  const offers = activity.data?.waitingOffers ?? 0;
  const posts = activity.data?.openPosts ?? 0;

  const items = [
    {
      key: "offers",
      search: { role: "worker", view: "offers" } as const,
      icon: HandCoins,
      label: t("jobsTabOffers"),
      hint: offers > 0 ? t("boardOffersWaiting", { count: formatNumber(offers, lang) }) : t("boardTrackInWork"),
      live: offers > 0,
    },
    {
      key: "posts",
      search: { role: "employer", view: "posts" } as const,
      icon: Briefcase,
      label: t("jobsTabMine"),
      hint: posts > 0 ? t("boardPostsOpen", { count: formatNumber(posts, lang) }) : t("boardTrackInWork"),
      live: posts > 0,
    },
  ];

  // One strip, two halves: it reads as "your side of the board", apart from browsing.
  return (
    <nav aria-label={t("navMyWork")} className="grid grid-cols-2 divide-x divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-sm">
      {items.map(({ key, search, icon: Icon, label, hint, live }) => (
        <Link
          key={key}
          to="/work"
          search={search}
          className="group flex min-w-0 items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-slate-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-900">{label}</span>
            <span className={cn("block truncate text-xs", live ? "font-medium text-brand-700" : "text-slate-500")}>
              {hint}
            </span>
          </span>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      ))}
    </nav>
  );
}

/** People hiring, or services offered: the board shows one kind at a time (6700). */
function BoardKindTabs({ kind }: { kind: JobPostKind }) {
  const { t } = useI18n();
  const search = useSearch({ from: "/jobs" });
  const tabs: { id: JobPostKind; label: StringKey; icon: typeof Briefcase }[] = [
    { id: "hire", label: "jobsTabHiring", icon: UserSearch },
    { id: "offer", label: "jobsTabOffering", icon: Megaphone },
  ];
  return (
    <div role="tablist" aria-label={t("jobsTitle")} className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = kind === id;
        return (
          <Link
            key={id}
            to="/jobs"
            search={{ ...search, kind: id === "hire" ? undefined : id }}
            replace
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-semibold transition-colors",
              active ? "bg-surface text-brand-800 shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{t(label)}</span>
          </Link>
        );
      })}
    </div>
  );
}

const FILTER_CHIP =
  "inline-flex h-10 min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-surface px-3 text-sm font-semibold " +
  "text-slate-800 transition-colors hover:border-slate-300";

function OpenJobs({ kind, onPost }: { kind: JobPostKind; onPost: () => void }) {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const search = useSearch({ from: "/jobs" });
  const navigate = useNavigate({ from: "/jobs" });
  const [homeArea, setHomeArea] = useHomeArea();
  const [picking, setPicking] = useState(false);

  // ?district= (from a link) wins; otherwise the area Home is showing.
  const district = search.district === "all" ? null : (search.district ?? homeArea);
  const skill = search.skill ?? null;

  const skills = useQuery({ queryKey: ["skills"], queryFn: listSkills, staleTime: 30 * 60_000 });

  const jobs = useInfiniteQuery({
    queryKey: ["jobs", "open", kind, district, skill],
    queryFn: ({ pageParam }) => listJobPosts({ kind, district, skill, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length < JOBS_PAGE ? undefined : all.length),
  });
  const items = jobs.data?.pages.flat() ?? [];
  const chosenSkill = skills.data?.find((s) => s.id === skill);
  const skillLabel = chosenSkill ? skillName(chosenSkill, lang) : null;

  return (
    <>
      {/* What you're browsing: the kind on top, then where and which skill. */}
      <section aria-label={t("jobsTitle")} className="space-y-2.5 rounded-xl border border-slate-200 bg-surface p-2.5 shadow-sm">
        <BoardKindTabs kind={kind} />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPicking(true)}
            className={FILTER_CHIP}
          >
            <MapPin className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-left">
              {district ? districtLabel(district, lang) : t("homeLocationAll")}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          </button>
          <label className={cn(FILTER_CHIP, "relative focus-within:border-brand-600")}>
            <Wrench className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              {skill ? (skillLabel ?? t("jobsAllSkills")) : t("jobsAllSkills")}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            {/* The native list stays (best on phones); it sits invisibly over the chip. */}
            <select
              value={skill ?? ""}
              onChange={(e) => navigate({ search: (prev) => ({ ...prev, skill: e.target.value || undefined }), replace: true })}
              aria-label={t("jobsAllSkills")}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            >
              <option value="">{t("jobsAllSkills")}</option>
              {(skills.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {skillName(s, lang)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {jobs.isLoading ? (
        <JobCardSkeleton count={3} />
      ) : jobs.isError ? (
        <ErrorState message={errorMessage(jobs.error)} onRetry={() => jobs.refetch()} retryLabel={t("retry")} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={kind === "offer" ? <Megaphone /> : <Briefcase />}
          title={t(kind === "offer" ? "jobsOfferingEmpty" : "jobsEmpty")}
          hint={t(kind === "offer" ? "jobsOfferingEmptyHint" : "jobsEmptyHint")}
          action={
            <Button size="sm" onClick={onPost}>
              <Plus className="h-4 w-4" aria-hidden />
              {t(kind === "offer" ? "offerYourService" : "postJob")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((post) => (
            <JobCard key={post.id} post={post} />
          ))}
        </div>
      )}
      <LoadMore query={jobs} />
      {/* Posting lives with the list, not the header: the empty state has it, and so does the list's end. */}
      {items.length > 0 && (
        <button
          type="button"
          onClick={onPost}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t(kind === "offer" ? "offerYourService" : "postJob")}
        </button>
      )}

      <AreaPickerDialog
        open={picking}
        onClose={() => setPicking(false)}
        value={district}
        myDistrict={profile?.district}
        onChange={(d) => {
          setHomeArea(d);
          navigate({ search: (prev) => ({ ...prev, district: undefined }), replace: true });
        }}
      />
    </>
  );
}

/* ================================================================== */
/* /jobs/$jobId - one request                                          */
/* ================================================================== */

export function JobScreen() {
  const { t } = useI18n();
  const { jobId } = useParams({ from: "/jobs/$jobId" });
  const { profile } = useSession();
  const isStaff = Boolean(profile?.staff_role);

  const post = useQuery({ queryKey: ["jobs", "post", jobId], queryFn: () => getJobPost(jobId) });
  const job = post.data ?? null;
  const mine = Boolean(job && profile && job.employer_profile_id === profile.id);
  const offering = job?.kind === "offer";

  return (
    <>
      <AppHeader title={t(offering ? "serviceDetailsTitle" : "jobDetailsTitle")} back={<BackButton fallback="/jobs" />} />
      <PageContainer className="space-y-3 md:space-y-4">
        {post.isLoading ? (
          <JobCardSkeleton count={2} />
        ) : post.isError ? (
          <ErrorState message={errorMessage(post.error)} onRetry={() => post.refetch()} retryLabel={t("retry")} />
        ) : !job ? (
          <EmptyState
            icon={<Briefcase />}
            title={t("jobNotFound")}
            hint={t("jobNotFoundHint")}
            action={
              <Link to="/jobs" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                {t("jobsTitle")}
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-start md:gap-4">
            <div className="space-y-3 md:space-y-4">
              <JobSummary job={job} mine={mine} />
              {mine && profile && !offering ? <OwnerOffers job={job} /> : null}
            </div>
            <div className="space-y-3 md:sticky md:top-20 md:space-y-4">
              {/* An offer post takes no price offers: people contact the poster (6700). */}
              {!mine && (offering ? <ServiceContactPanel job={job} /> : <OfferPanel job={job} profile={profile} />)}
              <PosterCard job={job} mine={mine} />
              {mine && <OwnerActions job={job} />}
              {isStaff && !mine && <StaffPostActions job={job} />}
            </div>
          </div>
        )}
      </PageContainer>
    </>
  );
}

function Fact({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <div className="text-sm font-medium text-slate-800">{children}</div>
      </div>
    </div>
  );
}

/**
 * The post itself. Everyone sees its area - municipality and district; the
 * exact place is private (job_post_places, 6100), so only its poster sees
 * it here, and the chosen worker gets it on their work request.
 */
function JobSummary({ job, mine }: { job: JobPost; mine: boolean }) {
  const { t, lang } = useI18n();
  const budget = jobBudgetText(job, lang);
  const area = [...new Set([municipalityLabel(job.district, job.municipality, lang), districtLabel(job.district, lang)])]
    .filter(Boolean)
    .join(", ");
  const place = useQuery({
    queryKey: ["job-place", job.id],
    queryFn: () => getJobPostPlace(job.id),
    enabled: mine,
    staleTime: 5 * 60_000,
  });
  const exact = mine ? place.data?.location_text : null;
  const offering = job.kind === "offer";

  return (
    <Card>
      <CardBody className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <JobKindTag kind={job.kind} className="py-1" />
          {job.skill && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
              <SkillIcon skillId={job.skill.id} inherit className="h-3.5 w-3.5" />
              {skillName(job.skill, lang)}
            </span>
          )}
          <JobStateBadge post={job} />
        </div>

        <h2 className="mt-2.5 text-xl font-bold leading-snug tracking-tight text-brand-900 sm:text-2xl">{job.title}</h2>
        <p className="mt-1 text-xs text-slate-500">{t("jobPostedAgo", { time: relativeTime(job.created_at, lang) })}</p>

        <div className="mt-3 rounded-xl bg-brand-50/70 px-3.5 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-brand-700">
            {t(offering ? "serviceRate" : "jobBudget")}
          </p>
          <p className={cn("text-lg font-bold", budget ? "text-brand-900" : "text-slate-600")}>
            {budget ?? t(offering ? "serviceRateOpen" : "jobBudgetOpen")}
          </p>
        </div>

        <div className={cn("mt-4 grid gap-3", offering ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
          <Fact icon={MapPin} label={t("jobWhere")}>
            {exact ? (
              <>
                {exact}
                <span className="block text-xs font-normal text-slate-500">{area}</span>
                <span className="mt-0.5 block text-[11px] font-normal leading-snug text-slate-400">{t("jobPlaceMine")}</span>
              </>
            ) : (
              <>
                {area}
                {!mine && !offering && (
                  <span className="mt-0.5 block text-[11px] font-normal leading-snug text-slate-400">
                    {t("jobPlaceHidden")}
                  </span>
                )}
              </>
            )}
          </Fact>
          <Fact icon={CalendarDays} label={t(offering ? "serviceUntil" : "jobWhen")}>
            {formatDate(job.work_date, lang)}
          </Fact>
          {!offering && (
            <Fact icon={Users} label={t("jobOffersTitle")}>
              {offerCountText(job.offer_count, t, lang)}
            </Fact>
          )}
        </div>

        {job.details && (
          <p className="mt-4 whitespace-pre-line border-t border-slate-100 pt-3.5 text-sm leading-relaxed text-slate-700">
            {job.details}
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function PersonLine({ person, size = 44 }: { person: JobPerson; size?: number }) {
  const { lang } = useI18n();
  const place = locationShort({ ...person, province: null, ward: null }, lang);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar name={person.full_name} src={person.avatar_url} size={size} profileId={person.id} />
      <div className="min-w-0">
        <Link
          to="/worker/$workerId"
          params={{ workerId: person.id }}
          className="flex min-w-0 items-center gap-1 text-sm font-semibold text-slate-900 hover:underline"
        >
          <span className="truncate">{person.full_name}</span>
          <VerifiedBadge
            staffRole={person.staff_role}
            verified={person.is_verified}
            skillVerified={person.verified_skill_ids.length > 0}
          />
        </Link>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-slate-500">
          <RatingLine rating={person.rating} count={person.rating_count} className="text-xs" />
          {place && <span className="truncate">{place}</span>}
        </div>
      </div>
    </div>
  );
}

function PosterCard({ job, mine }: { job: JobPost; mine: boolean }) {
  const { t } = useI18n();
  const { profile } = useSession();
  if (!job.poster) return null;
  return (
    <Card>
      <CardBody>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {job.kind === "offer"
            ? t(mine ? "serviceYouOffer" : "serviceOfferedBy")
            : t(mine ? "jobYouPosted" : "jobPostedBy")}
        </p>
        <div className="flex items-center gap-2">
          <PersonLine person={job.poster} />
          {profile && !mine && (
            <Link
              to="/chat/$otherId"
              params={{ otherId: job.poster.id }}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t("jobMessage")}</span>
            </Link>
          )}
        </div>
        {mine && job.kind === "offer" && job.status === "open" && (
          <p className="mt-2.5 text-xs leading-relaxed text-slate-500">{t("serviceYoursHint")}</p>
        )}
      </CardBody>
    </Card>
  );
}

/**
 * Someone else's service on offer: no price offers here - message them
 * (anyone signed in can), or open their profile, where their phone shows
 * if their call setting allows it.
 */
function ServiceContactPanel({ job }: { job: JobPost }) {
  const { t } = useI18n();
  const { profile } = useSession();
  const { requestSignIn } = useGuestMode();
  const poster = job.poster;
  if (!poster || jobState(job) !== "open") return null;
  const name = poster.full_name.split(/\s+/)[0] ?? poster.full_name;

  return (
    <Card tone="primary" className="overflow-hidden">
      <CardBody className="p-4">
        <h3 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Megaphone className="h-4 w-4 text-brand-700" aria-hidden />
          {t("serviceNeedThis")}
        </h3>
        <p className="mb-3 text-xs leading-relaxed text-slate-600">{t("serviceContactHint", { name })}</p>
        {profile ? (
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/chat/$otherId"
              params={{ otherId: poster.id }}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-700 text-sm font-semibold text-white hover:bg-brand-800"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              {t("jobMessage")}
            </Link>
            <Link
              to="/worker/$workerId"
              params={{ workerId: poster.id }}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-surface text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <UserRound className="h-4 w-4" aria-hidden />
              {t("serviceViewProfile")}
            </Link>
          </div>
        ) : (
          <Button className="w-full" onClick={requestSignIn}>
            <LogIn className="h-4 w-4" aria-hidden />
            {t("serviceSignIn", { name })}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* A worker's side: send, change or withdraw an offer                  */
/* ------------------------------------------------------------------ */

function OfferPanel({ job, profile }: { job: JobPost; profile: Profile | null }) {
  const { t, lang } = useI18n();
  const { requestSignIn } = useGuestMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const state = jobState(job);
  const posterName = job.poster?.full_name.split(/\s+/)[0] ?? "";

  const myOffer = useQuery({
    queryKey: ["jobs", "my-offer", job.id, profile?.id],
    queryFn: () => getMyOffer(job.id, profile!.id),
    enabled: Boolean(profile),
  });
  const mySkills = useQuery({
    queryKey: ["user-skills", profile?.id],
    queryFn: () => getUserSkills(profile!.id),
    enabled: Boolean(profile),
  });

  const withdraw = useMutation({
    mutationFn: () => withdrawJobOffer(myOffer.data!.id),
    onSuccess: () => {
      toast(t("jobOfferWithdrawn"));
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const shell = (children: React.ReactNode) => (
    <Card tone="primary" className="overflow-hidden">
      <CardBody className="p-4">
        <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <HandCoins className="h-4 w-4 text-brand-700" aria-hidden />
          {t("jobYourOffer")}
        </h3>
        {children}
      </CardBody>
    </Card>
  );

  if (!profile) {
    return shell(
      <Button className="w-full" onClick={requestSignIn}>
        <LogIn className="h-4 w-4" aria-hidden />
        {t("jobSignInToOffer")}
      </Button>,
    );
  }

  if (myOffer.isLoading || mySkills.isLoading) {
    return shell(<div className="skeleton h-24 w-full rounded-xl" />);
  }

  const offer = myOffer.data ?? null;
  const open = state === "open";

  // What became of an offer already sent.
  if (offer && !editing && (offer.status !== "withdrawn" || !open) && !(offer.status === "declined" && open)) {
    return shell(
      <>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-2xl font-bold text-brand-900">{formatMoney(offer.amount, lang)}</p>
          <Badge tone={OFFER_STATUS[offer.status].tone}>{t(OFFER_STATUS[offer.status].key)}</Badge>
        </div>
        {offer.note && <p className="mt-1.5 whitespace-pre-line text-sm text-slate-600">{offer.note}</p>}
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-600">
          {offer.status === "accepted" ? (
            <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-green-600" aria-hidden />
          ) : (
            <Clock className="mt-px h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          )}
          {offer.status === "pending"
            ? open
              ? t("jobOfferPendingNote", { name: posterName })
              : state === "expired"
                ? t("jobOfferExpiredNote")
                : t("jobOfferClosedNote")
            : offer.status === "accepted"
              ? t("jobOfferAcceptedNote", { name: posterName })
              : offer.status === "declined"
                ? t("jobOfferDeclinedNote", { name: posterName })
                : t("jobOfferWithdrawnNote")}
        </p>
        {offer.status === "accepted" && job.engagement_id && (
          <Link
            to="/work"
            search={{ role: "worker", job: job.engagement_id }}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-700 text-sm font-semibold text-white hover:bg-brand-800"
          >
            {t("jobOpenMyWork")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
        {offer.status === "pending" && open && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => withdraw.mutate()} loading={withdraw.isPending}>
              {t("jobWithdrawOffer")}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              {t("jobEditOffer")}
            </Button>
          </div>
        )}
      </>,
    );
  }

  if (!open) {
    return shell(
      <p className="text-sm text-slate-600">{state === "expired" ? t("jobOfferExpiredNote") : t("jobOfferClosedNote")}</p>,
    );
  }

  if ((mySkills.data ?? []).length === 0) {
    return shell(
      <>
        <p className="text-sm text-slate-600">{t("jobAddSkillsToOffer")}</p>
        <Link
          to="/profile"
          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-700 text-sm font-semibold text-white hover:bg-brand-800"
        >
          <UserRound className="h-4 w-4" aria-hidden />
          {t("jobAddSkills")}
        </Link>
      </>,
    );
  }

  return shell(
    <>
      {offer?.status === "withdrawn" && <p className="mb-2 text-xs text-slate-500">{t("jobOfferWithdrawnNote")}</p>}
      {offer?.status === "declined" && (
        <p className="mb-2 text-xs text-slate-500">{t("jobOfferDeclinedNote", { name: posterName })}</p>
      )}
      <OfferForm
        job={job}
        posterName={posterName}
        offer={offer}
        onDone={() => setEditing(false)}
        onCancel={editing ? () => setEditing(false) : undefined}
      />
    </>,
  );
}

function OfferForm({
  job,
  posterName,
  offer,
  onDone,
  onCancel,
}: {
  job: JobPost;
  posterName: string;
  offer: JobOffer | null;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const suggested = offer?.amount ?? job.budget_max ?? job.budget_min ?? null;
  const [amount, setAmount] = useState(suggested ? String(Math.round(suggested)) : "");
  const [note, setNote] = useState(offer?.note ?? "");
  const [error, setError] = useState("");
  const rule = useTextRule();
  const updating = offer?.status === "pending";

  const send = useMutation({
    mutationFn: () => makeJobOffer(job.id, Number(amount), note),
    onSuccess: () => {
      toast(updating ? t("jobOfferUpdated") : t("jobOfferSent"));
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      onDone();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!(Number(amount) > 0)) {
          setError(t("errJobBadAmount"));
          return;
        }
        if (rule(note)) return;
        send.mutate();
      }}
    >
      <Field label={t("jobOfferPrice")} error={error}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">{lang === "ne" ? "रु" : "Rs"}</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError("");
            }}
            placeholder={t("rateAmountPlaceholder")}
          />
        </div>
      </Field>
      <Field label={`${t("jobOfferNote", { name: posterName })} (${t("optional")})`} error={rule(note)}>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          rows={3}
          className="min-h-20"
          placeholder={t("jobOfferNotePlaceholder")}
        />
      </Field>
      <div className={cn("grid gap-2", onCancel && "grid-cols-2")}>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
        )}
        <Button type="submit" loading={send.isPending}>
          <Send className="h-4 w-4" aria-hidden />
          {updating ? t("jobUpdateOffer") : t("jobSendOffer")}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* The poster's side: the offers, choosing one, closing the post       */
/* ------------------------------------------------------------------ */

function OwnerOffers({ job }: { job: JobPost }) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [choosing, setChoosing] = useState<JobOffer | null>(null);
  const state = jobState(job);

  const offers = useQuery({ queryKey: ["jobs", "offers", job.id], queryFn: () => listOffersForPost(job.id) });
  // Waiting offers first, cheapest first; the rest after, newest first.
  const items = [...(offers.data ?? [])].sort((a, b) => {
    const rank = (o: JobOffer) => (o.status === "accepted" ? 0 : o.status === "pending" ? 1 : 2);
    return rank(a) - rank(b) || (rank(a) === 1 ? a.amount - b.amount : b.updated_at.localeCompare(a.updated_at));
  });
  const chosen = items.find((o) => o.status === "accepted");

  const choose = useMutation({
    mutationFn: (offer: JobOffer) => chooseJobOffer(offer.id),
    onSuccess: (_engagementId, offer) => {
      toast(t("jobChosen", { name: offer.worker?.full_name ?? "" }));
      setChoosing(null);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["engagements"] });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  return (
    <section>
      {state === "assigned" && job.engagement_id && (
        <Card tone="success" className="mb-3">
          <CardBody className="flex flex-wrap items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-700" aria-hidden />
            <p className="min-w-0 flex-1 text-sm font-semibold text-slate-900">
              {t("jobChosenWorker", { name: chosen?.worker?.full_name ?? "" })}
            </p>
            <Button size="sm" onClick={() => navigate({ to: "/work", search: { role: "employer", job: job.engagement_id! } })}>
              {t("jobViewRequest")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </CardBody>
        </Card>
      )}

      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 md:text-base">
        {t("jobOffersTitle")}
        {items.length > 0 && <span className="font-normal text-slate-400">{formatNumber(items.length, lang)}</span>}
      </h3>

      {offers.isLoading ? (
        <div className="skeleton h-24 w-full rounded-2xl" />
      ) : offers.isError ? (
        <ErrorState message={errorMessage(offers.error)} onRetry={() => offers.refetch()} retryLabel={t("retry")} />
      ) : items.length === 0 ? (
        <EmptyState icon={<HandCoins />} title={t("jobNoOffersYet")} hint={t("jobOffersEmptyOwner")} />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm">
          {items.map((offer) => {
            const status = OFFER_STATUS[offer.status];
            const faded = offer.status === "declined" || offer.status === "withdrawn";
            return (
              <li key={offer.id} className={cn("px-3.5 py-3 sm:px-4", faded && "opacity-60")}>
                <div className="flex items-start gap-3">
                  {offer.worker && <PersonLine person={offer.worker} size={40} />}
                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold text-brand-900">{formatMoney(offer.amount, lang)}</p>
                    {offer.status !== "pending" && <Badge tone={status.tone}>{t(status.key)}</Badge>}
                  </div>
                </div>
                {offer.note && <p className="mt-2 whitespace-pre-line text-sm text-slate-600 sm:pl-[52px]">{offer.note}</p>}
                {offer.status === "pending" && offer.worker && (
                  <div className="mt-2.5 flex gap-2 sm:pl-[52px]">
                    <Link
                      to="/chat/$otherId"
                      params={{ otherId: offer.worker.id }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden />
                      {t("jobMessage")}
                    </Link>
                    {state === "open" && (
                      <Button size="sm" className="flex-1 sm:flex-none" onClick={() => setChoosing(offer)}>
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        {t("jobChoose")}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {choosing && (
        <Dialog
          open
          onClose={() => setChoosing(null)}
          title={t("jobChooseTitle", { name: choosing.worker?.full_name ?? "" })}
          footer={
            <>
              <Button variant="outline" onClick={() => setChoosing(null)}>
                {t("cancel")}
              </Button>
              <Button loading={choose.isPending} onClick={() => choose.mutate(choosing)}>
                {t("jobChoose")}
              </Button>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-slate-700">
            {t("jobChooseBody", {
              name: choosing.worker?.full_name ?? "",
              amount: formatMoney(choosing.amount, lang),
            })}
          </p>
        </Dialog>
      )}
    </section>
  );
}

function OwnerActions({ job }: { job: JobPost }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const close = useMutation({
    mutationFn: () => closeJobPost(job.id),
    onSuccess: () => {
      toast(t("jobPostClosed"));
      setConfirming(false);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  if (job.status !== "open") return null;

  return (
    <>
      <Button variant="outline" className="w-full text-red-600 hover:bg-red-50" onClick={() => setConfirming(true)}>
        {t("jobClosePost")}
      </Button>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("jobCloseTitle")}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              {t("cancel")}
            </Button>
            <Button variant="danger" loading={close.isPending} onClick={() => close.mutate()}>
              {t("jobClosePost")}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-700">
          {t(job.kind === "offer" ? "jobCloseOfferBody" : "jobCloseBody")}
        </p>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Staff: edit, take down or delete a service post, with a reason     */
/* ------------------------------------------------------------------ */

type StaffAction = "edit" | "close" | "delete";

/**
 * Any of the three staff, on anyone else's post - service (7200) or
 * hiring (7300). Every action asks why, and the poster gets an alert with
 * that reason.
 */
function StaffPostActions({ job }: { job: JobPost }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [action, setAction] = useState<StaffAction | null>(null);
  const open = job.status === "open";

  const done = useMutation({
    mutationFn: async ({ kind, reason, edit }: { kind: StaffAction; reason: string; edit?: StaffPostEdit }) => {
      if (kind === "edit") await staffEditJobPost(job.id, edit!, reason);
      else if (kind === "close") await staffCloseJobPost(job.id, reason);
      else await staffDeleteJobPost(job.id, reason);
      return kind;
    },
    onSuccess: (kind) => {
      setAction(null);
      toast(t(kind === "edit" ? "staffPostEdited" : kind === "close" ? "staffPostClosed" : "staffPostDeleted"));
      if (kind === "delete") {
        // The post is gone: drop it rather than refetch a missing one.
        queryClient.removeQueries({ queryKey: ["jobs", "post", job.id] });
        void navigate({ to: "/jobs", search: { kind: "offer" }, replace: true });
      }
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  return (
    <Card>
      <CardBody>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden />
          {t("moderatorActions")}
        </h3>
        <p className="mb-3 mt-1 text-xs leading-relaxed text-slate-500">{t("staffPostHint")}</p>
        <div className="grid gap-2">
          {open && (
            <>
              <Button variant="outline" className="w-full justify-start" onClick={() => setAction("edit")}>
                <Pencil className="h-4 w-4" aria-hidden />
                {t("staffPostEdit")}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setAction("close")}>
                <EyeOff className="h-4 w-4" aria-hidden />
                {t("staffPostClose")}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 hover:bg-red-50"
            onClick={() => setAction("delete")}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {t("staffPostDelete")}
          </Button>
        </div>
      </CardBody>

      {action === "edit" && (
        <StaffEditDialog
          job={job}
          pending={done.isPending}
          onClose={() => setAction(null)}
          onSave={(edit, reason) => done.mutate({ kind: "edit", edit, reason })}
        />
      )}
      {(action === "close" || action === "delete") && (
        <StaffReasonDialog
          kind={action}
          hiring={job.kind === "hire"}
          pending={done.isPending}
          onClose={() => setAction(null)}
          onConfirm={(reason) => done.mutate({ kind: action, reason })}
        />
      )}
    </Card>
  );
}

/** The reason box every staff action shares. */
function ReasonField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const { t } = useI18n();
  return (
    <Field label={t("staffPostReason")} error={error} hint={error ? undefined : t("staffPostReasonHint")}>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("staffPostReasonPlaceholder")}
        maxLength={500}
        rows={3}
        className="min-h-20"
      />
    </Field>
  );
}

function StaffEditDialog({
  job,
  pending,
  onClose,
  onSave,
}: {
  job: JobPost;
  pending: boolean;
  onClose: () => void;
  onSave: (edit: StaffPostEdit, reason: string) => void;
}) {
  const { t, lang } = useI18n();
  const money = t(job.kind === "offer" ? "serviceRate" : "jobBudget");
  const [title, setTitle] = useState(job.title);
  const [details, setDetails] = useState(job.details ?? "");
  const [budgetMin, setBudgetMin] = useState(job.budget_min == null ? "" : String(job.budget_min));
  const [budgetMax, setBudgetMax] = useState(job.budget_max == null ? "" : String(job.budget_max));
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const rule = useTextRule();

  function save() {
    const next: Record<string, string> = {};
    if (title.trim().length < 3) next.title = t("required");
    const lo = budgetMin ? Number(budgetMin) : null;
    const hi = budgetMax ? Number(budgetMax) : null;
    if ((lo != null && !(lo > 0)) || (hi != null && !(hi > 0))) next.budget = t("errJobBadAmount");
    else if (lo != null && hi != null && hi < lo) next.budget = t("postJobBudgetOrder");
    if (reason.trim().length < 5) next.reason = t("errModReasonRequired");
    setErrors(next);
    if (Object.keys(next).length > 0 || rule(title, details)) return;
    onSave({ title: title.trim(), details: details.trim() || null, budget_min: lo, budget_max: hi }, reason.trim());
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t("staffPostEditTitle")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={pending} onClick={save}>
            {t("staffPostSave")}
          </Button>
        </>
      }
    >
      <Field label={t("postJobTitle")} error={errors.title || rule(title)}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
      </Field>
      <Field label={`${t("postJobDetails")} (${t("optional")})`} error={rule(details)}>
        <Textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={800} rows={4} className="min-h-24" />
      </Field>
      <Field label={`${money} (${t("optional")})`} error={errors.budget}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">{lang === "ne" ? "रु" : "Rs"}</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
            placeholder={t("postJobBudgetMin")}
            aria-label={`${money}: ${t("postJobBudgetMin")}`}
          />
          <span className="text-slate-400" aria-hidden>
            –
          </span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            placeholder={t("postJobBudgetMax")}
            aria-label={`${money}: ${t("postJobBudgetMax")}`}
          />
        </div>
      </Field>
      <ReasonField value={reason} onChange={setReason} error={errors.reason} />
    </Dialog>
  );
}

function StaffReasonDialog({
  kind,
  hiring,
  pending,
  onClose,
  onConfirm,
}: {
  kind: "close" | "delete";
  /** A hiring post: workers waiting on an offer hear it closed. */
  hiring: boolean;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const deleting = kind === "delete";

  function confirm() {
    if (reason.trim().length < 5) {
      setError(t("errModReasonRequired"));
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t(deleting ? "staffPostDeleteTitle" : "staffPostCloseTitle")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant="danger" loading={pending} onClick={confirm}>
            {t(deleting ? "staffPostDelete" : "staffPostClose")}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm leading-relaxed text-slate-700">
        {t(deleting ? "staffPostDeleteBody" : "staffPostCloseBody")}
        {hiring && ` ${t("staffPostHireNote")}`}
      </p>
      <ReasonField value={reason} onChange={setReason} error={error} />
    </Dialog>
  );
}
