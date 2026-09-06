import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Award,
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
  Trash2,
  Users,
} from "lucide-react";
import { AppHeader, LanguageToggle, PageContainer } from "@/components/duleko/Layout";
import { AvailabilityCalendar } from "@/components/duleko/AvailabilityCalendar";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { RatingStars } from "@/components/duleko/Rating";
import { SkillPicker } from "@/components/duleko/SkillGrid";
import { LocationFields, type LocationValue } from "@/components/duleko/LocationFields";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, SectionIcon, SectionTitle } from "@/components/ui/card";
import { Collapsible } from "@/components/ui/collapsible";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import {
  addCertificate,
  clearLocation,
  getAvailability,
  getContact,
  listCertificates,
  listSkills,
  removeCertificate,
  saveContact,
  setDayStatus,
  setUserSkills,
  shareLocation,
  updateProfile,
  uploadAvatar,
  uploadCover,
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

export function ProfileScreen() {
  const { t, lang, setLang } = useI18n();
  const { profile, user, refreshProfile, signOut } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
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

  if (!profile) return <SignInRequiredScreen title={t("myProfile")} />;

  const place = locationLine(profile, lang);
  const skillList = mySkills.data ?? [];

  return (
    <>
      <AppHeader title={t("myProfile")} right={<LanguageToggle />} />
      <PageContainer>
        {/* ---- Identity card: one flowing hierarchy, not competing blocks - */}
        <Card className="relative mb-5 overflow-hidden">
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={t("editProfile")}
              className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
          )}

          {/* Cover photo - a work-site / professional shot behind the avatar. */}
          <div className="relative h-32 w-full bg-gradient-to-br from-slate-100 to-slate-200 sm:h-40">
            {(coverPreview ?? profile.cover_url) && (
              <img
                src={coverPreview ?? profile.cover_url ?? undefined}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <label className="absolute bottom-2.5 right-2.5 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-slate-700 shadow ring-1 ring-slate-200 backdrop-blur transition-transform hover:scale-105">
              <Camera className="h-4 w-4" aria-hidden />
              <span className="sr-only">{t("changeCover")}</span>
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
          </div>

          <div className="px-5 pb-5">
            <div className="relative z-10 -mt-14 inline-block">
              <Avatar
                name={profile.full_name}
                src={avatarPreview ?? profile.avatar_url}
                size={84}
                online
                className="shadow-md ring-4 ring-white"
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

            <h1 className="mt-3 truncate text-xl font-bold text-slate-900">{profile.full_name}</h1>
            <div className="mt-1.5">
              <RatingStars value={Number(profile.rating)} count={profile.rating_count} />
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  profile.is_available ? "bg-green-500" : "bg-slate-300",
                )}
                aria-hidden
              />
              <span className="text-sm font-medium text-slate-700">
                {profile.is_available ? t("availableNow") : t("notAvailable")}
              </span>
              <Switch
                checked={profile.is_available}
                onChange={(next) => toggleAvailable.mutate(next)}
                aria-label={t("availableForWork")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
            <div className="px-2 py-3 text-center">
              <p className="text-lg font-bold text-slate-900">{formatNumber(skillList.length, lang)}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t("skills")}</p>
            </div>
            <div className="px-2 py-3 text-center">
              <p className="text-lg font-bold text-slate-900">{formatNumber(profile.rating_count, lang)}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t("reviews")}</p>
            </div>
            <div className="px-2 py-3 text-center">
              <p className="text-lg font-bold text-slate-900">
                {formatDate(profile.created_at.slice(0, 10), lang)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{t("memberSince")}</p>
            </div>
          </div>
        </Card>

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
                <Field label={`${t("altPhone")} (${t("optional")})`}>
                  <Input value={altPhone} onChange={(e) => setAltPhone(e.target.value)} inputMode="tel" />
                </Field>
                <Field label={`${t("bio")} (${t("optional")})`} hint={t("bioHint")}>
                  <Input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={100} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
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
                  {profile.bio && <p className="mb-2 text-sm font-medium text-slate-800">{profile.bio}</p>}
                  {profile.about ? (
                    <p className="text-sm leading-relaxed text-slate-700">{profile.about}</p>
                  ) : (
                    <p className="text-sm italic text-slate-400">{t("noAboutYet")}</p>
                  )}
                  {(profile.age != null || profile.education) && (
                    <div className="mt-2.5 flex flex-wrap gap-3 text-sm text-slate-600">
                      {profile.age != null && (
                        <span>{t("yearsOld", { count: formatNumber(profile.age, lang) })}</span>
                      )}
                      {profile.education && <span>{profile.education}</span>}
                    </div>
                  )}
                  {place && (
                    <p className="mt-2.5 flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {place}
                    </p>
                  )}
                  {myPhone.data?.alt_phone && (
                    <p className="mt-2.5 text-sm text-slate-500">
                      {t("altPhone")}: {myPhone.data.alt_phone}
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
                monthView
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
                  <SectionIcon icon={Award} />
                  {t("certificates")}
                </span>
              }
            >
              <p className="mb-3 text-sm text-slate-500">{t("certificatesHint")}</p>
              {(myCertificates.data?.length ?? 0) > 0 && (
                <ul className="mb-3 space-y-2">
                  {(myCertificates.data ?? []).map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm"
                    >
                      <Award className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
                      <a
                        href={c.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 truncate font-medium text-slate-800 hover:underline"
                      >
                        {c.title}
                      </a>
                      <button
                        type="button"
                        onClick={() => deleteCert.mutate(c.id)}
                        aria-label={t("delete")}
                        className="shrink-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-2">
                <Input
                  value={certTitle}
                  onChange={(e) => setCertTitle(e.target.value)}
                  placeholder={t("certificateTitlePlaceholder")}
                  maxLength={100}
                  className="flex-1"
                />
                <label
                  className={cn(
                    "inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50",
                    (!certTitle.trim() || addCert.isPending) && "pointer-events-none opacity-50",
                  )}
                >
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
