import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Flag,
  Info,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { AvailabilityCalendar } from "@/components/duleko/AvailabilityCalendar";
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
import { useToast } from "@/hooks/use-toast";
import {
  getAvailability,
  getContact,
  getFriendshipWith,
  getProfile,
  getUserSkills,
  listReviewsFor,
  removeFriendship,
  respondFriendRequest,
  sendFriendRequest,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { addDays, formatMoney, formatNumber, locationLine, relativeTime, skillName, toDateKey, todayKey } from "@/lib/utils";

/** Matches the Call/Chat buttons' look — a native `<a href="tel:">` can't use the <Button> component. */
const secondaryActionClass =
  "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-50 px-4 text-sm font-medium text-brand-800 transition-colors hover:bg-brand-100";

export function WorkerScreen() {
  const { t, lang } = useI18n();
  const { profile: me } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { workerId } = useParams({ from: "/worker/$workerId" });
  const [requestOpen, setRequestOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const worker = useQuery({ queryKey: ["profile", workerId], queryFn: () => getProfile(workerId) });
  const skills = useQuery({ queryKey: ["user-skills", workerId], queryFn: () => getUserSkills(workerId) });
  const reviews = useQuery({ queryKey: ["reviews", workerId], queryFn: () => listReviewsFor(workerId) });

  const availability = useQuery({
    queryKey: ["availability", workerId],
    queryFn: () => getAvailability(workerId, todayKey(), toDateKey(addDays(new Date(), 35))),
  });

  const contact = useQuery({
    queryKey: ["contact", workerId],
    queryFn: () => getContact(workerId),
    staleTime: 5 * 60_000,
  });

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

      <PageContainer>
        {/* ---- Identity card: cover photo behind an overlapping avatar, one flowing hierarchy - */}
        <Card className="mb-4 overflow-hidden">
          <div className="relative h-28 w-full bg-gradient-to-br from-slate-100 to-slate-200 sm:h-36">
            {w.cover_url && (
              <img src={w.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
          </div>

          <div className="px-5 pb-5">
            <div className="relative z-10 -mt-14 inline-block">
              <Avatar name={w.full_name} src={w.avatar_url} size={84} className="shadow-md ring-4 ring-white" />
            </div>

            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-slate-900">{w.full_name}</h1>
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

        {/* ---- Actions: one primary CTA, then friend + contact as secondary rows - */}
        {!isMe && (
          <div className="mb-4 space-y-2">
            <Button size="lg" className="w-full" onClick={() => setRequestOpen(true)}>
              {t("requestWork")}
            </Button>

            {!fs && (
              <Button variant="outline" className="w-full" loading={addFriend.isPending} onClick={() => addFriend.mutate()}>
                <UserPlus className="h-4 w-4" aria-hidden />
                {t("addFriend")}
              </Button>
            )}
            {fs?.status === "pending" && iAmRequester && (
              <Button variant="outline" className="w-full" loading={removeFriend.isPending} onClick={() => removeFriend.mutate()}>
                {t("friendRequestPending")} · {t("cancelRequest")}
              </Button>
            )}
            {fs?.status === "pending" && !iAmRequester && (
              <div className="flex gap-2">
                <Button className="flex-1" loading={respond.isPending} onClick={() => respond.mutate(true)}>
                  {t("acceptRequest")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  loading={respond.isPending}
                  onClick={() => respond.mutate(false)}
                >
                  {t("declineRequest")}
                </Button>
              </div>
            )}
            {fs?.status === "accepted" && (
              <Button
                variant="outline"
                className="w-full"
                loading={removeFriend.isPending}
                onClick={() => {
                  if (window.confirm(t("removeFriendConfirm"))) removeFriend.mutate();
                }}
              >
                <UserCheck className="h-4 w-4" aria-hidden />
                {t("alreadyFriends")}
              </Button>
            )}

            {contact.data ? (
              <div className="flex gap-2">
                <a href={`tel:${contact.data}`} className={secondaryActionClass}>
                  <Phone className="h-4 w-4" aria-hidden />
                  {t("callNow")}
                </a>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/chat/$otherId", params: { otherId: w.id } })}
                  className={secondaryActionClass}
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  {t("chat")}
                </button>
              </div>
            ) : (
              <p className="text-center text-xs text-slate-500">{t("phoneHidden")}</p>
            )}
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
            {w.about ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{w.about}</p>
            ) : (
              <p className="text-sm italic text-slate-400">{t("noAboutYetOther")}</p>
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
                <SectionIcon icon={Calendar} />
                {t("availability")}
              </span>
            </SectionTitle>
            <AvailabilityCalendar days={availability.data ?? []} weeks={4} />
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
              onClick={() => setReportOpen(true)}
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
