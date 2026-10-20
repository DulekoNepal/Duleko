import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Briefcase, CheckCircle2, ChevronRight, History, Plus, Search, Wrench } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { FeeReminder } from "@/components/duleko/payments/FeeReminder";
import { EngagementDetailsDialog } from "@/components/duleko/EngagementDetailsDialog";
import { EngagementRow, EngagementRowSkeleton } from "@/components/duleko/EngagementRow";
import { LoadMore, MyOffersList, MyPostsList, PostChoiceRow } from "@/components/duleko/jobs/MyBoardLists";
import { PostJobDialog } from "@/components/duleko/jobs/PostJobDialog";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useHomeArea } from "@/hooks/use-home-area";
import {
  ENGAGEMENTS_PAGE,
  countMyBoardActivity,
  getEngagement,
  listActiveEngagements,
  listFinishedEngagements,
  listMyPostsWithOffers,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { NEEDS_ME, stepOf, type Step } from "@/lib/work";
import { cn, formatNumber } from "@/lib/utils";
import type { EngagementWithParties, JobPost } from "@/lib/types";
import type { WorkRole, WorkView } from "@/router";

/**
 * My Work - everything you're part of, in one place.
 *
 *   Work I do      Active (requests, bookings)  · My offers (job board) · History
 *   Work I gave    Active (requests, bookings)  · My posts  (job board) · History
 *
 * Active leads with "Needs you" - each job whose next move is yours, saying
 * what that move is - then what's in progress, soonest day first. The job
 * board (/jobs) is only for browsing and posting: once an offer or a post
 * is yours, it's tracked here next to the work it turns into.
 *
 * A job's sheet opens over the list from ?job=, so it has a real address:
 * Back closes it, and notifications link straight to it.
 */

const ROLE_KEY = "duleko.workRole";

const NEEDS_ORDER: Step[] = ["reply", "confirm", "checkDone", "markDone", "review"];

function storedRole(): WorkRole {
  try {
    return localStorage.getItem(ROLE_KEY) === "employer" ? "employer" : "worker";
  } catch {
    return "worker";
  }
}

function rememberRole(role: WorkRole) {
  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch {
    // Private mode: the side just isn't remembered.
  }
}

/** A job already on screen in some list, so its sheet opens without a wait. */
function findCachedEngagement(queryClient: QueryClient, id: string): EngagementWithParties | undefined {
  for (const [, data] of queryClient.getQueriesData<unknown>({ queryKey: ["engagements"] })) {
    const lists: unknown[] = Array.isArray(data)
      ? [data]
      : data && typeof data === "object" && "pages" in data
        ? ((data as { pages: unknown[] }).pages ?? [])
        : [];
    for (const list of lists) {
      if (!Array.isArray(list)) continue;
      const hit = list.find((e) => (e as EngagementWithParties | null)?.id === id);
      if (hit) return hit as EngagementWithParties;
    }
  }
  return undefined;
}

export function WorkScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const search = useSearch({ from: "/work" });
  const navigate = useNavigate({ from: "/work" });
  const queryClient = useQueryClient();
  const [homeArea] = useHomeArea();
  const [posting, setPosting] = useState(false);
  // Whether the open sheet was opened from this screen (so Back closes it)
  // or arrived from a link (so closing it just clears the address).
  const openedHere = useRef(false);
  const me = profile?.id;

  const role: WorkRole = search.role ?? storedRole();
  const boardView: WorkView = role === "worker" ? "offers" : "posts";
  const view: WorkView = search.view === "history" || search.view === boardView ? search.view : "active";

  // Both sides load at once: the side you're not looking at still says,
  // on its tab, how many of its jobs are waiting on you.
  const workerActive = useQuery({
    queryKey: ["engagements", "active", "worker", me],
    queryFn: () => listActiveEngagements(me!, "worker"),
    enabled: Boolean(me),
  });
  const employerActive = useQuery({
    queryKey: ["engagements", "active", "employer", me],
    queryFn: () => listActiveEngagements(me!, "employer"),
    enabled: Boolean(me),
  });
  const postsToChoose = useQuery({
    queryKey: ["jobs", "to-choose", me],
    queryFn: () => listMyPostsWithOffers(me!),
    enabled: Boolean(me),
  });
  const board = useQuery({
    queryKey: ["jobs", "activity", me],
    queryFn: () => countMyBoardActivity(me!),
    enabled: Boolean(me),
  });

  const needsCount = (list: EngagementWithParties[] | undefined) =>
    (list ?? []).filter((e) => NEEDS_ME.has(stepOf(e, me!))).length;
  const needs = {
    worker: needsCount(workerActive.data),
    employer: needsCount(employerActive.data) + (postsToChoose.data?.length ?? 0),
  };

  // ---- The job sheet ---------------------------------------------------
  const linkedJob = useQuery({
    queryKey: ["engagements", "job", search.job, me],
    queryFn: () => getEngagement(search.job!, me!),
    enabled: Boolean(search.job && me),
    placeholderData: () => (search.job ? findCachedEngagement(queryClient, search.job) : undefined),
  });
  const linked = search.job ? (linkedJob.data ?? null) : null;

  // Arriving from a link: show the side and list the job belongs to.
  useEffect(() => {
    if (!linked || !me || openedHere.current || linkedJob.isPlaceholderData) return;
    const jobRole: WorkRole = linked.worker_profile_id === me ? "worker" : "employer";
    const finished = stepOf(linked, me) === "done" || linked.status === "declined" || linked.status === "cancelled";
    rememberRole(jobRole);
    navigate({ search: (prev) => ({ ...prev, role: jobRole, view: finished ? "history" : undefined }), replace: true });
  }, [linked?.id, me, linkedJob.isPlaceholderData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!search.job) openedHere.current = false;
  }, [search.job]);

  function openJob(id: string) {
    openedHere.current = true;
    navigate({ search: (prev) => ({ ...prev, role, job: id }) });
  }

  function closeJob() {
    if (openedHere.current || search.from === "notifications") {
      openedHere.current = false;
      window.history.back();
    } else {
      navigate({ search: (prev) => ({ ...prev, job: undefined, from: undefined }), replace: true });
    }
  }

  function setRole(next: WorkRole) {
    rememberRole(next);
    navigate({ search: (prev) => ({ ...prev, role: next, view: undefined }), replace: true });
  }

  function setView(next: WorkView) {
    navigate({ search: (prev) => ({ ...prev, role, view: next === "active" ? undefined : next }), replace: true });
  }

  if (!profile) return <SignInRequiredScreen title={t("myWork")} />;

  const tabs: { id: WorkView; label: StringKey; count: number; urgent?: boolean }[] = [
    { id: "active", label: "workTabActive", count: needs[role], urgent: true },
    role === "worker"
      ? { id: "offers", label: "jobsTabOffers", count: board.data?.waitingOffers ?? 0 }
      : { id: "posts", label: "jobsTabMine", count: board.data?.openPosts ?? 0 },
    { id: "history", label: "workTabHistory", count: 0 },
  ];

  return (
    <>
      {/* No header action on either side: finding work and posting a job
          are offered inside the lists, where they apply. */}
      <AppHeader title={t("myWork")} />
      <PageContainer className="space-y-3">
        <RoleSwitch role={role} onChange={setRole} needs={needs} />

        {role === "worker" && <FeeReminder />}

        <div role="tablist" aria-label={t("myWork")} className="flex gap-1 border-b border-slate-200">
          {tabs.map((tab) => {
            const selected = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setView(tab.id)}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 pb-2 pt-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600",
                  selected
                    ? "border-brand-600 font-semibold text-slate-900"
                    : "border-transparent font-medium text-slate-500 hover:text-slate-800",
                )}
              >
                {t(tab.label)}
                {tab.count > 0 && (
                  <span
                    className={cn(
                      "min-w-5 rounded-full px-1.5 py-px text-center text-[11px] font-bold tabular-nums",
                      tab.urgent ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {formatNumber(tab.count, lang)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" className="space-y-4 pt-1">
          {view === "active" && (
            <ActiveView
              role={role}
              myProfileId={profile.id}
              query={role === "worker" ? workerActive : employerActive}
              postsToChoose={role === "employer" ? (postsToChoose.data ?? []) : []}
              boardCount={role === "worker" ? (board.data?.waitingOffers ?? 0) : (board.data?.openPosts ?? 0)}
              onOpen={openJob}
              onBoard={() => setView(boardView)}
              onPost={() => setPosting(true)}
            />
          )}
          {view === "offers" && <MyOffersList profileId={profile.id} onOpenJob={openJob} />}
          {view === "posts" && <MyPostsList profileId={profile.id} onPost={() => setPosting(true)} />}
          {view === "history" && <HistoryView role={role} myProfileId={profile.id} onOpen={openJob} />}
        </div>
      </PageContainer>

      {linked && (
        <EngagementDetailsDialog open onClose={closeJob} engagement={linked} myProfileId={profile.id} />
      )}

      {posting && (
        <PostJobDialog open onClose={() => setPosting(false)} profile={profile} defaultDistrict={homeArea} />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function RoleSwitch({
  role,
  onChange,
  needs,
}: {
  role: WorkRole;
  onChange: (role: WorkRole) => void;
  needs: Record<WorkRole, number>;
}) {
  const { t, lang } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 md:max-w-md" role="tablist" aria-label={t("myWork")}>
      {(["worker", "employer"] as const).map((r) => {
        const Icon = r === "worker" ? Wrench : Briefcase;
        const selected = role === r;
        const count = needs[r];
        return (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(r)}
            className={cn(
              "flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
              selected ? "bg-surface font-semibold text-slate-900 shadow-sm" : "font-medium text-slate-500 hover:text-slate-800",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", selected ? "text-brand-600" : "text-slate-400")} aria-hidden />
            <span className="truncate">{r === "worker" ? t("asWorker") : t("asEmployer")}</span>
            {count > 0 && (
              <span
                className="min-w-5 shrink-0 rounded-full bg-amber-500 px-1.5 py-px text-center text-[11px] font-bold tabular-nums text-white"
                aria-label={t("workNeedsCount", { count: formatNumber(count, lang) })}
              >
                {formatNumber(count > 9 ? "9+" : count, lang)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Section({
  title,
  count,
  urgent = false,
  children,
}: {
  title: string;
  count: number;
  urgent?: boolean;
  children: React.ReactNode;
}) {
  const { lang } = useI18n();
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 px-0.5 text-[13px] font-semibold text-slate-700">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", urgent ? "bg-amber-500" : "bg-brand-500")} aria-hidden />
        {title}
        <span className="font-normal tabular-nums text-slate-400">{formatNumber(count, lang)}</span>
      </h2>
      <div
        className={cn(
          "divide-y divide-slate-100 overflow-hidden rounded-2xl border bg-surface shadow-sm",
          urgent ? "border-amber-200" : "border-slate-200",
        )}
      >
        {children}
      </div>
    </section>
  );
}

function ActiveView({
  role,
  myProfileId,
  query,
  postsToChoose,
  boardCount,
  onOpen,
  onBoard,
  onPost,
}: {
  role: WorkRole;
  myProfileId: string;
  query: { data?: EngagementWithParties[]; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  postsToChoose: JobPost[];
  boardCount: number;
  onOpen: (id: string) => void;
  onBoard: () => void;
  onPost: () => void;
}) {
  const { t, lang } = useI18n();

  if (query.isLoading) return <EngagementRowSkeleton count={3} />;
  if (query.isError) {
    return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} retryLabel={t("retry")} />;
  }

  const items = query.data ?? [];
  const withStep = items.map((e) => ({ e, step: stepOf(e, myProfileId) }));
  // Most pressing first: someone waiting on an answer, then a booking to
  // confirm, work to close off, and a review last. Soonest day within each.
  const needsMe = withStep
    .filter(({ step }) => NEEDS_ME.has(step))
    .sort((a, b) => NEEDS_ORDER.indexOf(a.step) - NEEDS_ORDER.indexOf(b.step));
  // Reviewed and done is history, not progress.
  const moving = withStep.filter(({ step }) => !NEEDS_ME.has(step) && step !== "done");
  const needsTotal = needsMe.length + postsToChoose.length;

  // A quiet way across to the board list, when it has something live.
  const boardLink =
    boardCount > 0 ? (
      <button
        type="button"
        onClick={onBoard}
        className="group flex w-full items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-surface px-3.5 py-2.5 text-left text-sm transition-colors hover:border-brand-300 hover:bg-brand-50/40"
      >
        <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
          {role === "worker" ? t("jobsTabOffers") : t("jobsTabMine")}
          <span className="ml-1.5 font-normal text-slate-500">
            {role === "worker"
              ? t("boardOffersWaiting", { count: formatNumber(boardCount, lang) })
              : t("boardPostsOpen", { count: formatNumber(boardCount, lang) })}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </button>
    ) : null;

  if (needsTotal === 0 && moving.length === 0) {
    return (
      <>
        <EmptyState
          icon={role === "worker" ? <Wrench /> : <Briefcase />}
          title={role === "worker" ? t("workEmptyWorkerTitle") : t("workEmptyEmployerTitle")}
          hint={role === "worker" ? t("workEmptyWorkerHint") : t("workEmptyEmployerHint")}
          action={
            role === "worker" ? (
              <Link
                to="/jobs"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-700 px-3 text-sm font-medium text-white hover:bg-brand-800"
              >
                <Search className="h-4 w-4" aria-hidden />
                {t("homeFindWork")}
              </Link>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={onPost}>
                  <Plus className="h-4 w-4" aria-hidden />
                  {t("postJob")}
                </Button>
                <Link
                  to="/search"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-surface px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  <Search className="h-4 w-4" aria-hidden />
                  {t("workFindPeople")}
                </Link>
              </div>
            )
          }
        />
        {boardLink}
      </>
    );
  }

  return (
    <>
      {needsTotal > 0 ? (
        <Section title={t("workNeedsYou")} count={needsTotal} urgent>
          {postsToChoose.map((post) => (
            <PostChoiceRow key={post.id} post={post} />
          ))}
          {needsMe.map(({ e }) => (
            <EngagementRow key={e.id} engagement={e} myProfileId={myProfileId} onOpen={() => onOpen(e.id)} />
          ))}
        </Section>
      ) : (
        <p className="flex items-center gap-2 rounded-2xl bg-brand-50/60 px-3.5 py-2.5 text-sm text-brand-900">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
          {t("workAllCaughtUp")}
        </p>
      )}

      {moving.length > 0 && (
        <Section title={t("workInProgress")} count={moving.length}>
          {moving.map(({ e }) => (
            <EngagementRow key={e.id} engagement={e} myProfileId={myProfileId} onOpen={() => onOpen(e.id)} />
          ))}
        </Section>
      )}

      {boardLink}
    </>
  );
}

function HistoryView({ role, myProfileId, onOpen }: { role: WorkRole; myProfileId: string; onOpen: (id: string) => void }) {
  const { t } = useI18n();
  const history = useInfiniteQuery({
    queryKey: ["engagements", "history", role, myProfileId],
    queryFn: ({ pageParam }) => listFinishedEngagements(myProfileId, role, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length < ENGAGEMENTS_PAGE ? undefined : all.length),
  });
  const items = history.data?.pages.flat() ?? [];

  if (history.isLoading) return <EngagementRowSkeleton count={4} />;
  if (history.isError) {
    return <ErrorState message={errorMessage(history.error)} onRetry={() => history.refetch()} retryLabel={t("retry")} />;
  }
  if (items.length === 0) {
    return <EmptyState icon={<History />} title={t("workHistoryEmpty")} hint={t("workHistoryEmptyHint")} />;
  }
  return (
    <>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm">
        {items.map((e) => (
          <EngagementRow key={e.id} engagement={e} myProfileId={myProfileId} onOpen={() => onOpen(e.id)} finished />
        ))}
      </div>
      <LoadMore query={history} />
    </>
  );
}
