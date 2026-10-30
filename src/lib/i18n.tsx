import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Lang } from "./types";
import { siteStrings } from "./i18n-site";
import { paymentStrings } from "./i18n-payments";
import { jobStrings } from "./i18n-jobs";
import { profileStrings } from "./i18n-profile";
import { workStrings } from "./i18n-work";
import { authStrings } from "./i18n-auth";
import { kycStrings } from "./i18n-kyc";
import { badgeStrings } from "./i18n-badges";
import { callStrings } from "./i18n-calls";
import { referralStrings } from "./i18n-referral";
import { setActiveCalendar, storeCalendar, storedCalendar, type CalendarChoice } from "./bs-calendar";

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
  viewProfilePhoto: ["{name}'s profile photo", "{name}को प्रोफाइल फोटो"],
  viewCoverPhoto: ["Cover photo", "कभर फोटो"],
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
  signOut: ["Sign out", "लगआउट गर्नुहोस्"],
  signOutConfirmTitle: ["Sign out?", "लगआउट गर्ने हो?"],
  signOutConfirmBody: [
    "You can sign back in anytime the same way you signed in today.",
    "तपाईं आज जसरी लगइन गर्नुभयो, जुनसुकै बेला त्यसरी नै फेरि लगइन गर्न सक्नुहुन्छ।",
  ],
  signOutRemember: ["Remember my login on this phone", "यो फोनमा मेरो लगइन विवरण सम्झिनुहोस्"],
  signOutRememberHint: [
    "Your number and name are kept, so next time you only type your PIN. Your PIN is never saved.",
    "तपाईंको नम्बर र नाम राखिन्छ, जसले गर्दा अर्को पटक पिन मात्र हाल्नुपर्छ। तपाईंको पिन कहिल्यै सेभ हुँदैन।",
  ],
  savedLoginWelcome: ["Welcome back, {name}", "फेरि स्वागत छ, {name}"],
  savedLoginNotYou: ["Not you?", "तपाईं होइन?"],
  savedLoginGoogle: ["You signed in with Google last time.", "तपाईंले पछिल्लो पटक Google बाट लगइन गर्नुभएको थियो।"],
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
    "यो इमेलमा पहिले नै खाता छ। बरु लगइन गर्नुहोस्; \"Google बाट जारी राख्नुहोस्\" पनि प्रयोग गर्न सक्नुहुन्छ।",
  ],
  authWelcome: ["Welcome to Duleko", "डुलेकोमा स्वागत छ"],
  authBlurb: [
    "A simple way for workers and employers in your area to find each other.",
    "तपाईंको क्षेत्रका कामदार र काम दिनेहरूलाई एकअर्कासँग जोड्ने सजिलो माध्यम।",
  ],
  confirmPassword: ["Confirm password", "पासवर्ड पुष्टि गर्नुहोस्"],
  passwordsDontMatch: ["Passwords don't match.", "पासवर्ड मिलेन।"],
  incorrectCredentials: ["Incorrect email or password.", "इमेल वा पासवर्ड मिलेन।"],
  pleaseWaitBeforeRetry: [
    "Please wait a moment before trying again.",
    "कृपया अलिक पर्खेर फेरि प्रयास गर्नुहोस्।",
  ],

  // ---- email verification (OTP) ----------------------------------------
  verifyEmailTitle: ["Verify your email", "आफ्नो इमेल पुष्टि गर्नुहोस्"],
  verifyEmailBlurb: [
    "Enter the 6-digit code we sent to {email}.",
    "हामीले {email}मा पठाएको ६ अंकको कोड यहाँ हाल्नुहोस्।",
  ],
  verify: ["Verify", "पुष्टि गर्नुहोस्"],
  resendCode: ["Resend code", "कोड फेरि पठाउनुहोस्"],
  resendCodeIn: ["Resend code in {seconds}s", "{seconds} सेकेन्डमा कोड फेरि पठाउनुहोस्"],
  codeResent: ["We've sent a new code.", "हामीले नयाँ कोड पठायौं।"],
  useAnotherEmail: ["Use a different email", "फरक इमेल प्रयोग गर्नुहोस्"],
  invalidOrExpiredCode: [
    "That code is incorrect or has expired. Request a new one.",
    "त्यो कोड गलत छ वा यसको म्याद सकिएको छ। नयाँ कोड माग्नुहोस्।",
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
    "जारी राख्न हामीले {email}मा पठाएको ६ अंकको कोड यहाँ हाल्नुहोस्।",
  ],
  newPassword: ["New password", "नयाँ पासवर्ड"],
  setNewPassword: ["Set new password", "नयाँ पासवर्ड सेट गर्नुहोस्"],
  backToSignIn: ["Back to sign in", "लगइनमा फर्कनुहोस्"],

  // ---- guest browsing --------------------------------------------------
  exploreDuleko: ["Explore Duleko", "डुलेको हेर्नुहोस्"],
  signUpOrLogIn: ["Sign up / Log in", "खाता खोल्नुहोस् / लगइन"],
  signUpOrLogInHint: [
    "Create work requests, chat, and build your own profile.",
    "कामको अनुरोध पठाउनुहोस्, कुराकानी गर्नुहोस् र आफ्नो प्रोफाइल बनाउनुहोस्।",
  ],
  landingFreeNote: [
    "Free to join. Free to browse.",
    "सदस्य बन्न निःशुल्क। हेर्न पनि निःशुल्क।",
  ],
  signInRequiredTitle: ["Sign in to continue", "जारी राख्न लगइन गर्नुहोस्"],
  signInRequiredBody: [
    "You'll need a free Duleko account for this. It only takes a minute.",
    "यसको लागि डुलेकोको निःशुल्क खाता चाहिन्छ। एक मिनेटमै बन्छ।",
  ],
  notNow: ["Not now", "अहिले होइन"],
  keepExploring: ["Keep exploring", "हेर्दै जानुहोस्"],

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
  basedIn: ["Based in", "बसोबास"],
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
    "काम लगाउन मात्र चाहनुहुन्छ? यो चरण छोड्न सक्नुहुन्छ।",
  ],
  finishSetup: ["Finish", "पूरा गर्नुहोस्"],
  photo: ["Photo", "फोटो"],
  addPhoto: ["Add photo", "फोटो थप्नुहोस्"],
  changePhoto: ["Change photo", "फोटो बदल्नुहोस्"],
  removePhoto: ["Remove photo", "फोटो हटाउनुहोस्"],
  changeCover: ["Change cover photo", "कभर फोटो बदल्नुहोस्"],
  photoTooBig: ["This file is too large.", "यो फाइल धेरै ठूलो छ।"],

  // ---- home ----------------------------------------------------------
  greeting: ["Namaste, {name}", "नमस्ते, {name}"],
  searchPlaceholder: ["Search workers or skills", "कामदार वा सीप खोज्नुहोस्"],
  browseSkills: ["Browse by skill", "सीप अनुसार हेर्नुहोस्"],
  skillCategoryTrades: ["Trades & Local Services", "कालिगडी तथा स्थानीय सेवा"],
  skillCategoryProfessional: ["Professional & Skilled Services", "पेशागत तथा दक्ष सेवा"],
  skillCategoryPersonal: ["Personal & Everyday Services", "व्यक्तिगत तथा दैनिक सेवा"],

  // ---- emergency contacts ---------------------------------------------
  emergencyContacts: ["Emergency Contacts", "आपतकालीन सम्पर्क"],
  emergencyContactsHint: ["Tap a number to call it directly.", "नम्बरमा थिच्नुहोस्, सिधै फोन लाग्छ।"],
  emergencyPoliceEmergency: ["Police Emergency", "प्रहरी आपतकालीन"],
  emergencyArmedPoliceForce: ["Armed Police Force", "सशस्त्र प्रहरी बल"],
  emergencyFireBrigade: ["Fire Brigade", "दमकल"],
  emergencyAmbulanceService: ["Ambulance Service", "एम्बुलेन्स सेवा"],
  emergencyRedCrossAmbulance: ["Nepal Red Cross Ambulance", "नेपाल रेडक्रस एम्बुलेन्स"],
  emergencyParopakarAmbulance: ["Paropakar Ambulance Service", "परोपकार एम्बुलेन्स सेवा"],
  emergencyTrafficEmergency: ["Traffic Emergency", "ट्राफिक आपतकालीन"],
  emergencyNationalDisasterResponse: ["National Disaster Response (NDR)", "राष्ट्रिय विपद् प्रतिकार्य (NDR)"],
  emergencyHelicopterRescue: ["Helicopter Rescue (Simrik Air, TIA)", "हेलिकप्टर उद्धार (सिमरिक एयर, त्रिभुवन विमानस्थल)"],
  emergencyHeliAmbulanceCharter: ["Heli Ambulance Charter Service", "हेली एम्बुलेन्स चार्टर सेवा"],
  emergencyChildHelpline: ["Child Helpline", "बाल हेल्पलाइन"],
  emergencyWomensHelpline: ["Women's Helpline", "महिला हेल्पलाइन"],
  emergencyMissingChildSupport: ["Missing Child Support", "हराएका बालबालिका सहायता"],

  availableToday: ["Available today", "आज उपलब्ध"],
  nearYou: ["Near you", "तपाईंको नजिक"],
  noWorkersYet: ["No workers here yet.", "यहाँ अझै कामदार छैनन्।"],
  noWorkersHint: [
    "Be the first - add your skills so people can find you.",
    "पहिलो बन्नुहोस् - आफ्ना सीप थप्नुहोस्, अनि मानिसहरूले तपाईंलाई भेट्टाउन सक्छन्।",
  ],
  yourWorkToday: ["Your work", "तपाईंको काम"],
  pendingRequests: ["{count} waiting for you", "{count} अनुरोध तपाईंको जवाफको पर्खाइमा"],
  addYourSkills: ["Add your skills", "आफ्ना सीपहरू थप्नुहोस्"],
  browseWorkers: ["Browse workers", "कामदारहरू हेर्नुहोस्"],
  goodMorning: ["Good morning", "शुभ प्रभात"],
  goodAfternoon: ["Good afternoon", "शुभ दिउँसो"],
  goodEvening: ["Good evening", "शुभ साँझ"],
  homeHeroPrompt: ["What do you need done today?", "आज के काम गराउनु छ?"],
  popularSkills: ["Popular", "लोकप्रिय"],
  // What people write for others can't carry a number or emoji (8200).
  errTextHasPhone: [
    "Phone numbers can't go here. Your number is shared once you agree on a job.",
    "यहाँ फोन नम्बर राख्न मिल्दैन। काम पक्का भएपछि तपाईंको नम्बर आफैं देखिन्छ।",
  ],
  errTextHasEmoji: ["Emojis can't go here. Please write plain text.", "यहाँ इमोजी राख्न मिल्दैन। सादा अक्षर मात्र लेख्नुहोस्।"],
  homeJoinTitle: ["New here? Join Duleko for free", "यहाँ नयाँ हुनुहुन्छ? डुलेकोमा निःशुल्क जोडिनुहोस्"],
  quickActions: ["Quick actions", "छिटो पहुँच"],
  quickFindWorkers: ["Find workers", "कामदार खोज्नुहोस्"],
  quickFindWorkersHint: ["Search by skill", "सीप अनुसार खोज्नुहोस्"],
  quickWorkHint: ["Requests & jobs", "अनुरोध र कामहरू"],
  quickChatsHint: ["Your messages", "तपाईंका सन्देशहरू"],
  quickFriendsHint: ["People you know", "चिनेका मानिसहरू"],
  quickProfileHint: ["Skills & calendar", "सीप र पात्रो"],
  profileCompleteTitle: ["Your profile is {percent}% complete", "तपाईंको प्रोफाइल {percent}% पूरा छ"],
  profileCompleteHint: [
    "A complete profile helps people nearby find and trust you.",
    "पूरा प्रोफाइलले नजिकका मानिसलाई तपाईंलाई भेट्टाउन र तपाईंमाथि विश्वास गर्न सजिलो बनाउँछ।",
  ],
  profileCompleteDoneHint: [
    "Everything people look for is filled in - keep it up to date.",
    "मानिसहरूले हेर्ने सबै विवरण भरिएको छ - यसलाई अद्यावधिक राख्नुहोस्।",
  ],
  profileItemPhoto: ["Add a profile photo", "प्रोफाइल फोटो थप्नुहोस्"],
  profileItemAbout: ["Write a short intro", "छोटो परिचय लेख्नुहोस्"],
  profileItemLocation: ["Set your location", "आफ्नो स्थान राख्नुहोस्"],
  completeProfile: ["Complete profile", "प्रोफाइल पूरा गर्नुहोस्"],
  reviewCountOne: ["1 review", "१ समीक्षा"],
  availableTodayHint: ["Free to take work today", "आज काम लिन खाली"],
  availableTodayNear: ["Free to take work today in {place}", "{place}मा आज काम लिन खाली"],
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
    "यो फेरि सक्रिय नगरेसम्म तपाईं \"आज उपलब्ध\" मा देखिनुहुने छैन।",
  ],
  workerAvailableHint: [
    "Taking new work - send a request or start a chat.",
    "नयाँ काम लिनुहुन्छ - अनुरोध पठाउनुहोस् वा कुराकानी सुरु गर्नुहोस्।",
  ],
  workerUnavailableHint: [
    "Not taking new work right now - you can still chat.",
    "अहिले नयाँ काम लिनुहुन्न - तर कुराकानी गर्न सक्नुहुन्छ।",
  ],
  workerCalendarTitle: ["Busy and free days", "व्यस्त र खाली दिन"],
  workerNoBusyDays: ["No busy days marked - open every day.", "कुनै दिन व्यस्त चिन्ह लगाइएको छैन - हरेक दिन खाली।"],
  workerCalendarHint: [
    "Booked days are already taken. Pick a free day when you send a request.",
    "बुक भएका दिनमा काम लिइसकिएको छ। अनुरोध पठाउँदा खाली दिन छान्नुहोस्।",
  ],
  profileItemSkills: ["Add your skills", "आफ्ना सीपहरू थप्नुहोस्"],
  profileItemPhone: ["Add a phone number", "फोन नम्बर थप्नुहोस्"],
  profileItemCertificate: ["Upload a certificate", "प्रमाणपत्र अपलोड गर्नुहोस्"],
  visibilityTitle: ["Visibility", "दृश्यता"],
  accountTitle: ["Account", "खाता"],
  noBusyDays: ["No busy days marked - you're open every day.", "कुनै दिन व्यस्त चिन्ह लगाइएको छैन - तपाईं हरेक दिन खाली हुनुहुन्छ।"],
  skillsAndRates: ["Skills & rates", "सीप र दर"],
  busyDaysLabel: ["Busy days", "व्यस्त दिन"],
  rateNotSet: ["No rate set", "दर राखिएको छैन"],
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
  sayHelloTo: ["Say hello to {name}", "{name}लाई नमस्ते भन्नुहोस्"],
  chatStarterHint: ["Start with one of these, or write your own.", "यीमध्ये एउटाबाट सुरु गर्नुहोस् वा आफ्नै लेख्नुहोस्।"],
  chatStarter1: ["Namaste! 🙏", "नमस्ते! 🙏"],
  chatStarter2: ["Are you available today?", "के तपाईं आज उपलब्ध हुनुहुन्छ?"],
  chatStarter3: ["What is your rate?", "तपाईंको दर कति हो?"],
  chatStarter4: ["Can you share more details?", "थप विवरण दिन सक्नुहुन्छ?"],
  addEmoji: ["Add emoji", "इमोजी थप्नुहोस्"],
  jumpToLatest: ["Jump to latest", "पछिल्लो सन्देशमा जानुहोस्"],
  sentYouFriendRequest: ["{name} sent you a friend request", "{name}ले तपाईंलाई साथी अनुरोध पठाउनुभयो"],
  stayingSafeTitle: ["Staying safe", "सुरक्षित रहनुहोस्"],
  stayingSafeTip1: [
    "Agree on the job and the price in a work request before meeting.",
    "भेट्नुअघि कामको अनुरोधमै काम र मूल्य तय गर्नुहोस्।",
  ],
  stayingSafeTip2: ["Keep your chats on Duleko.", "कुराकानी डुलेकोमै राख्नुहोस्।"],
  stayingSafeTip3: [
    "Leave a review when the work is done - it helps everyone.",
    "काम सकिएपछि समीक्षा दिनुहोस् - यसले सबैलाई मद्दत गर्छ।",
  ],
  reportProfile: ["Report this profile", "यो प्रोफाइलबारे उजुरी गर्नुहोस्"],
  shiftEnterHint: ["Enter to send · Shift + Enter for a new line", "पठाउन Enter · नयाँ लाइनका लागि Shift + Enter"],
  guestHeroTitle: ["Find skilled people near you", "नजिकैका सिपालु मानिस भेट्टाउनुहोस्"],

  // ---- search --------------------------------------------------------
  filters: ["Filters", "फिल्टर"],
  allSkills: ["All skills", "सबै सीप"],
  anywhere: ["Anywhere", "जहाँसुकै"],
  anyDay: ["Any day", "जुनसुकै दिन"],
  onDate: ["Free on", "यस दिन खाली"],
  sortBy: ["Sort by", "क्रमबद्ध गर्नुहोस्"],
  sortRelevance: ["Best match", "सबैभन्दा मिल्दो"],
  sortRating: ["Highest rated", "सबैभन्दा उच्च रेटिङ"],
  sortNewest: ["Newest", "सबैभन्दा नयाँ"],
  availableOnly: ["Available only", "उपलब्ध मात्र"],
  resultsCount: ["{count} workers", "{count} कामदार"],
  noResults: ["No workers match this search.", "यो खोजसँग मिल्ने कामदार भेटिएन।"],
  noResultsHint: ["Try a wider area or a different skill.", "अझ फराकिलो क्षेत्र वा अर्को सीप खोजेर हेर्नुहोस्।"],
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
  callAcceptedWork: ["After work acceptance", "काम स्वीकार भएपछि मात्र"],
  callFriends: ["Friends", "साथीहरू"],
  callNobody: ["Friends only", "साथीहरू मात्र"],
  privacyContactTitle: ["Privacy & contact", "गोपनीयता र सम्पर्क"],
  callEveryoneHint: ["Any signed-in user can see your number and call you.", "लगइन गरेका जो कोहीले तपाईंको नम्बर देखेर फोन गर्न सक्छन्।"],
  callAcceptedWorkHint: [
    "Only people whose work request with you was accepted.",
    "तपाईंसँगको कामको अनुरोध स्वीकार भएका व्यक्तिहरू मात्र।",
  ],
  callFriendsHint: ["Only people you have added as friends.", "तपाईंले साथी बनाएका व्यक्तिहरू मात्र।"],
  callNobodyHint: [
    "Only your friends can see your number. Everyone else can still chat with you.",
    "तपाईंका साथीहरूले मात्र नम्बर देख्न सक्छन्। अरूले भने कुराकानी गर्न सक्छन्।",
  ],
  friendsAlwaysHint: [
    "Friends can always call and chat with you, whatever you pick.",
    "तपाईंले जुनसुकै विकल्प छाने पनि साथीहरूले सधैं फोन र कुराकानी गर्न सक्छन्।",
  ],
  callSettingSaved: ["Call setting saved.", "फोन सेटिङ सुरक्षित भयो।"],
  chatSettingTitle: ["Who can chat with me", "मसँग कसले कुराकानी गर्न सक्छ"],
  chatEveryone: ["Everybody", "सबैजना"],
  chatEveryoneHint: [
    "Phone numbers can't be sent in chat. Use the call setting above instead.",
    "कुराकानीमा फोन नम्बर पठाउन मिल्दैन। बरु माथिको फोन सेटिङ प्रयोग गर्नुहोस्।",
  ],
  phoneNumberBlocked: [
    "Phone numbers can't be shared in chat. They are shared through Call, based on the person's call setting.",
    "कुराकानीमा फोन नम्बर साझा गर्न मिल्दैन। फोन नम्बर सम्बन्धित व्यक्तिको फोन सेटिङअनुसार 'फोन गर्नुहोस्' बटनबाट मात्र देखिन्छ।",
  ],
  callNotAllowed: [
    "You can't call this person yet. They may limit who can call them, or haven't added a number.",
    "तपाईं अहिले यस व्यक्तिलाई फोन गर्न सक्नुहुन्न। उहाँले फोन गर्न पाउनेहरू सीमित गर्नुभएको हुन सक्छ वा नम्बर थप्नुभएको छैन।",
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
  chatNow: ["Chat now", "अहिले कुराकानी गर्नुहोस्"],
  typingIndicator: ["typing…", "टाइप गर्दै…"],
  seenLabel: ["Seen", "हेरियो"],
  sending: ["Sending", "पठाउँदै"],
  sent: ["Sent", "पठाइयो"],
  unsend: ["Unsend", "सन्देश फिर्ता लिनुहोस्"],
  unsendConfirm: ["Unsend this message for everyone?", "यो सन्देश सबैबाट फिर्ता लिने हो?"],
  messageRemoved: ["This message was removed.", "यो सन्देश हटाइयो।"],
  youLabel: ["You", "तपाईं"],
  copy: ["Copy", "कपी गर्नुहोस्"],
  react: ["React", "प्रतिक्रिया दिनुहोस्"],
  reply: ["Reply", "जवाफ दिनुहोस्"],
  edit: ["Edit", "सम्पादन गर्नुहोस्"],
  edited: ["edited", "सम्पादित"],
  replyingTo: ["Replying to {name}", "{name}लाई जवाफ दिँदै"],
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
  adminRoleLabel: ["Admin", "एडमिन"],
  technicalAdminRoleLabel: ["Technical admin", "प्राविधिक एडमिन"],
  unverifyProfile: ["Remove verification", "प्रमाणीकरण हटाउनुहोस्"],
  unverifiedSuccess: ["Verification removed.", "प्रमाणीकरण हटाइयो।"],
  suspendUser: ["Suspend user", "प्रयोगकर्ता निलम्बन गर्नुहोस्"],
  unsuspendUser: ["Unsuspend user", "निलम्बन हटाउनुहोस्"],
  suspendConfirmTitle: ["Suspend this account?", "यो खाता निलम्बन गर्ने हो?"],
  suspendConfirmBody: [
    "They will be signed out, hidden from search, and unable to sign back in until you unsuspend them.",
    "उहाँ लगआउट हुनुहुनेछ, खोजमा देखिनुहुने छैन र तपाईंले निलम्बन नहटाउन्जेल फेरि लगइन गर्न सक्नुहुने छैन।",
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
  reportedBy: ["Reported by {name}", "{name}ले उजुरी गर्नुभयो"],
  markReviewed: ["Mark reviewed", "हेरिसकियो भनी चिन्ह लगाउनुहोस्"],
  dismissReport: ["Dismiss", "खारेज गर्नुहोस्"],
  reportResolved: ["Report updated.", "उजुरी अद्यावधिक भयो।"],
  viewProfile: ["View profile", "प्रोफाइल हेर्नुहोस्"],
  moderatorActions: ["Moderator actions", "मोडेरेटर कार्यहरू"],

  // ---- friends --------------------------------------------------------
  addFriend: ["Add friend", "साथी थप्नुहोस्"],
  friendRequestPending: ["Request sent", "अनुरोध पठाइयो"],
  cancelRequest: ["Cancel request", "अनुरोध रद्द गर्नुहोस्"],
  acceptRequest: ["Accept", "स्वीकार गर्नुहोस्"],
  declineRequest: ["Decline", "अस्वीकार गर्नुहोस्"],
  friendRequestSent: ["Friend request sent.", "साथी अनुरोध पठाइयो।"],
  alreadyFriends: ["✓ Friends", "✓ साथी"],
  myFriends: ["My friends", "मेरा साथीहरू"],
  friendRequests: ["Friend requests", "साथी अनुरोधहरू"],
  noFriendsYet: ["No friends yet.", "अहिलेसम्म कुनै साथी छैनन्।"],
  noFriendsYetHint: [
    "People you add as a friend show up here.",
    "तपाईंले साथी बनाएका मानिसहरू यहाँ देखिन्छन्।",
  ],
  noRequestsYet: ["No pending requests.", "पर्खिरहेको कुनै अनुरोध छैन।"],
  removeFriend: ["Remove", "हटाउनुहोस्"],
  removeFriendConfirm: ["Remove this friend?", "यो साथीलाई हटाउने हो?"],

  // ---- location (your work area is in i18n-jobs.ts) --------------------
  locationPermissionDenied: [
    "Could not get your location. Check your browser's location permission.",
    "तपाईंको स्थान लिन सकिएन। ब्राउजरमा स्थानको अनुमति जाँच्नुहोस्।",
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
  cancelReasonFoundSomeoneElse: ["Found someone else", "अरू कसैलाई भेटियो"],
  cancelReasonNoLongerNeeded: ["No longer needed", "अब आवश्यक छैन"],
  cancelReasonNoteRequired: ["Please describe the reason.", "कृपया कारण लेख्नुहोस्।"],
  confirmCancel: ["Cancel job", "काम रद्द गर्नुहोस्"],

  // ---- skills: Others + rate ---------------------------------------------
  othersSkillLabel: ["Describe your skill", "आफ्नो सीप वर्णन गर्नुहोस्"],
  othersSkillPlaceholder: ["e.g. Mehendi artist", "जस्तै: मेहेन्दी कलाकार"],
  othersSkillNoteLabel: ["More details", "थप विवरण"],
  othersSkillNotePlaceholder: ["A little about this work", "यो कामको बारेमा छोटकरी"],
  rateFor: ["Rate for {skill}", "{skill}को दर"],
  rateAmountPlaceholder: ["Amount", "रकम"],
  rateUnitPlaceholder: ["per hour, per switch…", "प्रति घण्टा, प्रति स्विच…"],
  rateHint: [
    "Optional - your usual price for this skill.",
    "वैकल्पिक - यो सीपका लागि तपाईंले सामान्यतया लिने मूल्य।",
  ],

  // ---- google sign-in -----------------------------------------------
  continueWithGoogle: ["Continue with Google", "Google बाट जारी राख्नुहोस्"],
  orDivider: ["or", "वा"],

  reportTitle: ["Report this person", "यो व्यक्तिबारे उजुरी गर्नुहोस्"],
  reportReason: ["Reason", "कारण"],
  reportDetails: ["What happened?", "के भयो?"],
  reportSent: ["Thanks. We will look into it.", "धन्यवाद। हामी यसबारे छानबिन गर्नेछौं।"],
  reasonSpam: ["Spam", "स्प्याम"],
  reasonFake: ["Fake profile", "नक्कली प्रोफाइल"],
  reasonAbusive: ["Abusive behaviour", "दुर्व्यवहार"],
  reasonNoShow: ["Did not show up", "भनेको बेला आएनन्"],
  reasonUnsafe: ["Unsafe", "असुरक्षित"],
  reasonOther: ["Other", "अन्य"],

  // ---- work request --------------------------------------------------
  requestTitle: ["Request work from {name}", "{name}लाई कामको अनुरोध"],
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
  cannotRequestSelf: ["You cannot request work from yourself.", "आफैंलाई कामको अनुरोध पठाउन मिल्दैन।"],
  dateInPast: ["Pick today or a later date.", "आज वा पछिको मिति छान्नुहोस्।"],
  dateUnavailable: ["That day is already booked. Pick another.", "त्यो दिन पहिले नै बुक भइसकेको छ। अर्को दिन छान्नुहोस्।"],

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
  workForName: ["For {name}", "{name}को लागि"],
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
    "तपाईंले कामको अनुरोध पठाउँदा वा कसैले तपाईंलाई अनुरोध पठाउँदा यहाँ देखिन्छ।",
  ],
  waitingOnWorker: ["Waiting for the worker to reply.", "कामदारको जवाफको पर्खाइमा।"],
  waitingOnEmployer: ["Waiting for them to confirm.", "उहाँले पक्का गर्ने पर्खाइमा।"],
  confirmedNext: ["Confirmed. Contact each other to arrange the day.", "पक्का भयो। दिन मिलाउन एकअर्कालाई सम्पर्क गर्नुहोस्।"],
  cancelConfirm: ["Cancel this job?", "यो काम रद्द गर्ने हो?"],

  // ---- reviews -------------------------------------------------------
  reviewTitle: ["How did it go?", "काम कस्तो भयो?"],
  reviewFor: ["Review for {name}", "{name}को समीक्षा"],
  yourRating: ["Your rating", "तपाईंको रेटिङ"],
  reviewComment: ["Add a comment", "टिप्पणी थप्नुहोस्"],
  reviewCommentPlaceholder: ["On time and did good work.", "समयमै आउनुभयो र राम्रो काम गर्नुभयो।"],
  submitReview: ["Submit review", "समीक्षा पठाउनुहोस्"],
  reviewThanks: ["Thanks for the review.", "समीक्षाको लागि धन्यवाद।"],
  star1: ["Poor", "नराम्रो"],
  star2: ["Fair", "ठीकै"],
  star3: ["Good", "राम्रो"],
  star4: ["Very good", "धेरै राम्रो"],
  star5: ["Excellent", "उत्कृष्ट"],

  // ---- notifications -------------------------------------------------
  notifications: ["Notifications", "सूचना"],
  markAllRead: ["Mark all read", "सबै पढिएको चिन्ह लगाउनुहोस्"],
  unreadCount: ["{count} unread", "{count} नपढिएका"],
  filterAll: ["All", "सबै"],
  filterUnread: ["Unread", "नपढिएका"],
  noUnread: ["Nothing unread.", "नपढिएको केही छैन।"],
  noNotifications: ["No notifications.", "कुनै सूचना छैन।"],
  officialAccount: ["Official", "आधिकारिक"],

  // ---- notice board --------------------------------------------------
  noticeBoard: ["Notice board", "सूचना पाटी"],
  noticeBoardHint: ["Official notices from the Duleko team.", "डुलेको टोलीका आधिकारिक सूचनाहरू।"],
  notice: ["Notice", "सूचना"],
  postNotice: ["Post a notice", "सूचना राख्नुहोस्"],
  postNoticeShort: ["Post", "राख्नुहोस्"],
  noticeTitle: ["Title", "शीर्षक"],
  noticeTitlePlaceholder: ["e.g. Office closed for Dashain", "जस्तै: दशैंमा कार्यालय बन्द"],
  noticeText: ["Text", "विवरण"],
  noticeTextPlaceholder: ["Write the notice here", "सूचना यहाँ लेख्नुहोस्"],
  noticeImage: ["Image (JPEG or PNG)", "तस्बिर (JPEG वा PNG)"],
  noticeAddImage: ["Choose an image", "तस्बिर छान्नुहोस्"],
  noticeRemoveImage: ["Remove image", "तस्बिर हटाउनुहोस्"],
  noticeTitleTooShort: [
    "Give the notice a title of at least 3 characters.",
    "सूचनाको कम्तीमा ३ अक्षरको शीर्षक लेख्नुहोस्।",
  ],
  noticeImageType: ["Choose a JPEG or PNG image.", "JPEG वा PNG तस्बिर छान्नुहोस्।"],
  noticeGoesToEveryone: [
    "Every member gets an alert and an email. You can take a notice down later, but emails already sent stay sent.",
    "हरेक सदस्यलाई एपमा सूचना र इमेल जान्छ। सूचना पछि हटाउन सकिन्छ, तर पठाइसकेको इमेल फिर्ता हुँदैन।",
  ],
  publishNotice: ["Publish to everyone", "सबैलाई पठाउनुहोस्"],
  noticePublished: ["Notice published. Everyone is being notified.", "सूचना प्रकाशित भयो। सबैलाई जानकारी पठाइँदैछ।"],
  noNotices: ["No notices yet.", "अहिलेसम्म कुनै सूचना छैन।"],
  noNoticesHint: [
    "Official notices from the Duleko team will appear here.",
    "डुलेको टोलीका आधिकारिक सूचनाहरू यहाँ देखिनेछन्।",
  ],
  noticeNotFound: ["This notice is no longer on the board.", "यो सूचना अब पाटीमा छैन।"],
  deleteNotice: ["Take down", "हटाउनुहोस्"],
  deleteNoticeTitle: ["Take this notice down?", "यो सूचना हटाउने?"],
  deleteNoticeConfirm: [
    "It disappears from the board and from everyone's alerts. Emails already sent stay in people's inboxes.",
    "यो सूचना पाटी र सबैको सूचनाबाट हट्छ। पठाइसकेका इमेल भने मानिसहरूको इनबक्समै रहन्छन्।",
  ],
  noticeDeleted: ["Notice taken down.", "सूचना हटाइयो।"],
  dulekoTeam: ["Duleko team", "डुलेको टोली"],
  openFullImage: ["Open full image", "पूरा तस्बिर खोल्नुहोस्"],
  allNotices: ["All notices", "सबै सूचना"],

  // ---- alerts outside the app ----------------------------------------
  alertsOutsideApp: ["Email & SMS alerts", "इमेल र एसएमएस सूचना"],
  emailAlerts: ["Email me", "मलाई इमेल पठाउनुहोस्"],
  emailAlertsHint: [
    "Work requests, friend requests, and chats you miss while you are away.",
    "कामको अनुरोध, साथी अनुरोध र तपाईं अनलाइन नभएका बेला आएका सन्देश।",
  ],
  smsAlerts: ["Text me (SMS)", "मलाई एसएमएस पठाउनुहोस्"],
  smsAlertsHint: [
    "Only the important ones - work requests and friend requests. Needs a phone number saved.",
    "महत्त्वपूर्ण कुरा मात्र - कामको अनुरोध र साथी अनुरोध। यसका लागि फोन नम्बर राखिएको हुनुपर्छ।",
  ],
  alertPrefsSaved: ["Alert settings saved.", "सूचना सेटिङ सुरक्षित भयो।"],

  // ---- appearance ----------------------------------------------------
  appearance: ["Appearance", "स्वरूप"],
  themeSystem: ["Auto", "स्वतः"],
  themeLight: ["Light", "उज्यालो"],
  themeDark: ["Dark", "अँध्यारो"],
  darkMode: ["Dark mode", "अँध्यारो मोड"],

  // ---- phone alert categories (Android Settings > Notifications) -----
  alertChannelMessages: ["Messages", "सन्देशहरू"],
  alertChannelWork: ["Work requests", "कामका अनुरोधहरू"],
  alertChannelFriends: ["Friend requests", "साथी अनुरोधहरू"],
  alertChannelUpdates: ["News and updates", "समाचार र अपडेटहरू"],

  // ---- profile / settings --------------------------------------------
  myProfile: ["My profile", "मेरो प्रोफाइल"],

  // ---- sharing a profile ---------------------------------------------
  shareProfile: ["Share profile", "प्रोफाइल सेयर गर्नुहोस्"],
  downloadCard: ["Download Professional ID card", "व्यावसायिक परिचयपत्र डाउनलोड गर्नुहोस्"],
  downloadCardShort: ["Download ID card", "परिचयपत्र डाउनलोड"],
  generatingCard: ["Preparing your card…", "तपाईंको कार्ड तयार हुँदैछ…"],
  cardDownloaded: ["Professional ID card downloaded.", "व्यावसायिक परिचयपत्र डाउनलोड भयो।"],
  cardSavedToGallery: ["Professional ID card saved to your gallery.", "व्यावसायिक परिचयपत्र तपाईंको ग्यालेरीमा सुरक्षित भयो।"],
  cardSaveDenied: [
    "Allow Duleko to save photos, then try again.",
    "Duleko लाई फोटो सुरक्षित गर्ने अनुमति दिनुहोस्, अनि फेरि प्रयास गर्नुहोस्।",
  ],
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
  editProfile: ["Edit profile", "प्रोफाइल सम्पादन गर्नुहोस्"],
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
    "व्यस्त चिन्ह लगाउन दिनमा थिच्नुहोस्। पक्का भएका कामका दिन आफैं चिन्ह लाग्छन्।",
  ],
  profileSaved: ["Profile saved.", "प्रोफाइल सुरक्षित भयो।"],
  memberSince: ["Member since", "सदस्य बनेको"],
  memberId: ["Duleko Membership ID", "डुलेको सदस्यता नम्बर"],
  basicInfo: ["Basic info", "आधारभूत जानकारी"],
  noAboutYet: [
    "Add a short bio so people know what you do.",
    "आफ्नो कामबारे मानिसहरूलाई थाहा दिन छोटो परिचय थप्नुहोस्।",
  ],
  noSkillsYetProfile: ["No skills added yet.", "अझै कुनै सीप थपिएको छैन।"],
  noSkillsYetProfileHint: [
    "Add skills so employers can find and hire you.",
    "काम दिनेहरूले तपाईंलाई भेट्टाउन र काममा लगाउन सकून् भनेर सीप थप्नुहोस्।",
  ],
  noAboutYetOther: ["Hasn't added a bio yet.", "अहिलेसम्म परिचय थप्नुभएको छैन।"],
  daysMarkedBusy: ["{count} days marked busy", "{count} दिन व्यस्त चिन्ह लगाइएको"],
  uploadCertificateHint: ["PNG, JPG, or PDF up to 5 MB", "PNG, JPG वा PDF (५ MB सम्म)"],

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
  bio: ["Short bio", "छोटो परिचय"],
  bioHint: ["A one-line headline, under 100 characters.", "१०० अक्षरभन्दा कम, एक लाइनको परिचय।"],
  age: ["Age", "उमेर"],
  highestEducation: ["Highest education", "उच्चतम शिक्षा"],
  yearsOld: ["{count} years old", "{count} वर्ष"],
  upload: ["Upload", "अपलोड गर्नुहोस्"],
  delete: ["Delete", "मेटाउनुहोस्"],

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
    "खाता बनाएर तपाईं डुलेकोका प्रयोगका सर्तहरूमा सहमत हुनुहुन्छ र गोपनीयता नीति स्वीकार गर्नुहुन्छ।",
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
  policyFullTerms: ["Read the full Terms of Use", "प्रयोगका सर्तहरू पूरा पढ्नुहोस्"],
  policySummaryAge: [
    "You must be 18 or older, and sign up with a Google or email account of your own.",
    "तपाईं १८ वर्ष वा सोभन्दा माथिको हुनुपर्छ र आफ्नै Google वा इमेल खाताबाट दर्ता हुनुपर्छ।",
  ],
  policySummary1: [
    "Provide genuine information about yourself, your skills, and your location. Do not impersonate anyone or use fake certificates.",
    "आफ्नो परिचय, सीप र स्थानबारे सही जानकारी दिनुहोस्। अरू कसैको नक्कल नगर्नुहोस्, नक्कली प्रमाणपत्र प्रयोग नगर्नुहोस्।",
  ],
  policySummary2: [
    "A verified phone number is required. Do not create multiple accounts to mislead or defraud others.",
    "प्रमाणित फोन नम्बर अनिवार्य छ। अरूलाई झुक्याउन वा ठग्न धेरै खाता नबनाउनुहोस्।",
  ],
  policySummary3: [
    "Use Duleko responsibly. It must not be used for scams, harassment, discrimination, or illegal activity.",
    "डुलेको जिम्मेवारीपूर्वक प्रयोग गर्नुहोस्। यसलाई ठगी, दुर्व्यवहार, भेदभाव वा गैरकानुनी गतिविधिका लागि प्रयोग गर्न पाइँदैन।",
  ],
  policySummary4: [
    "Only list skills you can reasonably perform. Listing a skill does not by itself mean Duleko has verified it.",
    "आफूले साँच्चै गर्न सक्ने सीप मात्र राख्नुहोस्। सीप राख्दैमा डुलेकोले त्यो प्रमाणित गरेको मानिँदैन।",
  ],
  policySummary5: [
    "Be respectful and truthful in requests, communication, cancellations, payments, and reviews.",
    "अनुरोध, कुराकानी, रद्द, भुक्तानी र समीक्षामा सम्मानजनक र इमानदार हुनुहोस्।",
  ],
  policySummary6: [
    "Sensitive information such as your phone number and exact live location is only shared according to your privacy and contact settings.",
    "फोन नम्बर र ठ्याक्कै लाइभ स्थानजस्ता संवेदनशील जानकारी तपाईंको गोपनीयता र सम्पर्क सेटिङअनुसार मात्र साझा गरिन्छ।",
  ],
  policySummary7: [
    "Duleko helps people connect. It does not guarantee the quality, safety, completion, price, or payment of any work arranged between users.",
    "डुलेकोले मानिसहरूलाई जोड्न मद्दत गर्छ। प्रयोगकर्ताबीच मिलेको कामको गुणस्तर, सुरक्षा, काम पूरा हुने कुरा, मूल्य वा भुक्तानीको ग्यारेन्टी डुलेकोले दिँदैन।",
  ],
  policySummary8: [
    "Use reasonable judgment before meeting, hiring, or working with someone. Report suspicious or unsafe behaviour.",
    "कसैलाई भेट्नु, काममा लगाउनु वा सँगै काम गर्नुअघि उचित सतर्कता अपनाउनुहोस्। शंकास्पद वा असुरक्षित व्यवहारबारे उजुरी गर्नुहोस्।",
  ],
  policySummary9: [
    "Accounts involved in fraud, fake credentials, or repeated harmful behaviour may be restricted or suspended.",
    "ठगी, नक्कली प्रमाणपत्र वा बारम्बार हानिकारक व्यवहारमा संलग्न खाता सीमित वा निलम्बन गर्न सकिन्छ।",
  ],

  // ---- location permission prompt (asked only when a feature needs it) --
  locationConsentTitle: ["Sort by distance?", "दूरीअनुसार मिलाउने हो?"],
  locationConsentBody: [
    "Duleko uses your phone's location for this search only. Your exact position stays on this phone - just its area, about 1 km, is used - and nothing is saved.",
    "डुलेकोले यो खोजका लागि मात्र तपाईंको फोनको स्थान प्रयोग गर्छ। तपाईंको ठ्याक्कै स्थान यही फोनमा रहन्छ - करिब १ किलोमिटरको क्षेत्र मात्र प्रयोग हुन्छ - र केही पनि सुरक्षित गरिँदैन।",
  ],
  allowLocation: ["Allow Location", "स्थान अनुमति दिनुहोस्"],
  continueAction: ["Continue", "जारी राख्नुहोस्"],

  // Location consent prompt for registration
  registrationLocationConsentTitle: ["Allow Duleko to use your location?", "डुलेकोलाई तपाईंको स्थान प्रयोग गर्न दिने हो?"],
  registrationLocationConsentDesc: [
    "Your location helps Duleko show relevant people and opportunities nearby. Your precise/live location will not be publicly displayed unless you choose to share it.",
    "तपाईंको स्थानले डुलेकोलाई नजिकैका सान्दर्भिक मानिस र अवसर देखाउन मद्दत गर्छ। तपाईंले आफैं साझा नगरेसम्म तपाईंको ठ्याक्कै वा लाइभ स्थान सार्वजनिक रूपमा देखाइँदैन।",
  ],

  // ---- welcome walkthrough ----------------------------------------------
  skip: ["Skip", "छोड्नुहोस्"],
  getStarted: ["Get started", "सुरु गर्नुहोस्"],
  welcomeBack: ["Welcome back, {name}!", "फेरि स्वागत छ, {name}!"],
  walkthroughTitle1: ["Find skilled people nearby", "नजिकैका सिपालु मानिस भेट्टाउनुहोस्"],
  walkthroughBody1: [
    "Browse by skill or search to find workers near you, sorted by distance.",
    "सीपअनुसार हेर्नुहोस् वा खोज्नुहोस् - नजिकैका कामदार दूरीअनुसार क्रमैसँग देखिन्छन्।",
  ],
  walkthroughTitle2: ["Request work in a tap", "एक ट्यापमै काम अनुरोध गर्नुहोस्"],
  walkthroughBody2: [
    "Describe the job, pick a free date, and send a request - no need to pick a specific skill.",
    "कामको विवरण दिनुहोस्, खाली मिति छान्नुहोस् र अनुरोध पठाउनुहोस् - कुनै खास सीप छान्नुपर्दैन।",
  ],
  walkthroughTitle3: ["Add friends, stay connected", "साथी थप्नुहोस्, जोडिइरहनुहोस्"],
  walkthroughBody3: [
    "Add people you know as friends to chat and call them anytime, work or no work.",
    "चिनेका मानिसलाई साथी बनाउनुहोस्, अनि काम होस् वा नहोस्, जुनसुकै बेला कुराकानी वा फोन गर्नुहोस्।",
  ],
  walkthroughTitle4: ["Set your rate and schedule", "आफ्नो दर र समय तालिका मिलाउनुहोस्"],
  walkthroughBody4: [
    "List your skills with an optional rate, and mark the days you're busy on a full year calendar.",
    "आफ्ना सीप र चाहनुहुन्छ भने दर राख्नुहोस्, अनि वर्षभरिको पात्रोमा व्यस्त दिन चिन्ह लगाउनुहोस्।",
  ],

  // ---- price negotiation (bidding) --------------------------------------
  yourOffer: ["Your offer", "तपाईंको प्रस्ताव"],
  workerRateHint: ["Their listed rate: {rates}", "उहाँको तोकिएको दर: {rates}"],
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
    "It connects people who need work done with skilled people nearby: tutors, electricians, IT help, drivers and anyone else with a skill to offer.",
    "यसले काम गराउन चाहने मानिसहरूलाई नजिकैका सिपालु मानिससँग जोड्छ: ट्युटर, बिजुली मिस्त्री, आईटी सहयोगी, चालक र सीप भएका जो कोही।",
  ],
  howItWorks: ["How it works", "यो कसरी काम गर्छ"],
  meetTheTeam: ["Meet the team", "टोली भेट्नुहोस्"],
  contactUs: ["Contact", "सम्पर्क"],
  contactEmail: ["dulekonepal@gmail.com", "dulekonepal@gmail.com"],
  contactQuestion: ["Questions, feedback, or partnership ideas? Reach us at", "प्रश्न, सुझाव वा साझेदारीको विचार छ? हामीलाई सम्पर्क गर्नुहोस्"],

  // Mission page
  missionTitle: ["Our mission", "हाम्रो उद्देश्य"],
  missionSubtitle: ["Why Duleko exists", "डुलेको किन?"],
  whatWereBuildingToward: ["What we're building toward", "हामी केतर्फ अघि बढिरहेका छौं"],
  missionPrinciple1: [
    "Any skill, not just a fixed list. Free-typed skills are just as searchable as catalogued ones.",
    "कुनै पनि सीप, तोकिएको सूचीमा मात्र सीमित छैन। आफ्नै शब्दमा लेखिएका सीप पनि सूचीका सीपजत्तिकै सजिलै खोजिन्छन्।",
  ],
  missionPrinciple2: [
    "Distance-first search, so the nearest available person is the easiest to find.",
    "दूरीलाई प्राथमिकता दिने खोज, जसले गर्दा सबैभन्दा नजिकको उपलब्ध व्यक्ति भेट्टाउन सबैभन्दा सजिलो हुन्छ।",
  ],
  missionPrinciple3: [
    "Free to join, free to browse. No cost to find work or find workers.",
    "सदस्य बन्न निःशुल्क, हेर्न निःशुल्क। काम वा कामदार खोज्न कुनै खर्च लाग्दैन।",
  ],
  missionPrinciple4: [
    "Every screen works in both languages, from day one.",
    "पहिलो दिनदेखि नै हरेक स्क्रिन दुवै भाषामा।",
  ],
  missionPrinciple5: [
    "Works well even on slower connections, since that is the reality for many people it is meant to serve.",
    "ढिलो इन्टरनेटमा पनि राम्रोसँग चल्छ, किनकि हामीले सेवा दिन खोजेका धेरै मानिसहरूको यथार्थ यही हो।",
  ],
  yourSkillsOurCommunity: ["Your skills. Our community.", "तपाईंको सीप। हाम्रो समुदाय।"],
  yourSkillsOurCommunityDesc: [
    "That is the line on every Duleko profile card, and it is the whole idea in five words: the skills belong to the people who have them, and the platform's only job is to help the right two people find each other.",
    "हरेक डुलेको प्रोफाइल कार्डमा यही वाक्य हुन्छ र हाम्रो पूरा सोच यसैमा छ: सीप त्यो सीप भएका मानिसकै हो र प्लेटफर्मको काम सही दुई व्यक्तिलाई एकअर्कासँग भेटाउनु मात्र हो।",
  ],
  missionStatement: [
    "If someone who isn't technical can't use and understand Duleko, it doesn't matter how well we build.",
    "प्राविधिक ज्ञान नभएको व्यक्तिले डुलेको बुझेर प्रयोग गर्न सकेन भने हामीले जतिसुकै राम्रो बनाए पनि त्यसको कुनै अर्थ रहँदैन।",
  ],

  // Motivation page
  motivationTitle: ["Why we built Duleko", "हामीले डुलेको किन बनायौं"],
  motivationSubtitle: ["In our own words", "हाम्रै शब्दमा"],
  motivationIntro: [
    "Duleko started from a plain observation: skilled people and the people who need them usually live close by, but beyond asking around, there is no easy way for them to find each other.",
    "डुलेको एउटा सामान्य अवलोकनबाट सुरु भयो: सिपालु मानिस र उनीहरूलाई खोज्ने मानिस प्रायः नजिकै बस्छन्, तर वरिपरि सोधपुछ गर्नुबाहेक एकअर्कालाई भेट्टाउने सजिलो उपाय छैन।",
  ],
  straightFromTheTeam: ["Straight from the team", "टोलीबाट सिधै"],
  whatKeepsUsBuilding: ["What keeps us building", "हामीलाई निरन्तर काम गर्न के ले प्रेरित गर्छ"],
  whatKeepsUsBuildingDesc: [
    "Every real profile on Duleko is the reason it exists. We don't want to be just another app. We want to make one thing easier for people who shouldn't need to be technical to use it.",
    "डुलेकोमा भएको हरेक वास्तविक प्रोफाइल नै यसको अस्तित्वको कारण हो। अर्को एउटा एप बन्नु हाम्रो उद्देश्य होइन; प्राविधिक ज्ञान नभएकाहरूका लागि एउटा खास काम सजिलो बनाउनु हो।",
  ],

  // Privacy policy page
  privacyTitle: ["Privacy policy", "गोपनीयता नीति"],
  privacyLastUpdated: ["Last updated: October 2026", "अन्तिम अद्यावधिक: अक्टोबर २०२६"],
  privacyIntro: [
    "Welcome to Duleko. Duleko helps people discover skills, connect with people nearby, and find or offer work opportunities.",
    "डुलेकोमा स्वागत छ। डुलेकोले मानिसहरूलाई सीप पत्ता लगाउन, नजिकैका मानिसहरूसँग जोडिन र कामको अवसर खोज्न वा दिन मद्दत गर्छ।",
  ],

  // Information we collect
  privacyInfoCollectTitle: ["1. Information we collect", "१. हामीले संकलन गर्ने जानकारी"],
  privacyInfoCollectIntro: [
    "Depending on the features a user chooses to use, Duleko may collect:",
    "प्रयोगकर्ताले प्रयोग गर्ने सुविधाअनुसार डुलेकोले निम्न जानकारी संकलन गर्न सक्छ:",
  ],
  privacyAccountInfo: ["Account information: name, mobile number and authentication information.", "खाता जानकारी: नाम, मोबाइल नम्बर र प्रमाणीकरणसम्बन्धी जानकारी।"],
  privacyProfileInfo: ["Profile information: photograph, skills, description, rates, general address/location and availability.", "प्रोफाइल जानकारी: फोटो, सीप, विवरण, दर, सामान्य ठेगाना वा स्थान र उपलब्धता।"],
  privacyWorkInfo: ["Work information: work requests, accepted/completed work, cancellations and reviews.", "कामसम्बन्धी जानकारी: कामको अनुरोध, स्वीकृत वा सम्पन्न काम, रद्द गरिएका काम र समीक्षा।"],
  privacyVerificationInfo: ["Verification information: certificates or other documents voluntarily submitted for verification.", "प्रमाणीकरण जानकारी: प्रमाणीकरणका लागि स्वेच्छाले पेस गरिएका प्रमाणपत्र वा अन्य कागजात।"],
  privacyLocationInfo: ["Location information: approximate or precise device location when the user gives permission to a feature requiring it.", "स्थान जानकारी: कुनै सुविधालाई प्रयोगकर्ताले अनुमति दिएको अवस्थामा मात्र, उपकरणको अनुमानित वा ठ्याक्कै स्थान।"],
  privacyTechnicalInfo: ["Technical information: information reasonably necessary for security, authentication, troubleshooting and operation of Duleko.", "प्राविधिक जानकारी: सुरक्षा, प्रमाणीकरण, समस्या समाधान र डुलेको सञ्चालनका लागि उचित रूपमा आवश्यक जानकारी।"],
  privacyNepalAct: [
    "Nepal's Privacy Act expressly regulates personal information and privacy, so Duleko should treat collection, storage and disclosure of these data as a core compliance issue rather than merely an app setting.",
    "नेपालको वैयक्तिक गोपनीयतासम्बन्धी ऐनले व्यक्तिगत जानकारी र गोपनीयतालाई स्पष्ट रूपमा नियमन गर्छ। त्यसैले डुलेकोले यस्तो जानकारीको संकलन, भण्डारण र खुलासालाई एपको सेटिङ मात्र नभई कानुन पालनाको मुख्य विषयका रूपमा लिन्छ।",
  ],

  // Why We Use This Information
  privacyWhyUseTitle: ["2. Why we use this information", "२. हामी यो जानकारी किन प्रयोग गर्छौं"],
  privacyWhyUseIntro: ["Duleko may use information to:", "डुलेकोले जानकारी निम्न कामका लागि प्रयोग गर्न सक्छ:"],
  privacyUseCreateAccount: ["Create and maintain accounts", "खाता खोल्न र सञ्चालन गर्न"],
  privacyUseShowWorkers: ["Show users relevant workers and skills", "प्रयोगकर्तालाई सान्दर्भिक कामदार र सीप देखाउन"],
  privacyUseConnect: ["Enable users to connect", "प्रयोगकर्तालाई एकअर्कासँग जोडिन सक्षम बनाउन"],
  privacyUseLocation: ["Provide location-based discovery", "स्थानमा आधारित खोज उपलब्ध गराउन"],
  privacyUseVerify: ["Verify users or qualifications", "प्रयोगकर्ता वा योग्यता प्रमाणित गर्न"],
  privacyUseProcessRequests: ["Process work requests", "कामका अनुरोधहरू प्रशोधन गर्न"],
  privacyUseDisplayReviews: ["Display ratings and reviews", "रेटिङ र समीक्षा देखाउन"],
  privacyUsePreventFraud: ["Prevent fraud and misuse", "ठगी र दुरुपयोग रोक्न"],
  privacyUseImprove: ["Improve Duleko", "डुलेको सुधार गर्न"],
  privacyUseComply: ["Comply with applicable Nepalese law", "लागू हुने नेपाली कानुनको पालना गर्न"],
  privacyNoFutureCollection: ["We should not collect personal information simply because it might become useful later.", "पछि कहिल्यै काम लाग्ला भन्ने कारणले मात्र हामी व्यक्तिगत जानकारी संकलन गर्दैनौं।"],

  // Public Profile Information
  privacyPublicProfileTitle: ["3. Public profile information", "३. सार्वजनिक प्रोफाइल जानकारी"],
  privacyPublicProfileIntro: [
    "Some information is intended to be visible to other Duleko users or visitors, such as:",
    "केही जानकारी अन्य डुलेको प्रयोगकर्ता वा आगन्तुकलाई देखिने गरी राखिन्छ, जस्तै:",
  ],
  privacyPublicProfileItems: [
    "Name • profile photo • skills • expected rates • general location • availability • ratings • verification status",
    "नाम • प्रोफाइल फोटो • सीप • अपेक्षित दर • सामान्य स्थान • उपलब्धता • रेटिङ • प्रमाणीकरणको अवस्था",
  ],
  privacyPublicProfileNotice: [
    "Users should be clearly informed which information will become public before publishing their profile.",
    "प्रोफाइल प्रकाशित गर्नुअघि कुन जानकारी सार्वजनिक हुन्छ भनेर प्रयोगकर्तालाई स्पष्ट रूपमा जानकारी दिइन्छ।",
  ],

  // Phone Numbers
  privacyPhoneTitle: ["4. Phone numbers", "४. फोन नम्बर"],
  privacyPhoneIntro: [
    "A user's mobile number is collected for account verification and communication.",
    "प्रयोगकर्ताको मोबाइल नम्बर खाता प्रमाणीकरण र सम्पर्कका लागि संकलन गरिन्छ।",
  ],
  privacyPhoneNotPublic: [
    "Duleko should not make phone numbers openly available to anonymous visitors.",
    "डुलेकोले फोन नम्बर अज्ञात आगन्तुकलाई खुला रूपमा उपलब्ध गराउँदैन।",
  ],
  privacyPhoneAccess: [
    "Where Duleko enables users to call or contact each other, access should follow Duleko's account and privacy controls.",
    "डुलेकोमार्फत प्रयोगकर्ताले एकअर्कालाई फोन वा सम्पर्क गर्न सक्ने अवस्थामा, नम्बरमा पहुँच डुलेकोको खाता र गोपनीयता नियन्त्रणअनुसार मात्र हुन्छ।",
  ],

  // Location and Live Location
  privacyLocationTitle: ["6. Location and live location", "६. स्थान र लाइभ स्थान"],
  privacyLocationImportant: ["This section is especially important for Duleko.", "यो खण्ड डुलेकोका लागि विशेष महत्त्वपूर्ण छ।"],
  privacyLocationNotPublic: [
    "A user's exact or live location should never become publicly visible merely because they created an account.",
    "खाता खोलेकै कारणले प्रयोगकर्ताको ठ्याक्कै वा लाइभ स्थान कहिल्यै सार्वजनिक रूपमा देखिँदैन।",
  ],
  privacyLocationPermission: [
    "Location access should be permission-based. Where possible, public discovery should display an approximate area or distance rather than exact coordinates.",
    "स्थानमा पहुँच अनुमतिमा आधारित हुन्छ। सम्भव भएसम्म, सार्वजनिक खोजमा ठ्याक्कै निर्देशांकको सट्टा अनुमानित क्षेत्र वा दूरी देखाइन्छ।",
  ],
  privacyLocationLiveSharing: [
    "If Duleko introduces live-location sharing, the user should knowingly activate it and be able to stop sharing it.",
    "डुलेकोले लाइभ स्थान साझा गर्ने सुविधा ल्याएमा, प्रयोगकर्ताले जानीबुझी त्यो सक्रिय गर्नुपर्छ र जुनसुकै बेला रोक्न सक्नुहुन्छ।",
  ],

  // Certificates and Verification
  privacyCertificatesTitle: ["7. Certificates and verification", "७. प्रमाणपत्र र प्रमाणीकरण"],
  privacyCertificatesNotPublic: [
    "Certificates submitted for verification should not automatically become publicly downloadable documents.",
    "प्रमाणीकरणका लागि पेस गरिएका प्रमाणपत्र आफैं सार्वजनिक रूपमा डाउनलोड गर्न मिल्ने कागजात बन्दैनन्।",
  ],
  privacyCertificatesDisplay: [
    "Duleko may instead display information such as:",
    "बरु डुलेकोले यस्तो जानकारी देखाउन सक्छ:",
  ],
  privacyVerified: ["✓ Training Verified", "✓ तालिम प्रमाणित"],
  privacyVerifiedBy: ["Verified by [Municipality/Training Institution]", "[नगरपालिका/तालिम संस्था] द्वारा प्रमाणित"],
  privacyCertificatesCollect: [
    "Duleko should collect and retain only the verification information reasonably necessary for this purpose.",
    "डुलेकोले यस उद्देश्यका लागि उचित रूपमा आवश्यक प्रमाणीकरण जानकारी मात्र संकलन र भण्डारण गर्छ।",
  ],

  // Sharing Information
  privacySharingTitle: ["8. Sharing information", "८. जानकारी साझेदारी"],
  privacyNoSell: [
    "Duleko should not sell users' personal information.",
    "डुलेकोले प्रयोगकर्ताको व्यक्तिगत जानकारी बेच्दैन।",
  ],
  privacySharingConditions: [
    "Information may be shared only where reasonably necessary to operate Duleko, where the user has authorized the sharing, with service providers needed to operate the platform subject to appropriate safeguards, or where disclosure is required by applicable law.",
    "जानकारी डुलेको सञ्चालन गर्न उचित रूपमा आवश्यक परेमा, प्रयोगकर्ताले साझा गर्न अनुमति दिएमा, उपयुक्त सुरक्षा व्यवस्थासहित प्लेटफर्म सञ्चालनका लागि आवश्यक सेवा प्रदायकसँग वा लागू कानुनले खुलासा गर्न अनिवार्य गरेमा मात्र साझा गरिन्छ।",
  ],
  privacyMunicipality: [
    "A municipality partnering with Duleko should not automatically receive individual users' private information simply because it promotes or verifies people on the platform.",
    "डुलेकोसँग साझेदारी गर्ने नगरपालिकाले प्लेटफर्ममा मानिसहरूलाई प्रवर्द्धन वा प्रमाणित गर्छ भन्ने कारणले मात्र प्रयोगकर्ताको निजी जानकारी स्वतः प्राप्त गर्दैन।",
  ],
  privacyAggregated: [
    "For reporting purposes, Duleko should preferably provide aggregated information such as:",
    "प्रतिवेदनका लागि डुलेकोले सकेसम्म यस्ता समग्र तथ्यांक उपलब्ध गराउँछ:",
  ],
  privacyAggregatedExample: [
    "247 trained people registered\n163 received work opportunities\n92 completed work",
    "२४७ जना प्रशिक्षित व्यक्ति दर्ता भए\n१६३ जनाले कामको अवसर पाए\n९२ जनाले काम पूरा गरे",
  ],
  privacyNoIndividualDisclosure: [
    "rather than disclosing individual people's private activity.",
    "व्यक्ति-व्यक्तिको निजी गतिविधि खुलाउनुको सट्टा।",
  ],

  // Data Security
  privacySecurityTitle: ["9. Data security", "९. डेटा सुरक्षा"],
  privacySecurityDesc: [
    "Duleko will take reasonable technical and organizational measures to protect personal information from unauthorized access, disclosure, alteration, loss, or misuse.",
    "डुलेकोले व्यक्तिगत जानकारीलाई अनधिकृत पहुँच, खुलासा, परिवर्तन, नोक्सानी वा दुरुपयोगबाट जोगाउन उचित प्राविधिक र संस्थागत उपाय अपनाउनेछ।",
  ],
  privacyNoAbsoluteSecurity: [
    "No online system can guarantee absolute security.",
    "कुनै पनि अनलाइन प्रणालीले पूर्ण सुरक्षाको ग्यारेन्टी दिन सक्दैन।",
  ],

  // User Choices
  privacyChoicesTitle: ["10. User choices", "१०. प्रयोगकर्ताका विकल्प"],
  privacyChoicesIntro: [
    "Users should be provided reasonable ways to:",
    "प्रयोगकर्तालाई निम्न कुराका लागि उचित उपाय उपलब्ध गराइन्छ:",
  ],
  privacyChoiceEdit: ["Edit their information", "आफ्नो जानकारी सम्पादन गर्न"],
  privacyChoiceVisibility: ["Control relevant visibility and location permissions", "सम्बन्धित दृश्यता र स्थान अनुमति नियन्त्रण गर्न"],
  privacyChoiceStopLocation: ["Stop live-location sharing", "लाइभ स्थान साझा गर्न रोक्न"],
  privacyChoiceLogout: ["Log out", "लगआउट गर्न"],
  privacyChoiceDelete: ["Request account deletion", "खाता मेटाउन अनुरोध गर्न"],
  privacyChoicesImplementation: [
    "The engineering implementation should actually support the rights and choices promised in this policy.",
    "यस नीतिमा वाचा गरिएका अधिकार र विकल्पहरू एपमा वास्तवमै काम गर्ने गरी बनाइएका छन्।",
  ],

  // Changes to Policy
  privacyChangesTitle: ["11. Changes to this policy", "११. यस नीतिमा परिवर्तन"],
  privacyChangesDesc: [
    "Duleko may update this Privacy Policy as the platform develops or legal requirements change.",
    "डुलेकोले प्लेटफर्म विकास हुँदा वा कानुनी आवश्यकताहरू परिवर्तन हुँदा यो गोपनीयता नीति अद्यावधिक गर्न सक्छ।",
  ],
  privacyChangesNotice: [
    "Where a material change significantly affects how users' personal information is handled, users should be appropriately informed.",
    "प्रयोगकर्ताको व्यक्तिगत जानकारी कसरी व्यवस्थापन गरिन्छ भन्ने कुरामा उल्लेखनीय असर पर्ने परिवर्तन भएमा प्रयोगकर्तालाई उचित तरिकाले जानकारी दिइनेछ।",
  ],

  // Contact
  privacyContactQuestion: ["Questions about this policy or your data? Reach us at", "यो नीति वा तपाईंको जानकारीबारे प्रश्न छ? हामीलाई सम्पर्क गर्नुहोस्"],

  // User Registration Policy
  registrationPolicyTitle: ["Duleko User Registration Policy", "डुलेको प्रयोगकर्ता दर्ता नीति"],
  registrationPolicyLastUpdated: ["Last updated: October 2026", "अन्तिम अद्यावधिक: अक्टोबर २०२६"],
  registrationPolicyIntro: [
    "Welcome to Duleko. Duleko helps people discover skills, connect with people nearby, and find or offer work opportunities. By creating an account, you agree to the following:",
    "डुलेकोमा स्वागत छ। डुलेकोले मानिसहरूलाई सीप पत्ता लगाउन, नजिकैका मानिसहरूसँग जोडिन र कामको अवसर खोज्न वा दिन मद्दत गर्छ। खाता खोलेर तपाईं निम्न कुरामा सहमत हुनुहुन्छ:",
  ],
  regPolicyAge: [
    "Be 18 or older. You must be at least 18 years old to create a Duleko account, and the Google or email account you sign up with must be your own.",
    "१८ वर्ष वा सोभन्दा माथिको हुनुहोस्। डुलेको खाता खोल्न तपाईं कम्तीमा १८ वर्ष पूरा भएको हुनुपर्छ र दर्ता हुन प्रयोग गर्ने Google वा इमेल खाता तपाईंकै हुनुपर्छ।",
  ],
  regPolicyGenuineInfo: [
    "Provide genuine information. Use accurate information about yourself, your skills, experience, location, rates, and qualifications. Do not impersonate another person or provide false certificates or credentials.",
    "सही जानकारी दिनुहोस्। आफ्नो परिचय, सीप, अनुभव, स्थान, दर र योग्यताबारे सही जानकारी दिनुहोस्। अरू कसैको नक्कल नगर्नुहोस् र झूटा प्रमाणपत्र वा योग्यता पेस नगर्नुहोस्।",
  ],
  regPolicyPhoneVerification: [
    "Phone verification is required. Every registered account must have a verified phone number. One person should not create multiple accounts for misleading, fraudulent, or abusive purposes.",
    "फोन प्रमाणीकरण अनिवार्य छ। दर्ता भएका हरेक खातामा प्रमाणित फोन नम्बर हुनुपर्छ। एउटै व्यक्तिले झुक्याउने, ठग्ने वा दुरुपयोग गर्ने उद्देश्यले धेरै खाता खोल्नु हुँदैन।",
  ],
  regPolicyResponsibleUse: [
    "Use Duleko responsibly. Duleko may not be used for scams, harassment, discrimination, illegal activities, exploitation, or activities that could harm other users.",
    "डुलेको जिम्मेवारीपूर्वक प्रयोग गर्नुहोस्। डुलेकोलाई ठगी, दुर्व्यवहार, भेदभाव, गैरकानुनी गतिविधि, शोषण वा अन्य प्रयोगकर्तालाई हानि पुर्‍याउन सक्ने गतिविधिमा प्रयोग गर्न पाइँदैन।",
  ],
  regPolicyTruthfulSkills: [
    "Be truthful about your skills. Only list skills you can reasonably perform. A skill listed by a user does not automatically mean that Duleko has verified that person's qualifications. Verified credentials will be clearly identified separately.",
    "आफ्नो सीपबारे इमानदार हुनुहोस्। आफूले साँच्चै गर्न सक्ने सीप मात्र सूचीमा राख्नुहोस्। प्रयोगकर्ताले सीप राख्दैमा डुलेकोले त्यो व्यक्तिको योग्यता प्रमाणित गरेको मानिँदैन। प्रमाणित योग्यतालाई छुट्टै र स्पष्ट रूपमा चिनाइनेछ।",
  ],
  regPolicyRespectOthers: [
    "Respect other users. Work requests, communication, cancellations, payments, and reviews should be made respectfully and truthfully. Users should not intentionally mislead or take advantage of one another.",
    "अरू प्रयोगकर्ताको सम्मान गर्नुहोस्। कामको अनुरोध, कुराकानी, रद्द, भुक्तानी र समीक्षा सम्मानपूर्वक र इमानदारीसाथ गर्नुपर्छ। प्रयोगकर्ताले जानीजानी एकअर्कालाई झुक्याउनु वा अनुचित फाइदा उठाउनु हुँदैन।",
  ],
  regPolicyProtectInfo: [
    "Protect personal information. Some profile information may be visible to people exploring Duleko. Sensitive information such as your phone number, exact/live location, and other private information should only be shared according to Duleko's privacy and contact settings.",
    "व्यक्तिगत जानकारी सुरक्षित राख्नुहोस्। प्रोफाइलका केही जानकारी डुलेको हेर्ने मानिसहरूलाई देखिन सक्छन्। तपाईंको फोन नम्बर, ठ्याक्कै वा लाइभ स्थान र अन्य निजी जानकारीजस्ता संवेदनशील कुरा डुलेकोको गोपनीयता र सम्पर्क सेटिङअनुसार मात्र साझा गरिनुपर्छ।",
  ],
  regPolicyWorkPayment: [
    "Work and payment responsibility. Duleko helps people connect; it does not guarantee the quality, safety, completion, price, or payment of work arranged between users unless explicitly stated otherwise.",
    "काम र भुक्तानीको जिम्मेवारी। डुलेकोले मानिसहरूलाई जोड्न मद्दत गर्छ; स्पष्ट रूपमा अन्यथा नभनिएसम्म, प्रयोगकर्ताबीच मिलेको कामको गुणस्तर, सुरक्षा, काम पूरा हुने कुरा, मूल्य वा भुक्तानीको ग्यारेन्टी डुलेकोले दिँदैन।",
  ],
  regPolicySafetyFirst: [
    "Safety comes first. Users are responsible for using reasonable judgment before meeting, hiring, or working with another person. Suspicious, unsafe, or inappropriate behavior should be reported to Duleko.",
    "सुरक्षा पहिलो। कसैलाई भेट्नु, काममा लगाउनु वा सँगै काम गर्नुअघि उचित सतर्कता अपनाउने जिम्मेवारी प्रयोगकर्ताकै हो। शंकास्पद, असुरक्षित वा अनुचित व्यवहारबारे डुलेकोलाई जानकारी दिनुपर्छ।",
  ],
  regPolicyAccountAction: [
    "Account action. Duleko may restrict or suspend accounts involved in fraud, fake credentials, repeated harmful behavior, serious policy violations, or activities that threaten the safety of the community.",
    "खातामाथि कारबाही। ठगी, नक्कली प्रमाणपत्र, बारम्बार हानिकारक व्यवहार, नीतिको गम्भीर उल्लंघन वा समुदायको सुरक्षामा खतरा पुर्‍याउने गतिविधिमा संलग्न खातालाई डुलेकोले सीमित वा निलम्बन गर्न सक्छ।",
  ],
  registrationAgreement: [
    "Registration Agreement",
    "दर्ता सम्झौता",
  ],
  registrationAgreementIntro: [
    "Before creating the account:",
    "खाता खोल्नुअघि:",
  ],
  registrationAgreePolicies: [
    "I am 18 or older, and I have read and agree to Duleko's Terms, Privacy Policy, and User Registration Policy.",
    "म १८ वर्ष वा सोभन्दा माथिको हुँ र मैले डुलेकोका सर्तहरू, गोपनीयता नीति र प्रयोगकर्ता दर्ता नीति पढेर स्वीकार गरेको छु।",
  ],
  createAccount: ["Create Account", "खाता खोल्नुहोस्"],

  // Terms of Use
  termsTitle: ["DULEKO – TERMS OF USE & USER POLICY", "डुलेको – प्रयोगका सर्तहरू र प्रयोगकर्ता नीति"],
  termsEffectiveDate: ["Effective Date: October 2026", "लागू मिति: अक्टोबर २०२६"],
  termsJurisdiction: ["Applicable Jurisdiction: Nepal", "लागू हुने क्षेत्राधिकार: नेपाल"],
  
  termsAboutTitle: ["1. About Duleko", "१. डुलेकोको बारेमा"],
  termsAboutDesc: [
    "Duleko is a digital platform that helps people discover, offer, and connect around skills and local work opportunities.",
    "डुलेको एउटा डिजिटल प्लेटफर्म हो, जसले मानिसहरूलाई सीप र स्थानीय कामका अवसर पत्ता लगाउन, प्रस्ताव गर्न र त्यसका आधारमा एकअर्कासँग जोडिन मद्दत गर्छ।",
  ],
  termsNotEmployer: [
    "Duleko itself is not the employer of users listed on the platform and, unless specifically stated otherwise, is not a party to agreements made between users regarding work, wages, transportation, delivery, or other services.",
    "डुलेको आफैं प्लेटफर्ममा सूचीकृत प्रयोगकर्ताको रोजगारदाता होइन। स्पष्ट रूपमा अन्यथा नभनिएसम्म, काम, ज्याला, यातायात, डेलिभरी वा अन्य सेवाबारे प्रयोगकर्ताबीच हुने सम्झौतामा डुलेको पक्ष हुँदैन।",
  ],

  termsCreatingAccountTitle: ["2. Creating an Account", "२. खाता खोल्ने"],
  termsCreatingAccountDesc: [
    "To create a Duleko account, users must provide accurate information and verify their mobile number through OTP.",
    "डुलेको खाता खोल्न प्रयोगकर्ताले सही जानकारी दिनुपर्छ र OTP मार्फत आफ्नो मोबाइल नम्बर प्रमाणित गर्नुपर्छ।",
  ],
  termsAgeRequirement: [
    "Users must be at least 18 years old, and must sign up with a Google or email account of their own.",
    "प्रयोगकर्ता कम्तीमा १८ वर्षको हुनुपर्छ र आफ्नै Google वा इमेल खाताबाट दर्ता हुनुपर्छ।",
  ],
  termsMustNot: ["Users must not:", "प्रयोगकर्ताले निम्न कार्य गर्नु हुँदैन:"],
  termsMustNotImpersonate: ["impersonate another person;", "अर्को व्यक्तिको नक्कल गर्ने;"],
  termsMustNotFraud: ["create accounts for fraudulent purposes;", "ठगीको उद्देश्यले खाता खोल्ने;"],
  termsMustNotFalseInfo: ["provide intentionally false information;", "जानीजानी झूटो जानकारी दिने;"],
  termsMustNotFakeCerts: ["upload fake certificates or qualifications;", "नक्कली प्रमाणपत्र वा योग्यता अपलोड गर्ने;"],
  termsMustNotMisuseInfo: ["misuse another person's phone number, photograph, identity, or personal information.", "अर्को व्यक्तिको फोन नम्बर, फोटो, पहिचान वा व्यक्तिगत जानकारीको दुरुपयोग गर्ने।"],
  termsAccountResponsibility: [
    "Users are responsible for activity conducted through their accounts.",
    "आफ्नो खाताबाट हुने गतिविधिको जिम्मेवारी प्रयोगकर्ता स्वयंको हुन्छ।",
  ],

  termsSkillsTitle: ["3. Skills and Qualifications", "३. सीप र योग्यता"],
  termsSkillsDesc: [
    "Users may list skills they are capable of performing.",
    "प्रयोगकर्ताले आफूले गर्न सक्ने सीप सूचीमा राख्न सक्छन्।",
  ],
  termsNotVerified: [
    "Simply listing a skill on Duleko does not mean Duleko has verified that skill.",
    "डुलेकोमा सीप सूचीमा राख्दैमा डुलेकोले त्यो सीप प्रमाणित गरेको मानिँदैन।",
  ],
  termsVerificationIndicator: [
    "Where Duleko, a municipality, training institution, or another authorized organization has verified a certificate or qualification, the profile may display a separate verification indicator.",
    "डुलेको, नगरपालिका, तालिम संस्था वा अन्य अधिकृत निकायले कुनै प्रमाणपत्र वा योग्यता प्रमाणित गरेको भए, प्रोफाइलमा छुट्टै प्रमाणीकरण चिन्ह देखिन सक्छ।",
  ],
  termsNoFalseClaims: [
    "Users must not falsely claim professional qualifications or certifications.",
    "प्रयोगकर्ताले पेशागत योग्यता वा प्रमाणपत्रको झूटो दाबी गर्नु हुँदैन।",
  ],

  termsWorkArrangementsTitle: ["4. Work Arrangements", "४. कामको मिलान"],
  termsWorkArrangementsDesc: [
    "Users may contact one another and arrange work through Duleko.",
    "प्रयोगकर्ताले डुलेकोमार्फत एकअर्कालाई सम्पर्क गरी काम मिलाउन सक्छन्।",
  ],
  termsUnlessStated: [
    "Unless Duleko explicitly states otherwise, the worker and hirer are responsible for agreeing on:",
    "डुलेकोले स्पष्ट रूपमा अन्यथा नभनेसम्म, निम्न कुरामा सहमति गर्ने जिम्मेवारी कामदार र काम दिनेकै हुन्छ:",
  ],
  termsWorkAgreement: [
    "the work → location → time → price/wage → payment method → other conditions.",
    "काम → स्थान → समय → मूल्य/ज्याला → भुक्तानी विधि → अन्य सर्तहरू।",
  ],
  termsNoGuarantee: [
    "Duleko does not guarantee that a user will receive work, that a worker will perform work satisfactorily, or that another user will make payment.",
    "कुनै प्रयोगकर्ताले काम पाउने, कामदारले सन्तोषजनक रूपमा काम गर्ने वा अर्को प्रयोगकर्ताले भुक्तानी गर्ने ग्यारेन्टी डुलेकोले दिँदैन।",
  ],
  termsUseJudgment: [
    "Users should use reasonable judgment before meeting or entering into a work arrangement.",
    "कसैलाई भेट्नु वा कामको सहमति गर्नुअघि प्रयोगकर्ताले उचित सतर्कता अपनाउनुपर्छ।",
  ],

  termsRatesPaymentsTitle: ["5. Rates and Payments", "५. दर र भुक्तानी"],
  termsRatesDesc: [
    "Rates displayed on profiles are the user's stated or expected rates and may not represent a final agreed price.",
    "प्रोफाइलमा देखिने दर प्रयोगकर्ताले उल्लेख गरेको वा अपेक्षा गरेको दर हो; यो अन्तिम सहमत मूल्य नहुन सक्छ।",
  ],
  termsNoIntegratedPayment: [
    "Unless Duleko later introduces an integrated payment service, payments are made directly between users and Duleko does not hold, transfer, or guarantee those payments.",
    "डुलेकोले पछि एकीकृत भुक्तानी सेवा नल्याएसम्म, भुक्तानी प्रयोगकर्ताबीच सिधै हुन्छ; डुलेकोले त्यस्तो भुक्तानी राख्दैन, स्थानान्तरण गर्दैन वा त्यसको ग्यारेन्टी दिँदैन।",
  ],

  termsReviewsTitle: ["6. Reviews", "६. समीक्षा"],
  termsReviewsDesc: [
    "Users may be permitted to review people with whom they have completed work.",
    "प्रयोगकर्तालाई आफूसँग काम सम्पन्न गरेका व्यक्तिको समीक्षा गर्न दिइन सक्छ।",
  ],
  termsReviewsGenuine: [
    "Reviews must reflect genuine experiences. Fake, abusive, discriminatory, threatening, or intentionally misleading reviews may be removed.",
    "समीक्षाले वास्तविक अनुभव झल्काउनुपर्छ। नक्कली, अपमानजनक, भेदभावपूर्ण, धम्कीपूर्ण वा जानीजानी भ्रामक समीक्षा हटाइन सक्छ।",
  ],
  termsReviewsDistinction: [
    "Duleko may distinguish a user's reputation as a worker from their reputation as a hirer.",
    "डुलेकोले प्रयोगकर्ताको कामदारका रूपमा र काम दिनेका रूपमा रहेको प्रतिष्ठालाई छुट्टाछुट्टै देखाउन सक्छ।",
  ],

  termsSafetyTitle: ["7. Safety and Prohibited Conduct", "७. सुरक्षा र निषेधित आचरण"],
  termsSafetyDesc: [
    "Duleko must not be used for fraud, harassment, threats, exploitation, discrimination, illegal activity, misleading representation, or activities that may endanger other users.",
    "डुलेकोलाई ठगी, दुर्व्यवहार, धम्की, शोषण, भेदभाव, गैरकानुनी गतिविधि, भ्रामक प्रस्तुति वा अन्य प्रयोगकर्तालाई खतरामा पार्न सक्ने गतिविधिमा प्रयोग गर्नु हुँदैन।",
  ],
  termsReportSuspicious: [
    "Users should report suspicious or unsafe activity.",
    "शंकास्पद वा असुरक्षित गतिविधिबारे प्रयोगकर्ताले उजुरी गर्नुपर्छ।",
  ],
  termsInvestigate: [
    "Duleko may investigate reports and restrict, suspend, or terminate accounts where reasonably necessary to protect users or the platform.",
    "प्रयोगकर्ता वा प्लेटफर्मको सुरक्षाका लागि उचित रूपमा आवश्यक परेमा डुलेकोले उजुरीको छानबिन गरी खातालाई सीमित, निलम्बन वा बन्द गर्न सक्छ।",
  ],

  // Team member specific translations
  sunilName: ["Sunil K. Chaudhary", "सुनिल के. चौधरी"],
  sunilRole: ["Founder & Product Lead", "संस्थापक र उत्पादन प्रमुख"],
  sunilLocation: ["Kapilvastu, Nepal", "कपिलवस्तु, नेपाल"],
  sunilUniversity: ["Haverford College & University of Oxford", "ह्याभरफोर्ड कलेज र अक्सफोर्ड विश्वविद्यालय"],
  sunilBio: [
    '"What if the opportunity you need is already somewhere around you?"\n\nThat question sits at the heart of Sunil K. Chaudhary\'s journey in building Duleko. Growing up in Kapilvastu, Nepal, he saw people searching for work while, often in the same communities, others struggled to find the right people for the work they needed done. He founded Duleko to bridge that gap and help turn local skills into accessible opportunities.\n\nSunil leads Duleko\'s product vision, strategy, and partnerships. He studies Mathematics and Economics at Haverford College with cross courses at University of Pennsylvania (Wharton), and is spending his junior year studying Mathematics & Economics at the University of Oxford. His experiences across community development, entrepreneurship, and technology-driven initiatives in Nepal and the United States continue to shape Duleko\'s mission: connecting local skills with local opportunities.',
    "\"तपाईंलाई चाहिने अवसर पहिले नै तपाईंकै वरिपरि कतै छ भने?\"\n\nडुलेको निर्माण गर्ने सुनिल के. चौधरीको यात्राको केन्द्रमा यही प्रश्न छ। कपिलवस्तुमा हुर्कँदा उनले एकातिर मानिसहरू काम खोजिरहेको देखे, अर्कातिर प्रायः उही समुदायमा अरूले आफूलाई चाहिने काम गरिदिने उपयुक्त मानिस भेट्न संघर्ष गरिरहेको देखे। यही खाडल पुर्न र स्थानीय सीपलाई सबैको पहुँचमा रहने अवसरमा बदल्न उनले डुलेकोको स्थापना गरे।\n\nसुनिल डुलेकोको उत्पादन दृष्टि, रणनीति र साझेदारीको नेतृत्व गर्छन्। उनी ह्याभरफोर्ड कलेजमा गणित र अर्थशास्त्र अध्ययन गर्दै छन्, साथै युनिभर्सिटी अफ पेन्सिल्भेनिया (व्हार्टन) मा पनि कक्षा लिन्छन् र आफ्नो तेस्रो वर्ष (जुनियर इयर) अक्सफोर्ड विश्वविद्यालयमा गणित र अर्थशास्त्र अध्ययन गर्दै बिताइरहेका छन्। नेपाल र संयुक्त राज्य अमेरिकामा सामुदायिक विकास, उद्यमशीलता र प्रविधिमा आधारित पहलहरूमा उनले बटुलेको अनुभवले डुलेकोको लक्ष्यलाई निरन्तर आकार दिइरहेको छ: स्थानीय सीपलाई स्थानीय अवसरसँग जोड्ने।",
  ],
  sunilSkill1: ["Product Strategy", "उत्पादन रणनीति"],
  sunilSkill2: ["Partnerships", "साझेदारी"],
  sunilSkill3: ["Community Development", "सामुदायिक विकास"],

  sanjayName: ["Sanjay Gupta", "संजय गुप्ता"],
  sanjayRole: ["Tech Lead", "प्राविधिक प्रमुख"],
  sanjayLocation: ["Chitkara University", "चितकारा विश्वविद्यालय"],
  sanjayBio: [
    '"If someone who isn\'t technical can\'t use and understand Duleko, it doesn\'t matter how well I build."\n\nThat\'s the standard Sanjay holds Duleko\'s engineering to. As Tech Lead, he owns the platform end to end, from the web app to the native Android build, the database, and everything that keeps requests, chats, and profiles clear and reliable for people who should never need to think about the tech underneath.\n\nHe\'s a Software Engineer, graduating in 2027 from Chitkara University, and has built Duleko\'s stack from the ground up: a bilingual (English/Nepali) app backed by Supabase, with real-time chat, distance-based search, and a native Android release. At Duleko, Sanjay leads all technical decisions, architecture, infrastructure, and app releases, working hands-on with Sunil and Dipendra to make sure what the community actually needs is what gets built.',
    "\"प्राविधिक ज्ञान नभएको व्यक्तिले डुलेको बुझेर प्रयोग गर्न सकेन भने मैले जतिसुकै राम्रो बनाए पनि त्यसको कुनै अर्थ रहँदैन।\"\n\nसंजयले डुलेकोको इन्जिनियरिङका लागि राखेको मापदण्ड यही हो। प्राविधिक प्रमुखका रूपमा उनी वेब एपदेखि नेटिभ एन्ड्रोइड एप र डाटाबेससम्म पूरै प्लेटफर्म सम्हाल्छन् - अनुरोध, कुराकानी र प्रोफाइललाई स्पष्ट र भरपर्दो बनाउने हरेक कुरा, जसले गर्दा प्रयोगकर्ताले भित्रको प्रविधिबारे कहिल्यै सोच्नु नपरोस्।\n\nउनी सफ्टवेयर इन्जिनियर हुन्, जसले सन् २०२७ मा चितकारा विश्वविद्यालयबाट स्नातक पूरा गर्दै छन्। उनले डुलेकोको सम्पूर्ण प्रविधि सुरुदेखि नै बनाएका हुन्: Supabase मा आधारित द्विभाषिक (अंग्रेजी/नेपाली) एप, तत्कालै चल्ने कुराकानी, दूरीमा आधारित खोज र नेटिभ एन्ड्रोइड एप। डुलेकोमा संजयले सबै प्राविधिक निर्णय, संरचना (आर्किटेक्चर), पूर्वाधार र एप सार्वजनिक गर्ने कामको नेतृत्व गर्छन् र समुदायलाई साँच्चै चाहिने कुरा नै बनोस् भनेर सुनिल र दिपेन्द्रसँग मिलेर काम गर्छन्।",
  ],
  sanjaySkill1: ["Full Stack Development", "फुल स्ट्याक विकास"],
  sanjaySkill2: ["Android Development", "एन्ड्रोइड विकास"],
  sanjaySkill3: ["System Architecture", "प्रणाली संरचना"],

  dipendraName: ["Dipendra Chaudhary", "दिपेन्द्र चौधरी"],
  dipendraRole: ["Community Lead", "समुदाय प्रमुख"],
  dipendraLocation: ["Lumbini Provincial Hospital", "लुम्बिनी प्रादेशिक अस्पताल"],
  dipendraBio: [
    '"How do we make sure that every individual\'s unique skills are recognized and turned into real, local opportunities?"\n\nThat conviction powers Dipendra\'s work as Community & Communications Coordinator at Duleko. He earned his Bachelor of Pharmacy degree (2021) as a Ministry of Education merit scholar from Universal College of Medical Sciences, Tribhuvan University, and has served as a Hospital Pharmacist at Lumbini Provincial Hospital (2022 to present), working closely with healthcare professionals and multidisciplinary teams on research, data management, and public health initiatives.\n\nAt Duleko, Dipendra leads community outreach, user support, product coordination, and social media communications. Drawing on his experience in health research, leadership, and community engagement, he runs educational initiatives to help users navigate the platform, manages direct communication channels, gathers vital user feedback to guide technical improvements, and takes part in core team meetings to shape the platform\'s strategy.',
    "\"हरेक व्यक्तिको आफ्नै खालको सीपलाई पहिचान दिलाएर वास्तविक, स्थानीय अवसरमा कसरी बदल्ने?\"\n\nयही प्रश्नले डुलेकोमा समुदाय तथा सञ्चार संयोजकका रूपमा दिपेन्द्रको कामलाई ऊर्जा दिन्छ। उनले शिक्षा मन्त्रालयको योग्यता छात्रवृत्तिमा त्रिभुवन विश्वविद्यालय अन्तर्गतको युनिभर्सल कलेज अफ मेडिकल साइन्सेजबाट फार्मेसीमा स्नातक (सन् २०२१) गरेका हुन् र सन् २०२२ देखि लुम्बिनी प्रादेशिक अस्पतालमा अस्पताल फार्मासिस्टका रूपमा कार्यरत छन्, जहाँ उनी स्वास्थ्यकर्मी र बहुविषयक टोलीसँग अनुसन्धान, डाटा व्यवस्थापन र जनस्वास्थ्यका पहलहरूमा नजिकबाट काम गर्छन्।\n\nडुलेकोमा दिपेन्द्र सामुदायिक पहुँच, प्रयोगकर्ता सहयोग, उत्पादन समन्वय र सामाजिक सञ्जालमार्फत हुने सञ्चारको नेतृत्व गर्छन्। स्वास्थ्य अनुसन्धान, नेतृत्व र सामुदायिक संलग्नताको अनुभवका आधारमा उनी प्रयोगकर्तालाई प्लेटफर्म चलाउन सिकाउने शैक्षिक कार्यक्रम सञ्चालन गर्छन्, प्रत्यक्ष सञ्चारका माध्यम व्यवस्थापन गर्छन्, प्राविधिक सुधारलाई दिशा दिन प्रयोगकर्ताका महत्त्वपूर्ण सुझाव संकलन गर्छन् र प्लेटफर्मको रणनीति तय गर्न मुख्य टोलीका बैठकमा सहभागी हुन्छन्।",
  ],
  dipendraSkill1: ["Community Outreach", "सामुदायिक पहुँच"],
  dipendraSkill2: ["User Support", "प्रयोगकर्ता सहयोग"],
  dipendraSkill3: ["Communications", "सञ्चार"],
  viewDulekoProfile: ["View Duleko profile →", "डुलेको प्रोफाइल हेर्नुहोस् →"],

  // Quotes for motivation page
  sunilQuote: ["What if the opportunity you need is already somewhere around you?", "तपाईंलाई चाहिने अवसर पहिले नै तपाईंकै वरिपरि कतै छ भने?"],
  sanjayQuote: [
    "If someone who isn't technical can't use and understand Duleko, it doesn't matter how well I build.",
    "प्राविधिक ज्ञान नभएको व्यक्तिले डुलेको बुझेर प्रयोग गर्न सकेन भने मैले जतिसुकै राम्रो बनाए पनि त्यसको कुनै अर्थ रहँदैन।",
  ],
  dipendraQuote: [
    "How do we make sure that every individual's unique skills are recognized and turned into real, local opportunities?",
    "हरेक व्यक्तिको आफ्नै खालको सीपलाई पहिचान दिलाएर वास्तविक, स्थानीय अवसरमा कसरी बदल्ने?",
  ],

  // ---- public website (see i18n-site.ts) -----------------------------
  ...siteStrings,

  // ---- payment details and Duleko's fees (see i18n-payments.ts) -------
  ...paymentStrings,

  // ---- Home and the job board (see i18n-jobs.ts) -----------------------
  ...jobStrings,

  // ---- your own Profile screen (see i18n-profile.ts) -------------------
  ...profileStrings,

  // ---- My Work: lists, steps and the job sheet (see i18n-work.ts) ------
  ...workStrings,

  // ---- mobile number + PIN sign-in (see i18n-auth.ts) ------------------
  ...authStrings,

  // ---- ID checks for the verified badge (see i18n-kyc.ts) --------------
  ...kycStrings,

  // ---- the two-level badge, covers, certificate checks (see i18n-badges.ts)
  ...badgeStrings,

  // ---- work agreed over a phone call (see i18n-calls.ts) ---------------
  ...callStrings,

  // ---- referral codes (see i18n-referral.ts) ---------------------------
  ...referralStrings,
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
  /** Which calendar dates are shown in - BS (Nepal's) unless someone picks AD. */
  calendar: CalendarChoice;
  setCalendar: (calendar: CalendarChoice) => void;
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
  const [calendar, setCalendarState] = useState<CalendarChoice>(storedCalendar);
  // formatDate() and friends read this; set during render so the children
  // rendering right after already see a change.
  setActiveCalendar(calendar);

  useEffect(() => {
    window.localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const toggleLang = useCallback(() => setLangState((l) => (l === "en" ? "ne" : "en")), []);
  const setCalendar = useCallback((next: CalendarChoice) => {
    storeCalendar(next);
    setCalendarState(next);
  }, []);

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

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, toggleLang, calendar, setCalendar, t }),
    [lang, setLang, toggleLang, calendar, setCalendar, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
