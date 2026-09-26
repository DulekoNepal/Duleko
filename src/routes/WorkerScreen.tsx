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
  UserRound,
} from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { RatingLine } from "@/components/duleko/WorkerList";
import { DetailRow, ProfileCover, SectionCard, StatItem } from "@/components/duleko/ProfileParts";
import { ReviewsCard } from "@/components/duleko/ReviewsCard";
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
import { cn, formatDate, formatMoney, formatNumber, locationLine, skillName } from "@/lib/utils";

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

  // Staff moderation only ever targets an ordinary member - never your own
  // profile, and never another staff member's (verify/suspend a colleague
  // makes no sense; revoke their role first if that's ever really needed).
  const showModerationMenu = isStaffViewer && !isMe && !w.staff_role;

  const tileClass =
    // Icon over label on a phone, where three sit side by side; one line from sm up.
    "inline-flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold sm:h-11 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm text-slate-700 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 disabled:opacity-60";

  const callButton = canCall ? (
    <a href={`tel:${contact.data!.phone}`} className={tileClass}>
      <Phone className="h-4 w-4" aria-hidden />
      {t("callNow")}
    </a>
  ) : (
    <button
      type="button"
      onClick={() => (me ? toast(t("callNotAllowed")) : requestSignIn())}
      className={cn(tileClass, "text-slate-400 hover:text-slate-500")}
    >
      <Lock className="h-4 w-4" aria-hidden />
      {t("callNow")}
    </button>
  );

  const chatButton = (
    <button
      type="button"
      onClick={() => withAuth(() => navigate({ to: "/chat/$otherId", params: { otherId: w.id } }))}
      className={tileClass}
    >
      <MessageCircle className="h-4 w-4" aria-hidden />
      {t("chat")}
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
      <UserPlus className="h-4 w-4" aria-hidden />
      <span className="truncate">{t("addFriend")}</span>
    </button>
  ) : fs.status === "pending" && iAmRequester ? (
    <button
      type="button"
      disabled={removeFriend.isPending}
      onClick={() => removeFriend.mutate()}
      className={tileClass}
    >
      <Clock className="h-4 w-4" aria-hidden />
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
      <UserCheck className="h-4 w-4" aria-hidden />
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

      <PageContainer className={cn("space-y-5 md:space-y-6", !isMe && "pb-40 md:pb-10")}>
        {/* ==============================================================
            Identity: cover, photo, name, actions, stats
            ============================================================== */}
        <section className="animate-in-up overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <ProfileCover src={w.cover_url} />

          <div className="px-4 pb-5 sm:px-6 sm:pb-6">
            {/* Centred on a phone, photo-left from sm up. */}
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:gap-5 sm:text-left">
              <div className="relative z-10 -mt-14 shrink-0 sm:-mt-16">
                <Avatar
                  name={w.full_name}
                  src={w.avatar_url}
                  size={112}
                  online={online}
                  className="shadow-lg ring-4 ring-white"
                />
              </div>

              <div className="min-w-0 max-w-full flex-1 sm:pb-1">
                {/* h2, not h1 - AppHeader already carries this name as the page h1. */}
                <h2 className="flex min-w-0 items-center justify-center gap-1.5 text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:justify-start sm:text-[1.75rem]">
                  <span className="truncate">{w.full_name}</span>
                  <VerifiedBadge staffRole={w.staff_role} verified={w.is_verified} size={22} />
                </h2>
                {w.bio && <p className="mt-1 text-sm leading-relaxed text-slate-600 sm:text-base">{w.bio}</p>}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-slate-500 sm:justify-start">
                  {place && (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <MapPin className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                      <span className="truncate">{place}</span>
                    </span>
                  )}
                  <RatingLine rating={w.rating} count={w.rating_count} className="text-sm" />
                </div>
              </div>

              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold sm:mb-1",
                  w.is_available ? "bg-brand-50 text-brand-800 ring-1 ring-brand-200" : "bg-slate-100 text-slate-500",
                )}
              >
                <span className="relative flex h-2.5 w-2.5" aria-hidden>
                  {w.is_available && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-50" />
                  )}
                  <span
                    className={cn(
                      "relative inline-flex h-2.5 w-2.5 rounded-full",
                      w.is_available ? "bg-brand-500" : "bg-slate-400",
                    )}
                  />
                </span>
                {w.is_available ? t("availableForWork") : t("notAvailable")}
              </span>
            </div>

            {/* ---- Someone asked to be your friend ------------------ */}
            {!isMe && incomingRequest && (
              <div className="animate-in-up mt-5 flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50/70 px-4 py-3.5 sm:flex-row sm:items-center">
                <span className="flex min-w-0 flex-1 items-center gap-2.5 text-sm font-semibold text-brand-900">
                  <UserPlus className="h-5 w-5 shrink-0 text-brand-700" aria-hidden />
                  {t("sentYouFriendRequest", { name: w.full_name.split(/\s+/)[0] })}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 sm:flex-none" loading={respond.isPending} onClick={() => respond.mutate(true)}>
                    {t("acceptRequest")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 sm:flex-none"
                    loading={respond.isPending}
                    onClick={() => respond.mutate(false)}
                  >
                    {t("declineRequest")}
                  </Button>
                </div>
              </div>
            )}

            {/* ---- Actions --------------------------------------------- */}
            {!isMe && (
              <div ref={actionsRef} className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
                <Button size="lg" className="w-full" onClick={() => withAuth(() => setRequestOpen(true))}>
                  <Send className="h-4 w-4" aria-hidden />
                  {t("requestWork")}
                </Button>
                <div className={cn("grid gap-2 sm:contents", friendButton ? "grid-cols-3" : "grid-cols-2")}>
                  {chatButton}
                  {callButton}
                  {friendButton}
                </div>
              </div>
            )}
          </div>

          {/* Hairline dividers from the 1px gaps over a grey backing. */}
          <dl className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-4">
            <StatItem icon={Briefcase} label={t("skills")} value={formatNumber(skillList.length, lang)} />
            <StatItem
              icon={Star}
              label={t("ratingLabel")}
              value={w.rating_count > 0 ? formatNumber(Number(w.rating).toFixed(1), lang) : "–"}
            />
            <StatItem icon={MessageSquare} label={t("reviews")} value={formatNumber(w.rating_count, lang)} />
            <StatItem
              icon={CalendarDays}
              label={t("memberSince")}
              value={formatDate(w.created_at.slice(0, 10), lang)}
              small
            />
          </dl>
        </section>

        {/* ==============================================================
            Content beside a details column on desktop
            ============================================================== */}
        <div className="grid gap-5 lg:grid-cols-3 lg:items-start">
          <div className="min-w-0 space-y-5 lg:col-span-2">
            <SectionCard icon={Info} title={t("about")}>
              {w.about ? (
                <p className="whitespace-pre-line text-[15px] leading-7 text-slate-700">{w.about}</p>
              ) : (
                <p className="text-sm italic text-slate-400">{t("noAboutYetOther")}</p>
              )}
            </SectionCard>

            <SectionCard
              icon={Briefcase}
              title={t("skillsAndRates")}
              badge={skillList.length > 0 ? skillList.length : undefined}
            >
              {/* These can only be fetched once the handle in the URL has
                  resolved to a profile, so there is a real gap before they
                  arrive - show placeholders rather than claiming there is
                  nothing here. */}
              {skills.isPending ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="skeleton h-[70px] rounded-2xl" />
                  ))}
                </div>
              ) : skillList.length === 0 ? (
                <p className="text-sm italic text-slate-400">{t("noSkillsYetProfile")}</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {skillList.map((s) => {
                    const label = s.id === "other" && s.custom_label ? s.custom_label : skillName(s, lang);
                    const rate =
                      s.rate_amount != null
                        ? `${formatMoney(s.rate_amount, lang)}${s.rate_unit ? ` / ${s.rate_unit}` : ""}`
                        : null;
                    return (
                      <li
                        key={s.id}
                        className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition-all duration-200 hover:border-brand-200 hover:shadow-sm"
                      >
                        <SkillTile
                          skillId={s.id}
                          className="h-11 w-11 rounded-xl bg-brand-50 transition-colors group-hover:bg-brand-100"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">{label}</p>
                          {s.custom_note ? (
                            <p className="mt-0.5 truncate text-xs text-slate-500">{s.custom_note}</p>
                          ) : null}
                        </div>
                        {rate && (
                          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                            {rate}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>

            {certList.length > 0 && (
              <SectionCard icon={Award} title={t("certificates")} badge={certList.length}>
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {certList.map((c) => (
                    <li key={c.id}>
                      <a
                        href={c.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 transition-colors hover:border-brand-200"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sun-400/15 text-sun-500">
                          <Award className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-brand-700">
                            {c.title}
                          </span>
                          <span className="block text-xs text-slate-500">{formatDate(c.created_at.slice(0, 10), lang)}</span>
                        </span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-brand-600" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            <ReviewsCard
              reviews={reviews.data?.pages.flat() ?? []}
              isPending={reviews.isPending}
              hasMore={reviews.hasNextPage}
              loadingMore={reviews.isFetchingNextPage}
              onLoadMore={() => reviews.fetchNextPage()}
              rating={Number(w.rating)}
              ratingCount={w.rating_count}
            />
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24">
            <SectionCard icon={UserRound} title={t("profileDetails")}>
              <dl className="space-y-3.5">
                {place && <DetailRow icon={MapPin} label={t("whereYouAre")} value={place} />}
                {w.age != null && (
                  <DetailRow icon={Cake} label={t("age")} value={t("yearsOld", { count: formatNumber(w.age, lang) })} />
                )}
                {w.education && (
                  <DetailRow icon={GraduationCap} label={t("highestEducation")} value={w.education} />
                )}
                {canCall && contact.data?.alt_phone && (
                  <DetailRow icon={Phone} label={t("altPhone")} value={contact.data.alt_phone} />
                )}
                <DetailRow
                  icon={CalendarDays}
                  label={t("memberSince")}
                  value={formatDate(w.created_at.slice(0, 10), lang)}
                />
              </dl>
            </SectionCard>

            {!isMe && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h3 className="flex items-center gap-2.5 text-base font-semibold text-slate-900">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                  </span>
                  {t("stayingSafeTitle")}
                </h3>
                <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
                  {(["stayingSafeTip1", "stayingSafeTip2", "stayingSafeTip3"] as const).map((key) => (
                    <li key={key} className="flex gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                      <span>{t(key)}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => withAuth(() => setReportOpen(true))}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Flag className="h-4 w-4" aria-hidden />
                  {t("reportProfile")}
                </button>
              </section>
            )}
          </aside>
        </div>
      </PageContainer>

      {/* ---- Phones: the main action follows you once the hero's buttons
           have scrolled away - sits just above the tab bar. ------------ */}
      {!isMe && (
        <div
          className={cn(
            "fixed inset-x-0 bottom-[calc(3.5rem+var(--sab))] z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)] backdrop-blur transition-all duration-300 md:hidden",
            showStickyBar ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
          )}
          aria-hidden={!showStickyBar}
        >
          <div className="mx-auto flex max-w-md items-center gap-2">
            <Avatar name={w.full_name} src={w.avatar_url} size={40} online={online} />
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
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
              aria-label={t("chat")}
            >
              <MessageCircle className="h-4.5 w-4.5" aria-hidden />
            </button>
            <Button className="h-10 shrink-0 px-4" tabIndex={showStickyBar ? 0 : -1} onClick={() => withAuth(() => setRequestOpen(true))}>
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
