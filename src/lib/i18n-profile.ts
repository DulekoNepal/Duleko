/**
 * Copy for the redesigned Profile screen (your own profile: the header,
 * the section editors and the Settings tab), in English and Nepali.
 * Merged into the app's string table in i18n.tsx, so it's used the same
 * way: t("profileEditIntro").
 */
export const profileStrings = {
  // ---- header ----------------------------------------------------------
  profileJoined: ["Joined {date}", "{date}देखि सदस्य"],
  profileNoPlace: ["Location not set", "स्थान राखिएको छैन"],
  profileAvailOnTitle: ["Available for work", "काम गर्न उपलब्ध"],
  profileAvailOffTitle: ["Not taking work", "अहिले नयाँ काम लिइँदैन"],
  profileStaffMenu: ["Staff", "स्टाफ"],

  // ---- overview --------------------------------------------------------
  profileFinishTitle: ["Finish your profile", "आफ्नो प्रोफाइल पूरा गर्नुहोस्"],
  profileStepsLeft: ["{count} steps left", "{count} चरण बाँकी"],
  profileStepsLeftOne: ["1 step left", "१ चरण बाँकी"],
  profileContactDetails: ["Contact & details", "सम्पर्क र विवरण"],
  profilePhoneSeenBy: ["Who can see it: {who}", "कसले देख्न सक्छ: {who}"],
  profileReviewsEmptyHint: [
    "Reviews show up here after you finish a job.",
    "काम सकेपछि समीक्षा यहाँ देखिन्छन्।",
  ],
  profileAdd: ["Add", "थप्नुहोस्"],
  profileCertRemoveTitle: ["Remove this certificate?", "यो प्रमाणपत्र हटाउने हो?"],
  profileCertRemoveBody: [
    "“{title}” will no longer show on your profile.",
    "“{title}” अब तपाईंको प्रोफाइलमा देखिने छैन।",
  ],
  profileRemove: ["Remove", "हटाउनुहोस्"],

  // ---- editors ---------------------------------------------------------
  profileEditIntro: ["Edit intro", "परिचय सम्पादन"],
  profileEditDetails: ["Edit contact & details", "सम्पर्क र विवरण सम्पादन"],
  profileHeadlinePlaceholder: [
    "e.g. Electrician & solar installer",
    "जस्तै: इलेक्ट्रिसियन र सोलार जडानकर्ता",
  ],
  profileAboutPlaceholder: [
    "What work do you do, for how long, and what are you best at?",
    "तपाईं के काम गर्नुहुन्छ, कति वर्षदेखि गर्दै हुनुहुन्छ र कुन काममा सबैभन्दा सिपालु हुनुहुन्छ?",
  ],
  profileNameRequired: ["Enter your name.", "आफ्नो नाम लेख्नुहोस्।"],
  profileAgeRule: ["Enter an age from 18 to 100.", "१८ देखि १०० सम्मको उमेर लेख्नुहोस्।"],
  profileSectionPhones: ["Phone numbers", "फोन नम्बर"],
  profileSectionPersonal: ["About you", "तपाईंको बारेमा"],
  profileSkillsPickHint: [
    "Tap every kind of work you do.",
    "तपाईंले गर्ने हरेक कामको प्रकारमा थिच्नुहोस्।",
  ],
  profileRatesTitle: ["Your rates", "तपाईंको दर"],
  profileSkillsSelected: ["{count} selected", "{count} छानिएको"],
  profileCertNamePlaceholder: ["e.g. CTEVT Level 1 Plumber", "जस्तै: CTEVT लेभल १ प्लम्बर"],
  profileCertChoose: ["Choose a file", "फाइल छान्नुहोस्"],
  profileCertChange: ["Change file", "फाइल बदल्नुहोस्"],

  // ---- calendar --------------------------------------------------------
  profileBusyUpcoming: ["Next busy days", "आगामी व्यस्त दिन"],

  // ---- settings --------------------------------------------------------
  profileHelpAbout: ["Help & about", "सहायता र जानकारी"],
  profileAboutDulekoHint: [
    "Our story, safety, privacy and terms.",
    "हाम्रो कथा, सुरक्षा, गोपनीयता र सर्तहरू।",
  ],

  // ---- someone else's profile (/worker/...) -----------------------------
  workerPreviewNote: ["This is how others see your profile.", "अरूले तपाईंको प्रोफाइल यसरी देख्छन्।"],
  workerRemoveFriendBody: [
    "You'll no longer be friends with {name}. You can still chat.",
    "{name}सँग अब तपाईं साथी रहनुहुने छैन। कुराकानी भने गर्न सक्नुहुन्छ।",
  ],
} as const;
