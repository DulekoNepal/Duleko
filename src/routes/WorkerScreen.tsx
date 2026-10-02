import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Award,
  Briefcase,
  Cake,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flag,
  GraduationCap,
  Info,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Send,
  Share2,
  ShieldBan,
  ShieldCheck,
  ShieldOff,
  Star,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { RatingLine } from "@/components/duleko/WorkerList";
import {
  AvailabilityCard,
  DetailRow,
  ProfileCover,
  SectionCard,
  StatTile,
} from "@/components/duleko/ProfileParts";
import { ReviewsPanel } from "@/components/duleko/ReviewsPanel";
import { AvailabilityCalendar } from "@/components/duleko/AvailabilityCalendar";
import { RequestWorkDialog } from "@/components/duleko/RequestWorkDialog";
import { ReportDialog } from "@/components/duleko/ReportDialog";
import { SuspendUserDialog } from "@/components/duleko/SuspendUserDialog";
import { VerifiedBadge } from "@/components/duleko/VerifiedBadge";
import { MenuItem, MenuPanel } from "@/components/ui/menu";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, FullPageLoader } from "@/components/ui/states";
import { shareProfile } from "@/lib/share";
import { SkillTile } from "@/components/duleko/SkillIcon";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useGuestMode } from "@/hooks/use-guest-mode";
import { usePresence } from "@/hooks/use-presence";
import { useToast } from "@/hooks/use-toast";
import {
  getAvailability,
  getContact,
  getFriendshipWith,
  getProfile,
  getUserSkills,
  isProfileSuspended,
  listCertificates,
  REVIEWS_PAGE,
  listReviewsFor,
  removeFriendship,
  respondFriendRequest,
  sendFriendRequest,
  suspendProfile,
  unsuspendProfile,
  unverifyProfile,
  verifyProfile,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import {
  addDays,
  cn,
  formatDate,
  formatMoney,
  formatNumber,
  locationLine,
  skillName,
  toDateKey,
  todayKey,
} from "@/lib/utils";

/** The tabs under the header - the same row your own Profile has. */
type WorkerTab = "overview" | "calendar" | "reviews";

export function WorkerScreen() {
  const { t, lang } = useI18n();
  const { profile: me } = useSession();
  const { requestSignIn } = useGuestMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // The URL carries a handle - an opaque public_slug on a shared link, or
  // the row id on older links and internal navigation. Everything below
  // keys off the resolved profile id, never off the URL.
  const { workerId: handle } = useParams({ from: "/worker/$workerId" });
  const [requestOpen, setRequestOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [moderationMenuOpen, setModerationMenuOpen] = useState(false);
  const [tab, setTab] = useState<WorkerTab>("overview");

  // The staff ⋯ menu closes on a tap anywhere else, or Escape - same
  // behaviour as the ⋯ menu on your own Profile screen.
  useEffect(() => {
    if (!moderationMenuOpen) return;
    function onPointerDownAnywhere(e: PointerEvent) {
      if ((e.target as HTMLElement | null)?.closest("[data-moderation-menu]")) return;
      setModerationMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setModerationMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDownAnywhere, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownAnywhere, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moderationMenuOpen]);

  /** Every action below needs an account - a guest gets the sign-in prompt instead. */
  function withAuth(action: () => void) {
    if (!me) {
      requestSignIn();
      return;
    }
    action();
  }

  const worker = useQuery({ queryKey: ["profile", handle], queryFn: () => getProfile(handle) });
  const workerId = worker.data?.id ?? "";
  const ready = Boolean(workerId);

  const online = usePresence([workerId])[workerId];

  const skills = useQuery({
    queryKey: ["user-skills", workerId],
    queryFn: () => getUserSkills(workerId),
    enabled: ready,
  });
  const reviews = useInfiniteQuery({
    queryKey: ["reviews", workerId],
    queryFn: ({ pageParam }) => listReviewsFor(workerId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length < REVIEWS_PAGE ? undefined : all.length),
    enabled: ready,
  });

  const contact = useQuery({
    queryKey: ["contact", workerId],
    queryFn: () => getContact(workerId),
    enabled: ready,
    staleTime: 5 * 60_000,
  });

  const certificates = useQuery({
    queryKey: ["certificates", workerId],
    queryFn: () => listCertificates(workerId),
    enabled: ready,
  });

  // A full year ahead, the same span your own Profile's calendar covers -
  // so viewing yourself here shares that cached copy.
  const availability = useQuery({
    queryKey: ["availability", workerId],
    queryFn: () => getAvailability(workerId, todayKey(), toDateKey(addDays(new Date(), 365))),
    enabled: ready,
  });

  // Chat is open to anyone signed in. Calling needs the other person to
  // have actually saved a number - getContact comes back null when they
  // have not (or when you are browsing as a guest).
  const canCall = Boolean(contact.data);

  const friendship = useQuery({
    queryKey: ["friendship", me?.id, workerId],
    queryFn: () => getFriendshipWith(me!.id, workerId),
    enabled: Boolean(me?.id) && ready,
  });

  function invalidateFriendship() {
    queryClient.invalidateQueries({ queryKey: ["friendship"] });
    queryClient.invalidateQueries({ queryKey: ["friends"] });
    queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    queryClient.invalidateQueries({ queryKey: ["unread"] });
  }

  // ---- Staff-only: verify/unverify, suspend/unsuspend -------------------
  const isStaffViewer = Boolean(me?.staff_role);
  const canSuspend = me?.staff_role === "admin" || me?.staff_role === "technical_admin";

  const suspension = useQuery({
    queryKey: ["suspended", workerId],
    queryFn: () => isProfileSuspended(workerId),
    enabled: ready && canSuspend,
  });

  function invalidateWorker() {
    queryClient.invalidateQueries({ queryKey: ["profile", handle] });
    queryClient.invalidateQueries({ queryKey: ["suspended", workerId] });
  }

  const verify = useMutation({
    mutationFn: () => verifyProfile(workerId, me!.id),
    onSuccess: () => {
      toast(t("verifiedSuccess"));
      invalidateWorker();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const unverify = useMutation({
    mutationFn: () => unverifyProfile(workerId),
    onSuccess: () => {
      toast(t("unverifiedSuccess"));
      invalidateWorker();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const suspend = useMutation({
    mutationFn: (reason: string | null) => suspendProfile(workerId, reason),
    onSuccess: () => {
      setSuspendOpen(false);
      toast(t("suspendedSuccess"));
      invalidateWorker();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const unsuspend = useMutation({
    mutationFn: () => unsuspendProfile(workerId),
    onSuccess: () => {
      toast(t("unsuspendedSuccess"));
      invalidateWorker();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const share = useMutation({
    mutationFn: () =>
      shareProfile(worker.data!.public_slug, worker.data!.full_name, t("shareProfileText", { name: worker.data!.full_name })),
    onSuccess: (result) => {
      if (result === "copied") toast(t("linkCopied"));
      else if (result === "failed") toast(t("copyFailed"), "error");
    },
  });

  const addFriend = useMutation({
    mutationFn: () => sendFriendRequest(me!.id, workerId),
    onSuccess: () => {
      toast(t("friendRequestSent"));
      invalidateFriendship();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const respond = useMutation({
    mutationFn: (accept: boolean) => respondFriendRequest(friendship.data!.id, accept),
    onSuccess: invalidateFriendship,
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const removeFriend = useMutation({
    mutationFn: () => removeFriendship(friendship.data!.id),
    onSuccess: invalidateFriendship,
    onError: (error) => toast(errorMessage(error), "error"),
  });

  // On a phone, the Request/Chat bar slides in once the hero's own buttons
  // have scrolled out of view, so the main action is never more than a tap away.
  const actionsRef = useRef<HTMLDivElement>(null);
  const tabRowRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const el = actionsRef.current;
      setShowStickyBar(Boolean(el) && el!.getBoundingClientRect().bottom < 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  if (worker.isLoading) return <FullPageLoader label={t("loading")} />;
  if (!worker.data) {
    return (
      <PageContainer>
        <EmptyState title={t("somethingWrong")} />
      </PageContainer>
    );
  }

  const w = worker.data;
  const isMe = me?.id === w.id;
  const place = locationLine(w, lang);
  const fs = friendship.data;
  const iAmRequester = fs?.requester_profile_id === me?.id;
  const incomingRequest = fs?.status === "pending" && !iAmRequester;
  const skillList = skills.data ?? [];
  const certList = certificates.data ?? [];
  const busyDaysCount = (availability.data ?? []).filter((d) => d.status === "booked").length;

  const tabs: { id: WorkerTab; label: string; badge?: number }[] = [
    { id: "overview", label: t("profileTabOverview") },
    { id: "calendar", label: t("profileTabCalendar"), badge: busyDaysCount },
    { id: "reviews", label: t("reviews"), badge: w.rating_count },
  ];

  // A stat tile can open another tab, which sits below the fold on a
  // phone - bring the tab row back into view with it.
  function selectTab(next: WorkerTab) {
    setTab(next);
    tabRowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // Staff moderation only ever targets an ordinary member - never your own
  // profile, and never another staff member's (verify/suspend a colleague
  // makes no sense; revoke their role first if that's ever really needed).
  const showModerationMenu = isStaffViewer && !isMe && !w.staff_role;

  // Chat, Call and the friend button share one small outline look - the same
  // size as the buttons on your own Profile.
  const tileClass =
    "inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-surface px-2.5 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 disabled:opacity-60 @xl:text-sm";

  const callButton = canCall ? (
    <a href={`tel:${contact.data!.phone}`} className={tileClass}>
      <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{t("callNow")}</span>
    </a>
  ) : (
    <button
      type="button"
      onClick={() => (me ? toast(t("callNotAllowed")) : requestSignIn())}
      className={cn(tileClass, "text-slate-400 hover:text-slate-500")}
    >
      <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{t("callNow")}</span>
    </button>
  );

  const chatButton = (
    <button
      type="button"
      onClick={() => withAuth(() => navigate({ to: "/chat/$otherId", params: { otherId: w.id } }))}
      className={tileClass}
    >
      <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{t("chat")}</span>
    </button>
  );

  // Friend state is the one button that changes: add, cancel your own
  // pending request, or show you're already friends (tap to remove).
  const friendButton = !fs ? (
    <button
      type="button"
      disabled={addFriend.isPending}
      onClick={() => withAuth(() => addFriend.mutate())}
      className={tileClass}
    >
      <UserPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{t("addFriend")}</span>
    </button>
  ) : fs.status === "pending" && iAmRequester ? (
    <button
      type="button"
      disabled={removeFriend.isPending}
      onClick={() => removeFriend.mutate()}
      className={tileClass}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{t("friendRequestPending")}</span>
    </button>
  ) : fs.status === "accepted" ? (
    <button
      type="button"
      disabled={removeFriend.isPending}
      onClick={() => {
        if (window.confirm(t("removeFriendConfirm"))) removeFriend.mutate();
      }}
      className={cn(tileClass, "border-brand-200 bg-brand-50 text-brand-800")}
    >
      <UserCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{t("alreadyFriends")}</span>
    </button>
  ) : null;

  return (
    <>
      <AppHeader
        title={w.full_name}
        subtitle={place || undefined}
        back={
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label={t("back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        }
        right={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => share.mutate()}
              aria-label={t("shareProfile")}
              className="rounded-lg p-2 text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700"
            >
              <Share2 className="h-5 w-5" aria-hidden />
            </button>

            {showModerationMenu && (
              <div className="relative" data-moderation-menu>
                <button
                  type="button"
                  onClick={() => setModerationMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={moderationMenuOpen}
                  aria-label={t("moderatorActions")}
                  className="rounded-lg p-2 text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700"
                >
                  <MoreHorizontal className="h-5 w-5" aria-hidden />
                </button>

                {moderationMenuOpen && (
                  <MenuPanel>
                    {w.is_verified ? (
                      <MenuItem
                        icon={ShieldOff}
                        label={t("unverifyProfile")}
                        onClick={() => {
                          setModerationMenuOpen(false);
                          unverify.mutate();
                        }}
                      />
                    ) : (
                      <MenuItem
                        icon={ShieldCheck}
                        label={t("verifyProfile")}
                        onClick={() => {
                          setModerationMenuOpen(false);
                          verify.mutate();
                        }}
                      />
                    )}

                    {canSuspend &&
                      (suspension.data ? (
                        <MenuItem
                          icon={ShieldBan}
                          label={t("unsuspendUser")}
                          onClick={() => {
                            setModerationMenuOpen(false);
                            unsuspend.mutate();
                          }}
                        />
                      ) : (
                        <MenuItem
                          icon={ShieldBan}
                          label={t("suspendUser")}
                          tone="danger"
                          onClick={() => {
                            setModerationMenuOpen(false);
                            setSuspendOpen(true);
                          }}
                        />
                      ))}
                  </MenuPanel>
                )}
              </div>
            )}
          </div>
        }
      />

      <PageContainer className={cn("space-y-3 md:space-y-4", !isMe && "pb-36 md:pb-10")}>
        {/* ==============================================================
            Identity, laid out like your own Profile: wide cover, round
            photo overlapping its bottom-left edge, name and actions beside
            it, then the tab row. Edge to edge on a phone, a card from sm
            up.
            ============================================================== */}
        <section className="@container animate-in-up -mx-4 -mt-3 border-b border-slate-200 bg-surface shadow-sm sm:mx-0 sm:mt-0 sm:rounded-3xl sm:border">
          <ProfileCover src={w.cover_url} className="h-32 overflow-hidden sm:rounded-t-3xl @md:h-40 @2xl:h-48 @4xl:h-56" />

          <div className="px-4 @2xl:px-6">
            <div className="flex flex-col gap-2.5 @4xl:flex-row @4xl:items-end @4xl:gap-5">
              {/* Photo: the only thing pulled up into the cover. */}
              <div className="relative z-10 -mt-14 h-24 w-24 shrink-0 self-start rounded-full bg-surface p-1 shadow-md @2xl:-mt-16 @2xl:h-32 @2xl:w-32">
                <Avatar name={w.full_name} src={w.avatar_url} size={128} className="h-full! w-full!" />
                {online && (
                  <span className="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full border-[3px] border-surface bg-green-500 @2xl:bottom-2.5 @2xl:right-2.5">
                    <span className="sr-only">{t("online")}</span>
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1 @4xl:pb-3">
                {/* h2, not h1 - AppHeader already carries this name as the page h1.
                    Wraps rather than truncates - a name is never cut short. */}
                <h2 className="flex min-w-0 items-center gap-2 text-xl font-bold leading-tight tracking-tight text-slate-900 @2xl:text-2xl">
                  <span className="min-w-0 break-words">{w.full_name}</span>
                  <VerifiedBadge staffRole={w.staff_role} verified={w.is_verified} size={18} />
                </h2>
                {w.bio && <p className="mt-0.5 text-sm leading-snug text-slate-600">{w.bio}</p>}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-slate-500">
                  <RatingLine rating={w.rating} count={w.rating_count} className="text-[13px]" />
                  {w.rating_count > 0 && (
                    <span aria-hidden className="text-slate-300">
                      ·
                    </span>
                  )}
                  <span className="font-medium text-slate-600">
                    {t("skillsCount", { count: formatNumber(skillList.length, lang) })}
                  </span>
                  {w.is_available && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800 ring-1 ring-brand-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />
                      {t("availableForWork")}
                    </span>
                  )}
                </div>
              </div>

              {/* ---- Actions: one row from @xl, Request on its own row above
                   the other three on a phone. ----------------------------- */}
              {!isMe && (
                <div
                  ref={actionsRef}
                  className="grid w-full gap-2 @xl:max-w-xl @xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] @4xl:w-auto @4xl:max-w-none @4xl:grid-cols-[repeat(4,auto)] @4xl:pb-3"
                >
                  <Button size="sm" className="w-full" onClick={() => withAuth(() => setRequestOpen(true))}>
                    <Send className="h-3.5 w-3.5" aria-hidden />
                    {t("requestWork")}
                  </Button>
                  <div className={cn("grid gap-2 @xl:contents", friendButton ? "grid-cols-3" : "grid-cols-2")}>
                    {chatButton}
                    {callButton}
                    {friendButton}
                  </div>
                </div>
              )}
            </div>

            {/* ---- Someone asked to be your friend ------------------ */}
            {!isMe && incomingRequest && (
              <div className="animate-in-up mt-3 flex flex-col gap-2.5 rounded-xl border border-brand-200 bg-brand-50/70 px-3 py-2.5 @md:flex-row @md:items-center">
                <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-semibold text-brand-900">
                  <UserPlus className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
                  {t("sentYouFriendRequest", { name: w.full_name.split(/\s+/)[0] })}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-8 flex-1 text-xs @md:flex-none"
                    loading={respond.isPending}
                    onClick={() => respond.mutate(true)}
                  >
                    {t("acceptRequest")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 flex-1 text-xs @md:flex-none"
                    loading={respond.isPending}
                    onClick={() => respond.mutate(false)}
                  >
                    {t("declineRequest")}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Tab row - scrolls sideways instead of wrapping on a narrow phone. */}
          <div
            ref={tabRowRef}
            role="tablist"
            aria-label={t("profileSectionsNav")}
            className="mt-3 flex scroll-mt-20 overflow-x-auto border-t border-slate-200 px-2 [scrollbar-width:none] @2xl:px-4 [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map(({ id, label, badge }) => {
              const selected = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`worker-tab-${id}`}
                  aria-selected={selected}
                  aria-controls={`worker-panel-${id}`}
                  onClick={() => setTab(id)}
                  className="group relative shrink-0 px-0.5 py-1"
                >
                  <span
                    className={cn(
                      "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors",
                      selected ? "text-brand-700" : "text-slate-600 group-hover:bg-slate-100 group-hover:text-slate-900",
                    )}
                  >
                    {label}
                    {badge ? (
                      <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-bold leading-5 text-slate-600">
                        {formatNumber(badge, lang)}
                      </span>
                    ) : null}
                  </span>
                  {selected && <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-t-full bg-brand-700" aria-hidden />}
                </button>
              );
            })}
          </div>
        </section>

        {/* ==============================================================
            The open tab, laid out like the same tab on your own Profile.
            ============================================================== */}
        <div className="@container">
          {tab === "overview" && (
            /* Where they stand today up top, then their intro beside their
               work once there's room; stacked on a phone in the order
               people read a profile. */
            <div
              id="worker-panel-overview"
              role="tabpanel"
              aria-labelledby="worker-tab-overview"
              className="animate-in-up space-y-3 md:space-y-4"
            >
              <div className="grid grid-cols-1 gap-3 md:gap-4 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <AvailabilityCard
                  on={w.is_available}
                  hint={w.is_available ? t("workerAvailableHint") : t("workerUnavailableHint")}
                />

                <div className="grid grid-cols-4 gap-2 @xl:gap-2.5">
                  <StatTile
                    icon={Star}
                    label={t("ratingLabel")}
                    value={w.rating_count > 0 ? formatNumber(Number(w.rating).toFixed(1), lang) : t("newShort")}
                  />
                  <StatTile
                    icon={MessageSquare}
                    label={t("reviews")}
                    value={formatNumber(w.rating_count, lang)}
                    onClick={() => selectTab("reviews")}
                  />
                  <StatTile icon={Briefcase} label={t("skills")} value={formatNumber(skillList.length, lang)} />
                  <StatTile
                    icon={CalendarDays}
                    label={t("busyDaysLabel")}
                    value={formatNumber(busyDaysCount, lang)}
                    onClick={() => selectTab("calendar")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:gap-4 @3xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @3xl:items-start">
                <div className="min-w-0 space-y-3 md:space-y-4">
                  <SectionCard compact icon={Info} title={t("about")}>
                    {w.about ? (
                      <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{w.about}</p>
                    ) : (
                      <p className="text-sm italic text-slate-400">{t("noAboutYetOther")}</p>
                    )}

                    <dl className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                      {place && <DetailRow icon={MapPin} label={t("basedIn")} value={place} />}
                      {canCall && contact.data?.alt_phone && (
                        <DetailRow icon={Phone} label={t("altPhone")} value={contact.data.alt_phone} />
                      )}
                      {w.education && (
                        <DetailRow icon={GraduationCap} label={t("highestEducation")} value={w.education} />
                      )}
                      {w.age != null && (
                        <DetailRow
                          icon={Cake}
                          label={t("age")}
                          value={t("yearsOld", { count: formatNumber(w.age, lang) })}
                        />
                      )}
                      <DetailRow
                        icon={CalendarDays}
                        label={t("memberSince")}
                        value={formatDate(w.created_at.slice(0, 10), lang)}
                      />
                    </dl>
                  </SectionCard>

                  {!isMe && (
                    <SectionCard compact icon={ShieldCheck} title={t("stayingSafeTitle")}>
                      <ul className="space-y-2 text-xs leading-relaxed text-slate-600">
                        {(["stayingSafeTip1", "stayingSafeTip2", "stayingSafeTip3"] as const).map((key) => (
                          <li key={key} className="flex gap-2">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden />
                            <span>{t(key)}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => withAuth(() => setReportOpen(true))}
                        className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Flag className="h-3.5 w-3.5" aria-hidden />
                        {t("reportProfile")}
                      </button>
                    </SectionCard>
                  )}
                </div>

                <div className="@container min-w-0 space-y-3 md:space-y-4">
                  <SectionCard
                    compact
                    icon={Briefcase}
                    title={t("skillsAndRates")}
                    badge={skillList.length > 0 ? skillList.length : undefined}
                  >
                    {/* These can only be fetched once the handle in the URL has
                        resolved to a profile, so there is a real gap before they
                        arrive - show placeholders rather than claiming there is
                        nothing here. */}
                    {skills.isPending ? (
                      <div className="grid grid-cols-1 gap-2 @lg:grid-cols-2">
                        {[0, 1].map((i) => (
                          <div key={i} className="skeleton h-14 rounded-xl" />
                        ))}
                      </div>
                    ) : skillList.length === 0 ? (
                      <p className="text-sm italic text-slate-400">{t("noSkillsYetProfile")}</p>
                    ) : (
                      <ul className="grid grid-cols-1 gap-2 @lg:grid-cols-2">
                        {skillList.map((s) => {
                          const label = s.id === "other" && s.custom_label ? s.custom_label : skillName(s, lang);
                          return (
                            <li
                              key={s.id}
                              className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
                            >
                              <SkillTile skillId={s.id} className="h-9 w-9 rounded-lg bg-surface ring-1 ring-slate-200" />
                              {/* The rate gets its own line so it never has to be cut short. */}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
                                {s.rate_amount != null ? (
                                  <p className="text-xs font-semibold text-brand-700">
                                    {formatMoney(s.rate_amount, lang)}
                                    {s.rate_unit && <span className="font-medium text-slate-500"> / {s.rate_unit}</span>}
                                  </p>
                                ) : (
                                  <p className="text-xs text-slate-400">{t("rateNotSet")}</p>
                                )}
                                {s.custom_note && (
                                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{s.custom_note}</p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </SectionCard>

                  {certList.length > 0 && (
                    <SectionCard compact icon={Award} title={t("certificates")} badge={certList.length}>
                      <ul className="grid grid-cols-1 gap-2 @lg:grid-cols-2">
                        {certList.map((c) => (
                          <li key={c.id}>
                            <a
                              href={c.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="group flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-surface p-2.5 transition-colors hover:border-brand-200"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                <Award className="h-4 w-4" aria-hidden />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-brand-700">
                                  {c.title}
                                </span>
                                <span className="block text-xs text-slate-500">
                                  {formatDate(c.created_at.slice(0, 10), lang)}
                                </span>
                              </span>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-brand-600" aria-hidden />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </SectionCard>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "calendar" && (
            <div
              id="worker-panel-calendar"
              role="tabpanel"
              aria-labelledby="worker-tab-calendar"
              className="animate-in-up grid grid-cols-1 gap-3 md:gap-4 @3xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @3xl:items-start"
            >
              {/* What the calendar means, beside it once there's room. */}
              <SectionCard compact icon={CalendarDays} title={t("workerCalendarTitle")}>
                <p className="text-sm font-medium text-slate-900">
                  {busyDaysCount > 0
                    ? t("daysMarkedBusy", { count: formatNumber(busyDaysCount, lang) })
                    : t("workerNoBusyDays")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{t("workerCalendarHint")}</p>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full ring-1 ring-slate-300" aria-hidden />
                    {t("freeDay")}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full bg-slate-800" aria-hidden />
                    {t("bookedDay")}
                  </li>
                </ul>
                {!isMe && (
                  <Button size="sm" className="mt-4 w-full" onClick={() => withAuth(() => setRequestOpen(true))}>
                    <Send className="h-3.5 w-3.5" aria-hidden />
                    {t("requestWork")}
                  </Button>
                )}
              </SectionCard>

              <section className="rounded-2xl border border-slate-200 bg-surface p-3 shadow-sm sm:p-4">
                <AvailabilityCalendar days={availability.data ?? []} monthView />
              </section>
            </div>
          )}

          {tab === "reviews" && (
            <div
              id="worker-panel-reviews"
              role="tabpanel"
              aria-labelledby="worker-tab-reviews"
              className="animate-in-up"
            >
              <ReviewsPanel
                reviews={reviews.data?.pages.flat() ?? []}
                isPending={reviews.isPending}
                hasMore={reviews.hasNextPage}
                loadingMore={reviews.isFetchingNextPage}
                onLoadMore={() => reviews.fetchNextPage()}
                rating={Number(w.rating)}
                ratingCount={w.rating_count}
              />
            </div>
          )}
        </div>
      </PageContainer>

      {/* ---- Phones: the main action follows you once the hero's buttons
           have scrolled away - sits just above the tab bar. ------------ */}
      {!isMe && (
        <div
          className={cn(
            "fixed inset-x-0 bottom-[calc(3.5rem+var(--sab))] z-30 border-t border-slate-200 bg-surface/95 px-4 py-2 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)] backdrop-blur transition-all duration-300 md:hidden",
            showStickyBar ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
          )}
          aria-hidden={!showStickyBar}
        >
          <div className="mx-auto flex max-w-md items-center gap-2">
            <Avatar name={w.full_name} src={w.avatar_url} size={36} online={online} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{w.full_name}</p>
              <p className="truncate text-xs text-slate-500">
                {w.is_available ? t("availableForWork") : t("notAvailable")}
              </p>
            </div>
            <button
              type="button"
              tabIndex={showStickyBar ? 0 : -1}
              onClick={() => withAuth(() => navigate({ to: "/chat/$otherId", params: { otherId: w.id } }))}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-600"
              aria-label={t("chat")}
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
            </button>
            <Button size="sm" className="shrink-0" tabIndex={showStickyBar ? 0 : -1} onClick={() => withAuth(() => setRequestOpen(true))}>
              {t("requestWork")}
            </Button>
          </div>
        </div>
      )}

      {me && (
        <>
          <RequestWorkDialog
            open={requestOpen}
            onClose={() => setRequestOpen(false)}
            worker={{ id: w.id, full_name: w.full_name }}
            employerProfileId={me.id}
            defaultLocation={locationLine(me, lang)}
          />
          <ReportDialog
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            reporterProfileId={me.id}
            reportedProfileId={w.id}
          />
          {canSuspend && (
            <SuspendUserDialog
              open={suspendOpen}
              onClose={() => setSuspendOpen(false)}
              loading={suspend.isPending}
              onConfirm={(reason) => suspend.mutate(reason)}
            />
          )}
        </>
      )}
    </>
  );
}
