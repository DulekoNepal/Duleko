import type { Lang, SkillCategory } from "@/lib/types";

/**
 * Duleko's skills catalogue as the website shows it - the same ids, names and
 * categories as the skills table (supabase/migrations 0500, 3100, 3200,
 * 5400, 7600), kept here so the public pages render instantly and without a
 * network round trip. "Others" is left out: the website says "write your
 * own" instead.
 */
export interface SiteSkill {
  id: string;
  en: string;
  ne: string;
  category: SkillCategory;
}

export const SITE_SKILLS: SiteSkill[] = [
  // Trades & local services
  { id: "electrician", en: "Electrician", ne: "बिजुली मिस्त्री", category: "trades" },
  { id: "plumber", en: "Plumber", ne: "धारा मिस्त्री", category: "trades" },
  { id: "carpenter", en: "Carpenter", ne: "सिकर्मी", category: "trades" },
  { id: "mason", en: "Mason", ne: "डकर्मी", category: "trades" },
  { id: "painter", en: "Painter", ne: "रंगरोगन गर्ने", category: "trades" },
  { id: "mechanic", en: "Mechanic", ne: "मेकानिक", category: "trades" },
  { id: "mobile_repair", en: "Mobile Repair", ne: "मोबाइल मर्मत", category: "trades" },
  { id: "driver", en: "Driver", ne: "चालक", category: "trades" },
  { id: "tailor", en: "Tailor", ne: "दर्जी", category: "trades" },
  { id: "cook", en: "Cook", ne: "भान्से", category: "trades" },
  { id: "cleaner", en: "Cleaner", ne: "सरसफाइकर्मी", category: "trades" },
  { id: "welder", en: "Welder", ne: "वेल्डर", category: "trades" },
  { id: "farm_worker", en: "Farm worker", ne: "खेतालो", category: "trades" },
  { id: "labourer", en: "Labourer", ne: "ज्यामी", category: "trades" },
  // Professional & skilled services
  { id: "it_computer", en: "IT / Computer", ne: "आईटी / कम्प्युटर", category: "professional" },
  { id: "tutor", en: "Tutor", ne: "ट्युटर", category: "professional" },
  { id: "health", en: "Health / Medical", ne: "स्वास्थ्य / चिकित्सा", category: "professional" },
  { id: "veterinary", en: "Vet Doctor / Veterinary", ne: "पशु चिकित्सक", category: "professional" },
  { id: "accountant", en: "Accountant", ne: "लेखापाल", category: "professional" },
  { id: "engineer", en: "Engineer", ne: "इन्जिनियर", category: "professional" },
  { id: "legal", en: "Legal Services", ne: "कानुनी सेवा", category: "professional" },
  { id: "designer", en: "Designer", ne: "डिजाइनर", category: "professional" },
  { id: "photographer", en: "Photographer", ne: "फोटोग्राफर", category: "professional" },
  { id: "technician", en: "Technician", ne: "प्राविधिक", category: "professional" },
  { id: "consultant", en: "Consultant", ne: "सल्लाहकार", category: "professional" },
  // Personal & everyday services
  { id: "auto_rickshaw", en: "Auto Rickshaw", ne: "अटो रिक्सा", category: "personal" },
  { id: "fitness", en: "Fitness Trainer", ne: "फिटनेस प्रशिक्षक", category: "personal" },
  { id: "barber", en: "Barber / Salon", ne: "नाई / सैलुन", category: "personal" },
  { id: "makeup", en: "Makeup Artist", ne: "मेकअप आर्टिस्ट", category: "personal" },
  { id: "music_dance", en: "Music / Dance", ne: "संगीत / नृत्य", category: "personal" },
  { id: "delivery", en: "Delivery", ne: "डेलिभरी", category: "personal" },
  { id: "care", en: "Child / Elder Care", ne: "हेरचाह", category: "personal" },
];

export const SKILL_CATEGORIES: SkillCategory[] = ["trades", "professional", "personal"];

export function siteSkill(id: string): SiteSkill {
  const skill = SITE_SKILLS.find((s) => s.id === id);
  if (!skill) throw new Error(`[Duleko] unknown website skill "${id}"`);
  return skill;
}

export function siteSkillName(skill: SiteSkill, lang: Lang): string {
  return lang === "ne" ? skill.ne : skill.en;
}
