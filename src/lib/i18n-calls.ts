/**
 * Copy for work agreed over a phone call (6800_call_deals.sql): the
 * "did you have a deal?" question after a call, and the worker's side.
 * Merged into the app's string table in i18n.tsx.
 */
export const callStrings = {
  // ---- After a call: asked of the caller --------------------------------
  callAskTitle: ["About your call", "तपाईंको फोनबारे"],
  callAskQuestion: ["Did you have a deal with {name}?", "{name}सँग सम्झौता भयो?"],
  callAskWhy: [
    "Your answer helps Duleko show which skilled people really get work.",
    "तपाईंको जवाफले कुन सिपालुले साँच्चै काम पाउँछन् भनी देखाउन डुलेकोलाई सघाउँछ।",
  ],
  callAnswerDeal: ["Yes! Made a deal", "हो! सम्झौता भयो"],
  callAnswerDiscussing: ["Still discussing", "अझै कुरा हुँदैछ"],
  callAnswerNo: ["No, not available", "होइन, उपलब्ध हुनुहुन्न"],
  callDealTitle: ["Nice! Tell us about the deal", "राम्रो! सम्झौताबारे भन्नुहोस्"],
  callDealSkill: ["What work?", "कुन काम?"],
  callDealSkillOther: ["Something else", "अरू केही"],
  callDealAmount: ["Agreed price (optional)", "मिलेको मूल्य (वैकल्पिक)"],
  callDealAmountHint: [
    "Only you, {name} and Duleko staff see this. No Duleko fee is charged on it.",
    "यो तपाईं, {name} र डुलेकोको टोलीले मात्र देख्छन्। यसमा डुलेकोको कुनै शुल्क लाग्दैन।",
  ],
  callDealRating: ["Rate {name} (optional)", "{name}लाई रेटिङ दिनुहोस् (वैकल्पिक)"],
  callDealComment: ["A short review (optional)", "छोटो समीक्षा (वैकल्पिक)"],
  callDealCommentPlaceholder: ["How was it working with them?", "उहाँसँग काम गर्दा कस्तो लाग्यो?"],
  callDealReviewNote: [
    "{name} is asked to confirm the deal. Your review shows once they do, or after 7 days.",
    "{name}लाई सम्झौता पक्का गर्न भनिन्छ। उहाँले पक्का गरेपछि वा ७ दिनपछि, तपाईंको समीक्षा देखिन्छ।",
  ],
  callDealSave: ["Save", "सुरक्षित गर्नुहोस्"],
  callDealBack: ["Back", "पछाडि"],
  callDealSaved: ["Thanks! Deal saved.", "धन्यवाद! सम्झौता सुरक्षित भयो।"],
  callDiscussingSaved: ["Got it - we'll ask again in a couple of days.", "बुझियो - दुई-तीन दिनमा फेरि सोध्नेछौं।"],
  callNoSaved: ["Thanks for letting us know.", "जानकारी दिनुभएकोमा धन्यवाद।"],
  starsLabel: ["{count} out of 5", "५ मध्ये {count}"],

  // ---- The worker's side -------------------------------------------------
  callConfirmTitle: ["Did you make a deal with {name}?", "{name}सँग सम्झौता भयो?"],
  callConfirmHint: [
    "{name} says you agreed {what} after a call. It counts in 7 days unless you say no.",
    "{name}ले फोनपछि {what} मिलेको बताउनुभयो। तपाईंले होइन नभने ७ दिनमा गनिन्छ।",
  ],
  callConfirmWork: ["work", "काम"],
  callConfirmYes: ["Yes, that's right", "हो, सही हो"],
  callConfirmNo: ["No deal", "सम्झौता भएन"],
  callConfirmedToast: ["Thanks - the deal is confirmed.", "धन्यवाद - सम्झौता पक्का भयो।"],
  callDisputedToast: ["Got it - that deal won't count.", "बुझियो - त्यो सम्झौता गनिँदैन।"],

  // ---- Staff: activity (/staff/activity, 6900) ---------------------------
  activityTitle: ["Duleko activity", "डुलेकोको गतिविधि"],
  activitySubtitle: ["What's happening on Duleko", "डुलेकोमा के भइरहेको छ"],
  activityAllTime: ["All time", "सुरुदेखि"],
  activityLast30: ["Last 30 days", "पछिल्ला ३० दिन"],
  statCalls: ["Calls made", "गरिएका फोन"],
  statAccepted: ["Work requests accepted", "स्वीकार भएका कामका अनुरोध"],
  statCompleted: ["Jobs reported completed", "सम्पन्न भनिएका काम"],
  statReviews: ["Reviews submitted", "लेखिएका समीक्षा"],
  statRepeat: ["Repeat customers", "दोहोरिएका ग्राहक"],
  statActive: ["Monthly active users", "मासिक सक्रिय प्रयोगकर्ता"],
  statDeals: ["Total reported deals", "जम्मा सम्झौता रकम"],
  activityHowCounted: [
    "Completed jobs and deal money include deals agreed over a call once the worker confirms (or 7 days pass). Active users are the last 30 days in both columns.",
    "सम्पन्न काम र सम्झौता रकममा फोनबाट मिलेका सम्झौता पनि पर्छन्, कामदारले पक्का गरेपछि (वा ७ दिनपछि)। सक्रिय प्रयोगकर्ता दुवैमा पछिल्ला ३० दिनका हुन्।",
  ],
  activityWebsite: ["Show on the website", "वेबसाइटमा देखाउनुहोस्"],
  activityWebsiteHint: [
    "Rounded down (\"120+\") on duleko.com. Off until the numbers are worth showing.",
    "duleko.com मा तलतिर मिलाएर (\"१२०+\") देखिन्छ। देखाउन लायक नभएसम्म बन्द राख्नुहोस्।",
  ],
  activityWebsiteAdminsOnly: ["Only admins can change this.", "यो एडमिनले मात्र बदल्न सक्छन्।"],
  activityWebsiteOn: ["The numbers are on the website now.", "अब अंकहरू वेबसाइटमा देखिन्छन्।"],
  activityWebsiteOff: ["The numbers are off the website.", "अंकहरू वेबसाइटबाट हटाइए।"],
  activityDealsTitle: ["Deals agreed over a call", "फोनबाट मिलेका सम्झौता"],
  activityDealsEmpty: ["No call deals yet.", "अहिलेसम्म फोनबाट सम्झौता छैन।"],
  activityDealsWaiting: ["{count} waiting for the worker", "{count} कामदारको जवाफ पर्खँदै"],
  activityDealsDisputed: ["{count} said no", "{count} जनाले होइन भने"],
  activityDealLine: ["{hirer} hired {worker}", "{hirer}ले {worker}लाई काम दिनुभयो"],
  dealStatusReported: ["Waiting", "पर्खँदै"],
  dealStatusConfirmed: ["Counts", "गनिन्छ"],
  dealStatusDisputed: ["Worker said no", "कामदारले होइन भने"],
  dealStatusRemoved: ["Removed", "हटाइयो"],
  activityRemoveDeal: ["Remove", "हटाउनुहोस्"],
  activityRemoveTitle: ["Remove this deal?", "यो सम्झौता हटाउने?"],
  activityRemoveBody: [
    "It stops counting anywhere, and its review is deleted. Use this for deals that are clearly made up.",
    "यो कतै पनि गनिँदैन र यसको समीक्षा मेटिन्छ। स्पष्ट रूपमा झूटा सम्झौताका लागि मात्र प्रयोग गर्नुहोस्।",
  ],
  activityRemoved: ["Deal removed.", "सम्झौता हटाइयो।"],
  activityShortcut: ["Activity", "गतिविधि"],

  // ---- The website (public_activity_stats, 6900) -------------------------
  siteStatsEyebrow: ["Duleko in numbers", "अंकमा डुलेको"],
  siteStatsTitle: ["Activities made in Duleko", "डुलेकोमा भएका गतिविधि"],

  // ---- Errors (6800) -------------------------------------------------------
  errCallNotAllowed: ["You can't call this person yet.", "तपाईं अहिले यो व्यक्तिलाई फोन गर्न सक्नुहुन्न।"],
  errCallNotFound: ["That call isn't there any more.", "त्यो फोन कलको विवरण अब छैन।"],
  errCallAnswered: ["You've already answered about that call.", "त्यो फोनबारे तपाईंले पहिल्यै जवाफ दिनुभयो।"],
  errCallBadAmount: ["Enter a price between Rs 1 and Rs 5,00,000.", "रु १ देखि रु ५,००,००० सम्मको मूल्य लेख्नुहोस्।"],
  errCallDealAnswered: ["You've already answered about that deal.", "त्यो सम्झौताबारे तपाईंले पहिल्यै जवाफ दिनुभयो।"],
} as const;
