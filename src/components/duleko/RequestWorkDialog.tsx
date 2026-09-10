import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { AvailabilityCalendar } from "./AvailabilityCalendar";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { createEngagement, getAvailability, getUserSkills } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { addDays, cn, formatDate, formatMoney, skillName, todayKey, toDateKey } from "@/lib/utils";
import type { Profile, WorkerCardData } from "@/lib/types";

type Worker = Pick<Profile, "id" | "full_name"> & Partial<WorkerCardData>;

export function RequestWorkDialog({
  open,
  onClose,
  worker,
  employerProfileId,
  defaultLocation,
}: {
  open: boolean;
  onClose: () => void;
  worker: Worker;
  employerProfileId: string;
  defaultLocation?: string;
}) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [workDate, setWorkDate] = useState(todayKey());
  const [location, setLocation] = useState(defaultLocation ?? "");
  const [offerAmount, setOfferAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Shown as a reference so the hirer's opening bid is in the right ballpark -
  // the worker set these rates themselves (see Profile > Your skills).
  const workerRates = useQuery({
    queryKey: ["user-skills", worker.id],
    queryFn: () => getUserSkills(worker.id),
    enabled: open,
  });
  const ratedSkills = (workerRates.data ?? []).filter((s) => s.rate_amount != null);

  const availability = useQuery({
    queryKey: ["availability", worker.id, "picker"],
    queryFn: () => getAvailability(worker.id, todayKey(), toDateKey(addDays(new Date(), 60))),
    enabled: open,
  });

  const bookedDays = useMemo(
    () => new Set((availability.data ?? []).filter((d) => d.status === "booked").map((d) => d.day)),
    [availability.data],
  );

  // The default day is always "today", but today itself might already be
  // booked - once we know, hop to the first free day so the dialog never
  // opens pre-selected on a date the worker can't actually take.
  useEffect(() => {
    if (!open || !availability.data) return;
    if (!bookedDays.has(workDate)) return;
    let candidate = workDate;
    for (let i = 0; i < 60; i++) {
      candidate = toDateKey(addDays(new Date(`${candidate}T00:00:00`), 1));
      if (!bookedDays.has(candidate)) {
        setWorkDate(candidate);
        return;
      }
    }
  }, [open, availability.data, bookedDays, workDate]);

  const mutation = useMutation({
    mutationFn: () =>
      createEngagement({
        employer_profile_id: employerProfileId,
        worker_profile_id: worker.id,
        skill_id: null,
        title: title.trim(),
        details: details.trim() || null,
        work_date: workDate,
        location_text: location.trim(),
        payment_amount: Number(offerAmount),
      }),
    onSuccess: () => {
      toast(t("requestSent"));
      queryClient.invalidateQueries({ queryKey: ["engagements"] });
      reset();
      onClose();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  function reset() {
    setTitle("");
    setDetails("");
    setWorkDate(todayKey());
    setOfferAmount("");
    setErrors({});
    setCalendarOpen(false);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (title.trim().length < 3) next.title = t("required");
    if (location.trim().length < 2) next.location = t("required");
    if (workDate < todayKey()) next.workDate = t("dateInPast");
    else if (bookedDays.has(workDate)) next.workDate = t("dateUnavailable");
    if (!offerAmount.trim() || Number(offerAmount) <= 0) next.offerAmount = t("required");
    if (worker.id === employerProfileId) next.title = t("cannotRequestSelf");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("requestTitle", { name: worker.full_name })}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} type="button">
            {t("cancel")}
          </Button>
          <Button
            className="flex-1"
            loading={mutation.isPending}
            onClick={() => {
              if (validate()) mutation.mutate();
            }}
          >
            {t("sendRequest")}
          </Button>
        </div>
      }
    >
      <Field label={t("jobTitle")} error={errors.title}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("jobTitlePlaceholder")}
          maxLength={120}
        />
      </Field>

      <Field label={t("workDate")} error={errors.workDate}>
        {/* Collapsed by default - the calendar grid is a lot of space to
            spend on one field before anyone asked to change the date. */}
        <div>
          <button
            type="button"
            onClick={() => setCalendarOpen((v) => !v)}
            aria-expanded={calendarOpen}
            className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
          >
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />
              {formatDate(workDate, lang)}
            </span>
            <ChevronDown
              className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", calendarOpen && "rotate-180")}
              aria-hidden
            />
          </button>
          {calendarOpen && (
            <div className="mt-3">
              <AvailabilityCalendar
                days={availability.data ?? []}
                weeks={6}
                selectedDay={workDate}
                onSelectDay={(day) => {
                  setWorkDate(day);
                  setErrors((prev) => ({ ...prev, workDate: "" }));
                  setCalendarOpen(false);
                }}
              />
            </div>
          )}
        </div>
      </Field>

      <Field label={t("workLocation")} error={errors.location}>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t("workLocationPlaceholder")}
          maxLength={160}
        />
      </Field>

      <Field
        label={t("yourOffer")}
        error={errors.offerAmount}
        hint={
          ratedSkills.length > 0
            ? t("workerRateHint", {
                // Plain text - this is a hint string, so it names the
                // skill rather than trying to carry an icon.
                rates: ratedSkills
                  .map(
                    (s) =>
                      `${skillName(s, lang)} ${formatMoney(s.rate_amount, lang)}${s.rate_unit ? ` / ${s.rate_unit}` : ""}`,
                  )
                  .join(" · "),
              })
            : undefined
        }
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">{lang === "ne" ? "रु" : "Rs"}</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={offerAmount}
            onChange={(e) => {
              setOfferAmount(e.target.value);
              setErrors((prev) => ({ ...prev, offerAmount: "" }));
            }}
            placeholder={t("rateAmountPlaceholder")}
          />
        </div>
      </Field>

      <Field label={`${t("jobDetails")} (${t("optional")})`}>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={800}
          rows={3}
        />
      </Field>
    </Dialog>
  );
}
