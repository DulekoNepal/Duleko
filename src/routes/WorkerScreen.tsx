import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Phone,
  Star,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { RatingStars } from "@/components/duleko/Rating";
import { RequestWorkDialog } from "@/components/duleko/RequestWorkDialog";
import { ReportDialog } from "@/components/duleko/ReportDialog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, SectionIcon, SectionTitle } from "@/components/ui/card";
import { EmptyState, FullPageLoader } from "@/components/ui/states";
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
  listCertificates,
  listReviewsFor,
  removeFriendship,
  respondFriendRequest,
  sendFriendRequest,
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
  const { workerId } = useParams({ from: "/worker/$workerId" });
  const [requestOpen, setRequestOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  /** Every action below needs an account - a guest gets the sign-in prompt instead. */
  function withAuth(action: () => void) {
    if (!me) {
      requestSignIn();
      return;
    }
    action();
  }

  const online = usePresence([workerId])[workerId];

  const worker = useQuery({ queryKey: ["profile", workerId], queryFn: () => getProfile(workerId) });
  const skills = useQuery({ queryKey: ["user-skills", workerId], queryFn: () => getUserSkills(workerId) });
  const reviews = useQuery({ queryKey: ["reviews", workerId], queryFn: () => listReviewsFor(workerId) });

  const contact = useQuery({
    queryKey: ["contact", workerId],
    queryFn: () => getContact(workerId),
    staleTime: 5 * 60_000,
  });

  const certificates = useQuery({
    queryKey: ["certificates", workerId],
    queryFn: () => listCertificates(workerId),
  });

  // Chat is open to anyone signed in. Calling needs the other person to
  // have actually saved a number - getContact comes back null when they
  // have not (or when you are browsing as a guest).
  const canCall = Boolean(contact.data);

  const friendship = useQuery({
    queryKey: ["friendship", me?.id, workerId],
    queryFn: () => getFriendshipWith(me!.id, workerId),
    enabled: Boolean(me?.id),
  });

  function invalidateFriendship() {
    queryClient.invalidateQueries({ queryKey: ["friendship"] });
    queryClient.invalidateQueries({ queryKey: ["friends"] });
    queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    queryClient.invalidateQueries({ queryKey: ["unread"] });
  }

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
                <h2 className="truncate text-xl font-bold text-slate-900">{w.full_name}</h2>
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

        <Card className="mb-4">
          <CardBody>
            <SectionTitle>
              <span className="inline-flex items-center gap-2">
                <SectionIcon icon={Briefcase} />
                {t("skills")}
              </span>
            </SectionTitle>
            {(skills.data?.length ?? 0) === 0 ? (
              <p className="text-sm italic text-slate-400">{t("noSkillsYetProfile")}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(skills.data ?? []).map((s) => {
                  const label = s.id === "other" && s.custom_label ? s.custom_label : skillName(s, lang);
                  const rate = s.rate_amount != null ? `${formatMoney(s.rate_amount, lang)}${s.rate_unit ? ` / ${s.rate_unit}` : ""}` : null;
                  return (
                    <Badge key={s.id} tone="brand">
                      <span aria-hidden>{s.emoji}</span>
                      {label}
                      {rate ? ` · ${rate}` : ""}
                    </Badge>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="mb-4">
          <CardBody>
            <SectionTitle>
              <span className="inline-flex items-center gap-2">
                <SectionIcon icon={Star} />
                {t("reviews")}
                {w.rating_count > 0 ? ` (${formatNumber(w.rating_count, lang)})` : ""}
              </span>
            </SectionTitle>
            {(reviews.data?.length ?? 0) === 0 ? (
              <p className="py-3 text-sm text-slate-500">{t("noReviewsYet")}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(reviews.data ?? []).map((r) => (
                  <li key={r.id} className="py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={r.reviewer?.full_name ?? "?"} src={r.reviewer?.avatar_url} size={28} />
                      <span className="text-sm font-medium text-slate-800">
                        {r.reviewer?.full_name ?? ""}
                      </span>
                      <span className="ml-auto text-xs text-slate-400">
                        {relativeTime(r.created_at, lang)}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <RatingStars value={r.rating} count={1} showCount={false} />
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-slate-600">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

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
        </>
      )}
    </>
  );
}
