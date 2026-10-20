import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useCanGoBack, useNavigate, useParams, useRouter, useSearch } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Handshake,
  Hash,
  Link2,
  MapPin,
  Phone,
  Quote,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  StickyNote,
  Wallet,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { SectionCard } from "@/components/duleko/ProfileParts";
import { RatingStars } from "@/components/duleko/Rating";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { useI18n, type StringKey } from "@/lib/i18n";
import { ACTIVITY_ROWS } from "@/lib/activity";
import {
  getActivityItem,
  getActivityStats,
  listActivity,
  listSkills,
  removeCallDeal,
  type ActivityItem,
  type ActivityItemType,
  type ActivityNumbers,
  type ActivityPerson,
  type ActivityRow,
} from "@/lib/queries";
import { copyLink } from "@/lib/share";
import { errorMessage } from "@/lib/supabase";
import type { Lang, Skill } from "@/lib/types";
import {
  cn,
  formatClockTime,
  formatDate,
  formatDayLabel,
  formatMoney,
  formatNumber,
  relativeTime,
  skillName,
  toDateKey,
} from "@/lib/utils";

export type ActivityRange = "all_time" | "last_30_days";

type Tone = "warning" | "success" | "danger" | "muted" | "neutral" | "brand";
type T = ReturnType<typeof useI18n>["t"];

/** Each kind of record has its own icon and tint, so a mixed list scans at a glance. */
const TYPE_STYLE: Record<ActivityItemType, { label: StringKey; icon: LucideIcon; tint: string }> = {
  call: { label: "itemCall", icon: Phone, tint: "bg-sky-100 text-sky-600" },
  request: { label: "itemRequest", icon: Briefcase, tint: "bg-brand-100 text-brand-700" },
  deal: { label: "itemDeal", icon: Handshake, tint: "bg-amber-100 text-amber-700" },
  review: { label: "itemReview", icon: Star, tint: "bg-violet-100 text-violet-600" },
};

const CALL_OUTCOME: Record<string, { label: StringKey; tone: Tone }> = {
  deal: { label: "callOutcomeDeal", tone: "success" },
  discussing: { label: "callOutcomeDiscussing", tone: "warning" },
  no: { label: "callOutcomeNo", tone: "muted" },
  short: { label: "callOutcomeShort", tone: "muted" },
};
const CALL_NONE = { label: "callOutcomeNone" as StringKey, tone: "neutral" as Tone };

const REQUEST_STATUS: Record<string, { label: StringKey; tone: Tone }> = {
  pending: { label: "statusPending", tone: "warning" },
  accepted: { label: "statusAccepted", tone: "brand" },
  declined: { label: "statusDeclined", tone: "danger" },
  confirmed: { label: "statusConfirmed", tone: "brand" },
  completed: { label: "statusCompleted", tone: "success" },
  cancelled: { label: "statusCancelled", tone: "danger" },
};

const DEAL_STATUS: Record<string, { label: StringKey; tone: Tone }> = {
  reported: { label: "dealStatusReported", tone: "warning" },
  confirmed: { label: "dealStatusConfirmed", tone: "success" },
  disputed: { label: "dealStatusDisputed", tone: "danger" },
  removed: { label: "dealStatusRemoved", tone: "muted" },
};

function statusOf(type: ActivityRow["type"], status: string | null | undefined) {
  if (type === "call") return CALL_OUTCOME[status ?? ""] ?? CALL_NONE;
  if (type === "request") return status ? REQUEST_STATUS[status] : undefined;
  if (type === "deal") return status ? DEAL_STATUS[status] : undefined;
  return undefined;
}

/** "12 Oct 2026, 9:41 am" - a moment, in the reader's calendar. */
function moment(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${formatDate(toDateKey(d), lang)}, ${formatClockTime(iso, lang)}`;
}

function sinceFor(range: ActivityRange): string | null {
  return range === "last_30_days" ? new Date(Date.now() - 30 * 86_400_000).toISOString() : null;
}

function useSkillNames() {
  const { lang } = useI18n();
  const skills = useQuery({ queryKey: ["skills"], queryFn: listSkills, staleTime: 30 * 60_000 });
  return useMemo(() => {
    const byId = new Map<string, Skill>((skills.data ?? []).map((s) => [s.id, s]));
    return (id: string | null | undefined) => (id ? skillName(byId.get(id), lang) || id : "");
  }, [skills.data, lang]);
}

/** Back that never strands you: a page opened from a shared link has nothing behind it. */
function BackButton() {
  const { t } = useI18n();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (
    <button
      type="button"
      onClick={() => (canGoBack ? router.history.back() : router.navigate({ to: "/staff/activity" }))}
      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
      aria-label={t("back")}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

function TypeIcon({ type, size = "md" }: { type: ActivityItemType; size?: "sm" | "md" | "lg" }) {
  const { icon: Icon, tint } = TYPE_STYLE[type];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        tint,
        size === "lg" ? "h-12 w-12 rounded-2xl" : size === "md" ? "h-9 w-9 rounded-xl" : "h-7 w-7 rounded-lg",
      )}
    >
      <Icon className={size === "lg" ? "h-6 w-6" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
    </span>
  );
}

/* ================================================================== */
/* /staff/activity/$kind - the records behind one number               */
/* ================================================================== */

/** What a row is filtered by: the call's answer, the request's status, the kind of job, the stars. */
function chipKeyOf(kind: string, row: ActivityRow): string | null {
  if (kind === "calls") return row.status ?? "none";
  if (kind === "accepted") return row.status ?? null;
  if (kind === "completed" || kind === "deals_npr") return row.type;
  if (kind === "reviews") return String(row.rating ?? 0);
  return null;
}

function chipLabel(kind: string, key: string, t: T): React.ReactNode {
  if (kind === "calls") return t((CALL_OUTCOME[key] ?? CALL_NONE).label);
  if (kind === "accepted") return REQUEST_STATUS[key] ? t(REQUEST_STATUS[key].label) : key;
  if (kind === "completed" || kind === "deals_npr") return t(TYPE_STYLE[key as ActivityItemType].label);
  if (kind === "reviews")
    return (
      <span className="inline-flex items-center gap-0.5">
        {key}
        <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
      </span>
    );
  return key;
}

function matches(row: ActivityRow, q: string, skillLabel: (id: string | null | undefined) => string): boolean {
  if (!q) return true;
  const hay = [
    row.from?.name,
    row.from?.member_no,
    row.to?.name,
    row.to?.member_no,
    row.title,
    row.comment,
    skillLabel(row.skill_id),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function ActivityListScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const navigate = useNavigate();
  const { kind } = useParams({ strict: false }) as { kind: string };
  const { range = "all_time" } = useSearch({ strict: false }) as { range?: ActivityRange };
  const row = ACTIVITY_ROWS.find((r) => r.key === kind);
  const isStaff = Boolean(profile?.staff_role);
  const skillLabel = useSkillNames();
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<string | null>(null);

  // The headline number comes from the same numbers as the tiles - the
  // list itself stops at 300.
  const stats = useQuery({ queryKey: ["activity-stats"], queryFn: getActivityStats, enabled: isStaff });
  const list = useQuery({
    queryKey: ["activity-list", kind, range],
    queryFn: () => listActivity(kind as keyof ActivityNumbers, sinceFor(range)),
    enabled: isStaff && Boolean(row),
  });

  const rows = useMemo(() => list.data ?? [], [list.data]);
  const chips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = chipKeyOf(kind, r);
      if (key != null) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const entries = [...counts.entries()];
    // Stars read best highest first; everything else by how common it is.
    return kind === "reviews" ? entries.sort((a, b) => Number(b[0]) - Number(a[0])) : entries.sort((a, b) => b[1] - a[1]);
  }, [rows, kind]);

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => rows.filter((r) => (chip == null || chipKeyOf(kind, r) === chip) && matches(r, q, skillLabel)),
    [rows, chip, kind, q, skillLabel],
  );
  const groups = useMemo(() => {
    const out: { day: string; rows: ActivityRow[] }[] = [];
    for (const r of shown) {
      const day = toDateKey(new Date(r.at));
      const last = out[out.length - 1];
      if (last?.day === day) last.rows.push(r);
      else out.push({ day, rows: [r] });
    }
    return out;
  }, [shown]);

  const title = row ? t(row.label) : t("activityTitle");
  if (!profile) return <SignInRequiredScreen title={title} />;

  // Active members are always the last 30 days, whichever range is picked.
  const fixedRange = kind === "active";
  const value = row && stats.data?.[range][row.key];
  const total = value == null ? "…" : row?.money ? formatMoney(value, lang) : formatNumber(value, lang);
  const filtering = Boolean(q) || chip != null;

  return (
    <>
      <AppHeader title={title} subtitle={t("activityTitle")} back={<BackButton />} />
      <PageContainer className="space-y-3 md:space-y-4">
        {!isStaff || !row ? (
          <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title={t("activitySubtitle")} />
        ) : (
          <>
            {/* The number itself, and the range it covers. */}
            <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm sm:p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                <row.icon className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-[11rem] flex-1">
                <p className="text-2xl font-bold tabular-nums leading-tight text-slate-900 sm:text-3xl">{total}</p>
                <p className="text-xs font-medium text-slate-500">
                  {title} · {t(range === "last_30_days" || fixedRange ? "activityLast30" : "activityAllTime")}
                </p>
              </div>
              {!fixedRange && (
                <Segmented
                  label={t("activityTitle")}
                  options={[
                    { value: "all_time", label: t("activityAllTime") },
                    { value: "last_30_days", label: t("activityLast30") },
                  ]}
                  value={range}
                  onChange={(next) => {
                    setChip(null);
                    void navigate({
                      to: "/staff/activity/$kind",
                      params: { kind },
                      search: next === "last_30_days" ? { range: next } : {},
                      replace: true,
                    });
                  }}
                />
              )}
            </section>

            {/* Search, and quick filters built from what's in the list. */}
            {rows.length > 0 && (
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <Input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("activitySearchPlaceholder")}
                    aria-label={t("activitySearchPlaceholder")}
                    className="pl-9 pr-9"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label={t("activityClearSearch")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {chips.length > 1 && (
                  <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
                    <FilterChip active={chip == null} onClick={() => setChip(null)} count={rows.length}>
                      {t("activityFilterAll")}
                    </FilterChip>
                    {chips.map(([key, count]) => (
                      <FilterChip key={key} active={chip === key} onClick={() => setChip(chip === key ? null : key)} count={count}>
                        {chipLabel(kind, key, t)}
                      </FilterChip>
                    ))}
                  </div>
                )}
              </div>
            )}

            {list.isPending ? (
              <ListSkeleton />
            ) : list.isError ? (
              <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} retryLabel={t("retry")} />
            ) : !rows.length ? (
              <EmptyState icon={<row.icon />} title={t("activityListEmpty")} hint={t("activityListEmptyHint")} />
            ) : !shown.length ? (
              <EmptyState
                icon={<Search />}
                title={t("activityNoMatch")}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setChip(null);
                    }}
                  >
                    {t("activityClearSearch")}
                  </Button>
                }
              />
            ) : (
              <>
                {filtering && (
                  <p className="text-xs text-slate-500">
                    {t("activityShowing", { shown: formatNumber(shown.length, lang), total: formatNumber(rows.length, lang) })}
                  </p>
                )}
                {groups.map((group) => (
                  <section key={group.day} aria-label={formatDayLabel(group.rows[0].at, lang)}>
                    <h2 className="mb-1.5 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <span>{formatDayLabel(group.rows[0].at, lang)}</span>
                      <span className="font-medium normal-case tracking-normal text-slate-400">
                        {formatNumber(group.rows.length, lang)}
                      </span>
                    </h2>
                    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm">
                      {group.rows.map((item) => (
                        <li key={`${item.type}-${item.id}`}>
                          <ActivityRowLink item={item} money={Boolean(row.money)} skillLabel={skillLabel} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
                {rows.length >= 300 && <p className="text-center text-xs text-slate-500">{t("activityListCapped")}</p>}
              </>
            )}
          </>
        )}
      </PageContainer>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  const { lang } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40",
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-slate-200 bg-surface text-slate-700 hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      {children}
      <span className={cn("tabular-nums", active ? "text-white/80" : "text-slate-400")}>{formatNumber(count, lang)}</span>
    </button>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-surface">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3.5 py-3">
          <div className="skeleton h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-1/2" />
            <div className="skeleton h-3 w-1/3" />
          </div>
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Two faces, overlapped: who did it, and who it was with. */
function AvatarPair({ from, to, online }: { from: ActivityPerson | null; to?: ActivityPerson | null; online?: boolean }) {
  if (!to) return <Avatar name={from?.name ?? "?"} src={from?.photo} size={44} online={online} />;
  return (
    <span className="relative h-11 w-11 shrink-0">
      <Avatar name={from?.name ?? "?"} src={from?.photo} size={34} className="absolute left-0 top-0" />
      <Avatar
        name={to.name}
        src={to.photo}
        size={22}
        className="absolute bottom-0 right-0 rounded-full ring-2 ring-surface"
      />
    </span>
  );
}

function ActivityRowLink({
  item,
  money,
  skillLabel,
}: {
  item: ActivityRow;
  money: boolean;
  skillLabel: (id: string | null | undefined) => string;
}) {
  const { t, lang } = useI18n();
  const status = statusOf(item.type, item.status);
  const onlineNow = item.type === "person" && !item.times && Date.now() - new Date(item.at).getTime() < 5 * 60_000;

  let detail: React.ReactNode;
  if (item.type === "person") {
    detail = item.times ? (
      t("activityRepeatLine", { count: formatNumber(item.times, lang), amount: formatMoney(item.amount ?? 0, lang) })
    ) : onlineNow ? (
      <span className="font-medium text-green-700">{t("activityOnlineNow")}</span>
    ) : (
      t("activityLastSeen", { time: relativeTime(item.at, lang) })
    );
  } else if (item.type === "review") {
    detail = (
      <span className="flex min-w-0 items-center gap-1.5">
        <RatingStars value={item.rating ?? 0} showValue={false} size={12} className="shrink-0" />
        {item.comment && <span className="truncate italic">“{item.comment}”</span>}
      </span>
    );
  } else {
    const Icon = TYPE_STYLE[item.type].icon;
    const what = item.title || skillLabel(item.skill_id) || (item.type === "call" ? null : t(TYPE_STYLE[item.type].label));
    detail = what && (
      <span className="flex min-w-0 items-center gap-1">
        <Icon className="h-3 w-3 shrink-0" aria-hidden />
        <span className="truncate">{what}</span>
      </span>
    );
  }

  const when = item.type === "person" ? null : formatClockTime(item.at, lang);
  const amount =
    money && item.amount != null ? (
      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{formatMoney(item.amount, lang)}</span>
    ) : null;

  // Names get the whole first line (only the money list puts its amount
  // there); what, when and the status share the second.
  const body = (
    <>
      <AvatarPair from={item.from} to={item.to} online={onlineNow} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="flex min-w-0 flex-1 items-center gap-1 text-sm text-slate-800">
            <span className="truncate font-semibold">{item.from?.name ?? "?"}</span>
            {item.to && (
              <>
                <ArrowRight className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                <span className="truncate font-semibold">{item.to.name}</span>
              </>
            )}
          </p>
          {amount}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-slate-500">
            {detail && <div className="min-w-0 truncate">{detail}</div>}
            {when && (
              <span className="shrink-0 tabular-nums text-slate-400">
                {detail ? "· " : ""}
                {when}
              </span>
            )}
          </div>
          {status && <Badge tone={status.tone}>{t(status.label)}</Badge>}
        </div>
      </div>
      <ChevronRight
        className="hidden h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 sm:block"
        aria-hidden
      />
    </>
  );
  const box =
    "group flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none";

  return item.type === "person" ? (
    <Link to="/worker/$workerId" params={{ workerId: item.id }} className={box}>
      {body}
    </Link>
  ) : (
    <Link to="/staff/activity/$type/$itemId" params={{ type: item.type, itemId: item.id }} className={box}>
      {body}
    </Link>
  );
}

/* ================================================================== */
/* /staff/activity/$type/$itemId - one record, in full                 */
/* ================================================================== */

export function ActivityItemScreen() {
  const { t } = useI18n();
  const { profile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { type, itemId } = useParams({ strict: false }) as { type: ActivityItemType; itemId: string };
  const isStaff = Boolean(profile?.staff_role);
  const known = type in TYPE_STYLE;
  const skillLabel = useSkillNames();
  const [removing, setRemoving] = useState(false);

  const item = useQuery({
    queryKey: ["activity-item", type, itemId],
    queryFn: () => getActivityItem(type, itemId),
    enabled: isStaff && known,
  });

  const remove = useMutation({
    mutationFn: () => removeCallDeal(itemId),
    onSuccess: () => {
      toast(t("activityRemoved"));
      setRemoving(false);
      void queryClient.invalidateQueries({ queryKey: ["activity-item"] });
      void queryClient.invalidateQueries({ queryKey: ["activity-list"] });
      void queryClient.invalidateQueries({ queryKey: ["activity-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["call-deals"] });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const title = known ? t(TYPE_STYLE[type].label) : t("activityTitle");
  if (!profile) return <SignInRequiredScreen title={title} />;

  const data = item.data;

  return (
    <>
      <AppHeader title={title} subtitle={t("activityTitle")} back={<BackButton />} />
      <PageContainer>
        {!isStaff || !known ? (
          <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title={t("activitySubtitle")} />
        ) : item.isPending ? (
          <ItemSkeleton />
        ) : item.isError ? (
          <ErrorState message={errorMessage(item.error)} onRetry={() => item.refetch()} retryLabel={t("retry")} />
        ) : !data ? (
          <EmptyState icon={<FileText className="h-8 w-8" />} title={t("activityItemGone")} />
        ) : (
          <div className="space-y-3 md:space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-4 lg:space-y-0">
            <div className="space-y-3 md:space-y-4">
              <ItemHero item={data} skillLabel={skillLabel} />
              <PeopleCard item={data} />
              {(data.type === "review" || (data.type === "deal" && (data.rating || data.comment))) && (
                <ReviewQuote rating={data.rating ?? null} comment={data.comment ?? null} />
              )}
              {data.type === "request" && <RequestNotes item={data} />}
              {data.type === "request" && <RequestReviews item={data} />}
            </div>

            <div className="space-y-3 md:space-y-4">
              <TimelineCard item={data} />
              <LinkedRecords item={data} />
              {data.type === "deal" && data.status !== "removed" && (
                <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-red-700">
                    <ShieldAlert className="h-4 w-4" aria-hidden />
                    {t("staffActions")}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-red-700/80">{t("activityRemoveBody")}</p>
                  <Button variant="danger" size="sm" className="mt-3" onClick={() => setRemoving(true)}>
                    {t("activityRemoveDeal")}
                  </Button>
                </section>
              )}
              <RecordId id={data.id} />
            </div>
          </div>
        )}
      </PageContainer>

      <Dialog
        open={removing}
        onClose={() => setRemoving(false)}
        title={t("activityRemoveTitle")}
        footer={
          <>
            <Button variant="outline" onClick={() => setRemoving(false)}>
              {t("cancel")}
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              {t("activityRemoveDeal")}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-700">{t("activityRemoveBody")}</p>
      </Dialog>
    </>
  );
}

function ItemSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-surface p-5">
        <div className="flex gap-3">
          <div className="skeleton h-12 w-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-5 w-2/3" />
            <div className="skeleton h-3 w-1/3" />
          </div>
        </div>
      </div>
      <div className="skeleton h-24 w-full rounded-2xl" />
      <div className="skeleton h-40 w-full rounded-2xl" />
    </div>
  );
}

/** The headline: what this is, in one line, with its status and the key numbers. */
function ItemHero({ item, skillLabel }: { item: ActivityItem; skillLabel: (id: string | null | undefined) => string }) {
  const { t, lang } = useI18n();
  const status = statusOf(item.type, item.type === "call" ? item.outcome : item.status);
  const from = item.from?.name ?? "?";
  const to = item.to?.name ?? "?";

  const headline =
    item.type === "call"
      ? t("evCalled", { from, to })
      : item.type === "request"
        ? item.title
        : item.type === "deal"
          ? t("activityDealLine", { hirer: from, worker: to })
          : t("reviewHeadline", { from, to });

  const facts: { icon: LucideIcon; text: string }[] = [];
  if (item.amount != null) facts.push({ icon: Wallet, text: formatMoney(item.amount, lang) });
  if (item.skill_id) facts.push({ icon: Wrench, text: skillLabel(item.skill_id) });
  if (item.work_date) facts.push({ icon: CalendarDays, text: formatDate(item.work_date, lang) });
  if (item.deal_date) facts.push({ icon: CalendarDays, text: formatDate(item.deal_date, lang) });
  if (item.location_text) facts.push({ icon: MapPin, text: item.location_text });

  return (
    <section className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3.5">
        <TypeIcon type={item.type} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(TYPE_STYLE[item.type].label)}
            </span>
            {status && <Badge tone={status.tone}>{t(status.label)}</Badge>}
          </div>
          <h2 className="mt-1 break-words text-lg font-bold leading-snug text-slate-900 sm:text-xl">{headline}</h2>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3 w-3 shrink-0" aria-hidden />
            {moment(item.created_at, lang)} · {relativeTime(item.created_at, lang)}
          </p>
        </div>
      </div>
      {facts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {facts.map(({ icon: Icon, text }) => (
            <span
              key={text}
              className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
              <span className="truncate">{text}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

const PEOPLE_LABELS: Record<ActivityItemType, [StringKey, StringKey]> = {
  call: ["detailCaller", "detailCallee"],
  request: ["detailHirer", "detailWorker"],
  deal: ["detailHirer", "detailWorker"],
  review: ["detailReviewer", "detailReviewee"],
};

/** Who, as two cards joined by an arrow - sideways on wide screens, down on phones. */
function PeopleCard({ item }: { item: ActivityItem }) {
  const { t } = useI18n();
  const [fromLabel, toLabel] = PEOPLE_LABELS[item.type];
  return (
    <section className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:gap-2">
      <PersonCard label={t(fromLabel)} person={item.from} />
      <span className="flex justify-center text-slate-300" aria-hidden>
        <ArrowDown className="h-4 w-4 sm:hidden" />
        <ArrowRight className="hidden h-4 w-4 sm:block" />
      </span>
      <PersonCard label={t(toLabel)} person={item.to} />
    </section>
  );
}

function PersonCard({ label, person }: { label: string; person: ActivityPerson | null }) {
  const { t } = useI18n();
  const inner = (
    <>
      <Avatar name={person?.name ?? "?"} src={person?.photo} size={44} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{person?.name ?? "—"}</p>
        {person?.member_no && (
          <p className="truncate text-[11px] tabular-nums text-slate-500">{t("detailMemberNo", { id: person.member_no })}</p>
        )}
      </div>
      {person && (
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" aria-hidden />
      )}
    </>
  );
  const box = "flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-surface p-3 shadow-sm";
  return person ? (
    <Link
      to="/worker/$workerId"
      params={{ workerId: person.id }}
      aria-label={`${label}: ${person.name}`}
      className={cn(box, "group transition-all hover:border-brand-300 hover:shadow-md")}
    >
      {inner}
    </Link>
  ) : (
    <div className={box}>{inner}</div>
  );
}

function ReviewQuote({ rating, comment }: { rating: number | null; comment: string | null }) {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden rounded-2xl border border-violet-100 bg-violet-100/40 p-4 sm:p-5">
      <Quote className="absolute right-3 top-3 h-10 w-10 text-violet-600/15" aria-hidden />
      {rating ? <RatingStars value={rating} showValue={false} size={18} /> : null}
      <p className={cn("text-sm leading-relaxed text-slate-800", rating && "mt-2", !comment && "italic text-slate-500")}>
        {comment ? `“${comment}”` : t("detailNoComment")}
      </p>
    </section>
  );
}

/** A work request's own words - everything else is in the headline and the timeline. */
function RequestNotes({ item }: { item: ActivityItem }) {
  const { t } = useI18n();
  const rows: [LucideIcon, StringKey, string | null | undefined][] = [
    [FileText, "detailDetails", item.details],
    [StickyNote, "detailPaymentNote", item.payment_note],
  ];
  const shown = rows.filter(([, , v]) => v);
  if (!shown.length) return null;
  return (
    <SectionCard compact icon={StickyNote} title={t("detailNotes")}>
      <dl className="space-y-3">
        {shown.map(([Icon, label, value]) => (
          <div key={label} className="flex gap-2.5">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t(label)}</dt>
              <dd className="mt-0.5 whitespace-pre-line break-words text-sm text-slate-800">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

function RequestReviews({ item }: { item: ActivityItem }) {
  const { t, lang } = useI18n();
  return (
    <SectionCard compact icon={Star} title={t("detailReviews")} badge={item.reviews?.length || undefined}>
      {!item.reviews?.length ? (
        <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">{t("detailNoReviews")}</p>
      ) : (
        <ul className="space-y-2">
          {item.reviews.map((r) => (
            <li key={r.id}>
              <Link
                to="/staff/activity/$type/$itemId"
                params={{ type: "review", itemId: r.id }}
                className="group flex items-start gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-brand-300 hover:bg-slate-50"
              >
                <Avatar name={r.from?.name ?? "?"} src={r.from?.photo} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800">{r.from?.name}</p>
                    <span className="shrink-0 text-[11px] text-slate-400">{relativeTime(r.at, lang)}</span>
                  </div>
                  <RatingStars value={r.rating} showValue={false} size={12} />
                  {r.comment && <p className="mt-1 text-xs leading-relaxed text-slate-600">“{r.comment}”</p>}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 self-center text-slate-300" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

type TimelineEvent = { text: string; at: string | null; tone: "done" | "good" | "bad" | "waiting" };

/** What happened, in order - the record's story rather than a list of fields. */
function timelineOf(item: ActivityItem, t: T): TimelineEvent[] {
  const from = item.from?.name ?? "?";
  const to = item.to?.name ?? "?";
  const ev: TimelineEvent[] = [];

  if (item.type === "call") {
    ev.push({ text: t("evCalled", { from, to }), at: item.created_at, tone: "done" });
    if (item.outcome && item.outcome !== "short") {
      const answer = t((CALL_OUTCOME[item.outcome] ?? CALL_NONE).label);
      ev.push({
        text: t("evCallerAnswered", { name: from, answer }),
        at: item.answered_at ?? null,
        tone: item.outcome === "deal" ? "good" : "done",
      });
    } else if (!item.outcome) {
      ev.push({ text: t("callOutcomeNone"), at: null, tone: "waiting" });
    }
    if (item.ask_again_at) ev.push({ text: t("evAskAgain"), at: item.ask_again_at, tone: "waiting" });
  } else if (item.type === "request") {
    ev.push({ text: t("evRequested", { name: from }), at: item.created_at, tone: "done" });
    if (item.status === "pending") ev.push({ text: t("evWaitingWorker", { name: to }), at: null, tone: "waiting" });
    if (item.status === "accepted" || item.status === "confirmed" || item.status === "completed")
      ev.push({ text: t("evAccepted", { name: to }), at: null, tone: "done" });
    if (item.status === "confirmed" || item.status === "completed")
      ev.push({ text: t("stepConfirmed"), at: null, tone: "done" });
    if (item.status === "completed") ev.push({ text: t("stepDone"), at: item.completed_at ?? null, tone: "good" });
    if (item.status === "declined") ev.push({ text: t("evDeclined", { name: to }), at: item.updated_at ?? null, tone: "bad" });
    if (item.status === "cancelled")
      ev.push({ text: t("evCancelled", { name: item.cancelled_by?.name ?? "?" }), at: item.updated_at ?? null, tone: "bad" });
    for (const r of item.reviews ?? []) ev.push({ text: t("evReviewWritten", { name: r.from?.name ?? "?" }), at: r.at, tone: "done" });
  } else if (item.type === "deal") {
    ev.push({ text: t("evDealReported", { name: from }), at: item.created_at, tone: "done" });
    if (item.worker_answered_at && item.status === "disputed")
      ev.push({ text: t("evWorkerDisputed", { name: to }), at: item.worker_answered_at, tone: "bad" });
    else if (item.worker_answered_at)
      ev.push({ text: t("evWorkerConfirmed", { name: to }), at: item.worker_answered_at, tone: "good" });
    else if (item.status === "reported") ev.push({ text: t("evAutoCount"), at: item.confirm_by ?? null, tone: "waiting" });
    else if (item.status === "confirmed") ev.push({ text: t("evAutoCounted"), at: item.confirm_by ?? null, tone: "good" });
    if (item.status === "removed")
      ev.push({ text: t("evRemoved", { name: item.removed_by?.name ?? "?" }), at: item.updated_at ?? null, tone: "bad" });
  } else {
    ev.push({ text: t("evReviewWritten", { name: from }), at: item.created_at, tone: "good" });
  }
  return ev;
}

const DOT: Record<TimelineEvent["tone"], string> = {
  done: "bg-slate-400",
  good: "bg-green-500",
  bad: "bg-red-500",
  waiting: "border-2 border-amber-400 bg-surface",
};

function TimelineCard({ item }: { item: ActivityItem }) {
  const { t, lang } = useI18n();
  const events = timelineOf(item, t);
  return (
    <SectionCard compact icon={Clock} title={t("timelineTitle")}>
      <ol>
        {events.map((e, i) => {
          const last = i === events.length - 1;
          return (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", DOT[e.tone])} aria-hidden />
                {!last && <span className="mt-1 w-px flex-1 bg-slate-200" aria-hidden />}
              </div>
              <div className={cn("min-w-0 flex-1", !last && "pb-3.5")}>
                <p className={cn("text-sm leading-snug", e.tone === "waiting" ? "text-slate-500" : "text-slate-800")}>
                  {e.text}
                </p>
                {e.at && <p className="mt-0.5 text-[11px] tabular-nums text-slate-400">{moment(e.at, lang)}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}

/** Links to the records this one came from or led to. */
function LinkedRecords({ item }: { item: ActivityItem }) {
  const { t } = useI18n();
  const links: { type: ActivityItemType; id: string }[] = [];
  if (item.type === "call" && item.deal_id) links.push({ type: "deal", id: item.deal_id });
  if (item.type === "deal") {
    if (item.call_id) links.push({ type: "call", id: item.call_id });
    if (item.review_id) links.push({ type: "review", id: item.review_id });
  }
  if (item.type === "review") {
    if (item.request_id) links.push({ type: "request", id: item.request_id });
    if (item.deal_id) links.push({ type: "deal", id: item.deal_id });
  }
  if (!links.length) return null;
  return (
    <SectionCard compact icon={Link2} title={t("detailLinked")}>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.type}>
            <Link
              to="/staff/activity/$type/$itemId"
              params={{ type: l.type, itemId: l.id }}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 transition-colors hover:border-brand-300 hover:bg-slate-50"
            >
              <TypeIcon type={l.type} size="sm" />
              <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{t(TYPE_STYLE[l.type].label)}</span>
              <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/** The record's id, to quote when staff talk about it. */
function RecordId({ id }: { id: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={async () => toast(t((await copyLink(id)) === "copied" ? "detailIdCopied" : "detailIdCopyFailed"))}
      className="group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      title={t("detailCopyId")}
      aria-label={t("detailCopyId")}
    >
      <Hash className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-mono">{id}</span>
      <Copy className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" aria-hidden />
    </button>
  );
}
