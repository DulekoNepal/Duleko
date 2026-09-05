import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { AvailabilityCalendar } from "./AvailabilityCalendar";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { createEngagement, getAvailability } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { addDays, todayKey, toDateKey } from "@/lib/utils";
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
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [workDate, setWorkDate] = useState(todayKey());
  const [location, setLocation] = useState(defaultLocation ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

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
  // booked — once we know, hop to the first free day so the dialog never
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
        payment_amount: null,
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
    setErrors({});
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (title.trim().length < 3) next.title = t("required");
    if (location.trim().length < 2) next.location = t("required");
    if (workDate < todayKey()) next.workDate = t("dateInPast");
    else if (bookedDays.has(workDate)) next.workDate = t("dateUnavailable");
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
        <AvailabilityCalendar
          days={availability.data ?? []}
          weeks={6}
          selectedDay={workDate}
          onSelectDay={(day) => {
            setWorkDate(day);
            setErrors((prev) => ({ ...prev, workDate: "" }));
          }}
        />
      </Field>

      <Field label={t("workLocation")} error={errors.location}>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t("workLocationPlaceholder")}
          maxLength={160}
        />
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
