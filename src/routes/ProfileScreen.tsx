import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { ProfileTab } from "@/router";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { DulekoPagesHub } from "@/components/duleko/DulekoPagesHub";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { CalendarTab } from "@/components/duleko/profile/CalendarTab";
import { OverviewTab } from "@/components/duleko/profile/OverviewTab";
import { PaymentsTab } from "@/components/duleko/profile/PaymentsTab";
import { ProfileEditors, type EditorKind } from "@/components/duleko/profile/ProfileEditors";
import { ProfileHero, usePhotoUpload, type StatTarget } from "@/components/duleko/profile/ProfileHero";
import { ReviewsDialog } from "@/components/duleko/profile/ReviewsDialog";
import { StickyTabBar, useStickyTabs } from "@/components/duleko/profile/ProfileUI";
import { AboutDulekoView, SettingsTab } from "@/components/duleko/profile/SettingsTab";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";

/** The tabs in the bar. About Duleko opens from Settings, so it has none. */
const TABS: { id: Exclude<ProfileTab, "about">; label: StringKey }[] = [
  { id: "overview", label: "profileTabOverview" },
  { id: "calendar", label: "profileTabCalendar" },
  { id: "payments", label: "profileTabPayments" },
  { id: "settings", label: "profileTabSettings" },
];

/**
 * Your own profile: who you are (the header), then four tabs - the profile
 * as others read it, your busy days, how you get paid, and settings. Each
 * section edits in its own short sheet rather than one long form.
 */
export function ProfileScreen() {
  const { t } = useI18n();
  const { profile } = useSession();
  const navigate = useNavigate();
  // Lives in the URL (?tab=) so Back from a page opened here returns to the same tab.
  const tab: ProfileTab = (useSearch({ strict: false }) as { tab?: ProfileTab }).tab ?? "overview";
  const activeTab = tab === "about" ? "settings" : tab;

  const [editor, setEditor] = useState<EditorKind | null>(null);
  const avatar = usePhotoUpload("avatar");
  const cover = usePhotoUpload("cover");

  const sticky = useStickyTabs(tab);
  const [jumpTo, setJumpTo] = useState<"skills" | null>(null);
  const [reviewsOpen, setReviewsOpen] = useState(false);

  // A tapped number in the header: scroll to its section on Overview.
  useEffect(() => {
    if (!jumpTo || tab !== "overview") return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`profile-${jumpTo}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setJumpTo(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [jumpTo, tab]);

  if (!profile) {
    return (
      <SignInRequiredScreen title={t("myProfile")}>
        <DulekoPagesHub />
      </SignInRequiredScreen>
    );
  }

  function selectTab(next: ProfileTab) {
    if (next === tab) return;
    sticky.willSwitch();
    // Replace, not push: switching tabs shouldn't pile up Back steps.
    void navigate({
      to: ".",
      search: { tab: next === "overview" ? undefined : next },
      replace: true,
      resetScroll: false,
    });
  }

  function jump(target: StatTarget) {
    if (target === "calendar") {
      selectTab("calendar");
      return;
    }
    if (target === "reviews") {
      setReviewsOpen(true);
      return;
    }
    if (tab !== "overview") selectTab("overview");
    setJumpTo(target);
  }

  return (
    <>
      <AppHeader title={t("myProfile")} />
      <PageContainer className="space-y-3 md:space-y-4">
        <ProfileHero avatar={avatar} cover={cover} onEdit={() => setEditor("intro")} onJump={jump} />

        <StickyTabBar
          tabs={TABS.map(({ id, label }) => ({ id, label: t(label) }))}
          active={activeTab}
          onSelect={selectTab}
          label={t("profileSectionsNav")}
          idPrefix="profile"
          sticky={sticky}
        />

        <div
          id="profile-panel"
          role="tabpanel"
          aria-labelledby={`profile-tab-${activeTab}`}
          key={tab}
          className="@container animate-in-up"
        >
          {tab === "overview" && <OverviewTab onEdit={setEditor} avatar={avatar} />}
          {tab === "calendar" && <CalendarTab />}
          {tab === "payments" && <PaymentsTab />}
          {tab === "settings" && <SettingsTab onOpenAbout={() => selectTab("about")} />}
          {tab === "about" && <AboutDulekoView onBack={() => selectTab("settings")} />}
        </div>
      </PageContainer>

      <ProfileEditors open={editor} onClose={() => setEditor(null)} />
      <ReviewsDialog open={reviewsOpen} onClose={() => setReviewsOpen(false)} />
    </>
  );
}
