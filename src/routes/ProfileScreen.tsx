import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { ProfileTab } from "@/router";
import {
  Award,
  Briefcase,
  Cake,
  CalendarDays,
  Camera,
  Check,
  CircleDot,
  Download,
  Eye,
  GraduationCap,
  Info,
  Link2 as LinkIcon,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Navigation,
  Pencil,
  Phone,
  Share2,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { AvailabilityCalendar } from "@/components/duleko/AvailabilityCalendar";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { RatingLine } from "@/components/duleko/WorkerList";
import { SkillPicker } from "@/components/duleko/SkillGrid";
import { VerifiedBadge } from "@/components/duleko/VerifiedBadge";
import { LocationFields, type LocationValue } from "@/components/duleko/LocationFields";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProfileCover, SectionCard } from "@/components/duleko/ProfileParts";
import { ContactPrivacyRows } from "@/components/duleko/ContactPrivacyRows";
import { ListGroup, ListRow } from "@/components/duleko/SettingsList";
import { DulekoPagesHub } from "@/components/duleko/DulekoPagesHub";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { MenuItem, MenuPanel } from "@/components/ui/menu";
import { Switch } from "@/components/ui/switch";
import { SkillTile } from "@/components/duleko/SkillIcon";
import { getCurrentPosition } from "@/lib/geolocation";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import {
  addCertificate,
  clearLocation,
  deleteMyAccount,
  getAvailability,
  getContact,
  getNotificationPrefs,
  listCertificates,
  listSkills,
  removeCertificate,
  saveContact,
  saveNotificationPrefs,
  setDayStatus,
  setLocationConsent,
  setUserSkills,
  shareLocation,
  updateProfile,
  uploadAvatar,
  verifyPassword,
  uploadCover,
  getUserSkills,
  type UserSkillInput,
} from "@/lib/queries";
import { copyLink, profileUrl, shareProfile } from "@/lib/share";
import { profileCardFilename, renderProfileCard, saveProfileCard } from "@/lib/profileCard";
import { errorMessage } from "@/lib/supabase";
import type { NotificationPrefs } from "@/lib/types";
import {
  addDays,
  cn,
  formatDate,
  formatMoney,
  formatNumber,
  isValidNepaliPhone,
  locationLine,
  normalisePhone,
  relativeTime,
  skillName,
  toDateKey,
  todayKey,
} from "@/lib/utils";

interface SkillDraft {
  rate_amount: string;
  rate_unit: string;
  custom_label: string;
  custom_note: string;
}

const emptyDraft: SkillDraft = { rate_amount: "", rate_unit: "", custom_label: "", custom_note: "" };

export function ProfileScreen() {
  const { t, lang } = useI18n();
  const { profile, user, refreshProfile, signOut } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [about, setAbout] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [education, setEducation] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [certTitle, setCertTitle] = useState("");
  const [location, setLocation] = useState<LocationValue>({
    province: null,
    district: null,
    municipality: null,
    ward: null,
    locality: null,
  });
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [skillDrafts, setSkillDrafts] = useState<Record<string, SkillDraft>>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  // Lives in the URL (?tab=) so Back from a page opened here returns to the same tab.
  const tab: ProfileTab = (useSearch({ strict: false }) as { tab?: ProfileTab }).tab ?? "overview";

  const allSkills = useQuery({ queryKey: ["skills"], queryFn: listSkills, staleTime: 30 * 60_000 });
  const mySkills = useQuery({
    queryKey: ["user-skills", profile?.id],
    queryFn: () => getUserSkills(profile!.id),
    enabled: Boolean(profile?.id),
  });
  const myPhone = useQuery({
    queryKey: ["contact", profile?.id],
    queryFn: () => getContact(profile!.id),
    enabled: Boolean(profile?.id),
  });
  const myCertificates = useQuery({
    queryKey: ["certificates", profile?.id],
    queryFn: () => listCertificates(profile!.id),
    enabled: Boolean(profile?.id),
  });
  // A full year ahead - the "mark busy days" calendar can flip forward
  // through all 12 months, so it needs the availability rows to match.
  const availability = useQuery({
    queryKey: ["availability", profile?.id],
    queryFn: () => getAvailability(profile!.id, todayKey(), toDateKey(addDays(new Date(), 365))),
    enabled: Boolean(profile?.id),
  });
  const alertPrefs = useQuery({
    queryKey: ["notification-prefs", profile?.id],
    queryFn: () => getNotificationPrefs(profile!.id),
    enabled: Boolean(profile?.id),
  });

  // The tab row scrolls sideways on a narrow phone: keep the open tab in
  // view (tapped, or landed on via Back / ?tab=), moving only the row.
  const tabRowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = tabRowRef.current;
    const active = row?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!row || !active) return;
    // Centre it; the browser clamps at either end.
    const r = row.getBoundingClientRect();
    const a = active.getBoundingClientRect();
    row.scrollLeft += a.left + a.width / 2 - (r.left + r.width / 2);
  }, [tab, editing]);

  // The ⋯ menu closes on a tap anywhere else, or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDownAnywhere(e: PointerEvent) {
      if ((e.target as HTMLElement | null)?.closest("[data-profile-menu]")) return;
      setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDownAnywhere, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownAnywhere, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  // Seed the form once the profile and its related rows have loaded.
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setAbout(profile.about ?? "");
    setBio(profile.bio ?? "");
    setAge(profile.age != null ? String(profile.age) : "");
    setEducation(profile.education ?? "");
    setLocation({
      province: profile.province,
      district: profile.district,
      municipality: profile.municipality,
      ward: profile.ward,
      locality: profile.locality,
    });
  }, [profile]);

  useEffect(() => {
    if (!mySkills.data) return;
    setSkillIds(mySkills.data.map((s) => s.id));
    const drafts: Record<string, SkillDraft> = {};
    for (const s of mySkills.data) {
      drafts[s.id] = {
        rate_amount: s.rate_amount != null ? String(s.rate_amount) : "",
        rate_unit: s.rate_unit ?? "",
        custom_label: s.custom_label ?? "",
        custom_note: s.custom_note ?? "",
      };
    }
    setSkillDrafts(drafts);
  }, [mySkills.data]);

  useEffect(() => {
    if (!myPhone.data) return;
    setPhone(myPhone.data.phone);
    setAltPhone(myPhone.data.alt_phone ?? "");
  }, [myPhone.data]);

  function toggleSkill(id: string) {
    setSkillIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
    setSkillDrafts((prev) => (prev[id] ? prev : { ...prev, [id]: { ...emptyDraft } }));
  }

  function draftFor(id: string): SkillDraft {
    return skillDrafts[id] ?? emptyDraft;
  }

  function setDraft(id: string, patch: Partial<SkillDraft>) {
    setSkillDrafts((prev) => ({ ...prev, [id]: { ...draftFor(id), ...patch } }));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      if (phone && !isValidNepaliPhone(phone)) throw new Error(t("phoneInvalid"));
      if (altPhone && !isValidNepaliPhone(altPhone)) throw new Error(t("phoneInvalid"));
      await updateProfile(profile.id, {
        full_name: fullName.trim(),
        about: about.trim() || null,
        bio: bio.trim() || null,
        age: age.trim() ? Number(age) : null,
        education: education.trim() || null,
        province: location.province,
        district: location.district,
        municipality: location.municipality,
        ward: location.ward,
        locality: location.locality,
        language: lang,
      });
      if (phone) await saveContact(profile.id, normalisePhone(phone), altPhone ? normalisePhone(altPhone) : null);
      const entries: UserSkillInput[] = skillIds.map((id) => {
        const d = draftFor(id);
        return {
          skill_id: id,
          custom_label: id === "other" ? d.custom_label.trim() || null : null,
          custom_note: id === "other" ? d.custom_note.trim() || null : null,
          rate_amount: d.rate_amount.trim() ? Number(d.rate_amount) : null,
          rate_unit: d.rate_amount.trim() && d.rate_unit.trim() ? d.rate_unit.trim() : null,
        };
      });
      await setUserSkills(profile.id, entries);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["user-skills"] });
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      await refreshProfile();
      toast(t("profileSaved"));
      setEditing(false);
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const toggleAvailable = useMutation({
    mutationFn: (next: boolean) => updateProfile(profile!.id, { is_available: next }),
    onSuccess: async () => {
      await refreshProfile();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const share = useMutation({
    mutationFn: () =>
      shareProfile(profile!.public_slug, profile!.full_name, t("shareProfileText", { name: profile!.full_name })),
    onSuccess: (result) => {
      if (result === "copied") toast(t("linkCopied"));
      else if (result === "failed") toast(t("copyFailed"), "error");
      // "shared" and "cancelled" both already spoke for themselves.
    },
  });

  // Drawn fresh on a canvas from the real profile - never a screenshot -
  // then handed to the browser as a plain PNG download.
  const downloadCard = useMutation({
    mutationFn: async () => {
      const blob = await renderProfileCard(profile!, mySkills.data ?? [], myPhone.data?.phone);
      return saveProfileCard(blob, profileCardFilename(profile!));
    },
    onSuccess: (result) => {
      if (result === "cancelled") return;
      toast(t(result === "shared" ? "cardReadyToShare" : "cardDownloaded"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  // Google sign-ins have no password to check against, so those confirm by
  // typing the word instead. A restored session doesn't always carry
  // `identities`, so app_metadata is read as a second signal rather than
  // wrongly downgrading a password account to the typed confirmation.
  const signInMethods = [
    ...(user?.identities?.map((i) => i.provider) ?? []),
    ...((user?.app_metadata?.providers as string[] | undefined) ?? []),
    user?.app_metadata?.provider,
  ];
  const hasPassword = signInMethods.includes("email");

  const copy = useMutation({
    mutationFn: () => copyLink(profileUrl(profile!.public_slug)),
    onSuccess: (result) =>
      result === "copied" ? toast(t("linkCopied")) : toast(t("copyFailed"), "error"),
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error(t("somethingWrong"));
      if (hasPassword) {
        try {
          await verifyPassword(user.email ?? "", deletePassword);
        } catch {
          throw new Error(t("wrongPassword"));
        }
      }
      await deleteMyAccount(user.id);
    },
    onSuccess: async () => {
      setDeleteOpen(false);
      toast(t("deleteAccountDone"));
      await signOut();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const deleteReady = hasPassword
    ? deletePassword.length > 0
    : deleteConfirm.trim().toUpperCase() === t("deleteAccountWord");

  const saveAlerts = useMutation({
    mutationFn: (patch: Partial<NotificationPrefs>) =>
      saveNotificationPrefs(profile!.id, {
        email_enabled: alertPrefs.data?.email_enabled ?? true,
        sms_enabled: alertPrefs.data?.sms_enabled ?? false,
        ...patch,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-prefs", profile?.id] });
      toast(t("alertPrefsSaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const changeDay = useMutation({
    mutationFn: ({ day, status }: { day: string; status: "available" | "booked" }) =>
      setDayStatus(profile!.id, day, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability", profile?.id] }),
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const changeAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!user || !profile) return;
      const url = await uploadAvatar(user.id, file);
      await updateProfile(profile.id, { avatar_url: url });
    },
    onSuccess: async () => {
      await refreshProfile();
      toast(t("profileSaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const changeCover = useMutation({
    mutationFn: async (file: File) => {
      if (!user || !profile) return;
      const url = await uploadCover(user.id, file);
      await updateProfile(profile.id, { cover_url: url });
    },
    onSuccess: async () => {
      await refreshProfile();
      toast(t("profileSaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const addCert = useMutation({
    mutationFn: async ({ title, file }: { title: string; file: File }) => {
      if (!user || !profile) return;
      await addCertificate(user.id, profile.id, title, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates", profile?.id] });
      setCertTitle("");
      toast(t("profileSaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const deleteCert = useMutation({
    mutationFn: (id: string) => removeCertificate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["certificates", profile?.id] }),
    onError: (error) => toast(errorMessage(error), "error"),
  });

  // One switch instead of a button: turning it on records consent and
  // shares a fresh location right away (the same thing AutoShareLocation
  // then keeps doing silently on every future login, no dialog, no
  // button); turning it off withdraws consent and wipes the stored
  // coordinates, same tap.
  const toggleLocationSharing = useMutation({
    mutationFn: async (next: boolean) => {
      if (next) {
        await setLocationConsent(profile!.id, "granted");
        await new Promise<void>((resolve, reject) => {
          getCurrentPosition(
            (pos) => {
              shareLocation(profile!.id, pos.coords.latitude, pos.coords.longitude).then(resolve, reject);
            },
            () => reject(new Error(t("locationPermissionDenied"))),
            { enableHighAccuracy: true, timeout: 10_000 },
          );
        });
      } else {
        await setLocationConsent(profile!.id, "declined");
        await clearLocation(profile!.id);
      }
    },
    onSuccess: async () => {
      await refreshProfile();
      toast(t("profileSaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  if (!profile) {
    return (
      <SignInRequiredScreen title={t("myProfile")}>
        <DulekoPagesHub />
      </SignInRequiredScreen>
    );
  }

  const place = locationLine(profile, lang);
  const skillList = mySkills.data ?? [];
  const certificates = myCertificates.data ?? [];
  // Every day is open by default - only "booked" is ever an explicit row -
  // so a busy-days count is the one number this data can honestly show;
  // "days available" would just restate the calendar's default state.
  const busyDaysCount = (availability.data ?? []).filter((d) => d.status === "booked").length;
  const coverSrc = coverPreview ?? profile.cover_url;

  // What people look for before they trust a profile - the nudge on the
  // Overview tab lists whichever of these are still missing.
  const strengthChecks: { done: boolean; label: string; icon: LucideIcon }[] = [
    { done: Boolean(profile.avatar_url || avatarPreview), label: t("profileItemPhoto"), icon: Camera },
    { done: Boolean(profile.about?.trim() || profile.bio?.trim()), label: t("profileItemAbout"), icon: Info },
    { done: Boolean(profile.district), label: t("profileItemLocation"), icon: MapPin },
    { done: skillList.length > 0, label: t("profileItemSkills"), icon: Briefcase },
    { done: Boolean(myPhone.data?.phone), label: t("profileItemPhone"), icon: Phone },
    { done: certificates.length > 0, label: t("profileItemCertificate"), icon: Award },
  ];
  const strengthPercent = Math.round(
    (strengthChecks.filter((c) => c.done).length / strengthChecks.length) * 100,
  );

  function startEditing() {
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectTab(next: ProfileTab) {
    // Replace, not push: switching tabs shouldn't pile up Back steps. The
    // page stays where it is - the tab bar is mid-page on a phone.
    void navigate({
      to: ".",
      search: { tab: next === "overview" ? undefined : next },
      replace: true,
      resetScroll: false,
    });
  }

  const tabs: { id: ProfileTab; label: string; badge?: number }[] = [
    { id: "overview", label: t("profileTabOverview") },
    { id: "calendar", label: t("profileTabCalendar"), badge: busyDaysCount },
    { id: "settings", label: t("profileTabSettings") },
    { id: "about", label: t("aboutTitle") },
  ];

  return (
    <>
      <AppHeader title={t("myProfile")} />
      <PageContainer className="space-y-4 md:space-y-5">
        {/* ================================================================
            Profile header, Facebook-style: wide cover, a big round photo
            overlapping its bottom-left edge, name and actions beside it,
            then the tab row. Edge to edge on a phone, a card from sm up.
            Only the photo reaches into the cover - the name, buttons and
            everything else start below it, so nothing ever overlaps. The
            card itself doesn't clip (the cover does), so the ⋯ menu can
            open past its bottom edge.
            ================================================================ */}
        <section className="@container animate-in-up relative z-10 -mx-4 -mt-3 border-b border-slate-200 bg-white shadow-sm sm:mx-0 sm:mt-0 sm:rounded-3xl sm:border">
          <ProfileCover src={coverSrc} className="h-40 overflow-hidden sm:rounded-t-3xl @md:h-52 @2xl:h-64 @4xl:h-80">
            <label className="absolute bottom-3 right-3 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-white/90 px-3 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-black/5 backdrop-blur transition-colors hover:bg-white @2xl:bottom-4 @2xl:right-4">
              <Camera className="h-4 w-4" aria-hidden />
              <span className="sr-only @lg:not-sr-only">{t("changeCover")}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 4 * 1024 * 1024) {
                    toast(t("photoTooBig"), "error");
                    return;
                  }
                  setCoverPreview(URL.createObjectURL(file));
                  changeCover.mutate(file);
                }}
              />
            </label>
          </ProfileCover>

          <div className="px-4 @2xl:px-8">
            <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-end @2xl:gap-6">
              {/* Photo: the only thing pulled up into the cover. */}
              <div className="relative z-10 -mt-[4.5rem] h-[7.5rem] w-[7.5rem] shrink-0 self-start rounded-full bg-white p-1 shadow-md @2xl:-mt-[5.5rem] @2xl:h-[10.5rem] @2xl:w-[10.5rem]">
                <Avatar
                  name={profile.full_name}
                  src={avatarPreview ?? profile.avatar_url}
                  size={160}
                  className="h-full! w-full!"
                />
                <label className="absolute bottom-1 right-1 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow ring-2 ring-white transition-colors hover:bg-slate-200 @2xl:bottom-2 @2xl:right-2">
                  <Camera className="h-4 w-4" aria-hidden />
                  <span className="sr-only">{t("changePhoto")}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        toast(t("photoTooBig"), "error");
                        return;
                      }
                      setAvatarPreview(URL.createObjectURL(file));
                      changeAvatar.mutate(file);
                    }}
                  />
                </label>
              </div>

              <div className="min-w-0 flex-1 @2xl:pb-4">
                <h2 className="flex min-w-0 items-center gap-2 text-2xl font-bold leading-tight tracking-tight text-slate-900 @2xl:text-[2rem]">
                  <span className="truncate">{profile.full_name}</span>
                  <VerifiedBadge staffRole={profile.staff_role} verified={profile.is_verified} size={22} />
                </h2>
                {profile.bio && <p className="mt-1 text-[15px] leading-snug text-slate-600">{profile.bio}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                  <RatingLine rating={profile.rating} count={profile.rating_count} className="text-sm" />
                  <span aria-hidden className="text-slate-300">
                    ·
                  </span>
                  <span className="font-medium text-slate-600">
                    {t("skillsCount", { count: formatNumber(skillList.length, lang) })}
                  </span>
                  {profile.is_available && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800 ring-1 ring-brand-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />
                      {t("availableForWork")}
                    </span>
                  )}
                </div>
              </div>

              {!editing && (
                <div className="relative flex w-full items-center gap-2 @2xl:w-auto @2xl:pb-4" data-profile-menu>
                  <Button className="flex-1 @2xl:flex-none" onClick={startEditing}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    {t("editProfile")}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 @2xl:flex-none"
                    onClick={() => share.mutate()}
                    aria-label={t("shareProfile")}
                  >
                    <Share2 className="h-4 w-4" aria-hidden />
                    <span className="hidden @xs:inline">{t("shareShort")}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    loading={downloadCard.isPending}
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label={t("profileOptions")}
                    title={t("profileOptions")}
                  >
                    {!downloadCard.isPending && <MoreHorizontal className="h-4.5 w-4.5" aria-hidden />}
                  </Button>

                  {menuOpen && (
                    <MenuPanel className="w-60">
                      <MenuItem
                        icon={Download}
                        label={t("downloadCard")}
                        onClick={() => {
                          setMenuOpen(false);
                          downloadCard.mutate();
                        }}
                      />
                      <MenuItem
                        icon={LinkIcon}
                        label={t("copyLink")}
                        onClick={() => {
                          setMenuOpen(false);
                          copy.mutate();
                        }}
                      />
                      <MenuItem
                        icon={Eye}
                        label={t("viewPublicProfile")}
                        onClick={() => {
                          setMenuOpen(false);
                          navigate({ to: "/worker/$workerId", params: { workerId: profile.id } });
                        }}
                      />
                      {profile.staff_role && (
                        <MenuItem
                          icon={ShieldCheck}
                          label={t("moderation")}
                          onClick={() => {
                            setMenuOpen(false);
                            navigate({ to: "/moderation" });
                          }}
                        />
                      )}
                    </MenuPanel>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tab row - scrolls sideways instead of wrapping on a narrow phone. */}
          {editing ? (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 bg-brand-50/60 px-4 py-3 sm:rounded-b-3xl @2xl:px-8">
              <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-brand-900">
                <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{t("editingProfile")}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                {t("cancel")}
              </Button>
            </div>
          ) : (
            <div
              ref={tabRowRef}
              role="tablist"
              aria-label={t("profileSectionsNav")}
              className="mt-4 flex overflow-x-auto border-t border-slate-200 px-2 [scrollbar-width:none] @2xl:px-6 [&::-webkit-scrollbar]:hidden"
            >
              {tabs.map(({ id, label, badge }) => {
                const selected = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`profile-tab-${id}`}
                    aria-selected={selected}
                    aria-controls={`profile-panel-${id}`}
                    onClick={() => selectTab(id)}
                    className="group relative shrink-0 px-1 py-1.5"
                  >
                    <span
                      className={cn(
                        "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                        selected ? "text-brand-700" : "text-slate-600 group-hover:bg-slate-100 group-hover:text-slate-900",
                      )}
                    >
                      {label}
                      {badge ? (
                        <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-bold leading-5 text-amber-800">
                          {formatNumber(badge, lang)}
                        </span>
                      ) : null}
                    </span>
                    {selected && (
                      <span className="absolute inset-x-1 bottom-0 h-[3px] rounded-t-full bg-brand-700" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {editing ? (
          /* ==============================================================
             Edit mode
             ============================================================== */
          <div className="@container space-y-4 md:space-y-5">
            <div className="grid grid-cols-1 gap-4 md:gap-5 @3xl:grid-cols-2 @3xl:items-start">
              <SectionCard icon={Info} title={t("basicInfo")}>
                <Field label={t("yourName")}>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} />
                </Field>
                <Field label={`${t("bio")} (${t("optional")})`} hint={t("bioHint")}>
                  <Input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={100} />
                </Field>
                <Field label={t("aboutYou")}>
                  <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={4} maxLength={600} />
                </Field>
                <div className="grid grid-cols-1 gap-x-3 @md:grid-cols-2">
                  <Field label={`${t("age")} (${t("optional")})`}>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={14}
                      max={100}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </Field>
                  <Field label={`${t("highestEducation")} (${t("optional")})`}>
                    <Input value={education} onChange={(e) => setEducation(e.target.value)} maxLength={100} />
                  </Field>
                </div>
              </SectionCard>

              <div className="space-y-4 md:space-y-5">
                <SectionCard icon={Phone} title={t("phoneNumber")}>
                  <Field label={t("phoneNumber")} hint={t("phoneHint")}>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
                  </Field>
                  <Field label={`${t("altPhone")} (${t("optional")})`} className="mb-0">
                    <Input value={altPhone} onChange={(e) => setAltPhone(e.target.value)} inputMode="tel" />
                  </Field>
                </SectionCard>

                <SectionCard icon={MapPin} title={t("whereYouAre")}>
                  <LocationFields value={location} onChange={setLocation} />
                </SectionCard>
              </div>
            </div>

            <SectionCard icon={Briefcase} title={t("yourSkills")}>
              <SkillPicker skills={allSkills.data ?? []} selected={skillIds} onToggle={toggleSkill} />

              {skillIds.length > 0 && (
                <div className="mt-5 grid grid-cols-1 gap-3 @2xl:grid-cols-2">
                  {skillIds.map((id) => {
                    const skill = (allSkills.data ?? []).find((s) => s.id === id);
                    if (!skill) return null;
                    const d = draftFor(id);
                    return (
                      <div key={id} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 sm:p-4">
                        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <SkillTile skillId={skill.id} className="h-8 w-8 rounded-lg bg-white ring-1 ring-slate-200" />
                          {skillName(skill, lang)}
                        </p>
                        {id === "other" && (
                          <>
                            <Field label={t("othersSkillLabel")}>
                              <Input
                                value={d.custom_label}
                                onChange={(e) => setDraft(id, { custom_label: e.target.value })}
                                placeholder={t("othersSkillPlaceholder")}
                                maxLength={60}
                              />
                            </Field>
                            <Field label={t("othersSkillNoteLabel")}>
                              <Input
                                value={d.custom_note}
                                onChange={(e) => setDraft(id, { custom_note: e.target.value })}
                                placeholder={t("othersSkillNotePlaceholder")}
                                maxLength={300}
                              />
                            </Field>
                          </>
                        )}
                        <p className="mb-1.5 text-xs text-slate-500">{t("rateHint")}</p>
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-sm font-medium text-slate-500">
                            {lang === "ne" ? "रु" : "Rs"}
                          </span>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            className="w-24 shrink-0 bg-white"
                            value={d.rate_amount}
                            onChange={(e) => setDraft(id, { rate_amount: e.target.value })}
                            placeholder={t("rateAmountPlaceholder")}
                          />
                          <span className="shrink-0 text-sm text-slate-400">/</span>
                          <Input
                            className="min-w-0 flex-1 bg-white"
                            value={d.rate_unit}
                            onChange={(e) => setDraft(id, { rate_unit: e.target.value })}
                            placeholder={t("rateUnitPlaceholder")}
                            maxLength={30}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Stays on screen while scrolling the form - above the phone
                tab bar, at the bottom edge once the sidebar takes over. */}
            <div className="sticky bottom-[calc(4.25rem+var(--sab))] z-20 flex gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg shadow-slate-900/10 backdrop-blur md:bottom-4">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                {t("cancel")}
              </Button>
              <Button className="flex-[2] sm:flex-1" loading={save.isPending} onClick={() => save.mutate()}>
                <Check className="h-4 w-4" aria-hidden />
                {t("saveChanges")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="@container">
            {tab === "overview" && (
              /* Same plain list style as Settings. Intro on the left, the
                 work on the right once there's room; stacked on a phone. */
              <div
                id="profile-panel-overview"
                role="tabpanel"
                aria-labelledby="profile-tab-overview"
                className="animate-in-up grid grid-cols-1 gap-6 @2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @2xl:items-start"
              >
                <div className="@container min-w-0 space-y-6">
                  <ListGroup>
                    <ListRow
                      icon={CircleDot}
                      title={profile.is_available ? t("availableForWork") : t("notAvailable")}
                      hint={profile.is_available ? t("availabilityOnHint") : t("availabilityOffHint")}
                      trailing={
                        <Switch
                          checked={profile.is_available}
                          disabled={toggleAvailable.isPending}
                          onChange={(next) => toggleAvailable.mutate(next)}
                          aria-label={t("availableForWork")}
                        />
                      }
                    />
                  </ListGroup>

                  <ListGroup title={t("profileIntro")} action={{ label: t("edit"), onClick: startEditing }}>
                    {profile.about ? (
                      <p className="whitespace-pre-line px-4 py-3.5 text-[15px] leading-7 text-slate-700">
                        {profile.about}
                      </p>
                    ) : (
                      <ListRow icon={Pencil} title={t("noAboutYet")} onClick={startEditing} />
                    )}
                    {place && <ListRow icon={MapPin} title={t("livesIn", { place })} />}
                    {myPhone.data?.phone && <ListRow icon={Phone} title={myPhone.data.phone} />}
                    {myPhone.data?.alt_phone && <ListRow icon={Phone} title={myPhone.data.alt_phone} />}
                    {profile.education && <ListRow icon={GraduationCap} title={profile.education} />}
                    {profile.age != null && (
                      <ListRow icon={Cake} title={t("yearsOld", { count: formatNumber(profile.age, lang) })} />
                    )}
                    <ListRow
                      icon={CalendarDays}
                      title={t("joinedOn", { date: formatDate(profile.created_at.slice(0, 10), lang) })}
                    />
                  </ListGroup>
                </div>

                <div className="@container min-w-0 space-y-6">
                  {strengthPercent < 100 && (
                    <ProfileStrength percent={strengthPercent} checks={strengthChecks} onComplete={startEditing} />
                  )}

                  <ListGroup
                    title={
                      skillList.length > 0
                        ? `${t("skillsAndRates")} · ${formatNumber(skillList.length, lang)}`
                        : t("skillsAndRates")
                    }
                    action={skillList.length > 0 ? { label: t("edit"), onClick: startEditing } : undefined}
                  >
                    {skillList.length === 0 ? (
                      <ListRow
                        icon={Briefcase}
                        title={t("addYourSkills")}
                        hint={t("noSkillsYetProfileHint")}
                        onClick={startEditing}
                      />
                    ) : (
                      skillList.map((s) => {
                        const label = s.id === "other" && s.custom_label ? s.custom_label : skillName(s, lang);
                        const rate =
                          s.rate_amount != null
                            ? `${formatMoney(s.rate_amount, lang)}${s.rate_unit ? ` / ${s.rate_unit}` : ""}`
                            : null;
                        return (
                          <div key={s.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                            <SkillTile skillId={s.id} className="h-9 w-9 shrink-0 rounded-lg bg-slate-50" />
                            {/* The rate gets its own line so it never has to be cut short. */}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[15px] font-medium text-slate-900">{label}</p>
                              {rate && <p className="text-sm font-medium text-brand-700">{rate}</p>}
                              {s.custom_note && <p className="truncate text-xs text-slate-500">{s.custom_note}</p>}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </ListGroup>

                  <ListGroup
                    title={
                      certificates.length > 0
                        ? `${t("certificates")} · ${formatNumber(certificates.length, lang)}`
                        : t("certificates")
                    }
                    footer={`${t("certificatesHint")} ${t("uploadCertificateHint")}`}
                  >
                    {certificates.map((c) => (
                      <div key={c.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                        <Award className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <a
                            href={c.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-[15px] font-medium text-slate-900 hover:text-brand-700 hover:underline"
                          >
                            {c.title}
                          </a>
                          <p className="text-xs text-slate-500">{formatDate(c.created_at.slice(0, 10), lang)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteCert.mutate(c.id)}
                          aria-label={t("delete")}
                          title={t("delete")}
                          className="-mr-1.5 shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    ))}

                    {/* Add one: name it, then pick the file. */}
                    <div className="flex flex-col gap-2 p-3 @md:flex-row @md:items-center">
                      <Input
                        value={certTitle}
                        onChange={(e) => setCertTitle(e.target.value)}
                        placeholder={t("certificateTitlePlaceholder")}
                        maxLength={100}
                        aria-label={t("addCertificate")}
                        className="min-w-0 flex-1"
                      />
                      <label
                        className={cn(
                          "inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50",
                          (!certTitle.trim() || addCert.isPending) && "pointer-events-none opacity-50",
                        )}
                      >
                        <Upload className="h-4 w-4" aria-hidden />
                        {t("upload")}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="hidden"
                          disabled={!certTitle.trim() || addCert.isPending}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file || !certTitle.trim()) return;
                            if (file.size > 5 * 1024 * 1024) {
                              toast(t("photoTooBig"), "error");
                              return;
                            }
                            addCert.mutate({ title: certTitle.trim(), file });
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </ListGroup>
                </div>
              </div>
            )}

            {tab === "calendar" && (
              <div
                id="profile-panel-calendar"
                role="tabpanel"
                aria-labelledby="profile-tab-calendar"
                className="animate-in-up mx-auto max-w-2xl"
              >
                <ListGroup title={t("markCalendar")} footer={t("calendarHint")}>
                  <ListRow
                    icon={CalendarDays}
                    title={
                      busyDaysCount > 0
                        ? t("daysMarkedBusy", { count: formatNumber(busyDaysCount, lang) })
                        : t("noBusyDays")
                    }
                  />
                  <div className="p-3 sm:p-5">
                    <AvailabilityCalendar
                      days={availability.data ?? []}
                      editable
                      monthView
                      onToggle={(day, status) => changeDay.mutate({ day, status })}
                    />
                  </div>
                </ListGroup>
              </div>
            )}

            {/* Settings and About share one plain list style and a readable
                column width, on every screen size. */}
            {tab === "settings" && (
              <div
                id="profile-panel-settings"
                role="tabpanel"
                aria-labelledby="profile-tab-settings"
                className="animate-in-up mx-auto max-w-2xl space-y-6"
              >
                <ListGroup title={t("settingsPreferences")}>
                  <ListRow
                    icon={Mail}
                    title={t("emailAlerts")}
                    hint={t("emailAlertsHint")}
                    trailing={
                      <Switch
                        checked={alertPrefs.data?.email_enabled ?? true}
                        onChange={(next) => saveAlerts.mutate({ email_enabled: next })}
                        aria-label={t("emailAlerts")}
                      />
                    }
                  />
                  <ListRow
                    icon={MessageSquare}
                    title={t("smsAlerts")}
                    hint={t("smsAlertsHint")}
                    trailing={
                      <Switch
                        checked={alertPrefs.data?.sms_enabled ?? false}
                        onChange={(next) => saveAlerts.mutate({ sms_enabled: next })}
                        aria-label={t("smsAlerts")}
                      />
                    }
                  />
                </ListGroup>

                <ListGroup title={t("settingsPrivacy")}>
                  <ListRow
                    icon={Navigation}
                    title={t("shareLocation")}
                    hint={
                      profile.location_consent === "granted"
                        ? profile.location_shared_at
                          ? t("locationShared", { time: relativeTime(profile.location_shared_at, lang) })
                          : t("locationSharedPending")
                        : t("shareLocationHint")
                    }
                    trailing={
                      <Switch
                        checked={profile.location_consent === "granted"}
                        disabled={toggleLocationSharing.isPending}
                        onChange={(next) => toggleLocationSharing.mutate(next)}
                        aria-label={t("shareLocation")}
                      />
                    }
                  />
                  <ContactPrivacyRows />
                </ListGroup>

                <ListGroup title={t("accountTitle")}>
                  <ListRow icon={Users} title={t("myFriends")} to="/friends" />
                  <ListRow
                    icon={Eye}
                    title={t("viewPublicProfile")}
                    to="/worker/$workerId"
                    params={{ workerId: profile.id }}
                  />
                  <ListRow
                    icon={LinkIcon}
                    title={t("copyLink")}
                    hint={<span className="break-all">{profileUrl(profile.public_slug)}</span>}
                    onClick={() => copy.mutate()}
                    trailing={null}
                  />
                  <ListRow
                    icon={Share2}
                    title={t("shareProfile")}
                    hint={t("shareProfileHint")}
                    onClick={() => share.mutate()}
                    trailing={null}
                  />
                </ListGroup>

                <ListGroup>
                  <ListRow icon={LogOut} title={t("signOut")} tone="danger" onClick={() => setSignOutConfirmOpen(true)} />
                  <ListRow
                    icon={Trash2}
                    title={t("deleteAccount")}
                    hint={t("deleteAccountHint")}
                    tone="danger"
                    onClick={() => {
                      setDeleteConfirm("");
                      setDeletePassword("");
                      setDeleteOpen(true);
                    }}
                  />
                </ListGroup>
              </div>
            )}

            {tab === "about" && (
              <div
                id="profile-panel-about"
                role="tabpanel"
                aria-labelledby="profile-tab-about"
                className="animate-in-up mx-auto max-w-2xl"
              >
                <DulekoPagesHub />
              </div>
            )}
          </div>
        )}
      </PageContainer>

      {/* One tap on the button should never be the whole action - a
          plain Cancel/Sign out is enough here since it's reversible,
          unlike delete account below. */}
      <Dialog
        open={signOutConfirmOpen}
        onClose={() => setSignOutConfirmOpen(false)}
        title={t("signOutConfirmTitle")}
        footer={
          <>
            <Button variant="outline" onClick={() => setSignOutConfirmOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setSignOutConfirmOpen(false);
                void signOut();
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {t("signOut")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">{t("signOutConfirmBody")}</p>
      </Dialog>

      {/* Proving it is really you, rather than a plain Yes/No, so this
          can't be tapped through by accident - there is no undo. */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("deleteAccount")}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              loading={deleteAccount.isPending}
              disabled={!deleteReady}
              onClick={() => deleteAccount.mutate()}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {t("deleteAccount")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">{t("deleteAccountBody")}</p>

        {hasPassword ? (
          <Field label={t("deleteAccountPasswordLabel")} className="mt-4">
            <Input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter" && deleteReady) deleteAccount.mutate();
              }}
            />
          </Field>
        ) : (
          // Signed in with Google: there is no password of ours to check.
          <Field label={t("deleteAccountConfirmLabel")} className="mt-4">
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={t("deleteAccountWord")}
              autoComplete="off"
            />
          </Field>
        )}
      </Dialog>
    </>
  );
}

/** How complete the profile is, and what's still missing - one slim line and a bar. */
function ProfileStrength({
  percent,
  checks,
  onComplete,
}: {
  percent: number;
  checks: { done: boolean; label: string; icon: LucideIcon }[];
  onComplete: () => void;
}) {
  const { t, lang } = useI18n();
  const missing = checks.filter((c) => !c.done).map((c) => c.label);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-[15px] font-medium text-slate-900">
          {t("profileCompleteTitle", { percent: formatNumber(percent, lang) })}
        </p>
        <button
          type="button"
          onClick={onComplete}
          className="-my-1 shrink-0 rounded-md px-1.5 py-1 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
        >
          {t("completeProfile")}
        </button>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("profileCompleteTitle", { percent: formatNumber(percent, lang) })}
      >
        <div className="h-full rounded-full bg-brand-600 transition-[width] duration-700" style={{ width: `${percent}%` }} />
      </div>
      {missing.length > 0 && <p className="mt-2.5 text-xs leading-relaxed text-slate-500">{missing.join(" · ")}</p>}
    </section>
  );
}
