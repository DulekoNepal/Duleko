import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { AvailabilityCalendar } from "@/components/duleko/AvailabilityCalendar";
import { SectionCard } from "@/components/duleko/ProfileParts";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { setDayStatus } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { BusyDaysSummary } from "./ProfileUI";
import { useMyProfileData } from "./use-my-profile-data";

/**
 * Busy days: the month calendar you tap to mark them, with what it means
 * and the next few busy days beside it once there's room (above it on a
 * phone, so the summary is read first).
 */
export function CalendarTab() {
  const { t } = useI18n();
  const { profile } = useSession();
  const { availability } = useMyProfileData();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const changeDay = useMutation({
    mutationFn: ({ day, status }: { day: string; status: "available" | "booked" }) =>
      setDayStatus(profile!.id, day, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability", profile?.id] }),
    onError: (error) => toast(errorMessage(error), "error"),
  });

  return (
    <div className="grid grid-cols-1 gap-3 md:gap-4 @3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @3xl:items-start">
      <SectionCard compact icon={CalendarDays} title={t("markCalendar")} className="@3xl:order-2">
        <BusyDaysSummary days={availability.data ?? []} emptyText={t("noBusyDays")} hint={t("calendarHint")} />
      </SectionCard>

      <section className="rounded-2xl border border-slate-200 bg-surface p-3 shadow-sm sm:p-4 @3xl:order-1">
        {availability.isPending ? (
          <div className="skeleton h-80 rounded-xl" />
        ) : (
          <AvailabilityCalendar
            days={availability.data ?? []}
            editable
            monthView
            onToggle={(day, status) => changeDay.mutate({ day, status })}
          />
        )}
      </section>
    </div>
  );
}
