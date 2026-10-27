/**
 * Copy for signing in with a mobile number and a PIN (migration 6000), in
 * English and Nepali. Merged into the app's string table in i18n.tsx, so
 * it's used the same way: t("authPinLabel").
 */
export const authStrings = {
  // ---- the sign-in / create-account screen ------------------------------
  authPhoneLabel: ["Mobile number", "मोबाइल नम्बर"],
  authPhoneSignUpHint: [
    "Hidden from others until you agree on a job.",
    "काम पक्का नभएसम्म अरूले देख्दैनन्।",
  ],
  authPhoneInvalid: [
    "Enter a 10-digit Nepali mobile number, like 98XXXXXXXX.",
    "98XXXXXXXX जस्तो १० अंकको नेपाली मोबाइल नम्बर लेख्नुहोस्।",
  ],
  authPhoneTaken: [
    "This number already has a Duleko account. Sign in instead.",
    "यो नम्बरमा पहिले नै डुलेको खाता छ। बरु लगइन गर्नुहोस्।",
  ],
  authPinLabel: ["PIN", "पिन"],
  authPinCreate: ["Choose a 4-digit PIN", "४ अंकको पिन बनाउनुहोस्"],
  authPinCreateHint: [
    "You'll sign in with your number and this PIN. Keep it to yourself.",
    "नम्बर र यही पिनले लगइन गर्नुहुनेछ। कसैलाई नभन्नुहोस्।",
  ],
  authPinConfirm: ["Enter the PIN again", "पिन फेरि हाल्नुहोस्"],
  authPinIncomplete: ["Enter every digit of the PIN.", "पिनका सबै अंक हाल्नुहोस्।"],
  authPinsDontMatch: ["The PINs don't match.", "पिन मिलेन।"],
  authPinWeak: [
    "That PIN is too easy to guess. Avoid ones like 1111 or 1234.",
    "यो पिन अनुमान गर्न धेरै सजिलो छ। 1111 वा 1234 जस्तो नराख्नुहोस्।",
  ],
  authPinShow: ["Show PIN", "पिन देखाउनुहोस्"],
  authPinHide: ["Hide PIN", "पिन लुकाउनुहोस्"],
  authPinDigit: ["PIN digit {n}", "पिनको अंक {n}"],
  authWrongPhoneOrPin: ["Wrong mobile number or PIN.", "गलत मोबाइल नम्बर वा पिन।"],
  authPinLocked: [
    "Too many wrong PINs. Try again in {minutes} minutes.",
    "धेरै पटक गलत पिन हालियो। {minutes} मिनेटपछि फेरि प्रयास गर्नुहोस्।",
  ],
  authPinOld: ["Enter your 6-digit PIN", "आफ्नो ६ अंकको पिन हाल्नुहोस्"],
  authPhoneOff: [
    "Mobile number sign-in isn't switched on yet. Use email or Google for now.",
    "मोबाइल नम्बरबाट लगइन अहिलेसम्म खुलेको छैन। अहिलेलाई इमेल वा Google प्रयोग गर्नुहोस्।",
  ],
  authUseEmail: ["Continue with email", "इमेलबाट जारी राख्नुहोस्"],
  authUsePhoneShort: ["Mobile number", "मोबाइल नम्बर"],
  authUseEmailShort: ["Email", "इमेल"],

  // ---- the screen's frame ----------------------------------------------
  authSignInTitle: ["Welcome back", "फेरि स्वागत छ"],
  authSignInBlurb: ["Sign in to your Duleko account.", "आफ्नो डुलेको खातामा लगइन गर्नुहोस्।"],
  authSignUpTitle: ["Create your account", "आफ्नो खाता खोल्नुहोस्"],
  authSignUpBlurb: ["It's free and takes about a minute.", "निःशुल्क छ, करिब एक मिनेट लाग्छ।"],
  authNewHere: ["New to Duleko?", "डुलेकोमा नयाँ हुनुहुन्छ?"],
  authCreateOne: ["Create an account", "खाता खोल्नुहोस्"],
  authHaveAccount: ["Already have an account?", "पहिले नै खाता छ?"],
  authMethodLabel: ["Continue with", "यसबाट जारी राख्नुहोस्"],
  authStepOf: ["Step {n} of 3", "चरण {n} / ३"],
  authStepEmail: ["Email", "इमेल"],
  authStepCode: ["Code", "कोड"],
  authStepPassword: ["Password", "पासवर्ड"],
  authBrandTitle: ["Find work and workers near you.", "नजिकै काम र कामदार भेट्टाउनुहोस्।"],
  authBrandPoint1: ["Workers and employers from your own area", "तपाईंकै क्षेत्रका कामदार र काम दिनेहरू"],
  authBrandPoint2: [
    "Your number stays hidden until you agree on a job",
    "काम पक्का नभएसम्म तपाईंको नम्बर लुकेको रहन्छ",
  ],
  authBrandPoint3: ["Use it in Nepali or English", "नेपाली वा अंग्रेजी, जुन सजिलो लाग्छ"],

  // ---- email: a 4-digit code, then a password (migration 8100) ----------
  authContinue: ["Continue", "जारी राख्नुहोस्"],
  authEmailCodeHint: [
    "We'll email you a 4-digit code to check it's yours.",
    "यो तपाईंकै हो भनी जाँच्न हामी ४ अंकको कोड इमेल गर्नेछौं।",
  ],
  authCodeTitle: ["Check your email", "आफ्नो इमेल हेर्नुहोस्"],
  authCodeBlurb: ["Enter the 4-digit code we sent to {email}", "{email} मा पठाएको ४ अंकको कोड हाल्नुहोस्"],
  authCodeSpam: ["Can't find it? Look in Spam too.", "भेटिएन? Spam मा पनि हेर्नुहोस्।"],
  authEmailInvalid: ["Enter a valid email address.", "सही इमेल ठेगाना लेख्नुहोस्।"],
  authEmailTaken: [
    "This email already has an account. Sign in instead.",
    "यो इमेलमा पहिले नै खाता छ। बरु लगइन गर्नुहोस्।",
  ],
  authNoAccount: ["No Duleko account uses this email.", "यो इमेलमा डुलेको खाता छैन।"],
  authCodeWrong: ["That code is wrong. {left} tries left.", "कोड मिलेन। अझै {left} पटक प्रयास गर्न सकिन्छ।"],
  authCodeExpired: [
    "That code no longer works. Ask for a new one.",
    "यो कोड अब चल्दैन। नयाँ कोड माग्नुहोस्।",
  ],
  authCodeLocked: [
    "Too many wrong codes for this email. Try again tomorrow.",
    "यो इमेलमा धेरै पटक गलत कोड हालियो। भोलि फेरि प्रयास गर्नुहोस्।",
  ],
  authCodeTooSoon: ["Wait {wait} seconds for another code.", "अर्को कोडका लागि {wait} सेकेन्ड पर्खनुहोस्।"],
  authCodeTooMany: [
    "Too many codes for this email. Try again in an hour.",
    "यो इमेलमा धेरै कोड पठाइयो। एक घण्टापछि फेरि प्रयास गर्नुहोस्।",
  ],
  authEmailBusy: [
    "Lots of people are joining right now. Try again in a few minutes.",
    "अहिले धेरै जना जोडिँदै हुनुहुन्छ। केही मिनेटपछि फेरि प्रयास गर्नुहोस्।",
  ],
  authEmailLimit: [
    "We can't send more emails today. Use your mobile number or Google instead.",
    "आज थप इमेल पठाउन सकिँदैन। बरु मोबाइल नम्बर वा Google प्रयोग गर्नुहोस्।",
  ],
  authEmailFailed: [
    "The email didn't go. Check the address and try again.",
    "इमेल गएन। ठेगाना जाँचेर फेरि प्रयास गर्नुहोस्।",
  ],
  authPasswordTitle: ["Create your password", "आफ्नो पासवर्ड बनाउनुहोस्"],
  authPasswordBlurb: [
    "Your email is verified. You'll sign in with it and this password.",
    "तपाईंको इमेल पुष्टि भयो। यही इमेल र पासवर्डले लगइन गर्नुहुनेछ।",
  ],
  authNewPasswordBlurb: ["Choose a new password for {email}", "{email} का लागि नयाँ पासवर्ड छान्नुहोस्"],
  authPasswordSave: ["Save and continue", "सेभ गरेर जारी राख्नुहोस्"],
  authAgreeShort: ["I'm 18 or older and agree to Duleko's rules.", "म १८ वर्ष वा माथिको हुँ र डुलेकोका नियममा सहमत छु।"],
  authRegistrationRules: ["Registration rules", "दर्ता नियम"],
  authUsePhone: ["Continue with mobile number", "मोबाइल नम्बरबाट जारी राख्नुहोस्"],

  // ---- back from Google in the Android app (google-sign-in.ts) ---------
  authGoogleCancelled: ["Google sign-in was cancelled.", "Google बाट लगइन रद्द भयो।"],
  authGoogleFailed: [
    "Google sign-in didn't finish. Please try again.",
    "Google बाट लगइन पूरा भएन। कृपया फेरि प्रयास गर्नुहोस्।",
  ],

  // ---- forgot PIN: no SMS yet, so staff reset it ------------------------
  authForgotPin: ["Forgot PIN?", "पिन बिर्सनुभयो?"],
  authForgotPinTitle: ["Forgot your PIN?", "पिन बिर्सनुभयो?"],
  authForgotPinBody: [
    "Duleko doesn't send SMS codes yet, so only the Duleko team can reset a PIN. Email us your name and the mobile number on your account. We'll check it's you and set a new PIN.",
    "डुलेकोले अहिले SMS कोड पठाउँदैन, त्यसैले पिन डुलेको टोलीले मात्र रिसेट गर्न सक्छ। आफ्नो नाम र खाताको मोबाइल नम्बर लेखेर हामीलाई इमेल गर्नुहोस्। तपाईं नै हो भनी जाँचेर हामी नयाँ पिन राखिदिनेछौं।",
  ],
  authForgotPinEmail: ["Email Duleko", "डुलेकोलाई इमेल गर्नुहोस्"],
  authForgotPinSubject: ["Reset my Duleko PIN", "मेरो डुलेको पिन रिसेट गर्नुहोस्"],

  // ---- onboarding and settings -----------------------------------------
  onboardPhoneLocked: [
    "The number you sign in with. Hidden until you accept or confirm a job.",
    "तपाईं लगइन गर्ने नम्बर। काम स्वीकार वा पक्का नभएसम्म लुकाइन्छ।",
  ],
  changePin: ["Change PIN", "पिन बदल्नुहोस्"],
  changePinHint: ["You sign in with {phone} and your PIN.", "तपाईं {phone} र पिनले लगइन गर्नुहुन्छ।"],
  currentPin: ["Current PIN", "हालको पिन"],
  newPin: ["New PIN", "नयाँ पिन"],
  newPinAgain: ["New PIN again", "नयाँ पिन फेरि"],
  pinSameAsOld: ["Choose a PIN different from your current one.", "हालकोभन्दा फरक पिन छान्नुहोस्।"],
  pinChanged: ["PIN changed.", "पिन बदलियो।"],
  pinUpgradeHint: ["Your new PIN will have 4 digits.", "तपाईंको नयाँ पिन ४ अंकको हुनेछ।"],
  addPin: ["Add mobile number + PIN", "मोबाइल नम्बर + पिन थप्नुहोस्"],
  addPinHint: [
    "Another way to sign in: your number and a 4-digit PIN.",
    "लगइन गर्ने अर्को तरिका: तपाईंको नम्बर र ४ अंकको पिन।",
  ],
  pinAdded: [
    "Done. You can now sign in with your number and PIN too.",
    "भयो। अब तपाईं नम्बर र पिनले पनि लगइन गर्न सक्नुहुन्छ।",
  ],
  wrongPin: ["That PIN is wrong.", "त्यो पिन गलत छ।"],
  deleteAccountPinLabel: ["Enter your PIN to confirm", "पुष्टि गर्न आफ्नो पिन हाल्नुहोस्"],
} as const;
