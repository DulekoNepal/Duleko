import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { districtLabel, municipalityLabel } from "./nepal";
import type { Lang, Profile, Skill } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function skillName(skill: Skill | null | undefined, lang: Lang): string {
  if (!skill) return "";
  return lang === "ne" ? skill.name_ne : skill.name_en;
}

/** "Ward 4, Chandrauta, Kapilvastu" — skips whatever is missing. */
export function locationLine(
  p: Pick<Profile, "province" | "district" | "municipality" | "ward" | "locality">,
  lang: Lang = "en",
): string {
  const wardLabel = lang === "ne" ? "वडा" : "Ward";
  const parts = [
    p.locality || null,
    p.ward ? `${wardLabel} ${p.ward}` : null,
    municipalityLabel(p.district, p.municipality, lang) || null,
    districtLabel(p.district, lang) || null,
  ].filter(Boolean) as string[];
  return parts.slice(0, 3).join(", ");
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Local (not UTC) YYYY-MM-DD — important, since a work date is a calendar day. */
export function toDateKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

const NE_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

export function formatNumber(value: number | string, lang: Lang): string {
  const s = String(value);
  if (lang !== "ne") return s;
  return s.replace(/[0-9]/g, (d) => NE_DIGITS[Number(d)]);
}

export function formatMoney(amount: number | null | undefined, lang: Lang): string {
  if (amount == null) return lang === "ne" ? "कुरा गरेर" : "To discuss";
  const rounded = Math.round(amount).toLocaleString("en-IN");
  return `${lang === "ne" ? "रु" : "Rs"} ${formatNumber(rounded, lang)}`;
}

export function formatDate(iso: string, lang: Lang): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const out = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return lang === "ne" ? formatNumber(out, lang) : out;
}

export function relativeTime(iso: string, lang: Lang): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  const pick = (en: string, ne: string) => (lang === "ne" ? ne : en);
  if (mins < 1) return pick("just now", "अहिले");
  if (mins < 60) return `${formatNumber(mins, lang)} ${pick("min ago", "मिनेट अघि")}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${formatNumber(hours, lang)} ${pick("hr ago", "घण्टा अघि")}`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${formatNumber(days, lang)} ${pick("d ago", "दिन अघि")}`;
  return formatDate(new Date(then).toISOString().slice(0, 10), lang);
}

/** Nepali mobile numbers: 10 digits starting 97/98, optional +977. */
export function normalisePhone(input: string): string {
  return input.replace(/[^\d+]/g, "");
}

export function isValidNepaliPhone(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("977") ? digits.slice(3) : digits;
  return /^9[678]\d{8}$/.test(local) || /^0?1\d{7}$/.test(local);
}
