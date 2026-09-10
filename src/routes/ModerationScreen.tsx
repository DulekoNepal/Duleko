import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ClipboardList, Flag } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { CardSkeleton, EmptyState } from "@/components/ui/states";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { listOpenReports, resolveReport } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { relativeTime } from "@/lib/utils";
import type { ReportReason } from "@/lib/types";

const REASON_KEY: Record<ReportReason, StringKey> = {
  spam: "reasonSpam",
  fake_profile: "reasonFake",
  abusive: "reasonAbusive",
  no_show: "reasonNoShow",
  unsafe: "reasonUnsafe",
  other: "reasonOther",
};

/**
 * Staff-only: the open reports queue. Not gated by a route guard - the
 * data itself is gated (reports_read_staff RLS only lets staff select
 * anything here at all), so a non-staff visitor just sees an empty list
 * rather than a "not authorized" screen worth building out.
 */
export function ModerationScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reports = useQuery({
    queryKey: ["open-reports"],
    queryFn: listOpenReports,
    enabled: Boolean(profile?.staff_role),
  });

  const resolve = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "reviewed" | "dismissed" }) =>
      resolveReport(id, status, profile!.id),
    onSuccess: () => {
      toast(t("reportResolved"));
      queryClient.invalidateQueries({ queryKey: ["open-reports"] });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  if (!profile) return <SignInRequiredScreen title={t("moderation")} />;

  return (
    <>
      <AppHeader title={t("moderation")} subtitle={t("moderationHint")} />
      <PageContainer>
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <ClipboardList className="h-4 w-4" aria-hidden />
          </span>
          <h2 className="text-base font-semibold text-slate-900">{t("openReports")}</h2>
        </div>

        {!profile.staff_role ? (
          <EmptyState icon={<Flag className="h-8 w-8" />} title={t("noOpenReports")} />
        ) : reports.isLoading ? (
          <CardSkeleton count={3} />
        ) : (reports.data?.length ?? 0) === 0 ? (
          <EmptyState icon={<Flag className="h-8 w-8" />} title={t("noOpenReports")} />
        ) : (
          <div className="space-y-3">
            {(reports.data ?? []).map((r) => (
              <Card key={r.id}>
                <CardBody>
                  <div className="flex items-start gap-3">
                    <Avatar name={r.reported.full_name} src={r.reported.avatar_url} size={40} />
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/worker/$workerId"
                        params={{ workerId: r.reported.id }}
                        className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-brand-700"
                      >
                        {r.reported.full_name}
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {t("reportedBy", { name: r.reporter.full_name })} · {relativeTime(r.created_at, lang)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge tone="warning">{t(REASON_KEY[r.reason])}</Badge>
                      </div>
                      {r.details && <p className="mt-2 text-sm text-slate-600">{r.details}</p>}

                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          loading={resolve.isPending}
                          onClick={() => resolve.mutate({ id: r.id, status: "reviewed" })}
                        >
                          {t("markReviewed")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={resolve.isPending}
                          onClick={() => resolve.mutate({ id: r.id, status: "dismissed" })}
                        >
                          {t("dismissReport")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}
