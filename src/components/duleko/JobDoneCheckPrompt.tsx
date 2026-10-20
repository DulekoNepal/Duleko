import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, MessagesSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { AnswerButton } from "./calls/CallDealParts";
import { ReviewDialog } from "./ReviewDialog";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { answerJobDone, listJobsToCheckDone } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { firstName } from "@/lib/work";
import { formatDate, formatMoney } from "@/lib/utils";
import type { EngagementWithParties } from "@/lib/types";

/** Jobs put off with "Ask me later" - asked again next time the app opens. */
const LATER_KEY = "duleko_done_check_later";

function readLater(): string[] {
  try {
    return JSON.parse(window.sessionStorage.getItem(LATER_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function saveLater(ids: string[]) {
  try {
    window.sessionStorage.setItem(LATER_KEY, JSON.stringify(ids));
  } catch {
    // No storage: it just asks again sooner.
  }
}

/**
 * "Is the work finished?" - asked of a hirer when the worker marks a job
 * done (7700). Yes closes the job and goes straight into rating them; Not
 * yet tells the worker. "Ask me later" puts it off until the app is next
 * opened; a report nobody answers completes by itself after three days.
 * The query shares the "engagements" key, so answering from the job
 * sheet takes it off here too.
 */
export function JobDoneCheckPrompt() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const { profile } = useSession();
  const queryClient = useQueryClient();
  const [later, setLater] = useState<string[]>(readLater);
  const [reviewFor, setReviewFor] = useState<EngagementWithParties | null>(null);

  const checks = useQuery({
    queryKey: ["engagements", "done-checks", profile?.id],
    queryFn: () => listJobsToCheckDone(profile!.id),
    enabled: Boolean(profile?.id),
    refetchOnWindowFocus: true,
  });

  const answer = useMutation({
    mutationFn: ({ job, done }: { job: EngagementWithParties; done: boolean }) => answerJobDone(job.id, done),
    onSuccess: (_void, { job, done }) => {
      void queryClient.invalidateQueries({ queryKey: ["engagements"] });
      void queryClient.invalidateQueries({ queryKey: ["availability"] });
      if (done) {
        toast(t("toastCompleted"));
        if (!job.my_review) setReviewFor(job);
      } else {
        toast(t("toastNotYetSent", { name: firstName(job.worker.full_name) }));
      }
    },
    onError: (error) => {
      toast(errorMessage(error), "error");
      // Most likely answered already, on another device.
      void queryClient.invalidateQueries({ queryKey: ["engagements"] });
    },
  });

  const job = (checks.data ?? []).find((e) => !later.includes(e.id)) ?? null;

  function askLater(id: string) {
    const next = [...later, id];
    setLater(next);
    saveLater(next);
  }

  return (
    <>
      {job && !reviewFor && profile && (
        <Dialog open dismissible={false} onClose={() => undefined} title={t("doneCheckTitle")}>
          <div className="flex flex-col items-center text-center">
            <Avatar name={job.worker.full_name} src={job.worker.avatar_url} size={64} profileId={job.worker.id} />
            <p className="mt-3 text-lg font-bold leading-snug text-slate-900">
              {t("doneCheckQuestion", { name: job.worker.full_name })}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">{job.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatDate(job.work_date, lang)}
              {job.payment_amount != null && ` · ${formatMoney(job.payment_amount, lang)}`}
            </p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-500">{t("doneCheckWhy")}</p>
          </div>
          <div className="mt-4 space-y-2">
            <AnswerButton
              icon={Check}
              label={t("actYesDone")}
              tone="brand"
              disabled={answer.isPending}
              onClick={() => answer.mutate({ job, done: true })}
            />
            <AnswerButton
              icon={MessagesSquare}
              label={t("actNotYet")}
              disabled={answer.isPending}
              onClick={() => answer.mutate({ job, done: false })}
            />
            <AnswerButton
              icon={Clock}
              label={t("doneCheckLater")}
              disabled={answer.isPending}
              onClick={() => askLater(job.id)}
            />
          </div>
        </Dialog>
      )}

      {reviewFor && profile && (
        <ReviewDialog
          open
          onClose={() => setReviewFor(null)}
          engagementId={reviewFor.id}
          reviewerProfileId={profile.id}
          revieweeProfileId={reviewFor.worker.id}
          revieweeName={reviewFor.worker.full_name}
        />
      )}
    </>
  );
}
