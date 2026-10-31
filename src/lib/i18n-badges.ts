/**
 * Copy for the two-level badge, Duleko's profile covers and certificate
 * checks (8300), in English and Nepali. Merged into the app's string table
 * in i18n.tsx, so it's used the same way: t("fullyVerifiedLabel").
 */
export const badgeStrings = {
  // ---- the badge and the cover -------------------------------------------
  fullyVerifiedLabel: ["Fully verified", "पूर्ण प्रमाणित"],
  halfVerifiedLabel: ["Half verified", "आंशिक प्रमाणित"],
  coverDulekoTeam: ["Duleko staff", "डुलेको स्टाफ"],
  coverNotVerified: ["Not verified yet", "अझै प्रमाणित छैन"],
  coverTopSkill: ["Top skill", "मुख्य सीप"],
  coverRole: ["Role", "भूमिका"],
  coverVerifiedSkills: ["Verified skills", "प्रमाणित सीप"],

  // ---- Skills and badge (/skills, and /worker/…/skills read-only) ---------------
  skillsPageTitle: ["Skills and badge", "सीप र ब्याज"],
  skillsPageMine: ["Your skills, and what Duleko has checked", "तपाईंका सीप र डुलेकोले जाँचेका कुरा"],
  skillsBadgeHow: ["What the badge means", "ब्याजको अर्थ"],
  skillsChecked: ["{count} of {total} checked by Duleko", "{total} मध्ये {count} डुलेकोले जाँचेको"],
  skillsEdit: ["Add or change skills", "सीप थप्नुहोस् वा बदल्नुहोस्"],
  skillsVerify: ["Verify", "प्रमाणित गर्नुहोस्"],
  skillsVerifyAria: ["Verify {skill}", "{skill} प्रमाणित गर्नुहोस्"],
  skillsStepIdOther: ["ID checked by Duleko", "डुलेकोले परिचयपत्र जाँचेको"],
  skillsStepSkillOther: ["A skill certificate checked by Duleko", "डुलेकोले सीपको प्रमाणपत्र जाँचेको"],
  coverOpenSkill: ["See {skill} and the other skills", "{skill} र अन्य सीप हेर्नुहोस्"],

  // ---- certificates on your profile -----------------------------------------
  certSkillLabel: ["Which skill does it prove?", "यसले कुन सीप प्रमाणित गर्छ?"],
  certNeedSkill: ["Add a skill first, then a certificate for it.", "पहिले सीप थप्नुहोस्, त्यसपछि त्यसको प्रमाणपत्र।"],
  certCheckHint: [
    "Duleko staff check every certificate. Once approved, your skill is verified.",
    "डुलेकोको टोलीले हरेक प्रमाणपत्र जाँच्छ। स्वीकृत भएपछि तपाईंको सीप प्रमाणित हुन्छ।",
  ],
  certStatusPending: ["Being checked", "जाँच हुँदैछ"],
  certStatusApproved: ["Checked by Duleko", "डुलेकोले जाँचेको"],
  certStatusRejected: ["Not accepted", "स्वीकृत भएन"],

  // ---- why a certificate was turned down -------------------------------------
  certReasonNameMismatch: [
    "The name on the certificate does not match your profile name.",
    "प्रमाणपत्रको नाम तपाईंको प्रोफाइलको नामसँग मिलेन।",
  ],
  certReasonNotValid: ["This is not a valid certificate for your skill.", "यो तपाईंको सीपको मान्य प्रमाणपत्र होइन।"],
  certReasonShortNotValid: ["Not a valid certificate", "मान्य प्रमाणपत्र होइन"],

  // ---- Get verified (/verify): the two steps ------------------------------------
  verifyLevelsTitle: ["Two steps to the green badge", "हरियो ब्याजका लागि दुई चरण"],
  verifyLevelsBody: [
    "One of the two gives the orange badge. Both give the green badge.",
    "दुईमध्ये एउटाले सुन्तला ब्याज, दुवैले हरियो ब्याज दिन्छ।",
  ],
  verifyStepId: ["Your ID", "तपाईंको परिचयपत्र"],
  verifyStepSkill: ["A skill certificate", "सीपको प्रमाणपत्र"],
  verifyStepDone: ["Done", "भयो"],
  verifyStepWaiting: ["Being checked", "जाँच हुँदैछ"],
  verifyStepTodo: ["Not yet", "अझै बाँकी"],
  verifySkillTitle: ["Verify a skill", "सीप प्रमाणित गर्नुहोस्"],
  verifySkillBody: [
    "Add a certificate for one of your skills - a training certificate, licence or diploma. Duleko staff will check it.",
    "आफ्नो कुनै सीपको प्रमाणपत्र थप्नुहोस् - तालिमको प्रमाणपत्र, अनुमतिपत्र वा डिप्लोमा। डुलेकोको टोलीले जाँच्नेछ।",
  ],
  verifySkillAdd: ["Add a certificate", "प्रमाणपत्र थप्नुहोस्"],
  verifySkillDone: ["Verified: {skills}", "प्रमाणित: {skills}"],

  // ---- Get verified: the two buttons, and the certification step ------------------
  verifyChooseIdTitle: ["ID check (KYC)", "परिचयपत्र जाँच (KYC)"],
  verifyChooseIdBody: [
    "Send a photo of your national ID card, or another ID",
    "आफ्नो राष्ट्रिय परिचयपत्र वा अर्को परिचयपत्रको फोटो पठाउनुहोस्",
  ],
  verifyChooseCertTitle: ["Duleko certification", "डुलेको प्रमाणीकरण"],
  verifyChooseCertBody: [
    "Send certificates that show your skills, up to five",
    "आफ्नो सीप देखाउने प्रमाणपत्र पठाउनुहोस्, बढीमा पाँचवटा",
  ],
  verifyIdHeader: ["Send your ID for the verified badge", "प्रमाणित ब्याजका लागि परिचयपत्र पठाउनुहोस्"],
  verifyCertHeader: ["Certificates that show your skills", "तपाईंको सीप देखाउने प्रमाणपत्र"],
  verifyStart: ["Start", "सुरु गर्नुहोस्"],
  verifyOpen: ["Open", "खोल्नुहोस्"],
  verifyBackToChoices: ["Both verification steps", "प्रमाणीकरणका दुवै चरण"],
  kycDocRecommended: ["Recommended", "सिफारिस गरिएको"],

  certStepYours: ["Your certificates", "तपाईंका प्रमाणपत्र"],
  certStepCount: ["{count} of 5", "५ मध्ये {count}"],
  certStepAddTitle: ["Add certificates", "प्रमाणपत्र थप्नुहोस्"],
  certStepAddBody: [
    "One photo per certificate - a training certificate, licence or diploma - and the skill it shows. Up to {count} more.",
    "हरेक प्रमाणपत्रको एउटा फोटो - तालिमको प्रमाणपत्र, अनुमतिपत्र वा डिप्लोमा - र त्यसले देखाउने सीप। अझै {count}वटासम्म।",
  ],
  certStepItem: ["Certificate {n}", "प्रमाणपत्र {n}"],
  certStepRemove: ["Remove this certificate", "यो प्रमाणपत्र हटाउनुहोस्"],
  certStepPhoto: ["Photo or PDF", "फोटो वा PDF"],
  certStepName: ["Name of the certificate (optional)", "प्रमाणपत्रको नाम (वैकल्पिक)"],
  certStepAddAnother: ["Add another certificate", "अर्को प्रमाणपत्र थप्नुहोस्"],
  certStepSend: ["Send for checking", "जाँचका लागि पठाउनुहोस्"],
  certStepSent: ["Sent. You'll get an alert once each one is checked.", "पठाइयो। हरेक जाँच भएपछि सूचना आउनेछ।"],
  certStepFull: [
    "You have five certificates. Remove one on your profile to add another.",
    "तपाईंसँग पाँचवटा प्रमाणपत्र छन्। अर्को थप्न प्रोफाइलबाट एउटा हटाउनुहोस्।",
  ],
  certStepNeedSkill: [
    "Add your skills to your profile first, then a certificate for each.",
    "पहिले प्रोफाइलमा आफ्नो सीप थप्नुहोस्, त्यसपछि हरेकको प्रमाणपत्र।",
  ],
  certStepAddSkills: ["Add skills", "सीप थप्नुहोस्"],
  certStepMissing: ["Each certificate needs a photo and a skill.", "हरेक प्रमाणपत्रमा फोटो र सीप चाहिन्छ।"],
  certStepUploadFailed: [
    "{done} sent. The rest didn't go through: {reason}",
    "{done}वटा पठाइयो। बाँकी पठाउन सकिएन: {reason}",
  ],
  errCertLimit: [
    "A profile holds at most five certificates. Remove one to add another.",
    "एउटा प्रोफाइलमा बढीमा पाँचवटा प्रमाणपत्र राख्न मिल्छ। अर्को थप्न एउटा हटाउनुहोस्।",
  ],

  // ---- staff: certificate checks ------------------------------------------------
  checksTabIds: ["IDs", "परिचयपत्र"],
  checksTabCertificates: ["Certificates", "प्रमाणपत्र"],
  certQueueHowTo: [
    "Approving verifies the skill you pick. Approve only when the certificate looks real, is readable, carries the member's name and fits that skill.",
    "स्वीकृत गर्दा तपाईंले छानेको सीप प्रमाणित हुन्छ। प्रमाणपत्र सक्कली, पढ्न मिल्ने, सदस्यकै नाममा र त्यही सीपको भए मात्र स्वीकृत गर्नुहोस्।",
  ],
  certQueueEmpty: ["No certificates waiting. All caught up.", "जाँच्न बाँकी कुनै प्रमाणपत्र छैन। सबै जाँचिसकियो।"],
  certQueuePickSkill: ["The skill it proves", "यसले प्रमाणित गर्ने सीप"],
  certQueueNoSkills: [
    "This member lists no skills, so it can't be approved yet.",
    "यो सदस्यले कुनै सीप राख्नुभएको छैन, त्यसैले अहिले स्वीकृत गर्न मिल्दैन।",
  ],
  certQueueOpen: ["Open certificate", "प्रमाणपत्र खोल्नुहोस्"],
  certApprovedToast: ["Skill verified. They'll get an alert.", "सीप प्रमाणित भयो। उहाँलाई सूचना जानेछ।"],

  // ---- errors from the certificate checks ------------------------------------------
  errCertSkillNotListed: ["Pick one of the skills on the profile.", "प्रोफाइलमा भएकै सीपमध्ये एउटा छान्नुहोस्।"],
  errCertSkillRequired: ["Pick the skill this certificate proves.", "यो प्रमाणपत्रले प्रमाणित गर्ने सीप छान्नुहोस्।"],
  errCertAlreadyReviewed: ["Someone already checked this certificate.", "यो प्रमाणपत्र कसैले जाँचिसक्नुभयो।"],
} as const;
