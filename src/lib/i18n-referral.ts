/**
 * Copy for referral codes (7900) - the invite card in Settings, the code
 * field while creating a profile, and its messages - in English and
 * Nepali. Merged into the app's string table in i18n.tsx.
 */
export const referralStrings = {
  referralInvite: ["Invite friends", "साथीलाई निम्तो दिनुहोस्"],
  referralInviteHint: [
    "You and each friend who joins get 1 free job",
    "तपाईं र जोडिने हरेक साथीले १ निःशुल्क काम पाउनुहुन्छ",
  ],
  referralYourCode: ["Your referral code", "तपाईंको रेफरल कोड"],
  referralHow: [
    "When a friend joins Duleko with your code, you both get one job with no Duleko fee. You get one for every friend who joins.",
    "साथी तपाईंको कोड हालेर डुलेकोमा जोडिएमा तपाईं दुवैले डुलेको शुल्क नलाग्ने एउटा काम पाउनुहुन्छ। जोडिने हरेक साथीबापत तपाईंले एउटा पाउनुहुन्छ।",
  ],
  referralCopy: ["Copy code", "कोड कपी गर्नुहोस्"],
  referralCopied: ["Copied", "कपी भयो"],
  referralShare: ["Share invite", "निम्तो पठाउनुहोस्"],
  referralShareText: [
    "Join me on Duleko - find local work and skilled people near you. Use my code {code} when you create your profile and we both get a free job.",
    "डुलेकोमा जोडिनुहोस् - नजिकैको काम र सिपालु मानिस भेट्नुहोस्। प्रोफाइल बनाउँदा मेरो कोड {code} हाल्नुहोस्, अनि हामी दुवैले एउटा निःशुल्क काम पाउँछौँ।",
  ],
  referralJoinedNone: ["No one has joined with your code yet.", "तपाईंको कोडबाट अहिलेसम्म कोही जोडिनुभएको छैन।"],
  referralJoined: [
    "{count} joined with your code · {count} free jobs earned",
    "तपाईंको कोडबाट {count} जना जोडिनुभयो · {count} निःशुल्क काम पाउनुभयो",
  ],
  referralInvitedBy: ["You joined with {name}'s code.", "तपाईं {name}को कोडबाट जोडिनुभएको हो।"],
  referralEnterTitle: ["Joined with a friend's code?", "साथीको कोडबाट जोडिनुभएको हो?"],
  referralEnterHint: [
    "You can add it within 7 days of joining.",
    "जोडिएको ७ दिनभित्र कोड हाल्न सक्नुहुन्छ।",
  ],
  referralApply: ["Add code", "कोड हाल्नुहोस्"],
  referralFieldLabel: ["Referral code", "रेफरल कोड"],
  referralFieldHint: [
    "Got a code from a friend? You both get 1 free job.",
    "साथीबाट कोड पाउनुभएको छ? तपाईं दुवैले १ निःशुल्क काम पाउनुहुन्छ।",
  ],
  referralApplied: [
    "Code added. You and {name} each get 1 free job.",
    "कोड हालियो। तपाईं र {name} दुवैले १ निःशुल्क काम पाउनुभयो।",
  ],
  referralErrFormat: ["A code is 4 letters and a number, like SANJ42.", "कोडमा ४ अक्षर र अङ्क हुन्छ, जस्तै SANJ42।"],
  referralErrNotFound: ["No one has that code. Check it and try again.", "यो कोड कसैको होइन। जाँचेर फेरि हाल्नुहोस्।"],
  referralErrOwn: ["That's your own code.", "यो तपाईंकै कोड हो।"],
  referralErrUsed: ["You've already joined with a code.", "तपाईंले पहिले नै कोड हालिसक्नुभएको छ।"],
  referralErrTooLate: [
    "Codes can only be added in your first 7 days.",
    "कोड जोडिएको पहिलो ७ दिनभित्र मात्र हाल्न सकिन्छ।",
  ],
  referralErrLater: [
    "Your profile is ready, but the referral code didn't go through: {reason} You can add it in Profile > Settings > Invite friends.",
    "तपाईंको प्रोफाइल तयार भयो, तर रेफरल कोड लागेन: {reason} प्रोफाइल > सेटिङ > साथीलाई निम्तो दिनुहोस् मा गएर फेरि हाल्न सक्नुहुन्छ।",
  ],
} as const;
