import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Briefcase,
  Calendar,
  Camera,
  ChevronRight,
  Info,
  LogOut,
  MapPin,
  Navigation,
  Pencil,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";
import { AppHeader, LanguageToggle, PageContainer } from "@/components/duleko/Layout";
import { AvailabilityCalendar } from "@/components/duleko/AvailabilityCalendar";
import { RatingStars } from "@/components/duleko/Rating";
import { SkillPicker } from "@/components/duleko/SkillGrid";
import { LocationFields, type LocationValue } from "@/components/duleko/LocationFields";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, SectionTitle } from "@/components/ui/card";
import { Collapsible } from "@/components/ui/collapsible";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { FullPageLoader } from "@/components/ui/states";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import {
  clearLocation,
  getAvailability,
  getContact,
  listSkills,
  saveContact,
  setDayStatus,
  setUserSkills,
  shareLocation,
  updateProfile,
  uploadAvatar,
  getUserSkills,
  type UserSkillInput,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
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

/** A small labelled icon badge used to give every section a consistent, scannable identity. */
function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
}

function StatTile({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}

export function ProfileScreen() {
  const { t, lang, setLang } = useI18n();
  const { profile, user, refreshProfile, signOut } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [about, setAbout] = useState("");
  const [phone, setPhone] = useState("");
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
  const availability = useQuery({
    queryKey: ["availability", profile?.id],
    queryFn: () => getAvailability(profile!.id, todayKey(), toDateKey(addDays(new Date(), 35))),
    enabled: Boolean(profile?.id),
  });

  // Seed the form once the profile and its related rows have loaded.
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setAbout(profile.about ?? "");
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
    if (myPhone.data) setPhone(myPhone.data);
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
      await updateProfile(profile.id, {
        full_name: fullName.trim(),
        about: about.trim() || null,
        province: location.province,
        district: location.district,
        municipality: location.municipality,
        ward: location.ward,
        locality: location.locality,
        language: lang,
      });
      if (phone) await saveContact(profile.id, normalisePhone(phone));
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

  const shareLoc = useMutation({
    mutationFn: () =>
      new Promise<void>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error(t("locationPermissionDenied")));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            shareLocation(profile!.id, pos.coords.latitude, pos.coords.longitude).then(resolve, reject);
          },
          () => reject(new Error(t("locationPermissionDenied"))),
          { enableHighAccuracy: true, timeout: 10_000 },
        );
      }),
    onSuccess: async () => {
      await refreshProfile();
      toast(t("profileSaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const clearLoc = useMutation({
    mutationFn: () => clearLocation(profile!.id),
    onSuccess: async () => refreshProfile(),
    onError: (error) => toast(errorMessage(error), "error"),
  });

  if (!profile) return <FullPageLoader label={t("loading")} />;

  const place = locationLine(profile, lang);
  const skillList = mySkills.data ?? [];

  return (
    <>
      <AppHeader title={t("myProfile")} right={<LanguageToggle />} />
      <PageContainer>
        {/* ---- Hero identity card --------------------------------------- */}
        <div className="relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-5 pb-5 pt-8 text-center shadow-sm">
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={t("editProfile")}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
          )}

          <div className="relative mx-auto w-fit">
            <Avatar
              name={profile.full_name}
              src={avatarPreview ?? profile.avatar_url}
              size={88}
              className="ring-4 ring-white/90"
            />
            <label className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-slate-700 shadow ring-1 ring-slate-200 transition-transform hover:scale-105">
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

          <h1 className="mt-3 truncate text-lg font-semibold text-white">{profile.full_name}</h1>
          <div className="mt-1.5 flex justify-center">
            <span className="inline-flex rounded-full bg-white/90 px-2.5 py-1">
              <RatingStars value={Number(profile.rating)} count={profile.rating_count} />
            </span>
          </div>

          <div className="mt-4 inline-flex items-center gap-2.5 rounded-full bg-white/15 py-1.5 pl-4 pr-2 text-sm font-medium text-white backdrop-blur">
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                profile.is_available ? "bg-emerald-400" : "bg-white/50",
              )}
              aria-hidden
            />
            {profile.is_available ? t("availableNow") : t("notAvailable")}
            <Switch
              checked={profile.is_available}
              onChange={(next) => toggleAvailable.mutate(next)}
              aria-label={t("availableForWork")}
            />
          </div>
          <p className="mx-auto mt-2 max-w-xs text-xs text-white/70">{t("availableForWorkHint")}</p>
        </div>

        {/* ---- Quick stats ------------------------------------------------ */}
        <div className="mb-5 grid grid-cols-3 gap-2.5">
          <StatTile value={formatNumber(skillList.length, lang)} label={t("skills")} />
          <StatTile value={formatNumber(profile.rating_count, lang)} label={t("reviews")} />
          <StatTile value={formatDate(profile.created_at.slice(0, 10), lang)} label={t("memberSince")} />
        </div>

        {editing ? (
          <>
            <Card className="mb-4">
              <CardBody>
                <SectionTitle>
                  <span className="inline-flex items-center gap-2">
                    <SectionIcon icon={Info} />
                    {t("basicInfo")}
                  </span>
                </SectionTitle>
                <Field label={t("yourName")}>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} />
                </Field>
                <Field label={t("phoneNumber")} hint={t("phoneHint")}>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
                </Field>
                <Field label={t("aboutYou")}>
                  <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3} maxLength={600} />
                </Field>
              </CardBody>
            </Card>

            <Card className="mb-4">
              <CardBody>
                <SectionTitle>
                  <span className="inline-flex items-center gap-2">
                    <SectionIcon icon={MapPin} />
                    {t("whereYouAre")}
                  </span>
                </SectionTitle>
                <LocationFields value={location} onChange={setLocation} />
              </CardBody>
            </Card>

            <Card className="mb-4">
              <CardBody>
                <SectionTitle>
                  <span className="inline-flex items-center gap-2">
                    <SectionIcon icon={Briefcase} />
                    {t("yourSkills")}
                  </span>
                </SectionTitle>
                <SkillPicker skills={allSkills.data ?? []} selected={skillIds} onToggle={toggleSkill} />

                {skillIds.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {skillIds.map((id) => {
                      const skill = (allSkills.data ?? []).find((s) => s.id === id);
                      if (!skill) return null;
                      const d = draftFor(id);
                      return (
                        <div key={id} className="rounded-xl border border-slate-200 p-3">
                          <p className="mb-2 text-sm font-medium text-slate-800">
                            <span aria-hidden>{skill.emoji}</span> {skillName(skill, lang)}
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
                            <span className="text-sm text-slate-500">{lang === "ne" ? "रु" : "Rs"}</span>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              className="w-24"
                              value={d.rate_amount}
                              onChange={(e) => setDraft(id, { rate_amount: e.target.value })}
                              placeholder={t("rateAmountPlaceholder")}
                            />
                            <span className="text-sm text-slate-500">/</span>
                            <Input
                              className="flex-1"
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
              </CardBody>
            </Card>

            <div className="mb-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                {t("cancel")}
              </Button>
              <Button className="flex-1" loading={save.isPending} onClick={() => save.mutate()}>
                {t("save")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Card className="mb-4">
              <CardBody>
                <Collapsible
                  title={
                    <span className="inline-flex items-center gap-2">
                      <SectionIcon icon={Info} />
                      {t("aboutYou")}
                    </span>
                  }
                  defaultOpen
                >
                  {profile.about ? (
                    <p className="text-sm leading-relaxed text-slate-700">{profile.about}</p>
                  ) : (
                    <p className="text-sm italic text-slate-400">{t("noAboutYet")}</p>
                  )}
                  {place && (
                    <p className="mt-2.5 flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {place}
                    </p>
                  )}
                </Collapsible>
              </CardBody>
            </Card>

            <Card className="mb-4">
              <CardBody>
                <Collapsible
                  title={
                    <span className="inline-flex items-center gap-2">
                      <SectionIcon icon={Briefcase} />
                      {t("yourSkills")}
                    </span>
                  }
                  defaultOpen
                >
                  {skillList.length === 0 ? (
                    <p className="text-sm italic text-slate-400">{t("noSkillsYetProfile")}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {skillList.map((s) => {
                        const label = s.id === "other" && s.custom_label ? s.custom_label : skillName(s, lang);
                        const rate =
                          s.rate_amount != null
                            ? `${formatMoney(s.rate_amount, lang)}${s.rate_unit ? ` / ${s.rate_unit}` : ""}`
                            : null;
                        return (
                          <Badge key={s.id} tone="brand">
                            <span aria-hidden>{s.emoji}</span>
                            {label}
                            {rate ? ` · ${rate}` : ""}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </Collapsible>
              </CardBody>
            </Card>

            <Card className="mb-4">
              <CardBody>
                <Collapsible
                  title={
                    <span className="inline-flex items-center gap-2">
                      <SectionIcon icon={Navigation} />
                      {t("shareLocation")}
                    </span>
                  }
                >
                  <p className="mb-3 text-sm text-slate-500">{t("shareLocationHint")}</p>
                  <p className="mb-3 text-sm text-slate-700">
                    {profile.location_shared_at
                      ? t("locationShared", { time: relativeTime(profile.location_shared_at, lang) })
                      : t("locationNotShared")}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      loading={shareLoc.isPending}
                      onClick={() => shareLoc.mutate()}
                    >
                      <Navigation className="h-4 w-4" aria-hidden />
                      {profile.location_shared_at ? t("updateLocation") : t("shareLocation")}
                    </Button>
                    {profile.location_shared_at && (
                      <Button variant="ghost" loading={clearLoc.isPending} onClick={() => clearLoc.mutate()}>
                        {t("clearLocationAction")}
                      </Button>
                    )}
                  </div>
                </Collapsible>
              </CardBody>
            </Card>
          </>
        )}

        <Card className="mb-4">
          <CardBody>
            <Collapsible
              title={
                <span className="inline-flex items-center gap-2">
                  <SectionIcon icon={Calendar} />
                  {t("markCalendar")}
                </span>
              }
              defaultOpen
            >
              <p className="mb-3 text-sm text-slate-500">{t("calendarHint")}</p>
              <AvailabilityCalendar
                days={availability.data ?? []}
                editable
                onToggle={(day, status) => changeDay.mutate({ day, status })}
              />
            </Collapsible>
          </CardBody>
        </Card>

        <Card className="mb-4">
          <CardBody>
            <Collapsible
              title={
                <span className="inline-flex items-center gap-2">
                  <SectionIcon icon={SettingsIcon} />
                  {t("settings")}
                </span>
              }
            >
              <Link
                to="/friends"
                className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100"
              >
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-500" aria-hidden />
                  {t("myFriends")}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
              </Link>

              <Button variant="outline" className="w-full" onClick={() => void signOut()}>
                <LogOut className="h-4 w-4" aria-hidden />
                {t("signOut")}
              </Button>
            </Collapsible>
          </CardBody>
        </Card>
      </PageContainer>
    </>
  );
}
