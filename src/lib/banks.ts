import type { PaymentKind, PaymentMethod } from "./types";
import adbl from "@/assets/banks/adbl.webp";
import citizens from "@/assets/banks/citizens.webp";
import esewa from "@/assets/banks/esewa.webp";
import everest from "@/assets/banks/everest.webp";
import gibl from "@/assets/banks/gibl.webp";
import himalayan from "@/assets/banks/himalayan.webp";
import khalti from "@/assets/banks/khalti.svg";
import kumari from "@/assets/banks/kumari.webp";
import laxmisunrise from "@/assets/banks/laxmisunrise.webp";
import machhapuchchhre from "@/assets/banks/machhapuchchhre.webp";
import nabil from "@/assets/banks/nabil.svg";
import nbl from "@/assets/banks/nbl.webp";
import nicasia from "@/assets/banks/nicasia.webp";
import nimb from "@/assets/banks/nimb.webp";
import nmb from "@/assets/banks/nmb.webp";
import prabhu from "@/assets/banks/prabhu.webp";
import prime from "@/assets/banks/prime.webp";
import rbb from "@/assets/banks/rbb.webp";
import sanima from "@/assets/banks/sanima.webp";
import sbi from "@/assets/banks/sbi.webp";
import scb from "@/assets/banks/scb.webp";
import siddhartha from "@/assets/banks/siddhartha.webp";
import corporate from "@/assets/banks/corporate.webp";
import excel from "@/assets/banks/excel.webp";
import garima from "@/assets/banks/garima.webp";
import green from "@/assets/banks/green.webp";
import jyoti from "@/assets/banks/jyoti.webp";
import kamanasewa from "@/assets/banks/kamanasewa.webp";
import lumbini from "@/assets/banks/lumbini.webp";
import mahalaxmi from "@/assets/banks/mahalaxmi.webp";
import miteri from "@/assets/banks/miteri.webp";
import muktinath from "@/assets/banks/muktinath.webp";
import narayani from "@/assets/banks/narayani.webp";
import salapa from "@/assets/banks/salapa.webp";
import saptakoshi from "@/assets/banks/saptakoshi.webp";
import shangrila from "@/assets/banks/shangrila.webp";
import shineresunga from "@/assets/banks/shineresunga.webp";
import sindhu from "@/assets/banks/sindhu.webp";

/**
 * Nepal's commercial ("A" class) banks after the mergers up to 2024, and
 * below them its development ("B" class) banks, by the same codes as the
 * payment_methods.bank_code check and bank_name_of() in the database (5600,
 * and 5700 for the development banks) - change them together. Finance
 * companies, cooperatives and Karnali Development Bank (under NRB
 * resolution) go under "other" with their name typed in.
 *
 * Each has its official logo (sources in assets/banks/SOURCES.md), the
 * logo's width over height, and the colour its card is drawn in - taken
 * from the logo - with the ink that reads on it.
 */
export interface Brand {
  code: string;
  name: string;
  nameNe: string;
  /** What people call it and search by. */
  short: string;
  logo: string;
  aspect: number;
  color: string;
  ink: "light" | "dark";
}

export const BANKS: Brand[] = [
  { code: "nabil", name: "Nabil Bank", nameNe: "नबिल बैंक", short: "NABIL", logo: nabil, aspect: 175 / 23, color: "#0B7A45", ink: "light" },
  { code: "nimb", name: "Nepal Investment Mega Bank", nameNe: "नेपाल इन्भेष्टमेन्ट मेगा बैंक", short: "NIMB", logo: nimb, aspect: 185 / 160, color: "#D0153A", ink: "light" },
  { code: "gibl", name: "Global IME Bank", nameNe: "ग्लोबल आइएमई बैंक", short: "GIBL", logo: gibl, aspect: 1, color: "#034089", ink: "light" },
  { code: "nicasia", name: "NIC Asia Bank", nameNe: "एनआईसी एशिया बैंक", short: "NIC", logo: nicasia, aspect: 1, color: "#C92134", ink: "light" },
  { code: "himalayan", name: "Himalayan Bank", nameNe: "हिमालयन बैंक", short: "HBL", logo: himalayan, aspect: 5, color: "#A82C31", ink: "light" },
  { code: "everest", name: "Everest Bank", nameNe: "एभरेष्ट बैंक", short: "EBL", logo: everest, aspect: 1, color: "#BB131A", ink: "light" },
  { code: "sbi", name: "Nepal SBI Bank", nameNe: "नेपाल एसबिआई बैंक", short: "SBI", logo: sbi, aspect: 249 / 49, color: "#2A2076", ink: "light" },
  { code: "scb", name: "Standard Chartered Bank Nepal", nameNe: "स्ट्यान्डर्ड चार्टर्ड बैंक नेपाल", short: "SC", logo: scb, aspect: 1, color: "#0469D6", ink: "light" },
  { code: "nbl", name: "Nepal Bank", nameNe: "नेपाल बैंक", short: "NBL", logo: nbl, aspect: 1, color: "#252971", ink: "light" },
  { code: "rbb", name: "Rastriya Banijya Bank", nameNe: "राष्ट्रिय वाणिज्य बैंक", short: "RBB", logo: rbb, aspect: 92 / 94, color: "#C9B21C", ink: "dark" },
  { code: "adbl", name: "Agricultural Development Bank", nameNe: "कृषि विकास बैंक", short: "ADBL", logo: adbl, aspect: 1, color: "#185FAB", ink: "light" },
  { code: "kumari", name: "Kumari Bank", nameNe: "कुमारी बैंक", short: "KBL", logo: kumari, aspect: 1, color: "#FDCA05", ink: "dark" },
  { code: "laxmisunrise", name: "Laxmi Sunrise Bank", nameNe: "लक्ष्मी सनराइज बैंक", short: "LSL", logo: laxmisunrise, aspect: 365 / 75, color: "#F58229", ink: "dark" },
  { code: "siddhartha", name: "Siddhartha Bank", nameNe: "सिद्धार्थ बैंक", short: "SBL", logo: siddhartha, aspect: 257 / 67, color: "#E6A913", ink: "dark" },
  { code: "machhapuchchhre", name: "Machhapuchchhre Bank", nameNe: "माछापुच्छ्रे बैंक", short: "MBL", logo: machhapuchchhre, aspect: 922 / 156, color: "#08519F", ink: "light" },
  { code: "citizens", name: "Citizens Bank International", nameNe: "सिटिजन्स बैंक इन्टरनेशनल", short: "CZBIL", logo: citizens, aspect: 170 / 115, color: "#1C8467", ink: "light" },
  { code: "prime", name: "Prime Commercial Bank", nameNe: "प्राइम कमर्सियल बैंक", short: "PCBL", logo: prime, aspect: 1, color: "#A93A7B", ink: "light" },
  { code: "nmb", name: "NMB Bank", nameNe: "एनएमबी बैंक", short: "NMB", logo: nmb, aspect: 100 / 102, color: "#00809F", ink: "light" },
  { code: "prabhu", name: "Prabhu Bank", nameNe: "प्रभु बैंक", short: "PRVU", logo: prabhu, aspect: 304 / 66, color: "#CC181F", ink: "light" },
  { code: "sanima", name: "Sanima Bank", nameNe: "सानिमा बैंक", short: "SANIMA", logo: sanima, aspect: 8, color: "#01632F", ink: "light" },
];

/**
 * The development banks Nepal Rastra Bank lists as operating in 2026: eight
 * national and eight province or district level.
 */
export const DEVELOPMENT_BANKS: Brand[] = [
  { code: "muktinath", name: "Muktinath Bikas Bank", nameNe: "मुक्तिनाथ विकास बैंक", short: "MNBBL", logo: muktinath, aspect: 311 / 76, color: "#32348F", ink: "light" },
  { code: "garima", name: "Garima Bikas Bank", nameNe: "गरिमा विकास बैंक", short: "GBBL", logo: garima, aspect: 495 / 120, color: "#1F6FA8", ink: "light" },
  { code: "jyoti", name: "Jyoti Bikas Bank", nameNe: "ज्योति विकास बैंक", short: "JBBL", logo: jyoti, aspect: 416 / 120, color: "#055BA9", ink: "light" },
  { code: "shangrila", name: "Shangri-la Development Bank", nameNe: "सांग्रिला डेभलपमेन्ट बैंक", short: "SADBL", logo: shangrila, aspect: 378 / 69, color: "#04672B", ink: "light" },
  { code: "lumbini", name: "Lumbini Bikas Bank", nameNe: "लुम्बिनी विकास बैंक", short: "LBBL", logo: lumbini, aspect: 331 / 48, color: "#0077B6", ink: "light" },
  { code: "kamanasewa", name: "Kamana Sewa Bikas Bank", nameNe: "कामना सेवा विकास बैंक", short: "KSBBL", logo: kamanasewa, aspect: 72 / 120, color: "#014EA7", ink: "light" },
  { code: "mahalaxmi", name: "Mahalaxmi Bikas Bank", nameNe: "महालक्ष्मी विकास बैंक", short: "MLBL", logo: mahalaxmi, aspect: 1, color: "#B83A35", ink: "light" },
  { code: "shineresunga", name: "Shine Resunga Development Bank", nameNe: "साइन रेसुङ्गा डेभलपमेन्ट बैंक", short: "SHINE", logo: shineresunga, aspect: 521 / 120, color: "#981E52", ink: "light" },
  { code: "corporate", name: "Corporate Development Bank", nameNe: "कर्पोरेट डेभलपमेन्ट बैंक", short: "CORBL", logo: corporate, aspect: 378 / 120, color: "#A82D55", ink: "light" },
  { code: "excel", name: "Excel Development Bank", nameNe: "एक्सेल डेभलपमेन्ट बैंक", short: "EDBL", logo: excel, aspect: 495 / 120, color: "#18479F", ink: "light" },
  { code: "green", name: "Green Development Bank", nameNe: "ग्रीन डेभलपमेन्ट बैंक", short: "GRDBL", logo: green, aspect: 709 / 120, color: "#0E6B39", ink: "light" },
  { code: "miteri", name: "Miteri Development Bank", nameNe: "मितेरी डेभलपमेन्ट बैंक", short: "MDB", logo: miteri, aspect: 90 / 64, color: "#432F73", ink: "light" },
  { code: "narayani", name: "Narayani Development Bank", nameNe: "नारायणी डेभलपमेन्ट बैंक", short: "NABBC", logo: narayani, aspect: 570 / 120, color: "#334671", ink: "light" },
  { code: "salapa", name: "Salapa Bikas Bank", nameNe: "सलपा विकास बैंक", short: "SALAPA", logo: salapa, aspect: 88 / 120, color: "#00843B", ink: "light" },
  { code: "saptakoshi", name: "Saptakoshi Development Bank", nameNe: "सप्तकोशी डेभलपमेन्ट बैंक", short: "SAPDBL", logo: saptakoshi, aspect: 90 / 88, color: "#017AB6", ink: "light" },
  { code: "sindhu", name: "Sindhu Bikas Bank", nameNe: "सिन्धु विकास बैंक", short: "SINDU", logo: sindhu, aspect: 204 / 56, color: "#184F92", ink: "light" },
];

/** Every bank with its own logo, commercial first. */
export const ALL_BANKS: Brand[] = [...BANKS, ...DEVELOPMENT_BANKS];

export const OTHER_BANK = "other";

/** eSewa and Khalti, drawn in their own colours: eSewa's green, Khalti's red. */
export const WALLETS: Record<"esewa" | "khalti", Brand> = {
  esewa: { code: "esewa", name: "eSewa", nameNe: "इसेवा", short: "eSewa", logo: esewa, aspect: 616 / 160, color: "#60BB46", ink: "dark" },
  khalti: { code: "khalti", name: "Khalti", nameNe: "खल्ती", short: "Khalti", logo: khalti, aspect: 2, color: "#DC0019", ink: "light" },
};

/** A bank typed in by name: a plain slate card with a bank icon. */
const OTHER_BRAND = { color: "#475569", ink: "light" as const };

export const PAYMENT_KINDS: PaymentKind[] = ["bank", "esewa", "khalti"];

export function bankByCode(code: string | null | undefined): Brand | null {
  return ALL_BANKS.find((b) => b.code === code) ?? null;
}

/** The bank's or wallet's brand, or null for a bank typed in as "other". */
export function brandOf(method: Pick<PaymentMethod, "kind" | "bank_code">): Brand | null {
  return method.kind === "bank" ? bankByCode(method.bank_code) : WALLETS[method.kind];
}

/** The card's colour and ink, for any account. */
export function cardStyleOf(method: Pick<PaymentMethod, "kind" | "bank_code">) {
  return brandOf(method) ?? OTHER_BRAND;
}

/** What an account is called: its bank, or eSewa / Khalti. */
export function methodTitle(
  method: Pick<PaymentMethod, "kind" | "bank_code" | "bank_name">,
  lang: "en" | "ne" = "en",
): string {
  if (method.kind === "bank" && method.bank_code === OTHER_BANK) return method.bank_name ?? "";
  const brand = brandOf(method);
  if (!brand) return method.bank_name ?? "";
  return lang === "ne" ? brand.nameNe : brand.name;
}

/** "0123 4567 8901 23": easier to read out and check against a bank app. */
export function groupDigits(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 ");
}

/** A hex colour mixed toward black by `amount` (0-1) - the far end of a card's gradient. */
export function shade(hex: string, amount: number): string {
  const parts = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amount)));
  return `#${parts.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Lower-case letters and digits only, for matching a search to a bank. */
export function searchKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]/g, "");
}
