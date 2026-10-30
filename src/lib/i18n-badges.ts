/**
 * Copy for the two-level badge, Duleko's profile covers and certificate
 * checks (8300), in English and Nepali. Merged into the app's string table
 * in i18n.tsx, so it's used the same way: t("fullyVerifiedLabel").
 */
export const badgeStrings = {
  // ---- the badge and the cover -------------------------------------------
  fullyVerifiedLabel: ["Fully verified", "पूर्ण प्रमाणित"],
  halfVerifiedLabel: ["Half verified", "आंशिक प्रमाणित"],
  coverDulekoTeam: ["Duleko team", "डुलेको टोली"],
  coverNotVerified: ["Not verified yet", "अझै प्रमाणित छैन"],
  coverTopSkill: ["Top skill", "मुख्य सीप"],
  coverRole: ["Role", "भूमिका"],

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
