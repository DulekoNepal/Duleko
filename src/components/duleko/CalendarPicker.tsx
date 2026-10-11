import { CalendarDays } from "lucide-react";
import { ListRow } from "@/components/duleko/SettingsList";
import { Segmented } from "@/components/ui/segmented";
import { useI18n } from "@/lib/i18n";

/** Settings > Dates: one row, Nepali (BS) - the default - or English (AD). */
export function CalendarPicker() {
  const { t, calendar, setCalendar } = useI18n();
  return (
    <ListRow
      icon={CalendarDays}
      title={t("dateCalendarTitle")}
      trailing={
        <Segmented
          label={t("dateCalendarTitle")}
          value={calendar}
          onChange={(next) => setCalendar(next)}
          options={[
            { value: "bs", label: t("dateCalendarBs") },
            { value: "ad", label: t("dateCalendarAd") },
          ]}
        />
      }
    />
  );
}
