/**
 * Copy for signing in with a mobile number and a PIN (migration 6000), in
 * English and Nepali. Merged into the app's string table in i18n.tsx, so
 * it's used the same way: t("authPinLabel").
 */
export const authStrings = {
  // ---- the sign-in / create-account screen ------------------------------
  authPhoneLabel: ["Mobile number", "मोबाइल नम्बर"],
  authPhoneSignUpHint: [
    "You'll sign in with this number. Others can't see it until you accept or confirm a job.",
    "तपाईं यही नम्बरले लगइन गर्नुहुनेछ। काम स्वीकार वा पक्का नभएसम्म अरूले देख्दैनन्।",
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
  authPinCreate: ["Choose a 6-digit PIN", "६ अंकको पिन बनाउनुहोस्"],
  authPinCreateHint: [
    "You'll need it with your number to sign in. Don't share it with anyone.",
    "लगइन गर्दा नम्बरसँगै यही पिन चाहिन्छ। कसैलाई नभन्नुहोस्।",
  ],
  authPinConfirm: ["Enter the PIN again", "पिन फेरि हाल्नुहोस्"],
  authPinIncomplete: ["Enter all 6 digits of the PIN.", "पिनका सबै ६ अंक हाल्नुहोस्।"],
  authPinsDontMatch: ["The PINs don't match.", "पिन मिलेन।"],
  authPinWeak: [
    "That PIN is too easy to guess. Avoid ones like 111111 or 123456.",
    "यो पिन अनुमान गर्न धेरै सजिलो छ। 111111 वा 123456 जस्तो नराख्नुहोस्।",
  ],
  authPinShow: ["Show PIN", "पिन देखाउनुहोस्"],
  authPinHide: ["Hide PIN", "पिन लुकाउनुहोस्"],
  authPinDigit: ["PIN digit {n}", "पिनको अंक {n}"],
  authWrongPhoneOrPin: ["Wrong mobile number or PIN.", "गलत मोबाइल नम्बर वा पिन।"],
  authPhoneOff: [
    "Mobile number sign-in isn't switched on yet. Use email or Google for now.",
    "मोबाइल नम्बरबाट लगइन अहिलेसम्म खुलेको छैन। अहिलेलाई इमेल वा Google प्रयोग गर्नुहोस्।",
  ],
  authUseEmail: ["Continue with email", "इमेलबाट जारी राख्नुहोस्"],
  authUsePhone: ["Continue with mobile number", "मोबाइल नम्बरबाट जारी राख्नुहोस्"],

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
  pinSameAsOld: ["Choose a PIN different from your current one.", "हालको भन्दा फरक पिन छान्नुहोस्।"],
  pinChanged: ["PIN changed.", "पिन बदलियो।"],
  wrongPin: ["That PIN is wrong.", "त्यो पिन गलत छ।"],
  deleteAccountPinLabel: ["Enter your PIN to confirm", "पुष्टि गर्न आफ्नो पिन हाल्नुहोस्"],
} as const;
