/**
 * Copy for ID checks (KYC): the member's Get verified screen, the card on
 * their profile, and the staff queue, in English and Nepali. Merged into
 * the app's string table in i18n.tsx, so it's used the same way: t("kycTitle").
 */
export const kycStrings = {
  // ---- the documents ---------------------------------------------------
  kycDocCitizenship: ["Citizenship certificate", "नागरिकता प्रमाणपत्र"],
  kycDocNationalId: ["National ID card", "राष्ट्रिय परिचयपत्र"],
  kycDocDrivingLicense: ["Driving licence", "सवारी चालक अनुमतिपत्र"],
  kycDocPassport: ["Passport", "राहदानी (पासपोर्ट)"],
  kycFront: ["Front", "अगाडि"],
  kycBack: ["Back", "पछाडि"],
  kycPhotoPage: ["Photo page", "फोटो भएको पाना"],

  // ---- Get verified (/verify) --------------------------------------------
  kycTitle: ["Get verified", "प्रमाणित हुनुहोस्"],
  kycSubtitle: ["Send your ID for the verified badge", "प्रमाणित ब्याजका लागि परिचयपत्र पठाउनुहोस्"],
  kycIntro: [
    "People trust a verified profile more and hire it sooner. Send a photo of your ID and Duleko staff will check it.",
    "प्रमाणित प्रोफाइललाई मानिसहरू बढी विश्वास गर्छन् र छिटो काममा बोलाउँछन्। आफ्नो परिचयपत्रको फोटो पठाउनुहोस्, डुलेकोको टिमले जाँच्नेछ।",
  ],
  kycPrivacy: [
    "Only Duleko staff can see these photos. They are never shown on your profile.",
    "यी फोटो डुलेकोको टिमले मात्र हेर्न सक्छ। तपाईंको प्रोफाइलमा कहिल्यै देखाइँदैन।",
  ],
  kycYourId: ["Your ID", "तपाईंको परिचयपत्र"],
  kycNeedOne: ["Add at least one of these", "यीमध्ये कम्तीमा एउटा थप्नुहोस्"],
  kycHaveOne: ["Done - the others are optional", "पुग्यो - अरू ऐच्छिक हुन्"],
  kycRequiredOne: ["One required", "एउटा आवश्यक"],
  kycOptional: ["Optional", "ऐच्छिक"],
  kycAdded: ["Added", "थपियो"],
  kycBackMissing: ["Back missing", "पछाडिको बाँकी"],
  kycFrontMissing: ["Front missing", "अगाडिको बाँकी"],
  kycAddPhoto: ["Add photo", "फोटो थप्नुहोस्"],
  kycChangePhoto: ["Change photo", "फोटो बदल्नुहोस्"],
  kycRemovePhoto: ["Remove photo", "फोटो हटाउनुहोस्"],
  kycTipsTitle: ["For a quick check", "छिटो जाँचका लागि"],
  kycTipWhole: ["The whole card in the photo, no corners cut off", "पूरै कार्ड फोटोमा, कुनै कुना नकाटिएको"],
  kycTipLight: ["Good light, no glare, every word readable", "राम्रो उज्यालो, टल्केको नहोस्, हरेक अक्षर पढ्न मिल्ने"],
  kycTipName: ["The name must match your profile: {name}", "नाम तपाईंको प्रोफाइलसँग मिल्नुपर्छ: {name}"],
  kycPartial: ["Add the back of your {doc} too, or remove it.", "{doc}को पछाडिको फोटो पनि थप्नुहोस्, वा हटाउनुहोस्।"],
  kycSubmit: ["Send for checking", "जाँचका लागि पठाउनुहोस्"],
  kycUploading: ["Uploading {done} of {total}…", "{total} मध्ये {done} अपलोड हुँदैछ…"],
  kycSent: ["Sent. You'll get an alert once it's checked.", "पठाइयो। जाँच भएपछि सूचना आउनेछ।"],

  kycPendingTitle: ["We're checking your ID", "हामी तपाईंको परिचयपत्र जाँच्दैछौं"],
  kycPendingBody: [
    "Sent {when}. Duleko staff will check it soon, and you'll get an alert either way.",
    "{when} पठाइएको। डुलेकोको टिमले चाँडै जाँच्नेछ, र नतिजाको सूचना आउनेछ।",
  ],
  kycYouSent: ["You sent", "तपाईंले पठाउनुभएको"],
  kycVerifiedTitle: ["You're verified", "तपाईं प्रमाणित हुनुहुन्छ"],
  kycVerifiedBody: [
    "The verified badge shows next to your name. Changing your name later removes it until Duleko checks your ID again.",
    "तपाईंको नाउँ छेउ प्रमाणित ब्याज देखिन्छ। पछि नाम बदल्नुभयो भने डुलेकोले फेरि परिचयपत्र नजाँचुन्जेल ब्याज हट्छ।",
  ],
  kycStaffTitle: ["You're Duleko staff", "तपाईं डुलेकोको टिममा हुनुहुन्छ"],
  kycStaffBody: [
    "Your staff badge already shows you're verified, so you don't need an ID check.",
    "तपाईंको स्टाफ ब्याजले नै तपाईं प्रमाणित भएको देखाउँछ, त्यसैले परिचयपत्र जाँच चाहिँदैन।",
  ],
  kycRejectedTitle: ["Your last ID wasn't accepted", "तपाईंको अघिल्लो परिचयपत्र स्वीकृत भएन"],
  kycRejectedHint: ["Fix this and send it again below.", "यो मिलाएर तल फेरि पठाउनुहोस्।"],
  kycBackToProfile: ["Back to profile", "प्रोफाइलमा फर्कनुहोस्"],

  // ---- why an ID was turned down -----------------------------------------
  // The member reads the sentence; staff pick the short label.
  kycReasonUnclear: ["The photo is blurry or hard to read.", "फोटो धमिलो वा पढ्न गाह्रो छ।"],
  kycReasonNameMismatch: [
    "The name on the document does not match your profile name.",
    "कागजातको नाम तपाईंको प्रोफाइलको नामसँग मिलेन।",
  ],
  kycReasonIncomplete: ["Part of the document is missing or cut off.", "कागजातको केही भाग छुटेको वा काटिएको छ।"],
  kycReasonNotValid: ["This is not an accepted ID, or it has expired.", "यो मान्य परिचयपत्र होइन, वा यसको म्याद सकिएको छ।"],
  kycReasonShortUnclear: ["Blurry or unreadable", "धमिलो वा पढ्न नसकिने"],
  kycReasonShortNameMismatch: ["Name doesn't match", "नाम मिलेन"],
  kycReasonShortIncomplete: ["Part missing", "केही भाग छुट्यो"],
  kycReasonShortNotValid: ["Not valid or expired", "मान्य छैन वा म्याद सकियो"],
  kycReasonShortOther: ["Something else", "अन्य कारण"],

  // ---- the card on your profile -------------------------------------------
  kycCardTitle: ["Get the verified badge", "प्रमाणित ब्याज लिनुहोस्"],
  kycCardBody: [
    "Send a photo of your citizenship, national ID, driving licence or passport.",
    "आफ्नो नागरिकता, राष्ट्रिय परिचयपत्र, सवारी चालक अनुमतिपत्र वा राहदानीको फोटो पठाउनुहोस्।",
  ],
  kycCardPending: ["ID check in progress", "परिचयपत्र जाँच हुँदैछ"],
  kycCardPendingBody: ["Duleko staff will check it soon.", "डुलेकोको टिमले चाँडै जाँच्नेछ।"],
  kycCardRejected: ["ID not accepted", "परिचयपत्र स्वीकृत भएन"],
  kycCardTryAgain: ["Send again", "फेरि पठाउनुहोस्"],
  kycCardView: ["View", "हेर्नुहोस्"],
  kycNameLocked: [
    "Your name was checked against your ID, so it can't be changed here. To change it, contact Duleko.",
    "तपाईंको नाम परिचयपत्रसँग जाँच गरिएको छ, त्यसैले यहाँबाट बदल्न मिल्दैन। बदल्न डुलेकोलाई सम्पर्क गर्नुहोस्।",
  ],
  kycAgeLocked: [
    "Checked against your ID. To change it, contact Duleko.",
    "परिचयपत्रसँग जाँच गरिएको। बदल्न डुलेकोलाई सम्पर्क गर्नुहोस्।",
  ],
  errNameLockedVerified: [
    "Your name is verified from your ID. To change it, contact Duleko.",
    "तपाईंको नाम परिचयपत्रबाट प्रमाणित छ। बदल्न डुलेकोलाई सम्पर्क गर्नुहोस्।",
  ],
  errAgeLockedVerified: [
    "Your age is verified from your ID. To change it, contact Duleko.",
    "तपाईंको उमेर परिचयपत्रबाट प्रमाणित छ। बदल्न डुलेकोलाई सम्पर्क गर्नुहोस्।",
  ],
  kycViewId: ["View ID", "परिचयपत्र हेर्नुहोस्"],
  kycViewIdTitle: ["{name}'s ID", "{name} को परिचयपत्र"],
  kycViewIdNone: ["No approved ID on file for this profile.", "यो प्रोफाइलको स्वीकृत परिचयपत्र छैन।"],

  // ---- staff: ID checks (/staff/verify) -------------------------------------
  kycQueueTitle: ["ID checks", "परिचयपत्र जाँच"],
  kycQueueSubtitle: ["Check each ID, then give the verified badge", "हरेक परिचयपत्र जाँचेर प्रमाणित ब्याज दिनुहोस्"],
  kycQueueWaiting: ["Waiting", "जाँच्न बाँकी"],
  kycQueueHowTo: [
    "Approving gives the verified badge. Approve only when the name matches the profile, the face matches the profile photo, and the ID looks real and readable.",
    "स्वीकृत गर्दा प्रमाणित ब्याज मिल्छ। नाम प्रोफाइलसँग, अनुहार प्रोफाइल फोटोसँग मिलेको र परिचयपत्र सक्कली र पढ्न मिल्ने भए मात्र स्वीकृत गर्नुहोस्।",
  ],
  kycQueueEmpty: ["No IDs waiting. All caught up.", "जाँच्न बाँकी परिचयपत्र छैन।"],
  kycQueueStaffOnly: ["Only Duleko staff can open ID checks.", "परिचयपत्र जाँच डुलेकोको टिमले मात्र खोल्न सक्छ।"],
  kycQueueSent: ["Sent {when}", "{when} पठाइएको"],
  kycQueueNoPhoto: ["No profile photo", "प्रोफाइल फोटो छैन"],
  kycApprove: ["Approve", "स्वीकृत गर्नुहोस्"],
  kycReject: ["Reject", "अस्वीकार"],
  kycRejectTitle: ["Why isn't it accepted?", "किन स्वीकृत भएन?"],
  kycRejectNote: ["Note for the member (optional)", "सदस्यका लागि टिप्पणी (ऐच्छिक)"],
  kycRejectNoteNeeded: ["Note for the member", "सदस्यका लागि टिप्पणी"],
  kycRejectNoteHint: ["They'll read it with the reason above.", "माथिको कारणसँगै उहाँले यो पढ्नुहुनेछ।"],
  kycRejectSend: ["Reject and tell them", "अस्वीकार गरी जानकारी दिनुहोस्"],
  kycApprovedToast: ["Verified. They'll get an alert.", "प्रमाणित भयो। उहाँलाई सूचना जानेछ।"],
  kycRejectedToast: ["Rejected. They'll get an alert with the reason.", "अस्वीकार भयो। कारणसहित सूचना जानेछ।"],
  kycRecent: ["Recently checked", "भर्खरै जाँचिएका"],
  kycRecentEmpty: ["Nothing checked yet.", "अहिलेसम्म केही जाँचिएको छैन।"],
  kycStatusApproved: ["Approved", "स्वीकृत"],
  kycStatusRejected: ["Rejected", "अस्वीकृत"],
  kycCheckedBy: ["{name} · {when}", "{name} · {when}"],
  kycRotate: ["Rotate", "घुमाउनुहोस्"],
  kycOpenFull: ["Open full size", "पूरा आकारमा खोल्नुहोस्"],
  kycPhotoMissing: ["Photo not loaded", "फोटो खुलेन"],
  kycProfilePhoto: ["Profile photo", "प्रोफाइल फोटो"],
  kycWaitingCount: ["{count} waiting", "{count} बाँकी"],

  // ---- errors from submit_kyc / review_kyc ------------------------------------
  errKycPending: ["Your ID is already being checked.", "तपाईंको परिचयपत्र जाँच भइरहेको छ।"],
  errKycAlreadyVerified: ["You're already verified.", "तपाईं पहिल्यै प्रमाणित हुनुहुन्छ।"],
  errKycStaff: ["Staff don't need an ID check.", "स्टाफलाई परिचयपत्र जाँच चाहिँदैन।"],
  errKycDocumentRequired: ["Add at least one ID.", "कम्तीमा एउटा परिचयपत्र थप्नुहोस्।"],
  errKycBackRequired: ["Add both sides of the card.", "कार्डको दुवै पट्टिको फोटो थप्नुहोस्।"],
  errKycPhotos: ["Something went wrong with the photos. Please add them again.", "फोटोमा केही समस्या भयो। कृपया फेरि थप्नुहोस्।"],
  errKycAlreadyReviewed: ["Someone already checked this ID.", "यो परिचयपत्र कसैले जाँचिसक्नुभयो।"],
  errKycReasonRequired: ["Write a note so they know what to fix.", "के मिलाउनुपर्छ भनेर टिप्पणी लेख्नुहोस्।"],
} as const;
