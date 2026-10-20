import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Award,
  Briefcase,
  Cake,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Flag,
  GraduationCap,
  IdCard,
  Info,
  Link2 as LinkIcon,
  Lock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Send,
  Share2,
  ShieldBan,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserPlus,
  Wallet,
} from "lucide-react";
import { PaymentCard } from "@/components/duleko/payments/PaymentCard";
import { paymentMethodsKey } from "@/components/duleko/payments/PaymentMethodsManager";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { SectionCard } from "@/components/duleko/ProfileParts";
import {
  AboutText,
  BusyDaysSummary,
  CertificateList,
  EmptyNote,
  FACT_LIST,
  Fact,
  HeroBody,
  HeroCard,
  HeroCover,
  HeroIdentity,
  HeroSummary,
  HeroTopRow,
  ProfileColumn,
  ProfileColumns,
  SectionSkeleton,
  SkillRateList,
  StatStrip,
  StatusStrip,
  StickyTabBar,
  useStickyTabs,
} from "@/components/duleko/profile/ProfileUI";
import { useDownloadCard } from "@/components/duleko/profile/use-download-card";
import { ReviewsPanel } from "@/components/duleko/ReviewsPanel";
import { AvailabilityCalendar } from "@/components/duleko/AvailabilityCalendar";
import { RequestWorkDialog } from "@/components/duleko/RequestWorkDialog";
import { ReportDialog } from "@/components/duleko/ReportDialog";
import { SuspendUserDialog } from "@/components/duleko/SuspendUserDialog";
import { StaffIdDialog } from "@/components/duleko/kyc/KycStaffParts";
import { trackCallTap } from "@/lib/call-tracking";
import { MenuDivider, MenuItem, MenuLabel, MenuPanel } from "@/components/ui/menu";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, FullPageLoader } from "@/components/ui/states";
import { copyLink, profileUrl, shareProfile } from "@/lib/share";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useGuestMode } from "@/hooks/use-guest-mode";
import { usePresence } from "@/hooks/use-presence";
import { useToast } from "@/hooks/use-toast";
import {
  getAvailability,
  getContact,
  listPaymentMethods,
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
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { addDays, cn, formatNumber, locationLine, toDateKey, todayKey } from "@/lib/utils";

/** The tabs under the header - the same bar your own Profile has. */
type WorkerTab = "overview" | "calendar" | "reviews";

/**
 * Someone's profile, as anyone else meets it - built from the same pieces
 * as your own Profile, so the two read as one design. The header carries
 * what you came to do (request work, chat, call, add them); the tabs carry
 * their profile, their busy days, and what others said.
 */
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
  const [viewingId, setViewingId] = useState(false);
  const [unfriendOpen, setUnfriendOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<WorkerTab>("overview");
  const [jumpToSkills, setJumpToSkills] = useState(false);
  const sticky = useStickyTabs(tab);

  // The ⋯ menu closes on a tap anywhere else, or Escape - same behaviour
  // as the ⋯ menu on your own Profile screen.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDownAnywhere(e: PointerEvent) {
      if ((e.target as HTMLElement | null)?.closest("[data-worker-menu]")) return;
      setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDownAnywhere, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownAnywhere, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  // The Skills number in the header: scroll to the section on Overview.
  useEffect(() => {
    if (!jumpToSkills || tab !== "overview") return;
    const frame = requestAnimationFrame(() => {
      document.getElementById("worker-skills")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setJumpToSkills(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [jumpToSkills, tab]);

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
  // Only fetched once the Reviews tab is open - the header already has the totals.
  const reviews = useInfiniteQuery({
    queryKey: ["reviews", workerId],
    queryFn: ({ pageParam }) => listReviewsFor(workerId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length < REVIEWS_PAGE ? undefined : all.length),
    enabled: ready && tab === "reviews",
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

  // Only what RLS lets this viewer see: a job with them, or their phone rule.
  const paymentMethods = useQuery({
    queryKey: paymentMethodsKey(workerId),
    queryFn: () => listPaymentMethods(workerId),
    enabled: ready && Boolean(me),
    staleTime: 60_000,
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

  const copy = useMutation({
    mutationFn: () => copyLink(profileUrl(worker.data!.public_slug)),
    onSuccess: (result) => (result === "copied" ? toast(t("linkCopied")) : toast(t("copyFailed"), "error")),
  });

  // Staff only: anyone's Professional ID card, drawn from this profile.
  const downloadCard = useDownloadCard();

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
    onSuccess: () => {
      setUnfriendOpen(false);
      invalidateFriendship();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  // On a phone, the Request/Chat bar slides in once the header's own buttons
  // have scrolled out of view, so the main action is never more than a tap away.
  const actionsRef = useRef<HTMLDivElement>(null);
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
  }, [worker.data]);

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
  const methods = paymentMethods.data ?? [];
  const busyDaysCount = (availability.data ?? []).filter((d) => d.status === "booked").length;
  const rated = w.rating_count > 0;

  // Staff moderation only ever targets an ordinary member - never your own
  // profile, and never another staff member's (verify/suspend a colleague
  // makes no sense; revoke their role first if that's ever really needed).
  const showModeration = isStaffViewer && !isMe && !w.staff_role;

  function selectTab(next: WorkerTab) {
    if (next === tab) return;
    sticky.willSwitch();
    setTab(next);
  }

  function menuAction(action: () => void) {
    return () => {
      setMenuOpen(false);
      action();
    };
  }

  const openChat = () => withAuth(() => navigate({ to: "/chat/$otherId", params: { otherId: w.id } }));
  const openRequest = () => withAuth(() => setRequestOpen(true));

  // Chat, Call and the friend button share one outline look. Under the
  // Request button on a phone they're small tiles, icon over label, so a
  // longer Nepali label still fits a third of the width; pills beside it
  // from @xl.
  const secondary = cn(
    "inline-flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl border border-slate-300 bg-surface px-1.5 py-1.5 text-xs font-semibold text-slate-700",
    "@xl:h-10 @xl:flex-row @xl:gap-1.5 @xl:rounded-full @xl:px-3 @xl:py-0 @xl:text-[13px]",
    "transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 disabled:opacity-60",
  );

  const callButton = canCall ? (
    // Each tap is counted, and coming back asks how the call went (6800).
    <a href={`tel:${contact.data!.phone}`} onClick={() => trackCallTap(w.id)} className={secondary}>
      <Phone className="h-4 w-4 shrink-0" aria-hidden />
      <span className="max-w-full truncate">{t("callNow")}</span>
    </a>
  ) : (
    <button
      type="button"
      onClick={() => (me ? toast(t("callNotAllowed")) : requestSignIn())}
      className={cn(secondary, "text-slate-400 hover:text-slate-500")}
    >
      <Lock className="h-4 w-4 shrink-0" aria-hidden />
      <span className="max-w-full truncate">{t("callNow")}</span>
    </button>
  );

  // Friend state is the one button that changes: add, cancel your own
  // pending request, or show you're already friends (tap to remove).
  const friendButton = !fs ? (
    <button type="button" disabled={addFriend.isPending} onClick={() => withAuth(() => addFriend.mutate())} className={secondary}>
      <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
      <span className="max-w-full truncate">{t("addFriend")}</span>
    </button>
  ) : fs.status === "pending" && iAmRequester ? (
    <button type="button" disabled={removeFriend.isPending} onClick={() => removeFriend.mutate()} className={secondary}>
      <Clock className="h-4 w-4 shrink-0" aria-hidden />
      <span className="max-w-full truncate">{t("friendRequestPending")}</span>
    </button>
  ) : fs.status === "accepted" ? (
    <button
      type="button"
      onClick={() => setUnfriendOpen(true)}
      className={cn(secondary, "border-brand-200 bg-brand-50 text-brand-800")}
    >
      <UserCheck className="h-4 w-4 shrink-0" aria-hidden />
      <span className="max-w-full truncate">{t("alreadyFriends")}</span>
    </button>
  ) : null;

  return (
    <>
      <AppHeader
        title={w.full_name}
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
      />

      <PageContainer className={cn("space-y-3 md:space-y-4", !isMe && "pb-36 md:pb-10")}>
        {/* ==============================================================
            Header - the same card as your own Profile's, with what you
            came here to do in place of the editing controls.
            ============================================================== */}
        <HeroCard lifted={menuOpen}>
          <HeroCover src={w.cover_url} />
          <HeroBody>
            <HeroTopRow
              name={w.full_name}
              src={w.avatar_url}
              badge={
                online && (
                  <span className="absolute bottom-1.5 right-1.5 h-4.5 w-4.5 rounded-full border-[3px] border-surface bg-green-500 @2xl:bottom-2.5 @2xl:right-2.5">
                    <span className="sr-only">{t("online")}</span>
                  </span>
                )
              }
              actions={
                <div className="relative mt-3 flex items-center gap-1.5 @sm:gap-2" data-worker-menu>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-9 rounded-full px-0 @md:w-auto @md:px-3.5"
                    onClick={() => share.mutate()}
                    aria-label={t("shareProfile")}
                  >
                    <Share2 className="h-4 w-4" aria-hidden />
                    <span className="hidden @md:inline">{t("shareShort")}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    loading={downloadCard.isPending}
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label={t("profileOptions")}
                    title={t("profileOptions")}
                  >
                    {!downloadCard.isPending && <MoreHorizontal className="h-4 w-4" aria-hidden />}
                  </Button>

                  {menuOpen && (
                    <MenuPanel className="w-64">
                      <MenuItem icon={LinkIcon} label={t("copyLink")} onClick={menuAction(() => copy.mutate())} />
                      {!isMe && (
                        <MenuItem
                          icon={Flag}
                          label={t("reportProfile")}
                          tone="danger"
                          onClick={menuAction(() => withAuth(() => setReportOpen(true)))}
                        />
                      )}
                      {isStaffViewer && (
                        <>
                          <MenuDivider />
                          <MenuLabel>{t("moderatorActions")}</MenuLabel>
                          {/* Every profile - members, staff, your own. */}
                          <MenuItem
                            icon={Download}
                            label={t("downloadCard")}
                            onClick={menuAction(() => downloadCard.mutate(w))}
                          />
                        </>
                      )}
                      {showModeration && (
                        <>
                          {w.is_verified ? (
                            <>
                              <MenuItem icon={IdCard} label={t("kycViewId")} onClick={menuAction(() => setViewingId(true))} />
                              <MenuItem icon={ShieldOff} label={t("unverifyProfile")} onClick={menuAction(() => unverify.mutate())} />
                            </>
                          ) : (
                            // The badge is only given by approving an ID check.
                            <MenuItem icon={IdCard} label={t("kycQueueTitle")} onClick={menuAction(() => navigate({ to: "/staff/verify" }))} />
                          )}
                          {canSuspend &&
                            (suspension.data ? (
                              <MenuItem icon={ShieldBan} label={t("unsuspendUser")} onClick={menuAction(() => unsuspend.mutate())} />
                            ) : (
                              <MenuItem
                                icon={ShieldBan}
                                label={t("suspendUser")}
                                tone="danger"
                                onClick={menuAction(() => setSuspendOpen(true))}
                              />
                            ))}
                        </>
                      )}
                    </MenuPanel>
                  )}
                </div>
              }
            />

            <HeroIdentity person={w} />

            <HeroSummary>
              <StatStrip
                items={[
                  {
                    label: t("ratingLabel"),
                    value: rated ? formatNumber(Number(w.rating).toFixed(1), lang) : t("newShort"),
                    star: rated,
                    onClick: () => selectTab("reviews"),
                  },
                  { label: t("reviews"), value: formatNumber(w.rating_count, lang), onClick: () => selectTab("reviews") },
                  {
                    label: t("skills"),
                    value: formatNumber(skillList.length, lang),
                    onClick: () => {
                      selectTab("overview");
                      setJumpToSkills(true);
                    },
                  },
                  { label: t("busyDaysLabel"), value: formatNumber(busyDaysCount, lang), onClick: () => selectTab("calendar") },
                ]}
              />
              <StatusStrip
                on={w.is_available}
                title={w.is_available ? t("profileAvailOnTitle") : t("profileAvailOffTitle")}
                hint={w.is_available ? t("workerAvailableHint") : t("workerUnavailableHint")}
              />
            </HeroSummary>

            {isMe ? (
              // Viewing yourself: no buttons to contact yourself, just the
              // way back to editing.
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-3.5 py-2.5">
                <Eye className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <p className="min-w-0 flex-1 text-[13px] text-slate-600">{t("workerPreviewNote")}</p>
                <Link
                  to="/profile"
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-brand-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-800"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  {t("editProfile")}
                </Link>
              </div>
            ) : (
              // Request work on its own row above the other three on a
              // phone; one row from @xl.
              <div
                ref={actionsRef}
                className={cn(
                  "mt-3 grid gap-2",
                  friendButton
                    ? "grid-cols-3 @xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]"
                    : "grid-cols-2 @xl:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]",
                )}
              >
                <Button className={cn("rounded-full", friendButton ? "col-span-3" : "col-span-2", "@xl:col-span-1")} onClick={openRequest}>
                  <Send className="h-4 w-4" aria-hidden />
                  {t("requestWork")}
                </Button>
                <button type="button" onClick={openChat} className={secondary}>
                  <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="max-w-full truncate">{t("chat")}</span>
                </button>
                {callButton}
                {friendButton}
              </div>
            )}

            {/* ---- Someone asked to be your friend ---------------------- */}
            {!isMe && incomingRequest && (
              <div className="animate-in-up mt-3 flex flex-col gap-2.5 rounded-2xl border border-brand-200 bg-brand-50/70 px-3.5 py-2.5 @md:flex-row @md:items-center">
                <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-semibold text-brand-900">
                  <UserPlus className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
                  {t("sentYouFriendRequest", { name: w.full_name.split(/\s+/)[0] })}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 flex-1 rounded-full text-xs @md:flex-none" loading={respond.isPending} onClick={() => respond.mutate(true)}>
                    {t("acceptRequest")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 flex-1 rounded-full text-xs @md:flex-none"
                    loading={respond.isPending}
                    onClick={() => respond.mutate(false)}
                  >
                    {t("declineRequest")}
                  </Button>
                </div>
              </div>
            )}
          </HeroBody>
        </HeroCard>

        <StickyTabBar
          tabs={[
            { id: "overview" as const, label: t("profileTabOverview") },
            { id: "calendar" as const, label: t("profileTabCalendar") },
            { id: "reviews" as const, label: t("reviews") },
          ]}
          active={tab}
          onSelect={selectTab}
          label={t("profileSectionsNav")}
          idPrefix="worker"
          sticky={sticky}
        />

        <div id="worker-panel" role="tabpanel" aria-labelledby={`worker-tab-${tab}`} key={tab} className="@container animate-in-up">
          {tab === "overview" && (
            <ProfileColumns>
              <ProfileColumn>
                <SectionCard compact icon={Info} title={t("about")} className="order-1 @3xl:order-none">
                  {w.about?.trim() ? <AboutText text={w.about.trim()} /> : <EmptyNote>{t("noAboutYetOther")}</EmptyNote>}
                </SectionCard>

                <div id="worker-skills" className="order-2 scroll-mt-36 @3xl:order-none">
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
                      <SectionSkeleton />
                    ) : skillList.length === 0 ? (
                      <EmptyNote>{t("noSkillsYetProfile")}</EmptyNote>
                    ) : (
                      <SkillRateList skills={skillList} />
                    )}
                  </SectionCard>
                </div>

                {methods.length > 0 && (
                  <SectionCard compact icon={Wallet} title={t("payTheirDetails")} badge={methods.length} className="order-5 @3xl:order-none">
                    {!isMe && <p className="mb-3 text-xs leading-relaxed text-slate-500">{t("payPayHint")}</p>}
                    <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
                      {methods.map((m) => (
                        <PaymentCard key={m.id} method={m} compact />
                      ))}
                    </div>
                  </SectionCard>
                )}
              </ProfileColumn>

              <ProfileColumn>
                <SectionCard compact icon={IdCard} title={t("profileDetails")} className="order-3 @3xl:order-none">
                  <dl className={FACT_LIST}>
                    {place && (
                      <Fact icon={MapPin} label={t("basedIn")}>
                        {place}
                      </Fact>
                    )}
                    {canCall && contact.data?.alt_phone && (
                      <Fact icon={Phone} label={t("altPhone")}>
                        <span className="tabular-nums">{contact.data.alt_phone}</span>
                      </Fact>
                    )}
                    {w.education && (
                      <Fact icon={GraduationCap} label={t("highestEducation")}>
                        {w.education}
                      </Fact>
                    )}
                    {w.age != null && (
                      <Fact icon={Cake} label={t("age")}>
                        {t("yearsOld", { count: formatNumber(w.age, lang) })}
                      </Fact>
                    )}
                    <Fact icon={IdCard} label={t("memberId")}>
                      <span className="font-mono text-[13px] tracking-wide">{w.member_no}</span>
                    </Fact>
                  </dl>
                </SectionCard>

                {certList.length > 0 && (
                  <SectionCard compact icon={Award} title={t("certificates")} badge={certList.length} className="order-4 @3xl:order-none">
                    <CertificateList certificates={certList} />
                  </SectionCard>
                )}

                {!isMe && (
                  <SectionCard compact icon={ShieldCheck} title={t("stayingSafeTitle")} className="order-6 @3xl:order-none">
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
                      className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 px-3 text-xs font-medium text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <Flag className="h-3.5 w-3.5" aria-hidden />
                      {t("reportProfile")}
                    </button>
                  </SectionCard>
                )}
              </ProfileColumn>
            </ProfileColumns>
          )}

          {tab === "calendar" && (
            <div className="grid grid-cols-1 gap-3 md:gap-4 @3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @3xl:items-start">
              <SectionCard compact icon={CalendarDays} title={t("workerCalendarTitle")} className="@3xl:order-2">
                <BusyDaysSummary days={availability.data ?? []} emptyText={t("workerNoBusyDays")} hint={t("workerCalendarHint")} />
                {!isMe && (
                  <Button className="mt-4 w-full rounded-full" onClick={openRequest}>
                    <Send className="h-4 w-4" aria-hidden />
                    {t("requestWork")}
                  </Button>
                )}
              </SectionCard>

              <section className="rounded-2xl border border-slate-200 bg-surface p-3 shadow-sm sm:p-4 @3xl:order-1">
                {availability.isPending ? (
                  <div className="skeleton h-80 rounded-xl" />
                ) : (
                  <AvailabilityCalendar days={availability.data ?? []} monthView />
                )}
              </section>
            </div>
          )}

          {tab === "reviews" && (
            <ReviewsPanel
              reviews={reviews.data?.pages.flat() ?? []}
              isPending={rated && reviews.isPending}
              hasMore={reviews.hasNextPage}
              loadingMore={reviews.isFetchingNextPage}
              onLoadMore={() => reviews.fetchNextPage()}
              rating={Number(w.rating)}
              ratingCount={w.rating_count}
            />
          )}
        </div>
      </PageContainer>

      {/* ---- Phones: the main action follows you once the header's buttons
           have scrolled away - sits just above the tab bar. ------------- */}
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
              <p className={cn("truncate text-xs", w.is_available ? "text-brand-700" : "text-slate-500")}>
                {w.is_available ? t("profileAvailOnTitle") : t("profileAvailOffTitle")}
              </p>
            </div>
            <button
              type="button"
              tabIndex={showStickyBar ? 0 : -1}
              onClick={openChat}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-colors hover:bg-slate-50"
              aria-label={t("chat")}
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
            </button>
            <Button size="sm" className="shrink-0 rounded-full" tabIndex={showStickyBar ? 0 : -1} onClick={openRequest}>
              {t("requestWork")}
            </Button>
          </div>
        </div>
      )}

      {/* Removing a friend isn't a one-tap thing - say who, then confirm. */}
      <Dialog
        open={unfriendOpen}
        onClose={() => setUnfriendOpen(false)}
        title={t("removeFriendConfirm")}
        footer={
          <>
            <Button variant="outline" onClick={() => setUnfriendOpen(false)}>
              {t("cancel")}
            </Button>
            <Button variant="danger" loading={removeFriend.isPending} onClick={() => removeFriend.mutate()}>
              {t("removeFriend")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">{t("workerRemoveFriendBody", { name: w.full_name })}</p>
      </Dialog>

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
          {showModeration && w.is_verified && (
            <StaffIdDialog profileId={viewingId ? w.id : null} name={w.full_name} onClose={() => setViewingId(false)} />
          )}
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
