/**
 * Nepal administrative data used for location pickers.
 * Provinces and all 77 districts are complete, each bilingual (English / नेपाली).
 * Municipality lists are provided for the districts Duleko is launching in;
 * elsewhere the user types it in.
 */
import type { Lang } from "./types";

export interface Named {
  en: string;
  ne: string;
}

export interface Province {
  id: string;
  name_en: string;
  name_ne: string;
  districts: Named[];
}

export const PROVINCES: Province[] = [
  {
    id: "koshi",
    name_en: "Koshi",
    name_ne: "कोशी",
    districts: [
      { en: "Bhojpur", ne: "भोजपुर" },
      { en: "Dhankuta", ne: "धनकुटा" },
      { en: "Ilam", ne: "इलाम" },
      { en: "Jhapa", ne: "झापा" },
      { en: "Khotang", ne: "खोटाङ" },
      { en: "Morang", ne: "मोरङ" },
      { en: "Okhaldhunga", ne: "ओखलढुङ्गा" },
      { en: "Panchthar", ne: "पाँचथर" },
      { en: "Sankhuwasabha", ne: "संखुवासभा" },
      { en: "Solukhumbu", ne: "सोलुखुम्बु" },
      { en: "Sunsari", ne: "सुनसरी" },
      { en: "Taplejung", ne: "ताप्लेजुङ" },
      { en: "Terhathum", ne: "तेह्रथुम" },
      { en: "Udayapur", ne: "उदयपुर" },
    ],
  },
  {
    id: "madhesh",
    name_en: "Madhesh",
    name_ne: "मधेश",
    districts: [
      { en: "Bara", ne: "बारा" },
      { en: "Dhanusha", ne: "धनुषा" },
      { en: "Mahottari", ne: "महोत्तरी" },
      { en: "Parsa", ne: "पर्सा" },
      { en: "Rautahat", ne: "रौतहट" },
      { en: "Saptari", ne: "सप्तरी" },
      { en: "Sarlahi", ne: "सर्लाही" },
      { en: "Siraha", ne: "सिराहा" },
    ],
  },
  {
    id: "bagmati",
    name_en: "Bagmati",
    name_ne: "बागमती",
    districts: [
      { en: "Bhaktapur", ne: "भक्तपुर" },
      { en: "Chitwan", ne: "चितवन" },
      { en: "Dhading", ne: "धादिङ" },
      { en: "Dolakha", ne: "दोलखा" },
      { en: "Kathmandu", ne: "काठमाडौं" },
      { en: "Kavrepalanchok", ne: "काभ्रेपलाञ्चोक" },
      { en: "Lalitpur", ne: "ललितपुर" },
      { en: "Makwanpur", ne: "मकवानपुर" },
      { en: "Nuwakot", ne: "नुवाकोट" },
      { en: "Ramechhap", ne: "रामेछाप" },
      { en: "Rasuwa", ne: "रसुवा" },
      { en: "Sindhuli", ne: "सिन्धुली" },
      { en: "Sindhupalchok", ne: "सिन्धुपाल्चोक" },
    ],
  },
  {
    id: "gandaki",
    name_en: "Gandaki",
    name_ne: "गण्डकी",
    districts: [
      { en: "Baglung", ne: "बागलुङ" },
      { en: "Gorkha", ne: "गोरखा" },
      { en: "Kaski", ne: "कास्की" },
      { en: "Lamjung", ne: "लमजुङ" },
      { en: "Manang", ne: "मनाङ" },
      { en: "Mustang", ne: "मुस्ताङ" },
      { en: "Myagdi", ne: "म्याग्दी" },
      { en: "Nawalpur", ne: "नवलपुर" },
      { en: "Parbat", ne: "पर्वत" },
      { en: "Syangja", ne: "स्याङ्जा" },
      { en: "Tanahun", ne: "तनहुँ" },
    ],
  },
  {
    id: "lumbini",
    name_en: "Lumbini",
    name_ne: "लुम्बिनी",
    districts: [
      { en: "Arghakhanchi", ne: "अर्घाखाँची" },
      { en: "Banke", ne: "बाँके" },
      { en: "Bardiya", ne: "बर्दिया" },
      { en: "Dang", ne: "दाङ" },
      { en: "Eastern Rukum", ne: "रुकुम पूर्व" },
      { en: "Gulmi", ne: "गुल्मी" },
      { en: "Kapilvastu", ne: "कपिलवस्तु" },
      { en: "Palpa", ne: "पाल्पा" },
      { en: "Parasi", ne: "परासी" },
      { en: "Pyuthan", ne: "प्युठान" },
      { en: "Rolpa", ne: "रोल्पा" },
      { en: "Rupandehi", ne: "रूपन्देही" },
    ],
  },
  {
    id: "karnali",
    name_en: "Karnali",
    name_ne: "कर्णाली",
    districts: [
      { en: "Dailekh", ne: "दैलेख" },
      { en: "Dolpa", ne: "डोल्पा" },
      { en: "Humla", ne: "हुम्ला" },
      { en: "Jajarkot", ne: "जाजरकोट" },
      { en: "Jumla", ne: "जुम्ला" },
      { en: "Kalikot", ne: "कालिकोट" },
      { en: "Mugu", ne: "मुगु" },
      { en: "Salyan", ne: "सल्यान" },
      { en: "Surkhet", ne: "सुर्खेत" },
      { en: "Western Rukum", ne: "रुकुम पश्चिम" },
    ],
  },
  {
    id: "sudurpashchim",
    name_en: "Sudurpashchim",
    name_ne: "सुदूरपश्चिम",
    districts: [
      { en: "Achham", ne: "अछाम" },
      { en: "Baitadi", ne: "बैतडी" },
      { en: "Bajhang", ne: "बझाङ" },
      { en: "Bajura", ne: "बाजुरा" },
      { en: "Dadeldhura", ne: "डडेल्धुरा" },
      { en: "Darchula", ne: "दार्चुला" },
      { en: "Doti", ne: "डोटी" },
      { en: "Kailali", ne: "कैलाली" },
      { en: "Kanchanpur", ne: "कञ्चनपुर" },
    ],
  },
];

/** Local bodies for launch districts. Any district not listed accepts free text. */
export const MUNICIPALITIES: Record<string, Named[]> = {
  Kapilvastu: [
    { en: "Kapilvastu Municipality", ne: "कपिलवस्तु नगरपालिका" },
    { en: "Banganga Municipality", ne: "बाणगंगा नगरपालिका" },
    { en: "Buddhabhumi Municipality", ne: "बुद्धभूमि नगरपालिका" },
    { en: "Shivaraj Municipality", ne: "शिवराज नगरपालिका" },
    { en: "Krishnanagar Municipality", ne: "कृष्णनगर नगरपालिका" },
    { en: "Maharajgunj Municipality", ne: "महाराजगञ्ज नगरपालिका" },
    { en: "Mayadevi Rural Municipality", ne: "मायादेवी गाउँपालिका" },
    { en: "Yashodhara Rural Municipality", ne: "यशोधरा गाउँपालिका" },
    { en: "Suddhodhan Rural Municipality", ne: "शुद्धोधन गाउँपालिका" },
    { en: "Bijaynagar Rural Municipality", ne: "विजयनगर गाउँपालिका" },
  ],
  Rupandehi: [
    { en: "Butwal Sub-Metropolitan City", ne: "बुटवल उपमहानगरपालिका" },
    { en: "Siddharthanagar Municipality", ne: "सिद्धार्थनगर नगरपालिका" },
    { en: "Devdaha Municipality", ne: "देवदह नगरपालिका" },
    { en: "Lumbini Sanskritik Municipality", ne: "लुम्बिनी सांस्कृतिक नगरपालिका" },
    { en: "Sainamaina Municipality", ne: "सैनामैना नगरपालिका" },
    { en: "Tilottama Municipality", ne: "तिलोत्तमा नगरपालिका" },
    { en: "Gaidahawa Rural Municipality", ne: "गैडहवा गाउँपालिका" },
    { en: "Kanchan Rural Municipality", ne: "कञ्चन गाउँपालिका" },
    { en: "Kotahimai Rural Municipality", ne: "कोटहीमाई गाउँपालिका" },
    { en: "Marchawari Rural Municipality", ne: "मार्चवारी गाउँपालिका" },
    { en: "Mayadevi Rural Municipality", ne: "मायादेवी गाउँपालिका" },
    { en: "Omsatiya Rural Municipality", ne: "ओमसतिया गाउँपालिका" },
    { en: "Rohini Rural Municipality", ne: "रोहिणी गाउँपालिका" },
    { en: "Sammarimai Rural Municipality", ne: "सम्मरीमाई गाउँपालिका" },
    { en: "Siyari Rural Municipality", ne: "सियारी गाउँपालिका" },
    { en: "Suddhodhan Rural Municipality", ne: "शुद्धोधन गाउँपालिका" },
  ],
  Dang: [
    { en: "Ghorahi Sub-Metropolitan City", ne: "घोराही उपमहानगरपालिका" },
    { en: "Tulsipur Sub-Metropolitan City", ne: "तुलसीपुर उपमहानगरपालिका" },
    { en: "Lamahi Municipality", ne: "लमही नगरपालिका" },
    { en: "Babai Rural Municipality", ne: "बबई गाउँपालिका" },
    { en: "Banglachuli Rural Municipality", ne: "बंगलाचुली गाउँपालिका" },
    { en: "Dangisharan Rural Municipality", ne: "दंगीशरण गाउँपालिका" },
    { en: "Gadhawa Rural Municipality", ne: "गढवा गाउँपालिका" },
    { en: "Rajpur Rural Municipality", ne: "राजपुर गाउँपालिका" },
    { en: "Rapti Rural Municipality", ne: "राप्ती गाउँपालिका" },
    { en: "Shantinagar Rural Municipality", ne: "शान्तिनगर गाउँपालिका" },
  ],
  Kathmandu: [
    { en: "Kathmandu Metropolitan City", ne: "काठमाडौं महानगरपालिका" },
    { en: "Budhanilkantha Municipality", ne: "बुढानीलकण्ठ नगरपालिका" },
    { en: "Chandragiri Municipality", ne: "चन्द्रागिरी नगरपालिका" },
    { en: "Dakshinkali Municipality", ne: "दक्षिणकाली नगरपालिका" },
    { en: "Gokarneshwar Municipality", ne: "गोकर्णेश्वर नगरपालिका" },
    { en: "Kageshwari-Manohara Municipality", ne: "कागेश्वरी-मनोहरा नगरपालिका" },
    { en: "Kirtipur Municipality", ne: "कीर्तिपुर नगरपालिका" },
    { en: "Nagarjun Municipality", ne: "नागार्जुन नगरपालिका" },
    { en: "Shankharapur Municipality", ne: "शङ्खरापुर नगरपालिका" },
    { en: "Tarakeshwar Municipality", ne: "तारकेश्वर नगरपालिका" },
    { en: "Tokha Municipality", ne: "टोखा नगरपालिका" },
  ],
  Lalitpur: [
    { en: "Lalitpur Metropolitan City", ne: "ललितपुर महानगरपालिका" },
    { en: "Godawari Municipality", ne: "गोदावरी नगरपालिका" },
    { en: "Mahalaxmi Municipality", ne: "महालक्ष्मी नगरपालिका" },
    { en: "Bagmati Rural Municipality", ne: "बागमती गाउँपालिका" },
    { en: "Konjyosom Rural Municipality", ne: "कोन्ज्योसोम गाउँपालिका" },
    { en: "Mahankal Rural Municipality", ne: "महाङ्काल गाउँपालिका" },
  ],
};

export const ALL_DISTRICTS: Named[] = PROVINCES.flatMap((p) => p.districts).sort((a, b) =>
  a.en.localeCompare(b.en),
);

export function provinceOfDistrict(district: string | null | undefined): Province | undefined {
  if (!district) return undefined;
  return PROVINCES.find((p) => p.districts.some((d) => d.en === district));
}

export function districtsOf(provinceId: string | null | undefined): Named[] {
  if (!provinceId) return ALL_DISTRICTS;
  return PROVINCES.find((p) => p.id === provinceId)?.districts ?? ALL_DISTRICTS;
}

export function municipalitiesOf(district: string | null | undefined): Named[] {
  if (!district) return [];
  return MUNICIPALITIES[district] ?? [];
}

/** English name stored on the profile -> the label to show for the current language. */
export function districtLabel(district: string | null | undefined, lang: Lang): string {
  if (!district) return "";
  const found = ALL_DISTRICTS.find((d) => d.en === district);
  return found ? (lang === "ne" ? found.ne : found.en) : district;
}

/** Same idea for a known municipality; falls back to the raw value for free-typed ones. */
export function municipalityLabel(
  district: string | null | undefined,
  municipality: string | null | undefined,
  lang: Lang,
): string {
  if (!municipality) return "";
  const found = municipalitiesOf(district).find((m) => m.en === municipality);
  return found ? (lang === "ne" ? found.ne : found.en) : municipality;
}
