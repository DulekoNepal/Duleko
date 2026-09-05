import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { ArrowLeft, Flag, MapPin, Phone, ShieldOff } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { AvailabilityCalendar } from "@/components/duleko/AvailabilityCalendar";
import { RatingStars } from "@/components/duleko/Rating";
import { RequestWorkDialog } from "@/components/duleko/RequestWorkDialog";
import { ReportDialog } from "@/components/duleko/ReportDialog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, SectionTitle } from "@/components/ui/card";
import { EmptyState, FullPageLoader } from "@/components/ui/states";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import {
  blockUser,
  getAvailability,
  getContact,
  getProfile,
  getUserSkills,
  isBlockedByMe,
  listReviewsFor,
  unblockUser,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { addDays, formatNumber, locationLine, relativeTime, skillName, toDateKey, todayKey } from "@/lib/utils";

export function WorkerScreen() {
  const { t, lang } = useI18n();
  const { profile: me } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const blocked = useQuery({
    queryKey: ["blocked", me?.id, workerId],
    queryFn: () => isBlockedByMe(me!.id, workerId),
    enabled: Boolean(me?.id),
  });

  const toggleBlock = useMutation({
    mutationFn: async () => {
      if (!me) return;
      if (blocked.data) await unblockUser(me.id, workerId);
      else await blockUser(me.id, workerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked"] });
      queryClient.invalidateQueries({ queryKey: ["workers"] });
    },
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
        <Card className="mb-4">
          <CardBody>
            <div className="flex gap-4">
              <Avatar name={w.full_name} src={w.avatar_url} size={72} />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-900">{w.full_name}</h2>
                <RatingStars value={Number(w.rating)} count={w.rating_count} size={16} />
                {place && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" aria-hidden />
                    {place}
                  </p>
                )}
                <div className="mt-2">
                  <Badge tone={w.is_available ? "success" : "muted"}>
                    {w.is_available ? t("availableNow") : t("notAvailable")}
                  </Badge>
                </div>
              </div>
            </div>

            {(skills.data?.length ?? 0) > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(skills.data ?? []).map((s) => (
                  <Badge key={s.id} tone="brand">
                    <span aria-hidden>{s.emoji}</span>
                    {skillName(s, lang)}
                  </Badge>
                ))}
              </div>
            )}

            {w.about && <p className="mt-4 whitespace-pre-line text-sm text-slate-700">{w.about}</p>}

            {!isMe && (
              <div className="mt-4 flex flex-col gap-2">
                <Button size="lg" onClick={() => setRequestOpen(true)} disabled={Boolean(blocked.data)}>
                  {t("requestWork")}
                </Button>
                {contact.data ? (
                  <a
                    href={`tel:${contact.data}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-50 px-4 text-sm font-medium text-brand-800"
                  >
                    <Phone className="h-4 w-4" aria-hidden />
                    {t("callNow")} · {contact.data}
                  </a>
                ) : (
                  <p className="text-center text-xs text-slate-500">{t("phoneHidden")}</p>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="mb-4">
          <CardBody>
            <SectionTitle>{t("availability")}</SectionTitle>
            <AvailabilityCalendar days={availability.data ?? []} weeks={4} />
          </CardBody>
        </Card>

        <Card className="mb-4">
          <CardBody>
            <SectionTitle>
              {t("reviews")}
              {w.rating_count > 0 ? ` (${formatNumber(w.rating_count, lang)})` : ""}
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
          <div className="flex justify-center gap-4 pb-4 text-sm">
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-red-600"
            >
              <Flag className="h-4 w-4" aria-hidden />
              {t("report")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (blocked.data || window.confirm(t("blockConfirm"))) toggleBlock.mutate();
              }}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-red-600"
            >
              <ShieldOff className="h-4 w-4" aria-hidden />
              {blocked.data ? t("unblock") : t("block")}
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
