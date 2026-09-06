import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Lang } from "./types";

/**
 * Every user-visible string lives here, in English and Nepali.
 * Placeholders use {name} and are filled via t("key", { name: "..." }).
 */
const strings = {
  // ---- generic -------------------------------------------------------
  appName: ["Duleko", "दुलेको"],
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
  showLess: ["Show less", "कम देखाउनुहोस्"],
  somethingWrong: ["Something went wrong.", "केही गडबड भयो।"],
  noInternet: ["Check your internet connection.", "इन्टरनेट जडान जाँच्नुहोस्।"],
  confirm: ["Confirm", "पुष्टि गर्नुहोस्"],
  yes: ["Yes", "हो"],
  no: ["No", "होइन"],

  // ---- auth ----------------------------------------------------------
  signIn: ["Sign in", "लगइन गर्नुहोस्"],
  signUp: ["Create account", "खाता खोल्नुहोस्"],
  signOut: ["Sign out", "लगआउट"],
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
  authWelcome: ["Welcome to Duleko", "दुलेकोमा स्वागत छ"],
  authBlurb: [
    "A simple way for workers and employers in your area to find each other.",
    "तपाईंको क्षेत्रका कामदार र काम दिने बीच सजिलो भेटघाट।",
  ],

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
  availableToday: ["Available today", "आज उपलब्ध"],
  nearYou: ["Near you", "तपाईंको नजिक"],
  noWorkersYet: ["No workers here yet.", "यहाँ अझै कामदार छैनन्।"],
  noWorkersHint: [
    "Be the first — add your skills so people can find you.",
    "पहिलो बन्नुहोस् — सीप थप्नुहोस् ताकि मानिसले भेटून्।",
  ],
  yourWorkToday: ["Your work", "तपाईंको काम"],
  pendingRequests: ["{count} waiting for you", "{count} तपाईंको जवाफ पर्खिरहेको"],

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
  newProfile: ["New on Duleko", "दुलेकोमा नयाँ"],
  requestWork: ["Request work", "काम अनुरोध गर्नुहोस्"],
  callNow: ["Call", "फोन गर्नुहोस्"],
  phoneHidden: [
    "Phone number appears once the worker accepts.",
    "कामदारले स्वीकार गरेपछि फोन नम्बर देखिन्छ।",
  ],
  chat: ["Chat", "कुराकानी"],
  chatHidden: [
    "Chat opens once the worker accepts.",
    "कामदारले स्वीकार गरेपछि कुराकानी खुल्छ।",
  ],
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
  ratingSummary: ["{rating} ({count} reviews)", "{rating} ({count} समीक्षा)"],
  availableNow: ["Available", "उपलब्ध"],
  notAvailable: ["Not available", "उपलब्ध छैन"],
  bookedDay: ["Booked", "बुक भइसकेको"],
  report: ["Report", "उजुरी"],

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
  locationNotShared: ["Not shared yet", "अझै साझा गरिएको छैन"],
  shareLocationHint: [
    "Useful for drivers and delivery — lets nearby people find you. Optional.",
    "चालक र डेलिभरीका लागि उपयोगी — नजिकैका मानिसले भेट्टाउन सक्छन्। वैकल्पिक।",
  ],
  locationPermissionDenied: [
    "Could not get your location. Check your browser's location permission.",
    "स्थान लिन सकिएन। ब्राउजरको लोकेसन अनुमति जाँच्नुहोस्।",
  ],
  nearestSort: ["Nearest", "सबैभन्दा नजिक"],
  distanceAway: ["{km} km away", "{km} कि.मी. टाढा"],

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
    "Optional — your usual price for this skill.",
    "वैकल्पिक — यो सीपको लागि तपाईंको सामान्य मूल्य।",
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
  statusPending: ["Waiting", "पर्खाइमा"],
  statusAccepted: ["Accepted", "स्वीकृत"],
  statusDeclined: ["Declined", "अस्वीकृत"],
  statusConfirmed: ["Confirmed", "पक्का"],
  statusCompleted: ["Completed", "सम्पन्न"],
  statusCancelled: ["Cancelled", "रद्द"],
  accept: ["Accept", "स्वीकार गर्नुहोस्"],
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
  noNotifications: ["No notifications.", "कुनै सूचना छैन।"],

  // ---- profile / settings --------------------------------------------
  myProfile: ["My profile", "मेरो प्रोफाइल"],
  editProfile: ["Edit profile", "प्रोफाइल सम्पादन"],
  settings: ["Settings", "सेटिङ"],
  language: ["Language", "भाषा"],
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
  noAboutYetOther: ["Hasn't added a bio yet.", "अझै चिनारी थपेका छैनन्।"],

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
  iAgreeToThe: ["I agree to Duleko's", "म दुलेकोको"],
  termsOfService: ["Terms of Service", "सेवाका सर्तहरू"],
  privacyPolicy: ["Privacy Policy", "गोपनीयता नीति"],
  mustAgreeToPolicies: [
    "Please agree to the Terms of Service and Privacy Policy to continue.",
    "जारी राख्न कृपया सेवाका सर्तहरू र गोपनीयता नीतिमा सहमत हुनुहोस्।",
  ],

  // ---- welcome walkthrough ----------------------------------------------
  skip: ["Skip", "छोड्नुहोस्"],
  getStarted: ["Get started", "सुरु गर्नुहोस्"],
  welcomeBack: ["Welcome back, {name}!", "फेरि स्वागत छ, {name}!"],
  walkthroughTitle1: ["Find skilled people nearby", "नजिकैका सिपालु मानिस भेट्टाउनुहोस्"],
  walkthroughBody1: [
    "Browse by skill or search to find workers near you, sorted by distance.",
    "सिप अनुसार हेर्नुहोस् वा खोज्नुहोस् — दूरी अनुसार क्रमबद्ध नजिकैका कामदार भेट्टाउनुहोस्।",
  ],
  walkthroughTitle2: ["Request work in a tap", "एक ट्यापमा काम अनुरोध गर्नुहोस्"],
  walkthroughBody2: [
    "Describe the job, pick a free date, and send a request — no need to pick a specific skill.",
    "कामको विवरण दिनुहोस्, खाली मिति छान्नुहोस्, र अनुरोध पठाउनुहोस् — कुनै खास सिप छान्नु पर्दैन।",
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
  acceptAtPrice: ["Accept — {amount}", "स्वीकार — {amount}"],
  waitingForCounter: [
    "Waiting for {name} to respond to your offer of {amount}.",
    "{name} ले तपाईंको {amount} प्रस्तावको जवाफ दिन पर्खँदै।",
  ],
  offerFromParty: ["{name} offered {amount}.", "{name} ले {amount} प्रस्ताव गर्नुभयो।"],
  counterOffer: ["Counter-offer", "जवाफी प्रस्ताव"],
  submitCounter: ["Send offer", "प्रस्ताव पठाउनुहोस्"],
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

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

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
