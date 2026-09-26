import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Lang } from "./types";
import { siteStrings } from "./i18n-site";

/**
 * Every user-visible string lives here, in English and Nepali.
 * Placeholders use {name} and are filled via t("key", { name: "..." }).
 */
const strings = {
  // ---- generic -------------------------------------------------------
  appName: ["Duleko", "डुलेको"],
  tagline: ["Find local work. Find local workers.", "नजिकैको काम खोज्नुहोस्। नजिकैका कामदार भेट्नुहोस्।"],
  save: ["Save", "सुरक्षित गर्नुहोस्"],
  cancel: ["Cancel", "रद्द गर्नुहोस्"],
  back: ["Back", "पछाडि"],
  next: ["Next", "अर्को"],
  done: ["Done", "भयो"],
  close: ["Close", "बन्द गर्नुहोस्"],
  loading: ["Loading…", "लोड हुँदै…"],
  saving: ["Saving…", "सुरक्षित हुँदै…"],
  retry: ["Try again", "फेरि प्रयास गर्नुहोस्"],
  optional: ["optional", "वैकल्पिक"],
  required: ["Required", "अनिवार्य"],
  search: ["Search", "खोज्नुहोस्"],
  seeAll: ["See all", "सबै हेर्नुहोस्"],
  loadMore: ["Load more", "थप हेर्नुहोस्"],
  loadOlderMessages: ["Load older messages", "पुराना सन्देश हेर्नुहोस्"],
  showLess: ["Show less", "कम देखाउनुहोस्"],
  seeMore: ["See more", "थप हेर्नुहोस्"],
  somethingWrong: ["Something went wrong.", "केही गडबड भयो।"],
  noInternet: ["Check your internet connection.", "इन्टरनेट जडान जाँच्नुहोस्।"],
  confirm: ["Confirm", "पुष्टि गर्नुहोस्"],
  yes: ["Yes", "हो"],
  no: ["No", "होइन"],
  mainNavLabel: ["Main", "मुख्य"],

  // ---- auth ----------------------------------------------------------
  signIn: ["Sign in", "लगइन गर्नुहोस्"],
  signUp: ["Create account", "खाता खोल्नुहोस्"],
  signInOrSignUp: ["Sign in or create account", "लगइन गर्नुहोस् वा खाता खोल्नुहोस्"],
  signOut: ["Sign out", "लगआउट"],
  signOutConfirmTitle: ["Sign out?", "लगआउट गर्ने हो?"],
  signOutConfirmBody: [
    "You can sign back in anytime with the same email and password.",
    "तपाईं जुनसुकै बेला उही इमेल र पासवर्डले फेरि लगइन गर्न सक्नुहुन्छ।",
  ],
  email: ["Email", "इमेल"],
  password: ["Password", "पासवर्ड"],
  emailPlaceholder: ["you@example.com", "you@example.com"],
  passwordHint: ["At least 6 characters", "कम्तीमा ६ अक्षर"],
  checkEmail: [
    "Check your email to confirm your account, then sign in.",
    "खाता पुष्टि गर्न इमेल हेर्नुहोस्, त्यसपछि लगइन गर्नुहोस्।",
  ],
  phoneAlreadyRegistered: [
    "This phone number is already linked to another account. Please use a different number.",
    "यो फोन नम्बर पहिले नै अर्को खातासँग जोडिएको छ। कृपया फरक नम्बर प्रयोग गर्नुहोस्।",
  ],
  emailAlreadyRegistered: [
    "An account already exists for this email. Try signing in instead, including with \"Continue with Google\".",
    "यो इमेलको लागि खाता पहिले नै छ। बरु लगइन गर्नुहोस्, \"Google बाट जारी राख्नुहोस्\" पनि प्रयोग गर्न सक्नुहुन्छ।",
  ],
  authWelcome: ["Welcome to Duleko", "डुलेकोमा स्वागत छ"],
  authBlurb: [
    "A simple way for workers and employers in your area to find each other.",
    "तपाईंको क्षेत्रका कामदार र काम दिने बीच सजिलो भेटघाट।",
  ],
  confirmPassword: ["Confirm password", "पासवर्ड पुष्टि गर्नुहोस्"],
  passwordsDontMatch: ["Passwords don't match.", "पासवर्ड मिलेन।"],
  incorrectCredentials: ["Incorrect email or password.", "गलत इमेल वा पासवर्ड।"],
  pleaseWaitBeforeRetry: [
    "Please wait a moment before trying again.",
    "कृपया अलिक पर्खेर फेरि प्रयास गर्नुहोस्।",
  ],

  // ---- email verification (OTP) ----------------------------------------
  verifyEmailTitle: ["Verify your email", "आफ्नो इमेल पुष्टि गर्नुहोस्"],
  verifyEmailBlurb: [
    "Enter the 6-digit code we sent to {email}.",
    "हामीले {email} मा पठाएको ६ अंकको कोड यहाँ हाल्नुहोस्।",
  ],
  verify: ["Verify", "पुष्टि गर्नुहोस्"],
  resendCode: ["Resend code", "कोड फेरि पठाउनुहोस्"],
  resendCodeIn: ["Resend code in {seconds}s", "{seconds} सेकेन्डमा कोड फेरि पठाउनुहोस्"],
  codeResent: ["We've sent a new code.", "हामीले नयाँ कोड पठायौं।"],
  useAnotherEmail: ["Use a different email", "फरक इमेल प्रयोग गर्नुहोस्"],
  invalidOrExpiredCode: [
    "That code is incorrect or has expired. Request a new one.",
    "त्यो कोड गलत छ वा म्याद सकिएको छ। नयाँ अनुरोध गर्नुहोस्।",
  ],

  // ---- forgot password ----------------------------------------------
  forgotPassword: ["Forgot password?", "पासवर्ड बिर्सनुभयो?"],
  resetPasswordTitle: ["Reset your password", "पासवर्ड रिसेट गर्नुहोस्"],
  resetPasswordBlurb: [
    "Enter your account email and we'll send you a code to reset your password.",
    "आफ्नो खाताको इमेल हाल्नुहोस्, हामी पासवर्ड रिसेट गर्न कोड पठाउनेछौं।",
  ],
  sendResetCode: ["Send code", "कोड पठाउनुहोस्"],
  verifyResetCodeBlurb: [
    "Enter the 6-digit code we sent to {email} to continue.",
    "जारी राख्न हामीले {email} मा पठाएको ६ अंकको कोड यहाँ हाल्नुहोस्।",
  ],
  newPassword: ["New password", "नयाँ पासवर्ड"],
  setNewPassword: ["Set new password", "नयाँ पासवर्ड सेट गर्नुहोस्"],
  backToSignIn: ["Back to sign in", "लगइनमा फर्कनुहोस्"],

  // ---- guest browsing --------------------------------------------------
  exploreDuleko: ["Explore Duleko", "डुलेको हेर्नुहोस्"],
  exploreDulekoHint: [
    "Look around first - browse workers and skills, no account needed.",
    "पहिले हेर्नुहोस् - कामदार र सीपहरू खाता बिना नै हेर्न सकिन्छ।",
  ],
  signUpOrLogIn: ["Sign up / Log in", "खाता खोल्नुहोस् / लगइन"],
  signUpOrLogInHint: [
    "Create work requests, chat, and build your own profile.",
    "काम अनुरोध, कुराकानी, र आफ्नो प्रोफाइल बनाउनुहोस्।",
  ],
  howDulekoWorks: ["How Duleko works", "डुलेको कसरी काम गर्छ"],
  landingFreeNote: [
    "Free to join. Free to browse.",
    "जोडिन निःशुल्क। हेर्न निःशुल्क।",
  ],
  signInRequiredTitle: ["Sign in to continue", "जारी राख्न लगइन गर्नुहोस्"],
  signInRequiredBody: [
    "You'll need a free Duleko account for this. It only takes a minute.",
    "यसको लागि डुलेकोको निःशुल्क खाता चाहिन्छ। एक मिनेटमै बन्छ।",
  ],
  notNow: ["Not now", "अहिले होइन"],
  keepExploring: ["Keep exploring", "हेर्न जारी राख्नुहोस्"],

  // ---- onboarding ----------------------------------------------------
  onboardingTitle: ["Set up your profile", "आफ्नो प्रोफाइल बनाउनुहोस्"],
  stepOf: ["Step {current} of {total}", "चरण {current} / {total}"],
  yourName: ["Your name", "तपाईंको नाम"],
  namePlaceholder: ["Ram Bahadur Thapa", "राम बहादुर थापा"],
  phoneNumber: ["Phone number", "फोन नम्बर"],
  phoneHint: [
    "Hidden until you accept or confirm a job.",
    "काम स्वीकार वा पक्का नभएसम्म लुकाइन्छ।",
  ],
  phoneInvalid: ["Enter a valid Nepali mobile number.", "सही नेपाली मोबाइल नम्बर लेख्नुहोस्।"],
  aboutYou: ["About you", "तपाईंको बारेमा"],
  aboutPlaceholder: [
    "8 years wiring houses. I bring my own tools.",
    "८ वर्षदेखि घरको वायरिङ। आफ्नै औजार ल्याउँछु।",
  ],
  whereYouAre: ["Where you are", "तपाईं कहाँ हुनुहुन्छ"],
  province: ["Province", "प्रदेश"],
  district: ["District", "जिल्ला"],
  municipality: ["Municipality", "नगरपालिका / गाउँपालिका"],
  ward: ["Ward", "वडा"],
  locality: ["Village / tole", "गाउँ / टोल"],
  selectProvince: ["Select province", "प्रदेश छान्नुहोस्"],
  selectDistrict: ["Select district", "जिल्ला छान्नुहोस्"],
  yourSkills: ["What work can you do?", "तपाईं के काम गर्न सक्नुहुन्छ?"],
  skillsHint: [
    "Pick one or more. You can change this later.",
    "एक वा बढी छान्नुहोस्। पछि परिवर्तन गर्न सकिन्छ।",
  ],
  skillsNoneHint: [
    "Only looking to hire? You can skip this.",
    "काम दिन मात्र चाहनुहुन्छ? यो छाड्न सक्नुहुन्छ।",
  ],
  finishSetup: ["Finish", "सिद्ध्याउनुहोस्"],
  photo: ["Photo", "फोटो"],
  addPhoto: ["Add photo", "फोटो थप्नुहोस्"],
  changePhoto: ["Change photo", "फोटो बदल्नुहोस्"],
  removePhoto: ["Remove photo", "फोटो हटाउनुहोस्"],
  changeCover: ["Change cover photo", "कभर फोटो बदल्नुहोस्"],
  photoTooBig: ["Photo must be under 2 MB.", "फोटो २ MB भन्दा सानो हुनुपर्छ।"],

  // ---- home ----------------------------------------------------------
  greeting: ["Namaste, {name}", "नमस्ते, {name}"],
  searchPlaceholder: ["Search workers or skills", "कामदार वा सीप खोज्नुहोस्"],
  browseSkills: ["Browse by skill", "सीप अनुसार हेर्नुहोस्"],
  skillCategoryTrades: ["Trades & Local Services", "सीप र स्थानीय सेवा"],
  skillCategoryProfessional: ["Professional & Skilled Services", "व्यावसायिक तथा दक्ष सेवा"],
  skillCategoryPersonal: ["Personal & Everyday Services", "व्यक्तिगत तथा दैनिक सेवा"],

  // ---- emergency contacts ---------------------------------------------
  emergencyContacts: ["Emergency Contacts", "आपतकालीन सम्पर्क"],
  emergencyContactsHint: ["Tap a number to call it directly.", "नम्बरमा थिच्नुहोस्, सिधै फोन लाग्नेछ।"],
  emergencyPoliceEmergency: ["Police Emergency", "प्रहरी आपतकालीन"],
  emergencyArmedPoliceForce: ["Armed Police Force", "सशस्त्र प्रहरी बल"],
  emergencyFireBrigade: ["Fire Brigade", "दमकल"],
  emergencyAmbulanceService: ["Ambulance Service", "एम्बुलेन्स सेवा"],
  emergencyRedCrossAmbulance: ["Nepal Red Cross Ambulance", "नेपाल रेडक्रस एम्बुलेन्स"],
  emergencyParopakarAmbulance: ["Paropakar Ambulance Service", "परोपकार एम्बुलेन्स सेवा"],
  emergencyTrafficEmergency: ["Traffic Emergency", "ट्राफिक आपतकालीन"],
  emergencyNationalDisasterResponse: ["National Disaster Response (NDR)", "राष्ट्रिय विपद् प्रतिकार्य (NDR)"],
  emergencyHelicopterRescue: ["Helicopter Rescue (Simrik Air, TIA)", "हेलिकप्टर उद्धार (सिमरिक एयर, त्रिवि विमानस्थल)"],
  emergencyHeliAmbulanceCharter: ["Heli Ambulance Charter Service", "हेली एम्बुलेन्स चार्टर सेवा"],
  emergencyChildHelpline: ["Child Helpline", "बाल हेल्पलाइन"],
  emergencyWomensHelpline: ["Women's Helpline", "महिला हेल्पलाइन"],
  emergencyMissingChildSupport: ["Missing Child Support", "हराएका बालबालिका सहायता"],

  availableToday: ["Available today", "आज उपलब्ध"],
  nearYou: ["Near you", "तपाईंको नजिक"],
  noWorkersYet: ["No workers here yet.", "यहाँ अझै कामदार छैनन्।"],
  noWorkersHint: [
    "Be the first - add your skills so people can find you.",
    "पहिलो बन्नुहोस् - सीप थप्नुहोस् ताकि मानिसले भेटून्।",
  ],
  yourWorkToday: ["Your work", "तपाईंको काम"],
  pendingRequests: ["{count} waiting for you", "{count} तपाईंको जवाफ पर्खिरहेको"],
  addYourSkills: ["Add your skills", "आफ्ना सीपहरू थप्नुहोस्"],
  browseWorkers: ["Browse workers", "कामदारहरू हेर्नुहोस्"],
  goodMorning: ["Good morning", "शुभ प्रभात"],
  goodAfternoon: ["Good afternoon", "शुभ दिउँसो"],
  goodEvening: ["Good evening", "शुभ साँझ"],
  homeHeroPrompt: ["What do you need done today?", "आज के काम गराउनु छ?"],
  popularSkills: ["Popular", "लोकप्रिय"],
  quickActions: ["Quick actions", "छिटो पहुँच"],
  quickFindWorkers: ["Find workers", "कामदार खोज्नुहोस्"],
  quickFindWorkersHint: ["Search by skill", "सीप अनुसार खोज्नुहोस्"],
  quickWorkHint: ["Requests & jobs", "अनुरोध र कामहरू"],
  quickChatsHint: ["Your messages", "तपाईंका सन्देशहरू"],
  quickFriendsHint: ["People you know", "चिनेका मानिसहरू"],
  quickProfileHint: ["Skills & calendar", "सीप र पात्रो"],
  profileCompleteTitle: ["Your profile is {percent}% complete", "तपाईंको प्रोफाइल {percent}% पूरा भयो"],
  profileCompleteHint: [
    "A complete profile helps people nearby find and trust you.",
    "पूरा प्रोफाइलले नजिकका मानिसहरूलाई तपाईंलाई भेट्टाउन र विश्वास गर्न मद्दत गर्छ।",
  ],
  profileItemPhoto: ["Add a profile photo", "प्रोफाइल फोटो थप्नुहोस्"],
  profileItemAbout: ["Write a short intro", "छोटो परिचय लेख्नुहोस्"],
  profileItemLocation: ["Set your location", "आफ्नो स्थान राख्नुहोस्"],
  completeProfile: ["Complete profile", "प्रोफाइल पूरा गर्नुहोस्"],
  reviewCountOne: ["1 review", "१ समीक्षा"],
  availableTodayHint: ["Free to take work today", "आज काम लिन खाली"],
  availableTodayNear: ["Free to take work today in {place}", "{place} मा आज काम लिन खाली"],
  seeEveryoneAvailable: ["See everyone available", "उपलब्ध सबैलाई हेर्नुहोस्"],
  requestShort: ["Request", "अनुरोध"],
  newShort: ["New", "नयाँ"],
  showResults: ["Show results", "नतिजा हेर्नुहोस्"],
  clearAll: ["Clear all", "सबै हटाउनुहोस्"],
  resultsCountMore: ["{count}+ workers", "{count}+ कामदार"],
  searchResultsTitle: ["Results", "नतिजा"],
  searchFor: ["“{q}”", "“{q}”"],
  locatingYou: ["Finding your location…", "तपाईंको स्थान पत्ता लगाउँदै…"],
  clearSearch: ["Clear search", "खोज हटाउनुहोस्"],
  profileTabOverview: ["Overview", "सारांश"],
  profileTabCalendar: ["Calendar", "पात्रो"],
  profileTabSettings: ["Settings", "सेटिङ"],
  profileSectionsNav: ["Profile sections", "प्रोफाइल खण्डहरू"],
  ratingLabel: ["Rating", "रेटिङ"],
  profileDetails: ["Details", "विवरण"],
  availabilityOnHint: [
    "You show up in \"Available today\" and people can send you work.",
    "तपाईं \"आज उपलब्ध\" मा देखिनुहुन्छ र मानिसहरूले तपाईंलाई काम पठाउन सक्छन्।",
  ],
  availabilityOffHint: [
    "You're hidden from \"Available today\" until you switch this back on.",
    "यो फेरि खोल्दासम्म तपाईं \"आज उपलब्ध\" मा देखिनुहुने छैन।",
  ],
  profileItemSkills: ["Add your skills", "आफ्ना सीपहरू थप्नुहोस्"],
  profileItemPhone: ["Add a phone number", "फोन नम्बर थप्नुहोस्"],
  profileItemCertificate: ["Upload a certificate", "प्रमाणपत्र अपलोड गर्नुहोस्"],
  visibilityTitle: ["Visibility", "दृश्यता"],
  accountTitle: ["Account", "खाता"],
  noBusyDays: ["No busy days marked - you're open every day.", "कुनै व्यस्त दिन छैन - तपाईं हरेक दिन खाली हुनुहुन्छ।"],
  skillsAndRates: ["Skills & rates", "सीप र दर"],
  editSkills: ["Edit skills", "सीप सम्पादन"],
  addCertificate: ["Add a certificate", "प्रमाणपत्र थप्नुहोस्"],
  saveChanges: ["Save changes", "परिवर्तन सुरक्षित गर्नुहोस्"],
  searchChats: ["Search chats", "कुराकानी खोज्नुहोस्"],
  allCaughtUp: ["You're all caught up", "तपाईंले सबै पढिसक्नुभयो"],
  allCaughtUpHint: ["New messages will show up here.", "नयाँ सन्देश यहाँ देखिनेछन्।"],
  noChatMatches: ["No chats match “{q}”", "“{q}” सँग मिल्ने कुराकानी छैन"],
  selectConversation: ["Select a conversation", "कुराकानी छान्नुहोस्"],
  selectConversationHint: [
    "Pick someone from the list to read and reply.",
    "पढ्न र जवाफ दिन सूचीबाट कसैलाई छान्नुहोस्।",
  ],
  findPeople: ["Find people", "मानिसहरू खोज्नुहोस्"],
  sayHelloTo: ["Say hello to {name}", "{name} लाई नमस्ते भन्नुहोस्"],
  chatStarterHint: ["Start with one of these, or write your own.", "यीमध्ये एउटाबाट सुरु गर्नुहोस्, वा आफ्नै लेख्नुहोस्।"],
  chatStarter1: ["Namaste! 🙏", "नमस्ते! 🙏"],
  chatStarter2: ["Are you available today?", "के तपाईं आज उपलब्ध हुनुहुन्छ?"],
  chatStarter3: ["What is your rate?", "तपाईंको दर कति हो?"],
  chatStarter4: ["Can you share more details?", "थप विवरण दिन सक्नुहुन्छ?"],
  addEmoji: ["Add emoji", "इमोजी थप्नुहोस्"],
  jumpToLatest: ["Jump to latest", "पछिल्लो सन्देशमा जानुहोस्"],
  sentYouFriendRequest: ["{name} sent you a friend request", "{name} ले तपाईंलाई मित्र अनुरोध पठाउनुभयो"],
  stayingSafeTitle: ["Staying safe", "सुरक्षित रहनुहोस्"],
  stayingSafeTip1: [
    "Agree on the job and the price in a work request before meeting.",
    "भेट्नुअघि कामको अनुरोधमा काम र मूल्य तय गर्नुहोस्।",
  ],
  stayingSafeTip2: ["Keep your chats on Duleko.", "कुराकानी डुलेकोमै राख्नुहोस्।"],
  stayingSafeTip3: [
    "Leave a review when the work is done - it helps everyone.",
    "काम सकिएपछि समीक्षा दिनुहोस् - यसले सबैलाई मद्दत गर्छ।",
  ],
  reportProfile: ["Report this profile", "यो प्रोफाइल उजुरी गर्नुहोस्"],
  shiftEnterHint: ["Enter to send · Shift + Enter for a new line", "पठाउन Enter · नयाँ लाइनका लागि Shift + Enter"],
  guestHeroTitle: ["Find skilled people near you", "नजिकैका सीपालु मानिस भेट्नुहोस्"],

  // ---- search --------------------------------------------------------
  filters: ["Filters", "फिल्टर"],
  allSkills: ["All skills", "सबै सीप"],
  anywhere: ["Anywhere", "जहाँसुकै"],
  anyDay: ["Any day", "जुनसुकै दिन"],
  onDate: ["Free on", "यो दिन खाली"],
  sortBy: ["Sort by", "क्रम"],
  sortRelevance: ["Best match", "उपयुक्त"],
  sortRating: ["Highest rated", "उच्च रेटिङ"],
  sortNewest: ["Newest", "नयाँ"],
  availableOnly: ["Available only", "उपलब्ध मात्र"],
  resultsCount: ["{count} workers", "{count} कामदार"],
  noResults: ["No workers match this search.", "यो खोजसँग मिल्ने कामदार भेटिएन।"],
  noResultsHint: ["Try a wider area or a different skill.", "फराकिलो क्षेत्र वा अर्को सीप प्रयास गर्नुहोस्।"],
  clearFilters: ["Clear filters", "फिल्टर हटाउनुहोस्"],

  // ---- worker profile ------------------------------------------------
  skills: ["Skills", "सीप"],
  about: ["About", "बारेमा"],
  availability: ["Availability", "उपलब्धता"],
  reviews: ["Reviews", "समीक्षा"],
  noReviewsYet: ["No reviews yet.", "अझै समीक्षा छैन।"],
  reviewCount: ["{count} reviews", "{count} समीक्षा"],
  newProfile: ["New on Duleko", "डुलेकोमा नयाँ"],
  requestWork: ["Request work", "काम अनुरोध गर्नुहोस्"],
  callNow: ["Call", "फोन गर्नुहोस्"],
  noPhoneSaved: [
    "This person has not added a phone number yet.",
    "यस व्यक्तिले अझै फोन नम्बर थप्नुभएको छैन।",
  ],
  callSettingTitle: ["Who can call me", "मलाई कसले फोन गर्न सक्छ"],
  callEveryone: ["Everyone", "सबैजना"],
  callAcceptedWork: ["Only after work is accepted", "काम स्वीकार भएपछि मात्र"],
  callFriends: ["Friends", "साथीहरू"],
  callNobody: ["Nobody", "कोही पनि होइन"],
  privacyContactTitle: ["Privacy & contact", "गोपनीयता र सम्पर्क"],
  callEveryoneHint: ["Any signed-in user can see your number and call you.", "साइन इन गरेको जो कोहीले तपाईंको नम्बर देखेर फोन गर्न सक्छ।"],
  callAcceptedWorkHint: [
    "Only people whose work request with you was accepted.",
    "तपाईंसँगको काम अनुरोध स्वीकार भएका व्यक्तिहरू मात्र।",
  ],
  callFriendsHint: ["Only people you have added as friends.", "तपाईंले साथी बनाएका व्यक्तिहरू मात्र।"],
  callNobodyHint: ["Your number stays hidden. Others can only chat.", "तपाईंको नम्बर लुकेको रहन्छ। अरूले कुराकानी मात्र गर्न सक्छन्।"],
  friendsAlwaysHint: [
    "Friends can always call and chat with you, whatever you pick.",
    "तपाईंले जे रोके पनि साथीहरूले सधैं फोन र कुराकानी गर्न सक्छन्।",
  ],
  callSettingSaved: ["Call setting saved.", "फोन सेटिङ सुरक्षित भयो।"],
  chatSettingTitle: ["Who can chat with me", "मसँग कसले कुराकानी गर्न सक्छ"],
  chatEveryone: ["Everybody", "सबैजना"],
  chatEveryoneHint: [
    "Phone numbers can't be sent in chat. Use the call setting above instead.",
    "च्याटमा फोन नम्बर पठाउन मिल्दैन। माथिको फोन सेटिङ प्रयोग गर्नुहोस्।",
  ],
  phoneNumberBlocked: [
    "Phone numbers can't be shared in chat. They are shared through Call, based on the person's call setting.",
    "च्याटमा फोन नम्बर साझा गर्न मिल्दैन। फोन नम्बर सम्बन्धित व्यक्तिको फोन सेटिङ अनुसार 'फोन' मार्फत साझा हुन्छ।",
  ],
  callNotAllowed: [
    "You can't call this person yet. They may limit who can call them, or haven't added a number.",
    "तपाईंले यस व्यक्तिलाई अहिले फोन गर्न मिल्दैन। उनले फोन गर्न सक्ने व्यक्ति सीमित गरेका हुन सक्छन्, वा नम्बर थपेका छैनन्।",
  ],
  chat: ["Chat", "कुराकानी"],
  chatPlaceholder: ["Type a message", "सन्देश लेख्नुहोस्"],
  chatEmpty: ["No messages yet. Say hello.", "अहिलेसम्म सन्देश छैन। नमस्ते भन्नुहोस्।"],
  send: ["Send", "पठाउनुहोस्"],
  navChats: ["Chats", "कुराकानी"],
  chatsTitle: ["Chats", "कुराकानीहरू"],
  youPrefix: ["You: ", "तपाईं: "],
  noChatsYet: ["No chats yet.", "अझै कुनै कुराकानी छैन।"],
  noChatsYetHint: [
    "Message someone from their profile to start a chat.",
    "कुराकानी सुरु गर्न कसैको प्रोफाइलबाट सन्देश पठाउनुहोस्।",
  ],
  chatNow: ["Chat now", "अहिले कुरा गर्नुहोस्"],
  typingIndicator: ["typing…", "टाइप गर्दै…"],
  seenLabel: ["Seen", "हेरियो"],
  unsend: ["Unsend", "पठाइएको हटाउनुहोस्"],
  unsendConfirm: ["Unsend this message for everyone?", "यो सन्देश सबैको लागि हटाउने?"],
  messageRemoved: ["This message was removed.", "यो सन्देश हटाइयो।"],
  youLabel: ["You", "तपाईं"],
  copy: ["Copy", "प्रतिलिपि"],
  react: ["React", "प्रतिक्रिया"],
  reply: ["Reply", "जवाफ दिनुहोस्"],
  edit: ["Edit", "सम्पादन गर्नुहोस्"],
  edited: ["edited", "सम्पादित"],
  replyingTo: ["Replying to {name}", "{name} लाई जवाफ"],
  editingMessage: ["Editing message", "सन्देश सम्पादन गर्दै"],
  editMessagePlaceholder: ["Edit your message", "आफ्नो सन्देश सम्पादन गर्नुहोस्"],
  newMessages: ["New messages", "नयाँ सन्देश"],
  ratingSummary: ["{rating} ({count} reviews)", "{rating} ({count} समीक्षा)"],
  availableNow: ["Available", "उपलब्ध"],
  notAvailable: ["Not available", "उपलब्ध छैन"],
  bookedDay: ["Booked", "बुक भइसकेको"],
  // "Free" on the calendar means "not booked that day" - a different idea
  // from availableNow above (open to accept work at all), so it gets its
  // own word instead of reusing "Available" for two different meanings.
  freeDay: ["Free", "खाली"],
  online: ["Online", "अनलाइन"],
  report: ["Report", "उजुरी"],

  // ---- staff / moderation ----------------------------------------------
  staffBadgeLabel: ["Duleko staff", "डुलेको स्टाफ"],
  verifiedBadgeLabel: ["Verified profile", "प्रमाणित प्रोफाइल"],
  moderatorRoleLabel: ["Moderator", "मोडेरेटर"],
  adminRoleLabel: ["Admin", "एड्मिन"],
  technicalAdminRoleLabel: ["Technical admin", "प्राविधिक एड्मिन"],
  verifyProfile: ["Verify profile", "प्रोफाइल प्रमाणित गर्नुहोस्"],
  unverifyProfile: ["Remove verification", "प्रमाणीकरण हटाउनुहोस्"],
  verifiedSuccess: ["Profile verified.", "प्रोफाइल प्रमाणित भयो।"],
  unverifiedSuccess: ["Verification removed.", "प्रमाणीकरण हटाइयो।"],
  suspendUser: ["Suspend user", "प्रयोगकर्ता निलम्बन गर्नुहोस्"],
  unsuspendUser: ["Unsuspend user", "निलम्बन हटाउनुहोस्"],
  suspendConfirmTitle: ["Suspend this account?", "यो खाता निलम्बन गर्ने हो?"],
  suspendConfirmBody: [
    "They will be signed out, hidden from search, and unable to sign back in until you unsuspend them.",
    "उनीहरू लगआउट हुनेछन्, खोजीमा देखिने छैनन्, र तपाईंले निलम्बन नहटाउञ्जेल फेरि लगइन गर्न सक्नेछैनन्।",
  ],
  suspendReasonPlaceholder: ["Reason (optional, staff-only)", "कारण (वैकल्पिक, स्टाफलाई मात्र देखिने)"],
  suspendedSuccess: ["Account suspended.", "खाता निलम्बन गरियो।"],
  unsuspendedSuccess: ["Account unsuspended.", "निलम्बन हटाइयो।"],
  suspendedBadge: ["Suspended", "निलम्बित"],
  cannotSuspendStaff: ["Staff accounts can't be suspended here.", "स्टाफ खाता यहाँबाट निलम्बन गर्न मिल्दैन।"],
  moderation: ["Moderation", "मोडेरेसन"],
  moderationHint: [
    "Visible only to Duleko staff.",
    "यो डुलेको स्टाफलाई मात्र देखिन्छ।",
  ],
  openReports: ["Open reports", "खुला उजुरीहरू"],
  noOpenReports: ["Nothing to review right now.", "अहिले हेर्नुपर्ने केही छैन।"],
  reportedBy: ["Reported by {name}", "{name} ले उजुरी गर्नुभयो"],
  markReviewed: ["Mark reviewed", "समीक्षा गरियो भनी चिन्ह लगाउनुहोस्"],
  dismissReport: ["Dismiss", "खारेज गर्नुहोस्"],
  reportResolved: ["Report updated.", "उजुरी अद्यावधिक भयो।"],
  viewProfile: ["View profile", "प्रोफाइल हेर्नुहोस्"],
  moderatorActions: ["Moderator actions", "मोडेरेटर कार्यहरू"],

  // ---- friends --------------------------------------------------------
  addFriend: ["Add friend", "मित्र थप्नुहोस्"],
  friendRequestPending: ["Request sent", "अनुरोध पठाइयो"],
  cancelRequest: ["Cancel request", "अनुरोध रद्द गर्नुहोस्"],
  acceptRequest: ["Accept", "स्वीकार गर्नुहोस्"],
  declineRequest: ["Decline", "अस्वीकार गर्नुहोस्"],
  friendRequestSent: ["Friend request sent.", "मित्र अनुरोध पठाइयो।"],
  alreadyFriends: ["✓ Friends", "✓ मित्र"],
  myFriends: ["My friends", "मेरा मित्रहरू"],
  friendRequests: ["Friend requests", "मित्र अनुरोधहरू"],
  noFriendsYet: ["No friends yet.", "अझै कुनै मित्र छैन।"],
  noFriendsYetHint: [
    "People you add as a friend show up here.",
    "तपाईंले मित्र थपेका मानिसहरू यहाँ देखिन्छन्।",
  ],
  noRequestsYet: ["No pending requests.", "पर्खिरहेको अनुरोध छैन।"],
  removeFriend: ["Remove", "हटाउनुहोस्"],
  removeFriendConfirm: ["Remove this friend?", "यो मित्रलाई हटाउने?"],

  // ---- live location ----------------------------------------------------
  shareLocation: ["Share my location", "मेरो स्थान साझा गर्नुहोस्"],
  updateLocation: ["Update location", "स्थान अद्यावधिक गर्नुहोस्"],
  clearLocationAction: ["Clear", "हटाउनुहोस्"],
  locationShared: ["Shared {time} ago", "{time} अघि साझा गरियो"],
  locationSharedPending: ["On - sharing automatically", "सक्रिय - स्वतः साझा हुँदैछ"],
  locationNotShared: ["Off", "बन्द"],
  shareLocationHint: [
    "Useful for drivers and delivery - lets nearby people find you. Optional.",
    "चालक र डेलिभरीका लागि उपयोगी - नजिकैका मानिसले भेट्टाउन सक्छन्। वैकल्पिक।",
  ],
  locationPermissionDenied: [
    "Could not get your location. Check your browser's location permission.",
    "स्थान लिन सकिएन। ब्राउजरको लोकेसन अनुमति जाँच्नुहोस्।",
  ],
  nearestSort: ["Nearest", "सबैभन्दा नजिक"],
  // Compact on purpose - it sits beside a place name in a ~220px column
  // on a phone, and the arrow icon beside it already reads as "away".
  distanceAway: ["{km} km", "{km} कि.मी."],

  // ---- cancellation reason ---------------------------------------------
  cancelReasonTitle: ["Why are you cancelling?", "किन रद्द गर्दै हुनुहुन्छ?"],
  cancelReasonPrompt: ["Pick a reason", "एउटा कारण छान्नुहोस्"],
  cancelReasonScheduleConflict: ["Schedule conflict", "समय मिलेन"],
  cancelReasonChangeOfPlans: ["Change of plans", "योजना बदलियो"],
  cancelReasonPriceDisagreement: ["Could not agree on price", "मूल्यमा सहमति भएन"],
  cancelReasonFoundSomeoneElse: ["Found someone else", "अरू कसैलाई भेट्टाइयो"],
  cancelReasonNoLongerNeeded: ["No longer needed", "अब आवश्यक छैन"],
  cancelReasonNoteRequired: ["Please describe the reason.", "कारण लेख्नुहोस्।"],
  confirmCancel: ["Cancel job", "काम रद्द गर्नुहोस्"],

  // ---- skills: Others + rate ---------------------------------------------
  othersSkillLabel: ["Describe your skill", "आफ्नो सीप वर्णन गर्नुहोस्"],
  othersSkillPlaceholder: ["e.g. Mehendi artist", "जस्तै: मेहेन्दी कलाकार"],
  othersSkillNoteLabel: ["More details", "थप विवरण"],
  othersSkillNotePlaceholder: ["A little about this work", "यो कामको बारेमा छोटकरी"],
  rateFor: ["Rate for {skill}", "{skill} को दर"],
  rateAmountPlaceholder: ["Amount", "रकम"],
  rateUnitPlaceholder: ["per hour, per switch…", "प्रति घण्टा, प्रति स्विच…"],
  rateHint: [
    "Optional - your usual price for this skill.",
    "वैकल्पिक - यो सीपको लागि तपाईंको सामान्य मूल्य।",
  ],

  // ---- google sign-in -----------------------------------------------
  continueWithGoogle: ["Continue with Google", "Google बाट जारी राख्नुहोस्"],
  orDivider: ["or", "वा"],

  reportTitle: ["Report this person", "यो व्यक्तिको उजुरी गर्नुहोस्"],
  reportReason: ["Reason", "कारण"],
  reportDetails: ["What happened?", "के भयो?"],
  reportSent: ["Thanks. We will look into it.", "धन्यवाद। हामी हेर्नेछौं।"],
  reasonSpam: ["Spam", "स्प्याम"],
  reasonFake: ["Fake profile", "नक्कली प्रोफाइल"],
  reasonAbusive: ["Abusive behaviour", "दुर्व्यवहार"],
  reasonNoShow: ["Did not show up", "काममा आएनन्"],
  reasonUnsafe: ["Unsafe", "असुरक्षित"],
  reasonOther: ["Other", "अन्य"],

  // ---- work request --------------------------------------------------
  requestTitle: ["Request work from {name}", "{name} सँग काम अनुरोध"],
  jobTitle: ["What is the job?", "के काम हो?"],
  jobTitlePlaceholder: ["Fix wiring in two rooms", "दुई कोठाको वायरिङ मर्मत"],
  jobDetails: ["More details", "थप विवरण"],
  workDate: ["Which day?", "कुन दिन?"],
  workLocation: ["Where?", "कहाँ?"],
  workLocationPlaceholder: ["Chandrauta, ward 4", "चन्द्रौटा, वडा ४"],
  payment: ["Payment offered", "प्रस्तावित ज्याला"],
  paymentPlaceholder: ["1500", "१५००"],
  paymentHint: ["Leave empty to discuss later.", "पछि कुरा गर्न खाली छोड्नुहोस्।"],
  sendRequest: ["Send request", "अनुरोध पठाउनुहोस्"],
  requestSent: ["Request sent.", "अनुरोध पठाइयो।"],
  cannotRequestSelf: ["You cannot request work from yourself.", "आफैंसँग काम माग्न मिल्दैन।"],
  dateInPast: ["Pick today or a later date.", "आज वा पछिको मिति छान्नुहोस्।"],
  dateUnavailable: ["That day is already booked. Pick another.", "त्यो दिन पहिले नै बुक भइसक्यो। अर्को छान्नुहोस्।"],

  // ---- my work -------------------------------------------------------
  myWork: ["My work", "मेरो काम"],
  asWorker: ["Work I do", "मैले गर्ने काम"],
  asEmployer: ["Work I gave", "मैले दिएको काम"],
  jobsCount: ["{count} jobs", "{count} काम"],
  // The four steps of a job, shown on the card rail and the timeline.
  workProgress: ["Progress", "प्रगति"],
  stepRequested: ["Requested", "अनुरोध"],
  stepAccepted: ["Accepted", "स्वीकृत"],
  stepConfirmed: ["Confirmed", "पक्का"],
  stepDone: ["Done", "सम्पन्न"],
  statusPending: ["Waiting", "पर्खाइमा"],
  statusAccepted: ["Accepted", "स्वीकृत"],
  statusDeclined: ["Declined", "अस्वीकृत"],
  statusConfirmed: ["Confirmed", "पक्का"],
  statusCompleted: ["Completed", "सम्पन्न"],
  statusCancelled: ["Cancelled", "रद्द"],
  accept: ["Accept", "स्वीकार गर्नुहोस्"],
  // Who the job is with, spelled out - the card used a bare arrow.
  workForName: ["For {name}", "{name} को लागि"],
  workByName: ["By {name}", "{name} द्वारा"],
  // Column headings on the engagement card's facts strip. Distinct from
  // workDate above, which is the "Which day?" form label.
  viewDetails: ["View details", "विवरण हेर्नुहोस्"],
  // A display label, unlike cancelReasonPrompt which prompts a choice.
  cancelledBecause: ["Cancelled", "रद्द भयो"],
  workAsWorkerNote: ["You are doing this work", "तपाईंले यो काम गर्दै हुनुहुन्छ"],
  workAsEmployerNote: ["They are doing this work for you", "उहाँले तपाईंको लागि यो काम गर्दै हुनुहुन्छ"],
  workCardDate: ["Date", "मिति"],
  workCardWhere: ["Where", "स्थान"],
  workCardPayment: ["Payment", "भुक्तानी"],
  decline: ["Decline", "अस्वीकार गर्नुहोस्"],
  confirmWork: ["Confirm", "पक्का गर्नुहोस्"],
  markComplete: ["Mark completed", "सम्पन्न भयो"],
  cancelWork: ["Cancel job", "काम रद्द गर्नुहोस्"],
  leaveReview: ["Leave review", "समीक्षा दिनुहोस्"],
  reviewDone: ["Reviewed", "समीक्षा दिइयो"],
  noWorkYet: ["Nothing here yet.", "यहाँ अझै केही छैन।"],
  noWorkYetHint: [
    "When you request work or someone requests you, it shows up here.",
    "तपाईंले काम माग्दा वा कसैले तपाईंलाई माग्दा यहाँ देखिन्छ।",
  ],
  waitingOnWorker: ["Waiting for the worker to reply.", "कामदारको जवाफ पर्खँदै।"],
  waitingOnEmployer: ["Waiting for them to confirm.", "उहाँको पुष्टि पर्खँदै।"],
  confirmedNext: ["Confirmed. Contact each other to arrange the day.", "पक्का भयो। दिन मिलाउन सम्पर्क गर्नुहोस्।"],
  cancelConfirm: ["Cancel this job?", "यो काम रद्द गर्ने?"],

  // ---- reviews -------------------------------------------------------
  reviewTitle: ["How did it go?", "काम कस्तो भयो?"],
  reviewFor: ["Review for {name}", "{name} को समीक्षा"],
  yourRating: ["Your rating", "तपाईंको रेटिङ"],
  reviewComment: ["Add a comment", "टिप्पणी थप्नुहोस्"],
  reviewCommentPlaceholder: ["On time and did good work.", "समयमै आए र राम्रो काम गरे।"],
  submitReview: ["Submit review", "समीक्षा पठाउनुहोस्"],
  reviewThanks: ["Thanks for the review.", "समीक्षाको लागि धन्यवाद।"],
  star1: ["Poor", "नराम्रो"],
  star2: ["Fair", "ठीकै"],
  star3: ["Good", "राम्रो"],
  star4: ["Very good", "धेरै राम्रो"],
  star5: ["Excellent", "उत्कृष्ट"],

  // ---- notifications -------------------------------------------------
  notifications: ["Notifications", "सूचना"],
  markAllRead: ["Mark all read", "सबै पढेको चिन्ह"],
  unreadCount: ["{count} unread", "{count} नपढेको"],
  filterAll: ["All", "सबै"],
  filterUnread: ["Unread", "नपढेको"],
  noUnread: ["Nothing unread.", "नपढेको केही छैन।"],
  noNotifications: ["No notifications.", "कुनै सूचना छैन।"],
  officialAccount: ["Official", "आधिकारिक"],

  // ---- alerts outside the app ----------------------------------------
  alertsOutsideApp: ["Email & SMS alerts", "इमेल र एसएमएस सूचना"],
  emailAlerts: ["Email me", "मलाई इमेल पठाउनुहोस्"],
  emailAlertsHint: [
    "Work requests, friend requests, and chats you miss while you are away.",
    "कामको अनुरोध, मित्र अनुरोध, र तपाईं नभएको बेला आएका च्याट।",
  ],
  smsAlerts: ["Text me (SMS)", "मलाई एसएमएस पठाउनुहोस्"],
  smsAlertsHint: [
    "Only the important ones - work requests and friend requests. Needs a phone number saved.",
    "महत्त्वपूर्ण कुरा मात्र - कामको अनुरोध र मित्र अनुरोध। फोन नम्बर सुरक्षित गरिएको हुनुपर्छ।",
  ],
  alertPrefsSaved: ["Alert settings saved.", "सूचना सेटिङ सुरक्षित भयो।"],

  // ---- profile / settings --------------------------------------------
  myProfile: ["My profile", "मेरो प्रोफाइल"],

  // ---- sharing a profile ---------------------------------------------
  shareProfile: ["Share profile", "प्रोफाइल सेयर गर्नुहोस्"],
  downloadCard: ["Download profile card", "प्रोफाइल कार्ड डाउनलोड गर्नुहोस्"],
  generatingCard: ["Preparing your card…", "तपाईंको कार्ड तयार हुँदैछ…"],
  cardDownloaded: ["Profile card downloaded.", "प्रोफाइल कार्ड डाउनलोड भयो।"],
  cardReadyToShare: ["Choose where to save your card.", "आफ्नो कार्ड कहाँ सुरक्षित गर्ने रोज्नुहोस्।"],
  profileOptions: ["Profile options", "प्रोफाइल विकल्पहरू"],
  copyLink: ["Copy link", "लिङ्क कपी गर्नुहोस्"],
  linkCopied: ["Profile link copied.", "प्रोफाइल लिङ्क कपी भयो।"],
  copyFailed: ["Could not copy the link.", "लिङ्क कपी गर्न सकिएन।"],
  shareProfileText: [
    "{name} on Duleko - find local work and local workers.",
    "डुलेकोमा {name} - नजिकैको काम र कामदार खोज्नुहोस्।",
  ],
  shareProfileHint: [
    "Anyone with this link can open your profile.",
    "यो लिङ्क भएका जो कोहीले तपाईंको प्रोफाइल हेर्न सक्छन्।",
  ],

  // ---- deleting an account -------------------------------------------
  manageAccount: ["Manage account", "खाता व्यवस्थापन"],
  viewPublicProfile: ["View my public profile", "मेरो सार्वजनिक प्रोफाइल हेर्नुहोस्"],
  yourProfileLink: ["Your profile link", "तपाईंको प्रोफाइल लिङ्क"],
  deleteAccount: ["Delete account", "खाता मेटाउनुहोस्"],
  deleteAccountHint: [
    "Permanent. Everything goes, and it cannot be brought back.",
    "स्थायी। सबै कुरा जान्छ, फिर्ता ल्याउन सकिँदैन।",
  ],
  deleteAccountBody: [
    "This removes your profile, photos, chats, work history and reviews for good. It cannot be undone.",
    "यसले तपाईंको प्रोफाइल, फोटो, कुराकानी, कामको इतिहास र समीक्षाहरू सधैंको लागि हटाउँछ। यो फिर्ता गर्न सकिँदैन।",
  ],
  deleteAccountConfirmLabel: [
    "Type DELETE to confirm",
    "पक्का गर्न DELETE लेख्नुहोस्",
  ],
  deleteAccountWord: ["DELETE", "DELETE"],
  deleteAccountPasswordLabel: [
    "Enter your password to confirm",
    "पक्का गर्न आफ्नो पासवर्ड लेख्नुहोस्",
  ],
  wrongPassword: ["That password is not right.", "पासवर्ड मिलेन।"],
  deleteAccountDone: ["Your account has been deleted.", "तपाईंको खाता मेटाइयो।"],
  editProfile: ["Edit profile", "प्रोफाइल सम्पादन"],
  settings: ["Settings", "सेटिङ"],
  language: ["Language", "भाषा"],
  switchToEnglish: ["Switch to English", "अंग्रेजीमा बदल्नुहोस्"],
  switchToNepali: ["Switch to Nepali", "नेपालीमा बदल्नुहोस्"],
  english: ["English", "अंग्रेजी"],
  nepali: ["Nepali", "नेपाली"],
  availableForWork: ["Available for work", "काम गर्न उपलब्ध"],
  markCalendar: ["Mark days you are busy", "व्यस्त दिन चिन्ह लगाउनुहोस्"],
  calendarHint: [
    "Tap a day to mark it busy. Confirmed jobs are marked for you.",
    "व्यस्त दिन छान्न थिच्नुहोस्। पक्का भएका काम आफैं चिन्ह लाग्छ।",
  ],
  profileSaved: ["Profile saved.", "प्रोफाइल सुरक्षित भयो।"],
  memberSince: ["Member since", "देखि सदस्य"],
  basicInfo: ["Basic info", "आधारभूत जानकारी"],
  noAboutYet: [
    "Add a short bio so people know what you do.",
    "छोटो चिनारी थप्नुहोस् ताकि मानिसहरूले तपाईंले के काम गर्नुहुन्छ थाहा पाऊन्।",
  ],
  noSkillsYetProfile: ["No skills added yet.", "अझै कुनै सीप थपिएको छैन।"],
  noSkillsYetProfileHint: [
    "Add skills so employers can find and hire you.",
    "काम दिनेहरूले तपाईंलाई भेट्टाउन र काम दिन सक्ने गरी सीप थप्नुहोस्।",
  ],
  noAboutYetOther: ["Hasn't added a bio yet.", "अझै चिनारी थपेका छैनन्।"],
  editingProfile: ["Editing your profile", "तपाईंको प्रोफाइल सम्पादन गर्दै"],
  daysMarkedBusy: ["{count} days marked busy", "{count} दिन व्यस्त चिन्ह लागेको"],
  uploadCertificateHint: ["PNG, JPG, or PDF up to 5 MB", "PNG, JPG, वा PDF (५ MB सम्म)"],

  // ---- nav -----------------------------------------------------------
  navHome: ["Home", "गृह"],
  navWork: ["Work", "काम"],
  navAlerts: ["Alerts", "सूचना"],
  navProfile: ["Profile", "प्रोफाइल"],

  // ---- setup screen --------------------------------------------------
  setupNeeded: ["Supabase is not configured", "Supabase कन्फिगर भएको छैन"],
  setupHint: [
    "Copy .env.example to .env.local and add your Supabase URL and anon key, then restart the dev server.",
    ".env.example लाई .env.local बनाई Supabase URL र anon key राख्नुहोस्, अनि सर्भर पुनः चलाउनुहोस्।",
  ],

  // ---- profile extras (age / education / bio / alt phone) ------------
  altPhone: ["Alternative phone", "वैकल्पिक फोन"],
  bio: ["Short bio", "छोटो चिनारी"],
  bioHint: ["A one-line headline, under 100 characters.", "१०० अक्षर भन्दा कम, एक लाइनको चिनारी।"],
  age: ["Age", "उमेर"],
  highestEducation: ["Highest education", "उच्च शिक्षा"],
  yearsOld: ["{count} years old", "{count} वर्ष"],
  upload: ["Upload", "अपलोड गर्नुहोस्"],
  delete: ["Delete", "मेट्नुहोस्"],

  // ---- certificates ----------------------------------------------------
  certificates: ["Certificates", "प्रमाणपत्रहरू"],
  certificatesHint: [
    "Show proof of any training you've completed. Optional.",
    "तपाईंले लिनुभएको तालिमको प्रमाण देखाउनुहोस्। वैकल्पिक।",
  ],
  certificateTitlePlaceholder: ["Certificate name", "प्रमाणपत्रको नाम"],

  // ---- month calendar navigation ---------------------------------------
  previousMonth: ["Previous month", "अघिल्लो महिना"],
  nextMonth: ["Next month", "अर्को महिना"],

  // ---- sign-up policy agreement -----------------------------------------
  createYourAccount: ["Create your Duleko account", "आफ्नो डुलेको खाता बनाउनुहोस्"],
  byCreatingAccountNotice: [
    "By creating an account, you agree to Duleko's Terms of Use and acknowledge the Privacy Policy.",
    "खाता बनाएर, तपाईं डुलेकोको प्रयोगका सर्तहरूमा सहमत हुनुहुन्छ र गोपनीयता नीति स्वीकार गर्नुहुन्छ।",
  ],
  iAgreeToThe: ["I agree to the", "म"],
  // Nepali puts the verb after the noun phrase, so it lands after both links
  // instead of up front the way the English sentence reads.
  agreeToPoliciesSuffix: ["", "मा सहमत छु"],
  termsOfService: ["Terms of Use", "प्रयोगका सर्तहरू"],
  privacyPolicy: ["Privacy Policy", "गोपनीयता नीति"],
  mustAgreeToPolicies: [
    "Please agree to the Terms of Use and Privacy Policy to continue.",
    "जारी राख्न कृपया प्रयोगका सर्तहरू र गोपनीयता नीतिमा सहमत हुनुहोस्।",
  ],
  policyQuickSummary: ["Quick summary", "छोटो सारांश"],
  policyFullTerms: ["Read the full Terms of Use", "पूरा प्रयोगका सर्तहरू पढ्नुहोस्"],
  policySummary1: [
    "Provide genuine information about yourself, your skills, and your location. Do not impersonate anyone or use fake certificates.",
    "आफ्नो बारेमा, सीप, र स्थानको बारेमा सही जानकारी दिनुहोस्। कसैको नक्कल नगर्नुहोस् वा नक्कली प्रमाणपत्र प्रयोग नगर्नुहोस्।",
  ],
  policySummary2: [
    "A verified phone number is required. Do not create multiple accounts to mislead or defraud others.",
    "प्रमाणित फोन नम्बर आवश्यक छ। अरूलाई भ्रमित वा ठग्न धेरै खाता नबनाउनुहोस्।",
  ],
  policySummary3: [
    "Use Duleko responsibly. It must not be used for scams, harassment, discrimination, or illegal activity.",
    "डुलेको जिम्मेवारीपूर्वक प्रयोग गर्नुहोस्। यो ठगी, दुर्व्यवहार, भेदभाव, वा गैरकानूनी गतिविधिको लागि प्रयोग हुनु हुँदैन।",
  ],
  policySummary4: [
    "Only list skills you can reasonably perform. Listing a skill does not by itself mean Duleko has verified it.",
    "तपाईं वास्तवमै गर्न सक्ने सीपहरू मात्र राख्नुहोस्। सीप राख्नुले मात्र डुलेकोले त्यो प्रमाणित गरेको जनाउँदैन।",
  ],
  policySummary5: [
    "Be respectful and truthful in requests, communication, cancellations, payments, and reviews.",
    "अनुरोध, संवाद, रद्द, भुक्तानी, र समीक्षामा सम्मानजनक र सत्य हुनुहोस्।",
  ],
  policySummary6: [
    "Sensitive information such as your phone number and exact live location is only shared according to your privacy and contact settings.",
    "फोन नम्बर र सटीक लाइभ स्थान जस्ता संवेदनशील जानकारी तपाईंको गोपनीयता र सम्पर्क सेटिङ अनुसार मात्र साझा गरिन्छ।",
  ],
  policySummary7: [
    "Duleko helps people connect. It does not guarantee the quality, safety, completion, price, or payment of any work arranged between users.",
    "डुलेकोले मानिसहरूलाई जोड्न मद्दत गर्छ। यसले प्रयोगकर्ताहरू बीच मिलेको कामको गुणस्तर, सुरक्षा, पूरा हुने, मूल्य, वा भुक्तानीकोग्यारेन्टी दिँदैन।",
  ],
  policySummary8: [
    "Use reasonable judgment before meeting, hiring, or working with someone. Report suspicious or unsafe behaviour.",
    "कसैलाई भेट्नु, काममा राख्नु, वा सँगै काम गर्नुअघि उचित सतर्कता अपनाउनुहोस्। शंकास्पद वा असुरक्षित व्यवहार जानकारी दिनुहोस्।",
  ],
  policySummary9: [
    "Accounts involved in fraud, fake credentials, or repeated harmful behaviour may be restricted or suspended.",
    "ठगी, नक्कली प्रमाणपत्र, वा बारम्बार हानिकारक व्यवहारमा संलग्न खाताहरू रोक्न वा निलम्बन गर्न सकिन्छ।",
  ],

  // ---- location permission prompt (asked only when a feature needs it) --
  locationConsentTitle: ["Share your location with Duleko?", "डुलेकोसँग तपाईंको स्थान साझा गर्ने हो?"],
  locationConsentBody: [
    "If you allow it, your location is shared automatically every time you sign in from now on - no need to ask again. It lets nearby people see roughly how far away you are. You can turn this off anytime from Profile.",
    "अनुमति दिनुभयो भने, अबदेखि तपाईं लगइन गर्दा हरेक पटक स्वतः स्थान साझा हुनेछ - फेरि सोध्नु पर्दैन। यसले नजिकैका मानिसहरूलाई तपाईं कति टाढा हुनुहुन्छ भनेर देख्न मद्दत गर्छ। तपाईं जुनसुकै बेला प्रोफाइलबाट यो बन्द गर्न सक्नुहुन्छ।",
  ],
  allowLocation: ["Allow Location", "स्थान अनुमति दिनुहोस्"],
  continueAction: ["Continue", "जारी राख्नुहोस्"],

  // Location consent prompt for registration
  registrationLocationConsentTitle: ["Allow Duleko to use your location?", "के डुलेकोले तपाईंको स्थान प्रयोग गर्न दिनुहुन्छ?"],
  registrationLocationConsentDesc: [
    "Your location helps Duleko show relevant people and opportunities nearby. Your precise/live location will not be publicly displayed unless you choose to share it.",
    "तपाईंको स्थानले डुलेकोलाई नजिकैका प्रासंगिक मानिसहरू र अवसरहरू देखाउन मद्दत गर्छ। तपाईंले साझा गर्ने छनोज नगरेसम्म तपाईंको सटीक/लाइभ स्थान सार्वजनिक रूपमा देखाइँदैन।",
  ],

  // ---- welcome walkthrough ----------------------------------------------
  skip: ["Skip", "छोड्नुहोस्"],
  getStarted: ["Get started", "सुरु गर्नुहोस्"],
  welcomeBack: ["Welcome back, {name}!", "फेरि स्वागत छ, {name}!"],
  walkthroughTitle1: ["Find skilled people nearby", "नजिकैका सिपालु मानिस भेट्टाउनुहोस्"],
  walkthroughBody1: [
    "Browse by skill or search to find workers near you, sorted by distance.",
    "सिप अनुसार हेर्नुहोस् वा खोज्नुहोस् - दूरी अनुसार क्रमबद्ध नजिकैका कामदार भेट्टाउनुहोस्।",
  ],
  walkthroughTitle2: ["Request work in a tap", "एक ट्यापमा काम अनुरोध गर्नुहोस्"],
  walkthroughBody2: [
    "Describe the job, pick a free date, and send a request - no need to pick a specific skill.",
    "कामको विवरण दिनुहोस्, खाली मिति छान्नुहोस्, र अनुरोध पठाउनुहोस् - कुनै खास सिप छान्नु पर्दैन।",
  ],
  walkthroughTitle3: ["Add friends, stay connected", "साथी थप्नुहोस्, जोडिइरहनुहोस्"],
  walkthroughBody3: [
    "Add people you know as friends to chat and call them anytime, work or no work.",
    "चिनेका मानिसलाई साथी बनाउनुहोस् र जुनसुकै बेला कुराकानी वा फोन गर्नुहोस्।",
  ],
  walkthroughTitle4: ["Set your rate and schedule", "आफ्नो मूल्य र समय तालिका मिलाउनुहोस्"],
  walkthroughBody4: [
    "List your skills with an optional rate, and mark the days you're busy on a full year calendar.",
    "आफ्ना सिपहरू र वैकल्पिक मूल्य राख्नुहोस्, र पूरै वर्षको पात्रोमा व्यस्त दिनहरू चिन्ह लगाउनुहोस्।",
  ],

  // ---- price negotiation (bidding) --------------------------------------
  yourOffer: ["Your offer", "तपाईंको प्रस्ताव"],
  workerRateHint: ["Their listed rate: {rates}", "तिनको दर: {rates}"],
  acceptAtPrice: ["Accept - {amount}", "स्वीकार - {amount}"],
  counterOffer: ["Counter-offer", "जवाफी प्रस्ताव"],
  submitCounter: ["Send offer", "प्रस्ताव पठाउनुहोस्"],
  negotiation: ["Negotiation", "मोलमोलाई"],
  yourTurn: ["Your turn", "तपाईंको पालो"],
  theirTurn: ["Waiting", "पर्खाइमा"],
  offerFrom: ["Offer from {name}", "{name}को प्रस्ताव"],
  waitingForResponse: ["Waiting for {name} to respond.", "{name}को जवाफको पर्खाइमा।"],

  // ---- static pages (About, Mission, Motivation, Privacy) ---------------
  navAbout: ["About", "बारेमा"],
  navMission: ["Mission", "उद्देश्य"],

  aboutTitle: ["About Duleko", "डुलेकोको बारेमा"],
  aboutSubtitle: ["Who we are and what we're building", "हामी को हौं र के बनाउँदैछौं"],
  aboutDescription: [
    "Duleko is a simple local skills marketplace built for Nepal, connecting people who need work done with skilled workers nearby, tutors, electricians, IT help, drivers, and anyone else with a skill to offer.",
    "डुलेको नेपालको लागि बनाइएको सरल स्थानीय सीप बजार हो, जसले काम गर्ने मानिसहरूलाई नजिकैका सिपालु कामदार, ट्युटर, इलेक्ट्रिसियन, आईटी सहयोग, चालक, र सीप भएका अन्य कसैसँग जोड्छ।",
  ],
  howItWorks: ["How it works", "यस कसरी काम गर्छ"],
  meetTheTeam: ["Meet the team", "टोली भेट्नुहोस्"],
  contactUs: ["Contact", "सम्पर्क"],
  contactEmail: ["dulekonepal@gmail.com", "dulekonepal@gmail.com"],
  contactQuestion: ["Questions, feedback, or partnership ideas? Reach us at", "प्रश्न, प्रतिक्रिया, वा साझेदारीको विचार? हामीलाई सम्पर्क गर्नुहोस्"],

  // Mission page
  missionTitle: ["Our mission", "हाम्रो उद्देश्य"],
  missionSubtitle: ["Why Duleko exists", "डुलेको किन छ"],
  whatWereBuildingToward: ["What we're building toward", "हामी के तिर बनाउँदैछौं"],
  missionPrinciple1: [
    "Any skill, not just a fixed list. Free-typed skills are just as searchable as catalogued ones.",
    "कुनै पनि सीप, निश्चित सूची मात्र होइन। मुक्त-रूपमा टाइप गरिएका सीपहरू पनि सूचीकृत जस्तै खोज्न सकिन्छ।",
  ],
  missionPrinciple2: [
    "Distance-first search, so the nearest available person is the easiest to find.",
    "दूरी-पहिले खोज, ताकि नजिकैको उपलब्ध व्यक्ति भेट्न सजिलो होस्।",
  ],
  missionPrinciple3: [
    "Free to join, free to browse. No cost to find work or find workers.",
    "जोडिन निःशुल्क, हेर्न निःशुल्क। काम वा कामदार खोज्न कुनै खर्च छैन।",
  ],
  missionPrinciple4: [
    "Built bilingual from day one: English and Nepali, equally.",
    "दिन एकदेखि द्विभाषिक: अंग्रेजी र नेपाली, समान रूपमा।",
  ],
  missionPrinciple5: [
    "Works well even on slower connections, since that is the reality for many people it is meant to serve.",
    "ढिलो कनेक्सनमा पनि राम्रोसँग काम गर्छ, किनकि यो धेरै मानिसहरूको लागि वास्तविकता हो।",
  ],
  yourSkillsOurCommunity: ["Your skills. Our community.", "तपाईंको सीप। हाम्रो समुदाय।"],
  yourSkillsOurCommunityDesc: [
    "That is the line on every Duleko profile card, and it is the whole idea in five words: the skills belong to the people who have them, and the platform's only job is to help the right two people find each other.",
    "हरेक डुलेको प्रोफाइल कार्डमा यही लाइन छ, र यो पाँच शब्दमा सम्पूर्ण विचार हो: सीपहरू ती भएका मानिसहरूकै हुन्, र प्लेटफर्मको एकमात्र काम सही दुई मानिसलाई एकअर्कालाई भेटाउन मद्दत गर्नु हो।",
  ],
  missionStatement: [
    "If someone who isn't technical can't use and understand Duleko, it doesn't matter how well we build.",
    "यदि प्राविधिक नभएको व्यक्तिले डुलेको प्रयोग र बुझ्न सकेन भने, हामीले कति राम्रो बनाए पनि केही मात्र हुँदैन।",
  ],
  missionStatementDesc: [
    "That is the bar for every screen we ship. Duleko is for people who need work done and people who do the work, not for people who build software. In most communities in Nepal, finding local work, or finding someone to do it, still happens by word of mouth. Duleko exists to make that connection direct, and clear enough that anyone can use it.",
    "हामीले पठाउने हरेक स्क्रिनको मापदण्ड यही हो। डुलेको काम गराउने र काम गर्ने मानिसहरूका लागि हो, सफ्टवेयर बनाउनेहरूका लागि होइन। नेपालका धेरै समुदायहरूमा स्थानीय काम खोज्ने वा त्यो गर्न कसैलाई भेट्टाउने अझै शब्दको माध्यमबाट हुन्छ। डुलेको त्यो जोडाई सिधै बनाउन, र जो कोहीले बुझेर प्रयोग गर्न सक्ने बनाउन छ।",
  ],

  // Motivation page
  motivationTitle: ["Why we built Duleko", "हामीले डुलेको किन बनायौं"],
  motivationSubtitle: ["In the founders' own words", "संस्थापकहरूकै शब्दहरूमा"],
  motivationIntro: [
    "Duleko started from a plain observation: skilled people and the people who need them are usually close by, but there is no easy way for them to find each other beyond asking around. In Nepal's local communities, that gap costs both sides time, whether it is a worker who could use the job or an employer who could use the help.",
    "डुलेको एउटा सामान्य अवलोकनबाट सुरु भयो: सिपालु मानिसहरू र तिनीहरूलाई चाहिने मानिसहरू सामान्यतया नजिकै हुन्छन्, तर वरिपरि सोध्नु बाहेक तिनीहरूलाई एकअर्कालाई भेट्टाउन कुनै सजिलो तरिका छैन। नेपालका स्थानीय समुदायहरूमा, त्यो खाडलले दुवैपट्टिलाई समय खर्च गराउँछ, चाहे काम चाहिने कामदार होस् वा सहयोग चाहिने काम दिने होस्।",
  ],
  straightFromTheTeam: ["Straight from the team", "टोलीबाट सिधै"],
  whatKeepsUsBuilding: ["What keeps us building", "हामीलाई के बनाउँदै राख्छ"],
  whatKeepsUsBuildingDesc: [
    "Every real profile on Duleko (a tutor listing their rate, a worker marking which days they are free, an employer sending a work request instead of making a dozen phone calls) is the actual reason this exists. Not to be another app, but to make one specific thing easier for people who should not need to be technical to use it.",
    "डुलेकोमा हरेक वास्तविक प्रोफाइल (ट्युटरले आफ्नो दर राख्ने, कामदारले कुन दिन खाली छ चिन्ह लगाउने, काम दिनेले दर्जनौं फोन नगरी काम अनुरोध पठाउने) यो अस्तित्वमा रहनको वास्तविक कारण हो। अर्को ऐप हुन नभई, प्राविधिक नभए पनि प्रयोग गर्न सकिने गरी एउटा खास कुरा सजिलो बनाउनु।",
  ],

  // Privacy policy page
  privacyTitle: ["Privacy policy", "गोपनीयता नीति"],
  privacyLastUpdated: ["Last updated: September 2026", "अन्तिम अद्यावधिक: सेप्टेम्बर २०२६"],
  privacyIntro: [
    "Welcome to Duleko. Duleko helps people discover skills, connect with people nearby, and find or offer work opportunities.",
    "डुलेकोमा स्वागत छ। डुलेकोले मानिसहरूलाई सीपहरू खोज्न, नजिकैका मानिसहरूसँग जोड्न, र कामको अवसर खोज्न वा प्रस्ताव गर्न मद्दत गर्छ।",
  ],

  // Information we collect
  privacyInfoCollectTitle: ["1. Information we collect", "१. हामीले संकलन गर्ने जानकारी"],
  privacyInfoCollectIntro: [
    "Depending on the features a user chooses to use, Duleko may collect:",
    "प्रयोगकर्ताले प्रयोग गर्ने सुविधाहरूको आधारमा, डुलेकोले निम्न जानकारी संकलन गर्न सक्छ:",
  ],
  privacyAccountInfo: ["Account information: name, mobile number and authentication information.", "खाता जानकारी: नाम, मोबाइल नम्बर र प्रमाणीकरण जानकारी।"],
  privacyProfileInfo: ["Profile information: photograph, skills, description, rates, general address/location and availability.", "प्रोफाइल जानकारी: फोटो, सीपहरू, विवरण, दरहरू, सामान्य ठेगाना/स्थान र उपलब्धता।"],
  privacyWorkInfo: ["Work information: work requests, accepted/completed work, cancellations and reviews.", "काम जानकारी: कामको अनुरोध, स्वीकृत/पूरा गरिएको काम, रद्द र समीक्षाहरू।"],
  privacyVerificationInfo: ["Verification information: certificates or other documents voluntarily submitted for verification.", "प्रमाणीकरण जानकारी: प्रमाणीकरणको लागि स्वेच्छिक रूपमा पेश गरिएका प्रमाणपत्र वा अन्य कागजातहरू।"],
  privacyLocationInfo: ["Location information: approximate or precise device location when the user gives permission to a feature requiring it.", "स्थान जानकारी: प्रयोगकर्ताले आवश्यक सुविधालाई अनुमति दिँदा उपकरणको अनुमानित वा सटीक स्थान।"],
  privacyTechnicalInfo: ["Technical information: information reasonably necessary for security, authentication, troubleshooting and operation of Duleko.", "प्राविधिक जानकारी: सुरक्षा, प्रमाणीकरण, समस्या समाधान र डुलेकोको सञ्चालनको लागि उचित रूपमा आवश्यक जानकारी।"],
  privacyNepalAct: [
    "Nepal's Privacy Act expressly regulates personal information and privacy, so Duleko should treat collection, storage and disclosure of these data as a core compliance issue rather than merely an app setting.",
    "नेपालको गोपनीयता ऐनले व्यक्तिगत जानकारी र गोपनीयतालाई स्पष्ट रूपमा नियमन गर्छ, त्यसैले डुलेकोले यी डेटाहरूको संकलन, भण्डारण र प्रकटीकरणलाई मात्र एक ऐप सेटिङको रूपमा होइन, तर एक मुख्य अनुपालन मुद्दाको रूपमा व्यवहार गर्नुपर्छ।",
  ],

  // Why We Use This Information
  privacyWhyUseTitle: ["2. Why we use this information", "२. हामी यो जानकारी किन प्रयोग गर्छौं"],
  privacyWhyUseIntro: ["Duleko may use information to:", "डुलेकोले जानकारी प्रयोग गर्न सक्छ:"],
  privacyUseCreateAccount: ["Create and maintain accounts", "खाताहरू सिर्जना र सम्हाल्न"],
  privacyUseShowWorkers: ["Show users relevant workers and skills", "प्रयोगकर्ताहरूलाई प्रासंगिक कामदार र सीपहरू देखाउन"],
  privacyUseConnect: ["Enable users to connect", "प्रयोगकर्ताहरूलाई जोड्न सक्ने बनाउन"],
  privacyUseLocation: ["Provide location-based discovery", "स्थान-आधारित खोज प्रदान गर्न"],
  privacyUseVerify: ["Verify users or qualifications", "प्रयोगकर्ता वा योग्यताहरू प्रमाणित गर्न"],
  privacyUseProcessRequests: ["Process work requests", "कामको अनुरोधहरू प्रक्रिया गर्न"],
  privacyUseDisplayReviews: ["Display ratings and reviews", "रेटिङ र समीक्षाहरू प्रदर्शन गर्न"],
  privacyUsePreventFraud: ["Prevent fraud and misuse", "ठगी र दुरुपयोग रोक्न"],
  privacyUseImprove: ["Improve Duleko", "डुलेको सुधार गर्न"],
  privacyUseComply: ["Comply with applicable Nepalese law", "लागू नेपाली कानून अनुपालन गर्न"],
  privacyNoFutureCollection: ["We should not collect personal information simply because it might become useful later.", "हामीले केवल भविष्यमा उपयोगी हुन सक्छ भनेर व्यक्तिगत जानकारी संकलन गर्नु हुँदैन।"],

  // Public Profile Information
  privacyPublicProfileTitle: ["3. Public profile information", "३. सार्वजनिक प्रोफाइल जानकारी"],
  privacyPublicProfileIntro: [
    "Some information is intended to be visible to other Duleko users or visitors, such as:",
    "केही जानकारी अन्य डुलेको प्रयोगकर्ता वा आगन्तुकहरूलाई देखिने उद्देश्यले राखिएको छ, जस्तै:",
  ],
  privacyPublicProfileItems: [
    "Name • profile photo • skills • expected rates • general location • availability • ratings • verification status",
    "नाम • प्रोफाइल फोटो • सीपहरू • अपेक्षित दरहरू • सामान्य स्थान • उपलब्धता • रेटिङ • प्रमाणीकरण स्थिति",
  ],
  privacyPublicProfileNotice: [
    "Users should be clearly informed which information will become public before publishing their profile.",
    "प्रयोगकर्ताहरूलाई आफ्नो प्रोफाइल प्रकाशित गर्नुअघि कुन जानकारी सार्वजनिक हुने भनेर स्पष्ट रूपमा जानकारी दिनुपर्छ।",
  ],

  // Phone Numbers
  privacyPhoneTitle: ["4. Phone numbers", "४. फोन नम्बरहरू"],
  privacyPhoneIntro: [
    "A user's mobile number is collected for account verification and communication.",
    "प्रयोगकर्ताको मोबाइल नम्बर खाता प्रमाणीकरण र सञ्चारको लागि संकलन गरिन्छ।",
  ],
  privacyPhoneNotPublic: [
    "Duleko should not make phone numbers openly available to anonymous visitors.",
    "डुलेकोले फोन नम्बरहरूलाई अनाम आगन्तुकहरूलाई खुला रूपमा उपलब्ध गर्नु हुँदैन।",
  ],
  privacyPhoneAccess: [
    "Where Duleko enables users to call or contact each other, access should follow Duleko's account and privacy controls.",
    "जहाँ डुलेकोले प्रयोगकर्ताहरूलाई एकअर्कालाई कल वा सम्पर्क गर्न सक्ने बनाउँछ, पहुँचले डुलेकोको खाता र गोपनीयता नियन्त्रणहरू पछ्याउनुपर्छ।",
  ],

  // Location and Live Location
  privacyLocationTitle: ["5. Location and live location", "५. स्थान र लाइभ स्थान"],
  privacyLocationImportant: ["This section is especially important for Duleko.", "यो खण्ड डुलेकोको लागि विशेष गरी महत्त्वपूर्ण छ।"],
  privacyLocationNotPublic: [
    "A user's exact or live location should never become publicly visible merely because they created an account.",
    "प्रयोगकर्ताको सटीक वा लाइभ स्थाले कहिल्यै मात्र खाता सिर्जना गरेकैले सार्वजनिक रूपमा देखिने हुनु हुँदैन।",
  ],
  privacyLocationPermission: [
    "Location access should be permission-based. Where possible, public discovery should display an approximate area or distance rather than exact coordinates.",
    "स्थान पहुँच अनुमति-आधारित हुनुपर्छ। सम्भव भए सम्म, सार्वजनिक खोजले सटीक निर्देशांकको सट्टा अनुमानित क्षेत्र वा दूरी प्रदर्शन गर्नुपर्छ।",
  ],
  privacyLocationLiveSharing: [
    "If Duleko introduces live-location sharing, the user should knowingly activate it and be able to stop sharing it.",
    "यदि डुलेकोले लाइभ-स्थान साझेदारी प्रस्तुत गर्छ भने, प्रयोगकर्ताले जानीजानी यसलाई सक्रिय गर्नुपर्छ र साझेदारी रोक्न सक्नुपर्छ।",
  ],

  // Certificates and Verification
  privacyCertificatesTitle: ["6. Certificates and verification", "६. प्रमाणपत्र र प्रमाणीकरण"],
  privacyCertificatesNotPublic: [
    "Certificates submitted for verification should not automatically become publicly downloadable documents.",
    "प्रमाणीकरणको लागि पेश गरिएका प्रमाणपत्रहरू स्वचालित रूपमा सार्वजनिक रूपमा डाउनलोड गर्न मिल्ने कागजातहरू बन्नु हुँदैन।",
  ],
  privacyCertificatesDisplay: [
    "Duleko may instead display information such as:",
    "डुलेकोले सट्टा यस्तो जानकारी प्रदर्शन गर्न सक्छ:",
  ],
  privacyVerified: ["✓ Training Verified", "✓ तालिम प्रमाणित"],
  privacyVerifiedBy: ["Verified by [Municipality/Training Institution]", "[नगरपालिका/तालिम संस्था] द्वारा प्रमाणित"],
  privacyCertificatesCollect: [
    "Duleko should collect and retain only the verification information reasonably necessary for this purpose.",
    "डुलेकोले यो उद्देश्यको लागि उचित रूपमा आवश्यक प्रमाणीकरण जानकारी मात्र संकलन र राख्नुपर्छ।",
  ],

  // Sharing Information
  privacySharingTitle: ["7. Sharing information", "७. जानकारी साझा गर्ने"],
  privacyNoSell: [
    "Duleko should not sell users' personal information.",
    "डुलेकोले प्रयोगकर्ताहरूको व्यक्तिगत जानकारी बेच्नु हुँदैन।",
  ],
  privacySharingConditions: [
    "Information may be shared only where reasonably necessary to operate Duleko, where the user has authorized the sharing, with service providers needed to operate the platform subject to appropriate safeguards, or where disclosure is required by applicable law.",
    "जानकारी केवल डुलेको सञ्चालन गर्न उचित रूपमा आवश्यक भएता, प्रयोगकर्ताले साझेदारीलाई अनुमति दिएको ठाउँमा, उपयुक्त सुरक्षाको अधीनमा प्लेटफर्म सञ्चालन गर्न आवश्यक सेवा प्रदायकहरूसँग, वा लागू कानूनले आवश्यक गरेको ठाउँमा मात्र साझा गर्न सकिन्छ।",
  ],
  privacyMunicipality: [
    "A municipality partnering with Duleko should not automatically receive individual users' private information simply because it promotes or verifies people on the platform.",
    "डुलेकोसँग साझेदार गरेको नगरपालिकाले केवल प्लेटफर्ममा मानिसहरूलाई प्रवर्द्धन वा प्रमाणित गर्छ भनेर व्यक्तिगत प्रयोगकर्ताहरूको निजी जानकारी स्वचालित रूपमा प्राप्त गर्नु हुँदैन।",
  ],
  privacyAggregated: [
    "For reporting purposes, Duleko should preferably provide aggregated information such as:",
    "रिपोर्टिङको उद्देश्यको लागि, डुलेकोले प्राथमिकताका साथ समगु जानकारी प्रदान गर्नुपर्छ, जस्तै:",
  ],
  privacyAggregatedExample: [
    "247 trained people registered\n163 received work opportunities\n92 completed work",
    "२४७ जना प्रशिक्षित व्यक्ति दर्ता भए\n१६३ जनाले कामको अवसर पाए\n९२ जनाले काम पूरा गरे",
  ],
  privacyNoIndividualDisclosure: [
    "rather than disclosing individual people's private activity.",
    "व्यक्तिगत मानिसहरूको निजी गतिविधि प्रकट गर्नुको सट्टा।",
  ],

  // Data Security
  privacySecurityTitle: ["8. Data security", "८. डेटा सुरक्षा"],
  privacySecurityDesc: [
    "Duleko will take reasonable technical and organizational measures to protect personal information from unauthorized access, disclosure, alteration, loss, or misuse.",
    "डुलेकोले व्यक्तिगत जानकारीलाई अनाधिकृत पहुँच, प्रकटीकरण, परिवर्तन, हराउने, वा दुरुपयोगबाट बचाउन उचित प्राविधिक र संगठनात्मक उपायहरू लिनेछ।",
  ],
  privacyNoAbsoluteSecurity: [
    "No online system can guarantee absolute security.",
    "कुनै पनि अनलाइन प्रणालीले पूर्ण सुरक्षा ग्यारेन्टी दिन सक्दैन।",
  ],

  // User Choices
  privacyChoicesTitle: ["9. User choices", "९. प्रयोगकर्ता विकल्पहरू"],
  privacyChoicesIntro: [
    "Users should be provided reasonable ways to:",
    "प्रयोगकर्ताहरूलाई उचित तरिकाहरू प्रदान गर्नुपर्छ:",
  ],
  privacyChoiceEdit: ["Edit their information", "आफ्नो जानकारी सम्पादन गर्न"],
  privacyChoiceVisibility: ["Control relevant visibility and location permissions", "प्रासंगिक दृश्यता र स्थान अनुमतिहरू नियन्त्रण गर्न"],
  privacyChoiceStopLocation: ["Stop live-location sharing", "लाइभ-स्थान साझेदारी रोक्न"],
  privacyChoiceLogout: ["Log out", "लग आउट गर्न"],
  privacyChoiceDelete: ["Request account deletion", "खाता मेटाउन अनुरोध गर्न"],
  privacyChoicesImplementation: [
    "The engineering implementation should actually support the rights and choices promised in this policy.",
    "इन्जिनियरिङ कार्यान्वयनले यस नीतिमा वाचा गरिएका अधिकार र विकल्पहरूलाई वास्तवमा समर्थन गर्नुपर्छ।",
  ],

  // Changes to Policy
  privacyChangesTitle: ["10. Changes to this policy", "१०. यो नीतिमा परिवर्तन"],
  privacyChangesDesc: [
    "Duleko may update this Privacy Policy as the platform develops or legal requirements change.",
    "डुलेकोले प्लेटफर्म विकास हुँदा वा कानूनी आवश्यकताहरू परिवर्तन हुँदा यो गोपनीयता नीति अद्यावधिक गर्न सक्छ।",
  ],
  privacyChangesNotice: [
    "Where a material change significantly affects how users' personal information is handled, users should be appropriately informed.",
    "जहाँ एउटा महत्त्वपूर्ण परिवर्तनले प्रयोगकर्ताहरूको व्यक्तिगत जानकारी कसरी ह्यान्डल गरिन्छ भन्ने कुरालाई महत्त्वपूर्ण रूपमा असर गर्छ, प्रयोगकर्ताहरूलाई उपयुक्त रूपमा जानकारी दिनुपर्छ।",
  ],

  // Contact
  privacyContactQuestion: ["Questions about this policy or your data? Reach us at", "यो नीति वा तपाईंको डेटाको बारेमा प्रश्न? हामीलाई सम्पर्क गर्नुहोस्"],

  // User Registration Policy
  registrationPolicyTitle: ["Duleko User Registration Policy", "डुलेको प्रयोगकर्ता दर्ता नीति"],
  registrationPolicyLastUpdated: ["Last updated: September 2026", "अन्तिम अद्यावधिक: सेप्टेम्बर २०२६"],
  registrationPolicyIntro: [
    "Welcome to Duleko. Duleko helps people discover skills, connect with people nearby, and find or offer work opportunities. By creating an account, you agree to the following:",
    "डुलेकोमा स्वागत छ। डुलेकोले मानिसहरूलाई सीपहरू खोज्न, नजिकैका मानिसहरूसँग जोड्न, र कामको अवसर खोज्न वा प्रस्ताव गर्न मद्दत गर्छ। खाता सिर्जना गरेर, तपाईं निम्नलाई स्वीकार गर्नुहुन्छ:",
  ],
  regPolicyGenuineInfo: [
    "Provide genuine information. Use accurate information about yourself, your skills, experience, location, rates, and qualifications. Do not impersonate another person or provide false certificates or credentials.",
    "सही जानकारी प्रदान गर्नुहोस्। आफ्नो बारेमा, सीप, अनुभव, स्थान, दर, र योग्यताको बारेमा सटीक जानकारी प्रयोग गर्नुहोस्। अर्को व्यक्तिको नक्कल नगर्नुहोस् वा नक्कली प्रमाणपत्र वा प्रमाणपत्र प्रदान नगर्नुहोस्।",
  ],
  regPolicyPhoneVerification: [
    "Phone verification is required. Every registered account must have a verified phone number. One person should not create multiple accounts for misleading, fraudulent, or abusive purposes.",
    "फोन प्रमाणीकरण आवश्यक छ। हरेक दर्ता गरिएको खातामा प्रमाणित फोन नम्बर हुनुपर्छ। एक व्यक्तिले भ्रामक, ठगी, वा दुरुपयोगको उद्देश्यका लागि धेरै खाता सिर्जना गर्नु हुँदैन।",
  ],
  regPolicyResponsibleUse: [
    "Use Duleko responsibly. Duleko may not be used for scams, harassment, discrimination, illegal activities, exploitation, or activities that could harm other users.",
    "डुलेको जिम्मेवारीपूर्वक प्रयोग गर्नुहोस्। डुलेको ठगी, दुर्व्यवहार, भेदभाव, गैरकानूनी गतिविधि, शोषण, वा अन्य प्रयोगकर्ताहरूलाई हानि पुर्याउने गतिविधिहरूको लागि प्रयोग हुनु हुँदैन।",
  ],
  regPolicyTruthfulSkills: [
    "Be truthful about your skills. Only list skills you can reasonably perform. A skill listed by a user does not automatically mean that Duleko has verified that person's qualifications. Verified credentials will be clearly identified separately.",
    "आफ्नो सीपहरूको बारेमा सत्य हुनुहोस्। तपाईं वास्तवमा गर्न सक्ने सीपहरू मात्र सूचीमा राख्नुहोस्। प्रयोगकर्ताले सूचीमा राखेको सीपले डुलेकोले त्यो व्यक्तिको योग्यता प्रमाणित गरेको जनाउँदैन। प्रमाणित प्रमाणपत्रहरू छुट्टै स्पष्ट रूपमा पहिचान गरिनेछ।",
  ],
  regPolicyRespectOthers: [
    "Respect other users. Work requests, communication, cancellations, payments, and reviews should be made respectfully and truthfully. Users should not intentionally mislead or take advantage of one another.",
    "अन्य प्रयोगकर्ताहरूलाई सम्मान गर्नुहोस्। कामको अनुरोध, सञ्चार, रद्द, भुक्तानी, र समीक्षाहरू सम्मानजनक र सत्य रूपमा गर्नुपर्छ। प्रयोगकर्ताहरूले एकअर्कालाई जानीजानी भ्रमित वा फाइदा उठाउनु हुँदैन।",
  ],
  regPolicyProtectInfo: [
    "Protect personal information. Some profile information may be visible to people exploring Duleko. Sensitive information such as your phone number, exact/live location, and other private information should only be shared according to Duleko's privacy and contact settings.",
    "व्यक्तिगत जानकारी सुरक्षित गर्नुहोस्। केही प्रोफाइल जानकारी डुलेको हेर्ने मानिसहरूलाई देखिन सक्छ। तपाईंको फोन नम्बर, सटीक/लाइभ स्थान, र अन्य निजी जानकारी जस्ता संवेदनशील जानकारी डुलेकोको गोपनीयता र सम्पर्क सेटिङ अनुसार मात्र सा�-shared गर्नुपर्छ।",
  ],
  regPolicyWorkPayment: [
    "Work and payment responsibility. Duleko helps people connect; it does not guarantee the quality, safety, completion, price, or payment of work arranged between users unless explicitly stated otherwise.",
    "काम र भुक्तानीको जिम्मेवारी। डुलेकोले मानिसहरूलाई जोड्न मद्दत गर्छ; यसले प्रयोगकर्ताहरू बीच मिलेको कामको गुणस्तर, सुरक्षा, पूरा हुने, मूल्य, वा भुक्तानीको ग्यारेन्टी दिँदैन जब सम्म स्पष्ट रूपमा भनिएको छैन।",
  ],
  regPolicySafetyFirst: [
    "Safety comes first. Users are responsible for using reasonable judgment before meeting, hiring, or working with another person. Suspicious, unsafe, or inappropriate behavior should be reported to Duleko.",
    "सुरक्षा पहिले आउँछ। प्रयोगकर्ताहरूले कसैलाई भेट्नु, काममा राख्नु, वा सँगै काम गर्नुअघि उचित सतर्कता अपनाउने जिम्मेवार छन्। शंकास्पद, असुरक्षित, वा अनुपयुक्त व्यवहार डुलेकोलाई जानकारी दिनुपर्छ।",
  ],
  regPolicyAccountAction: [
    "Account action. Duleko may restrict or suspend accounts involved in fraud, fake credentials, repeated harmful behavior, serious policy violations, or activities that threaten the safety of the community.",
    "खाता कारबाही। डुलेकोले ठगी, नक्कली प्रमाणपत्र, बारम्बार हानिकारक व्यवहार, गम्भीर नीति उल्लंघन, वा समुदायको सुरक्षालाई खतरा पैदा गर्ने गतिविधिहरूमा संलग्न खाताहरू रोक्न वा निलम्बन गर्न सकिन्छ।",
  ],
  registrationAgreement: [
    "Registration Agreement",
    "दर्ता सम्झौता",
  ],
  registrationAgreementIntro: [
    "Before creating the account:",
    "खाता सिर्जना गर्नुअघि:",
  ],
  registrationAgreePolicies: [
    "I have read and agree to Duleko's Terms, Privacy Policy, and User Registration Policy.",
    "मैले डुलेको सर्तहरू, गोपनीयता नीति, र प्रयोगकर्ता दर्ता नीति पढेको छु र स्वीकार गर्छु।",
  ],
  createAccount: ["Create Account", "खाता सिर्जना गर्नुहोस्"],

  // Terms of Use
  termsTitle: ["DULEKO – TERMS OF USE & USER POLICY", "डुलेको – प्रयोगका सर्तहरू र प्रयोगकर्ता नीति"],
  termsEffectiveDate: ["Effective Date: September 2026", "प्रभावकाली मिति: सेप्टेम्बर २०२६"],
  termsJurisdiction: ["Applicable Jurisdiction: Nepal", "लागू अधिकार क्षेत्र: नेपाल"],
  
  termsAboutTitle: ["1. About Duleko", "१. डुलेकोको बारेमा"],
  termsAboutDesc: [
    "Duleko is a digital platform that helps people discover, offer, and connect around skills and local work opportunities.",
    "डुलेको एक डिजिटल प्लेटफर्म हो जसले मानिसहरूलाई सीपहरू र स्थानीय कामको अवसरहरू खोज्न, प्रस्ताव गर्न, र तिनीहरू वरिपरि जोडिन मद्दत गर्छ।",
  ],
  termsNotEmployer: [
    "Duleko itself is not the employer of users listed on the platform and, unless specifically stated otherwise, is not a party to agreements made between users regarding work, wages, transportation, delivery, or other services.",
    "डुलेको आफैं प्लेटफर्ममा सूचीकृत प्रयोगकर्ताहरूको नियोक्ता होइन, र जब सम्म स्पष्ट रूपमा भनिएको छैन, यो काम, मजदुरी, यातायात, डेलिभरी, वा अन्य सेवाहरू सम्बन्धी प्रयोगकर्ताहरू बीच गरिएका सम्झौताहरूको पक्ष होइन।",
  ],

  termsCreatingAccountTitle: ["2. Creating an Account", "२. खाता सिर्जना गर्ने"],
  termsCreatingAccountDesc: [
    "To create a Duleko account, users must provide accurate information and verify their mobile number through OTP.",
    "डुलेको खाता सिर्जना गर्न, प्रयोगकर्ताहरूले सटीक जानकारी प्रदान गर्नुपर्छ र OTP मार्फत आफ्नो मोबाइल नम्बर प्रमाणित गर्नुपर्छ।",
  ],
  termsMustNot: ["Users must not:", "प्रयोगकर्ताहरूले यी गर्नु हुँदैन:"],
  termsMustNotImpersonate: ["impersonate another person;", "अर्को व्यक्तिको नक्कल गर्नु;"],
  termsMustNotFraud: ["create accounts for fraudulent purposes;", "ठगीको उद्देश्यका लागि खाताहरू सिर्जना गर्नु;"],
  termsMustNotFalseInfo: ["provide intentionally false information;", "जानीजानी गलत जानकारी प्रदान गर्नु;"],
  termsMustNotFakeCerts: ["upload fake certificates or qualifications;", "नक्कली प्रमाणपत्र वा योग्यताहरू अपलोड गर्नु;"],
  termsMustNotMisuseInfo: ["misuse another person's phone number, photograph, identity, or personal information.", "अर्को व्यक्तिको फोन नम्बर, फोटो, परिचय, वा व्यक्तिगत जानकारीको दुरुपयोग गर्नु।"],
  termsAccountResponsibility: [
    "Users are responsible for activity conducted through their accounts.",
    "प्रयोगकर्ताहरू आफ्ना खाताहरू मार्फत गरिएका गतिविधिको लागि जिम्मेवार छन्।",
  ],

  termsSkillsTitle: ["3. Skills and Qualifications", "३. सीपहरू र योग्यताहरू"],
  termsSkillsDesc: [
    "Users may list skills they are capable of performing.",
    "प्रयोगकर्ताहरूले आफू गर्न सक्ने सीपहरू सूचीमा राख्न सक्छन्।",
  ],
  termsNotVerified: [
    "Simply listing a skill on Duleko does not mean Duleko has verified that skill.",
    "डुलेकोमा सीप सूचीमा राख्नाले मात्र डुलेकोले त्यो सीप प्रमाणित गरेको जनाउँदैन।",
  ],
  termsVerificationIndicator: [
    "Where Duleko, a municipality, training institution, or another authorized organization has verified a certificate or qualification, the profile may display a separate verification indicator.",
    "जहाँ डुलेको, नगरपालिका, तालिम संस्था, वा अन्य अधिकृत संगठनले प्रमाणपत्र वा योग्यता प्रमाणित गरेको छ, प्रोफाइलमा छुट्टै प्रमाणीकरण संकेत प्रदर्शन हुन सक्छ।",
  ],
  termsNoFalseClaims: [
    "Users must not falsely claim professional qualifications or certifications.",
    "प्रयोगकर्ताहरूले व्यावसायिक योग्यता वा प्रमाणपत्रहरू गलत रूपमा दाबी गर्नु हुँदैन।",
  ],

  termsWorkArrangementsTitle: ["4. Work Arrangements", "४. कामको व्यवस्था"],
  termsWorkArrangementsDesc: [
    "Users may contact one another and arrange work through Duleko.",
    "प्रयोगकर्ताहरूले एकअर्कालाई सम्पर्क गर्न सक्छन् र डुलेको मार्फत काम व्यवस्था गर्न सक्छन्।",
  ],
  termsUnlessStated: [
    "Unless Duleko explicitly states otherwise, the worker and hirer are responsible for agreeing on:",
    "डुलेकोले स्पष्ट रूपमा भनेको बाहेक, कामदार र काम दिनेले निम्नमा सहमत हुने जिम्मेवार छन्:",
  ],
  termsWorkAgreement: [
    "the work → location → time → price/wage → payment method → other conditions.",
    "काम → स्थान → समय → मूल्य/मजदुरी → भुक्तानी विधि → अन्य शर्तहरू।",
  ],
  termsNoGuarantee: [
    "Duleko does not guarantee that a user will receive work, that a worker will perform work satisfactorily, or that another user will make payment.",
    "डुलेकोले प्रयोगकर्ताले काम पाउने, कामदारले काम सन्तुष्टिकरण रूपमा गर्ने, वा अर्को प्रयोगकर्ताले भुक्तानी गर्ने ग्यारेन्टी दिँदैन।",
  ],
  termsUseJudgment: [
    "Users should use reasonable judgment before meeting or entering into a work arrangement.",
    "प्रयोगकर्ताहरूले भेट्नु वा कामको व्यवस्था गर्नुअघि उचित सतर्कता अपनाउनुपर्छ।",
  ],

  termsRatesPaymentsTitle: ["5. Rates and Payments", "५. दर र भुक्तानीहरू"],
  termsRatesDesc: [
    "Rates displayed on profiles are the user's stated or expected rates and may not represent a final agreed price.",
    "प्रोफाइलहरूमा देखाइएका दरहरू प्रयोगकर्ताको जनाइएको वा अपेक्षित दरहरू हुन् र अन्तिम सहमत मूल्य प्रतिनिधित्व गर्न सक्दैन।",
  ],
  termsNoIntegratedPayment: [
    "Unless Duleko later introduces an integrated payment service, payments are made directly between users and Duleko does not hold, transfer, or guarantee those payments.",
    "डुलेकोले पछि एकीकृत भुक्तानी सेवा प्रस्तुत नगरेसम्म, भुक्तानीहरू प्रयोगकर्ताहरू बीच सिधै गरिन्छ र डुलेकोले ती भुक्तानीहरू थाम्दैन, सार्नदैन, वा ग्यारेन्टी दिँदैन।",
  ],

  termsReviewsTitle: ["6. Reviews", "६. समीक्षाहरू"],
  termsReviewsDesc: [
    "Users may be permitted to review people with whom they have completed work.",
    "प्रयोगकर्ताहरूलाई आफूसँग काम गरिसकेका मानिसहरूको समीक्षा गर्न अनुमति दिइन सक्छ।",
  ],
  termsReviewsGenuine: [
    "Reviews must reflect genuine experiences. Fake, abusive, discriminatory, threatening, or intentionally misleading reviews may be removed.",
    "समीक्षाहरूले वास्तविक अनुभवहरू प्रतिबिम्बित गर्नुपर्छ। नक्कली, दुरुपयोग गर्ने, भेदभावपूर्ण, धम्की दिने, वा जानीजानी भ्रामक समीक्षाहरू हटाउन सकिन्छ।",
  ],
  termsReviewsDistinction: [
    "Duleko may distinguish a user's reputation as a worker from their reputation as a hirer.",
    "डुलेकोले प्रयोगकर्ताको कामदारको रूपमा प्रतिष्ठालाई काम दिनेको रूपमा प्रतिष्ठाबाट छुट्टै गर्न सक्छ।",
  ],

  termsSafetyTitle: ["7. Safety and Prohibited Conduct", "७. सुरक्षा र निषिद्ध आचरण"],
  termsSafetyDesc: [
    "Duleko must not be used for fraud, harassment, threats, exploitation, discrimination, illegal activity, misleading representation, or activities that may endanger other users.",
    "डुलेको ठगी, दुरुपयोग, धम्की, शोषण, भेदभाव, गैरकानूनी गतिविधि, भ्रामक प्रतिनिधित्व, वा अन्य प्रयोगकर्ताहरूलाई खतरा पैदा गर्ने गतिविधिहरूको लागि प्रयोग हुनु हुँदैन।",
  ],
  termsReportSuspicious: [
    "Users should report suspicious or unsafe activity.",
    "प्रयोगकर्ताहरूले शंकास्पद वा असुरक्षित गतिविधिको रिपोर्ट गर्नुपर्छ।",
  ],
  termsInvestigate: [
    "Duleko may investigate reports and restrict, suspend, or terminate accounts where reasonably necessary to protect users or the platform.",
    "डुलेकोले रिपोर्टहरू अनुसन्धान गर्न सक्छ र प्रयोगकर्ता वा प्लेटफर्मको सुरक्षा गर्न उचित रूपमा आवश्यक ठाउँमा खाताहरू रोक्न, निलम्बन, वा समाप्त गर्न सक्छ।",
  ],

  // Team member specific translations
  sunilName: ["Sunil K. Chaudhary", "सुनिल के. चौधरी"],
  sunilRole: ["Founder", "संस्थापक"],
  sunilLocation: ["Kapilvastu, Nepal", "कपिलवस्तु, नेपाल"],
  sunilUniversity: ["Haverford College & University of Oxford", "ह्याभरफोर्ड कलेज र अक्सफोर्ड विश्वविद्यालय"],
  sunilBio: [
    '"What if the opportunity you need is already somewhere around you?"\n\nThat question sits at the heart of Sunil K. Chaudhary\'s journey in building Duleko. Growing up in Kapilvastu, Nepal, he saw people searching for work while, often in the same communities, others struggled to find the right people for the work they needed done. He founded Duleko to bridge that gap and help turn local skills into accessible opportunities.\n\nSunil leads Duleko\'s product vision, strategy, and partnerships. He studies Mathematics and Economics at Haverford College with cross courses at University of Pennsylvania (Wharton), and is spending his junior year studying Mathematics & Economics at the University of Oxford. His experiences across community development, entrepreneurship, and technology-driven initiatives in Nepal and the United States continue to shape Duleko\'s mission: connecting local skills with local opportunities.',
    '"तिम्रो लागि आवश्यक अवसर पहिल्यै तिम्रै वरिपरि कतै छ कि?"\n\nत्यो प्रश्न सुनिल के. चौधरीको डुलेको निर्माण यात्राको मुटुमा बसेको छ। कपिलवस्तु, नेपालमा हुर्कँदै, उनले मानिसहरूलाई काम खोज्दै गरेको देखे, जहाँ बारम्बार उही समुदायहरूमा, अन्य मानिसहरूले आफूलाई आवश्यक कामको लागि उपयुक्त मानिस खोज्न संघर्ष गर्थे। उनले त्यो खाडललाई पूर्ति गर्न र स्थानीय सीपहरूलाई पहुँचयोग्य अवसरहरूमा परिवर्तन गर्न मद्दत गर्न डुलेकोको स्थापना गरे।\n\nसुनिलले डुलेकोको उत्पादन दृष्टि, रणनीति, र साझेदारीहरूको नेतृत्व गर्छन्। उनी ह्याभरफोर्ड कलेजमा गणित र अर्थशास्त्र अध्ययन गर्छन् र पेन्सिल्भेनिया विश्वविद्यालय (व्हार्टन) मा क्रस-कोर्सहरू लिन्छन्, र आफ्नो जुनियर वर्ष अक्सफोर्ड विश्वविद्यालयमा गणित र अर्थशास्त्र अध्ययन गर्दै छन्। नेपाल र संयुक्त राज्य अमेरिकामा समुदाय विकास, उद्यमशीलता, र प्रविधि-चालित पहलहरूमा उनको अनुभवले डुलेकोको मिशनलाई निरन्तर आकार दिइरहेको छ: स्थानीय सीपहरूलाई स्थानीय अवसरहरूसँग जोड्न।',
  ],
  sunilSkill1: ["Product Strategy", "उत्पादन रणनीति"],
  sunilSkill2: ["Partnerships", "साझेदारी"],
  sunilSkill3: ["Community Development", "समुदाय विकास"],

  sanjayName: ["Sanjay Gupta", "संजय गुप्ता"],
  sanjayRole: ["Tech Lead", "प्राविधिक नेता"],
  sanjayLocation: ["Chitkara University", "चितकारा विश्वविद्यालय"],
  sanjayBio: [
    '"If someone who isn\'t technical can\'t use and understand Duleko, it doesn\'t matter how well I build."\n\nThat\'s the standard Sanjay holds Duleko\'s engineering to. As Tech Lead, he owns the platform end to end, from the web app to the native Android build, the database, and everything that keeps requests, chats, and profiles clear and reliable for people who should never need to think about the tech underneath.\n\nHe\'s a Software Engineer, graduating in 2027 from Chitkara University, and has built Duleko\'s stack from the ground up: a bilingual (English/Nepali) app backed by Supabase, with real-time chat, distance-based search, and a native Android release. At Duleko, Sanjay leads all technical decisions, architecture, infrastructure, and app releases, working hands-on with Sunil and Dipendra to make sure what the community actually needs is what gets built.',
    '"यदि प्राविधिक नभएको व्यक्तिले डुलेको प्रयोग र बुझ्न सकेन भने, मैले कति राम्रो बनाए पनि केही मात्र हुँदैन।"\n\nत्यो संजयले डुलेकोको इन्जिनियरिङलाई राख्ने मापदण्ड हो। प्राविधिक नेताको रूपमा, उनले प्लेटफर्मलाई अन्त्यदेखि अन्त्यसम्म सम्हाल्छन्, वेब ऐपबाट नेटिभ एन्ड्रोइड बिल्डसम्म, डेटाबेस, र तलको प्रविधिको बारेमा कहिल्यै सोच्नु नपर्ने मानिसहरूका लागि अनुरोध, कुराकानी, र प्रोफाइलहरू स्पष्ट र विश्वसनीय बनाउने सबै कुरा।\n\nउनी एक सफ्टवेयर इन्जिनियर हुन्, २०२७ मा चितकारा विश्वविद्यालयबाट स्नातक हुनेछौं, र डुलेकोको स्ट्याकले जमिनाबाट निर्माण गरेका छन्: सुपाबेसद्वारा समर्थित द्विभाषिक (अंग्रेजी/नेपाली) ऐप, रियल-टाइम कुराकानी, दूरी-आधारित खोज, र नेटिभ एन्ड्रोइड रिलिज। डुलेकोमा, संजयले सबै प्राविधिक निर्णयहरू, आर्किटेक्चर, इन्फ्रास्ट्रक्चर, र ऐप रिलिजहरूको नेतृत्व गर्छन्, सुनिल र दिपेन्द्रसँग हातेमाथे काम गर्दै समुदायले वास्तवमा के चाहन्छ त्यो नै निर्माण हुने गरी।',
  ],
  sanjaySkill1: ["Full Stack Development", "फुल स्ट्याक विकास"],
  sanjaySkill2: ["Android Development", "एन्ड्रोइड विकास"],
  sanjaySkill3: ["System Architecture", "प्रणाली आर्किटेक्चर"],

  dipendraName: ["Dipendra Chaudhary", "दिपेन्द्र चौधरी"],
  dipendraRole: ["Community & Communications Coordinator", "समुदाय र संचार समन्वयक"],
  dipendraLocation: ["Lumbini Provincial Hospital", "लुम्बिनी प्रादेशिक अस्पताल"],
  dipendraBio: [
    '"How do we make sure that every individual\'s unique skills are recognized and turned into real, local opportunities?"\n\nThat conviction powers Dipendra\'s work as Community & Communications Coordinator at Duleko. He earned his Bachelor of Pharmacy degree (2021) as a Ministry of Education merit scholar from Universal College of Medical Sciences, Tribhuvan University, and has served as a Hospital Pharmacist at Lumbini Provincial Hospital (2022 to present), working closely with healthcare professionals and multidisciplinary teams on research, data management, and public health initiatives.\n\nAt Duleko, Dipendra leads community outreach, user support, product coordination, and social media communications. Drawing on his experience in health research, leadership, and community engagement, he runs educational initiatives to help users navigate the platform, manages direct communication channels, gathers vital user feedback to guide technical improvements, and takes part in core team meetings to shape the platform\'s strategy.',
    '"हामी कसरी सुनिश्चित गर्छौं कि हरेक व्यक्तिको अद्वितीय सीपहरू पहिचान गरिन्छ र वास्तविक, स्थानीय अवसरहरूमा परिवर्तन हुन्छ?"\n\nत्यो विश्वासले दिपेन्द्रको डुलेकोमा समुदाय र संचार समन्वयकको रूपमा कामलाई शक्ति दिन्छ। उनले त्रिभुवन विश्वविद्यालयको युनिभर्सल कलेज अफ मेडिकल साइन्सेजबाट शिक्षा मन्त्रालय मेरिट विद्वानको रूपमा फार्मेसीको स्नातक डिग्री (२०२१) प्राप्त गरे, र लुम्बिनी प्रादेशिक अस्पतालमा अस्पताल फार्मासिस्टको रूपमा सेवा गरेका छन् (२०२२ देखि हालसम्म), स्वास्थ्य सेवा पेशेवरहरू र बहु-विषयक टोलीहरूसँग अनुसन्धान, डेटा व्यवस्थापन, र सार्वजनिक स्वास्थ्य पहलहरूमा काम गर्दै।\n\nडुलेकोमा, दिपेन्द्रले समुदाय पहुँच, प्रयोगकर्ता समर्थन, उत्पादन समन्वय, र सामाजिक मिडिया संचारको नेतृत्व गर्छन्। स्वास्थ्य अनुसन्धान, नेतृत्व, र समुदाय संलग्नतामा उनको अनुभवको आधारमा, उनले प्रयोगकर्ताहरूलाई प्लेटफर्ममा नेभिगेट गर्न मद्दत गर्न शैक्षिक पहलहरू चलाउँछन्, प्रत्यक्ष संचार च्यानलहरू व्यवस्थापन गर्छन्, प्राविधिक सुधारहरू मार्गदर्शन गर्न महत्त्वपूर्ण प्रयोगकर्ता प्रतिक्रिया संकलन गर्छन्, र प्लेटफर्मको रणनीति आकार दिन मुख्य टोली बैठकहरूमा भाग लिन्छन्।',
  ],
  dipendraSkill1: ["Community Outreach", "समुदाय पहुँच"],
  dipendraSkill2: ["User Support", "प्रयोगकर्ता समर्थन"],
  dipendraSkill3: ["Communications", "संचार"],
  viewDulekoProfile: ["View Duleko profile →", "डुलेको प्रोफाइल हेर्नुहोस् →"],

  // Quotes for motivation page
  sunilQuote: ["What if the opportunity you need is already somewhere around you?", "तिम्रो लागि आवश्यक अवसर पहिल्यै तिम्रै वरिपरि कतै छ कि?"],
  sanjayQuote: [
    "If someone who isn't technical can't use and understand Duleko, it doesn't matter how well I build.",
    "यदि प्राविधिक नभएको व्यक्तिले डुलेको प्रयोग र बुझ्न सकेन भने, मैले कति राम्रो बनाए पनि केही मात्र हुँदैन।",
  ],
  dipendraQuote: [
    "How do we make sure that every individual's unique skills are recognized and turned into real, local opportunities?",
    "हामी कसरी सुनिश्चित गर्छौं कि हरेक व्यक्तिको अद्वितीय सीपहरू पहिचान गरिन्छ र वास्तविक, स्थानीय अवसरहरूमा परिवर्तन हुन्छ?",
  ],

  // ---- public website (see i18n-site.ts) -----------------------------
  ...siteStrings,
} as const;

export type StringKey = keyof typeof strings;

const LANG_KEY = "duleko.lang";

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(LANG_KEY);
  if (stored === "en" || stored === "ne") return stored;
  return navigator.language?.toLowerCase().startsWith("ne") ? "ne" : "en";
}

/**
 * Translate a key outside of React (e.g. from a plain helper like
 * errorMessage() that can't call the useI18n hook). Reads the same
 * persisted language preference the provider uses.
 */
export function translateStatic(key: StringKey): string {
  const lang = detectInitialLang();
  const pair = strings[key] as readonly [string, string] | undefined;
  if (!pair) return key;
  return lang === "ne" ? pair[1] : pair[0];
}

/** One key in a specific language, whatever the current setting is. */
export function translateIn(lang: Lang, key: StringKey): string {
  const pair = strings[key] as readonly [string, string];
  return lang === "ne" ? pair[1] : pair[0];
}

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

// Kept across hot reloads: editing the string tables re-runs this module,
// and a fresh context would orphan the mounted provider ("useI18n must be
// used inside <I18nProvider>") until a full page reload.
const I18nContext: React.Context<I18nValue | null> =
  import.meta.hot?.data.i18nContext ?? createContext<I18nValue | null>(null);
if (import.meta.hot) import.meta.hot.data.i18nContext = I18nContext;

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  useEffect(() => {
    window.localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const toggleLang = useCallback(() => setLangState((l) => (l === "en" ? "ne" : "en")), []);

  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => {
      const pair = strings[key] as readonly [string, string] | undefined;
      let out = pair ? (lang === "ne" ? pair[1] : pair[0]) : String(key);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          out = out.replaceAll(`{${k}}`, String(v));
        }
      }
      return out;
    },
    [lang],
  );

  const value = useMemo<I18nValue>(() => ({ lang, setLang, toggleLang, t }), [lang, setLang, toggleLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
