import { Moon, Smartphone, Sun } from "lucide-react";
import { ListRow } from "@/components/duleko/SettingsList";
import { Segmented } from "@/components/ui/segmented";
import { useI18n } from "@/lib/i18n";
import { useIsDark, useThemeChoice } from "@/lib/theme";

/**
 * Settings > Appearance: one row, Auto (follow the phone) / Light / Dark
 * as three icons. The new theme spreads out from the icon that was tapped.
 */
export function AppearancePicker() {
  const { t } = useI18n();
  const [theme, setTheme] = useThemeChoice();
  const dark = useIsDark();
  const HeaderIcon = dark ? Moon : Sun;

  return (
    <ListRow
      icon={HeaderIcon}
      title={t("appearance")}
      trailing={
        <Segmented
          label={t("appearance")}
          iconOnly
          value={theme}
          onChange={(next, el) => {
            const box = el.getBoundingClientRect();
            setTheme(next, { x: box.left + box.width / 2, y: box.top + box.height / 2 });
          }}
          options={[
            { value: "system", label: t("themeSystem"), icon: Smartphone },
            { value: "light", label: t("themeLight"), icon: Sun },
            { value: "dark", label: t("themeDark"), icon: Moon },
          ]}
        />
      }
    />
  );
}
