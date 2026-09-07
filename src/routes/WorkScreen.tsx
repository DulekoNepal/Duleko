import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Briefcase } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { EngagementCard } from "@/components/duleko/EngagementCard";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { listMyEngagements } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { cn, formatNumber } from "@/lib/utils";

type Role = "worker" | "employer";

const ACTIVE_ORDER = ["pending", "accepted", "confirmed", "completed", "declined", "cancelled"];

export function WorkScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const [role, setRole] = useState<Role>("worker");

  const engagements = useQuery({
    queryKey: ["engagements", role, profile?.id],
    queryFn: () => listMyEngagements(profile!.id, role),
    enabled: Boolean(profile?.id),
  });

  const sorted = [...(engagements.data ?? [])].sort(
    (a, b) => ACTIVE_ORDER.indexOf(a.status) - ACTIVE_ORDER.indexOf(b.status),
  );

  if (!profile) return <SignInRequiredScreen title={t("myWork")} />;

  return (
    <>
      <AppHeader title={t("myWork")} />
      <PageContainer>
        <div className="mb-4 inline-flex w-full rounded-xl bg-slate-100 p-1" role="tablist">
          {(["worker", "employer"] as const).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={role === r}
              onClick={() => setRole(r)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                role === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
              )}
            >
              {r === "worker" ? t("asWorker") : t("asEmployer")}
            </button>
          ))}
        </div>

        {engagements.isLoading ? (
          <CardSkeleton count={3} />
        ) : engagements.isError ? (
          <ErrorState
            message={errorMessage(engagements.error)}
            onRetry={() => engagements.refetch()}
            retryLabel={t("retry")}
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="h-8 w-8" />}
            title={t("noWorkYet")}
            hint={t("noWorkYetHint")}
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-500">
              {formatNumber(sorted.length, lang)} · {role === "worker" ? t("asWorker") : t("asEmployer")}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {sorted.map((e) => (
                <EngagementCard key={e.id} engagement={e} myProfileId={profile!.id} />
              ))}
            </div>
          </>
        )}
      </PageContainer>
    </>
  );
}
