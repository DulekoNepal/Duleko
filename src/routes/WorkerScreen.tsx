import { useEffect, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  Award,
  ArrowLeft,
  Briefcase,
  Cake,
  Flag,
  GraduationCap,
  Info,
  Lock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Share2,
  ShieldBan,
  ShieldCheck,
  ShieldOff,
  Star,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { RatingStars } from "@/components/duleko/Rating";
import { ReviewsCard } from "@/components/duleko/ReviewsCard";
import { RequestWorkDialog } from "@/components/duleko/RequestWorkDialog";
import { ReportDialog } from "@/components/duleko/ReportDialog";
import { SuspendUserDialog } from "@/components/duleko/SuspendUserDialog";
import { VerifiedBadge } from "@/components/duleko/VerifiedBadge";
import { MenuItem, MenuPanel } from "@/components/ui/menu";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, SectionIcon, SectionTitle } from "@/components/ui/card";
import { EmptyState, FullPageLoader } from "@/components/ui/states";
import { shareProfile } from "@/lib/share";
import { SkillChip } from "@/components/duleko/SkillIcon";
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
import { cn, formatMoney, formatNumber, locationLine, relativeTime, skillName } from "@/lib/utils";

/** Matches the Call/Chat buttons' look - a native `<a href="tel:">` can't use the <Button> component. */
const secondaryActionClass =
  "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-50 px-4 text-sm font-medium text-brand-800 transition-colors duration-200 hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2";

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

  // Staff moderation only ever targets an ordinary member - never your own
  // profile, and never another staff member's (verify/suspend a colleague
  // makes no sense; revoke their role first if that's ever really needed).
  const showModerationMenu = isStaffViewer && !isMe && !w.staff_role;

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

      <PageContainer className="max-w-2xl">
        {/* ---- Identity card: cover photo behind an overlapping avatar, one flowing hierarchy - */}
        <Card className="mb-4 overflow-hidden">
          <div className="relative h-28 w-full bg-gradient-to-br from-slate-100 to-slate-200 sm:h-36">
            {w.cover_url && (
              <img src={w.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
          </div>

          <div className="px-5 pb-5">
            <div className="relative z-10 -mt-14 inline-block">
              <Avatar
                name={w.full_name}
                src={w.avatar_url}
                size={84}
                online={online}
                className="shadow-md ring-4 ring-white"
              />
            </div>

            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                {/* h2, not h1 - AppHeader already carries this name as the page h1. */}
                <h2 className="flex min-w-0 items-center gap-1.5 text-xl font-bold text-slate-900">
                  <span className="truncate">{w.full_name}</span>
                  <VerifiedBadge staffRole={w.staff_role} verified={w.is_verified} size={18} />
                </h2>
                <div className="mt-1">
                  <RatingStars value={Number(w.rating)} count={w.rating_count} />
                </div>
              </div>
              <Badge tone={w.is_available ? "success" : "muted"} className="shrink-0">
                {w.is_available ? t("availableNow") : t("notAvailable")}
              </Badge>
            </div>

            {place && (
              <p className="mt-2.5 flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                {place}
              </p>
            )}
          </div>
        </Card>

        {/* ---- Actions: Request Work + Friend side by side, Call + Chat side
             by side below - same 4 buttons for everyone, friends or not. - */}
        {!isMe && (
          <div className="mb-4 space-y-2">
            {fs?.status === "pending" && !iAmRequester ? (
              <div className="grid grid-cols-2 gap-2">
                <Button size="lg" className="col-span-2" onClick={() => setRequestOpen(true)}>
                  {t("requestWork")}
                </Button>
                <Button loading={respond.isPending} onClick={() => respond.mutate(true)}>
                  {t("acceptRequest")}
                </Button>
                <Button variant="outline" loading={respond.isPending} onClick={() => respond.mutate(false)}>
                  {t("declineRequest")}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button size="lg" onClick={() => withAuth(() => setRequestOpen(true))}>
                  {t("requestWork")}
                </Button>

                {!fs && (
                  <Button
                    size="lg"
                    variant="outline"
                    loading={addFriend.isPending}
                    onClick={() => withAuth(() => addFriend.mutate())}
                  >
                    <UserPlus className="h-4 w-4" aria-hidden />
                    {t("addFriend")}
                  </Button>
                )}
                {fs?.status === "pending" && iAmRequester && (
                  <Button size="lg" variant="outline" loading={removeFriend.isPending} onClick={() => removeFriend.mutate()}>
                    {t("cancelRequest")}
                  </Button>
                )}
                {fs?.status === "accepted" && (
                  <Button
                    size="lg"
                    variant="outline"
                    loading={removeFriend.isPending}
                    onClick={() => {
                      if (window.confirm(t("removeFriendConfirm"))) removeFriend.mutate();
                    }}
                  >
                    <UserCheck className="h-4 w-4" aria-hidden />
                    {t("alreadyFriends")}
                  </Button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {canCall ? (
                <a href={`tel:${contact.data!.phone}`} className={secondaryActionClass}>
                  <Phone className="h-4 w-4" aria-hidden />
                  {t("callNow")}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => (me ? toast(t("noPhoneSaved")) : requestSignIn())}
                  className={cn(secondaryActionClass, "opacity-60")}
                >
                  <Lock className="h-4 w-4" aria-hidden />
                  {t("callNow")}
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  withAuth(() => navigate({ to: "/chat/$otherId", params: { otherId: w.id } }))
                }
                className={secondaryActionClass}
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                {t("chat")}
              </button>
            </div>
          </div>
        )}

        <Card className="mb-4">
          <CardBody>
            <SectionTitle>
              <span className="inline-flex items-center gap-2">
                <SectionIcon icon={Info} />
                {t("about")}
              </span>
            </SectionTitle>
            {w.bio && <p className="mb-2 text-sm font-medium text-slate-800">{w.bio}</p>}
            {w.about ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{w.about}</p>
            ) : (
              <p className="text-sm italic text-slate-400">{t("noAboutYetOther")}</p>
            )}
            {(w.age != null || w.education) && (
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                {w.age != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Cake className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                    {t("yearsOld", { count: formatNumber(w.age, lang) })}
                  </span>
                )}
                {w.education && (
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                    {w.education}
                  </span>
                )}
              </div>
            )}
            {canCall && contact.data?.alt_phone && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600">
                <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                {t("altPhone")}: {contact.data.alt_phone}
              </p>
            )}
          </CardBody>
        </Card>

        <Card className="mb-4">
          <CardBody>
            <SectionTitle>
              <span className="inline-flex items-center gap-2">
                <SectionIcon icon={Briefcase} />
                {t("skills")}
              </span>
            </SectionTitle>
            {/* These can only be fetched once the handle in the URL has
                resolved to a profile, so there is a real gap before they
                arrive - say "loading" rather than claiming there is
                nothing here. */}
            {skills.isPending ? (
              <p className="text-sm text-slate-400">{t("loading")}</p>
            ) : (skills.data?.length ?? 0) === 0 ? (
              <p className="text-sm italic text-slate-400">{t("noSkillsYetProfile")}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(skills.data ?? []).map((s) => {
                  const label = s.id === "other" && s.custom_label ? s.custom_label : skillName(s, lang);
                  const rate = s.rate_amount != null ? `${formatMoney(s.rate_amount, lang)}${s.rate_unit ? ` / ${s.rate_unit}` : ""}` : null;
                  return (
                    <SkillChip key={s.id} skillId={s.id}>
                      {label}
                      {rate ? <span className="text-slate-500">{` · ${rate}`}</span> : null}
                    </SkillChip>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {(certificates.data?.length ?? 0) > 0 && (
          <Card className="mb-4">
            <CardBody>
              <SectionTitle>
                <span className="inline-flex items-center gap-2">
                  <SectionIcon icon={Award} />
                  {t("certificates")}
                </span>
              </SectionTitle>
              <ul className="space-y-2">
                {(certificates.data ?? []).map((c) => (
                  <li key={c.id}>
                    <a
                      href={c.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 transition-colors duration-200 hover:bg-slate-100"
                    >
                      <Award className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
                      <span className="truncate">{c.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
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

        {!isMe && (
          <div className="flex justify-center pb-4 text-sm">
            <button
              type="button"
              onClick={() => withAuth(() => setReportOpen(true))}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-red-600"
            >
              <Flag className="h-4 w-4" aria-hidden />
              {t("report")}
            </button>
          </div>
        )}
      </PageContainer>

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
