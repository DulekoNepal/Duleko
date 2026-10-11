/**
 * Copy for My Work - the lists (Active, offers/posts, History), the step
 * each job is at, and the job sheet's banner, actions and confirmations -
 * in English and Nepali. Merged into the app's string table in i18n.tsx.
 */
export const workStrings = {
  // ---- The screen ------------------------------------------------------
  workTabActive: ["Active", "सक्रिय"],
  workTabHistory: ["History", "पुराना काम"],
  workNeedsYou: ["Needs you", "तपाईंले गर्नुपर्ने"],
  workInProgress: ["In progress", "चलिरहेको"],
  workAllCaughtUp: ["Nothing needs you right now.", "अहिले तपाईंले गर्नुपर्ने केही छैन।"],
  workNeedsCount: ["{count} need you", "{count} वटा तपाईंलाई पर्खँदै"],
  workFindPeople: ["Find people", "मानिस खोज्नुहोस्"],
  workEmptyWorkerTitle: ["No active work right now", "अहिले कुनै सक्रिय काम छैन"],
  workEmptyWorkerHint: [
    "Requests from people who want to hire you show up here. Find work on the board and send your price.",
    "तपाईंलाई काममा लगाउन चाहनेहरूका अनुरोध यहाँ देखिन्छन्। बोर्डमा काम खोजेर आफ्नो मूल्य पठाउनुहोस्।",
  ],
  workEmptyEmployerTitle: ["Nobody is working for you right now", "अहिले तपाईंको लागि कसैले काम गरिरहेको छैन"],
  workEmptyEmployerHint: [
    "Post a job to get offers, or find a skilled person and send them a request.",
    "प्रस्ताव पाउन काम पोस्ट गर्नुहोस्, वा सीपालु मानिस खोजेर अनुरोध पठाउनुहोस्।",
  ],
  workHistoryEmpty: ["Nothing finished yet", "अहिलेसम्म कुनै काम सकिएको छैन"],
  workHistoryEmptyHint: [
    "Completed, declined and cancelled jobs are kept here.",
    "सम्पन्न, अस्वीकृत र रद्द भएका काम यहाँ राखिन्छन्।",
  ],
  workChooseOffersOne: ["1 offer to choose from", "छान्न १ प्रस्ताव"],
  workChooseOffers: ["{count} offers to choose from", "छान्न {count} प्रस्ताव"],
  workYouRated: ["You rated {rating}", "तपाईंको रेटिङ {rating}"],
  // Shortcuts between the board and My Work
  boardOffersWaiting: ["{count} waiting", "{count} प्रतीक्षामा"],
  boardPostsOpen: ["{count} open", "{count} खुला"],
  boardTrackInWork: ["Track in My Work", "मेरो काममा हेर्नुहोस्"],
  workOpenJob: ["Open the job", "काम खोल्नुहोस्"],
  dayToday: ["Today", "आज"],
  dayTomorrow: ["Tomorrow", "भोलि"],
  dayYesterday: ["Yesterday", "हिजो"],

  // ---- Where a job stands, one line in a list --------------------------
  stepLineReplyWorker: ["New request", "नयाँ अनुरोध"],
  stepLineReplyWorkerCounter: ["New price from {name}", "{name}को नयाँ मूल्य"],
  stepLineReplyEmployer: ["New price from {name}", "{name}को नयाँ मूल्य"],
  stepLineWaitReply: ["Waiting for {name}", "{name}को जवाफ पर्खँदै"],
  stepLineConfirm: ["{name} accepted", "{name}ले स्वीकार गर्नुभयो"],
  stepLineWaitConfirm: ["Waiting for {name} to confirm", "{name}ले पक्का गर्ने पर्खँदै"],
  stepLineUpcoming: ["Booked", "बुक भयो"],
  stepLineMarkDone: ["Is the work finished?", "काम सकियो?"],
  stepLineReview: ["Completed · how did it go?", "सम्पन्न · काम कस्तो भयो?"],
  actReply: ["Reply", "जवाफ"],
  actConfirm: ["Confirm", "पक्का"],
  actMarkDone: ["Mark done", "सकियो"],
  actRate: ["Rate", "रेटिङ"],

  // ---- The job sheet: what's happening, in one banner -------------------
  bannerReplyWorkerTitle: ["{name} wants to hire you", "{name} तपाईंलाई काममा लगाउन चाहनुहुन्छ"],
  bannerReplyWorkerCounterTitle: ["{name} sent a new price", "{name}ले नयाँ मूल्य पठाउनुभयो"],
  bannerReplyWorkerHint: [
    "Accept the price, offer your own, or decline.",
    "मूल्य स्वीकार गर्नुहोस्, आफ्नो मूल्य भन्नुहोस्, वा अस्वीकार गर्नुहोस्।",
  ],
  bannerReplyEmployerTitle: ["{name} asked for another price", "{name}ले अर्को मूल्य माग्नुभयो"],
  bannerReplyEmployerHint: [
    "Agree to it, or offer another. Once you agree, they accept to go ahead.",
    "त्यसमा सहमत हुनुहोस्, वा अर्को मूल्य भन्नुहोस्। तपाईं सहमत भएपछि अगाडि बढ्न उहाँले स्वीकार गर्नुहुन्छ।",
  ],
  bannerWaitReplyTitle: ["Waiting for {name}", "{name}को जवाफ पर्खँदै"],
  bannerWaitReplyWorkerHint: [
    "You asked for {amount}. They can agree or offer another price.",
    "तपाईंले {amount} माग्नुभयो। उहाँ सहमत हुन वा अर्को मूल्य भन्न सक्नुहुन्छ।",
  ],
  bannerWaitReplyEmployerHint: [
    "They can accept, offer another price, or decline. You'll get an alert.",
    "उहाँले स्वीकार गर्न, अर्को मूल्य भन्न वा अस्वीकार गर्न सक्नुहुन्छ। तपाईंलाई सूचना आउनेछ।",
  ],
  bannerConfirmTitle: ["{name} accepted", "{name}ले स्वीकार गर्नुभयो"],
  bannerConfirmHint: [
    "Confirm to book {date}. You can call each other now.",
    "{date} बुक गर्न पक्का गर्नुहोस्। अब एकअर्कालाई फोन गर्न सक्नुहुन्छ।",
  ],
  bannerWaitConfirmTitle: ["You accepted", "तपाईंले स्वीकार गर्नुभयो"],
  bannerWaitConfirmHint: [
    "Waiting for {name} to confirm the booking. You can call each other now.",
    "{name}ले बुकिङ पक्का गर्ने पर्खँदै। अब एकअर्कालाई फोन गर्न सक्नुहुन्छ।",
  ],
  bannerUpcomingTitle: ["Booked for {date}", "{date} को लागि बुक भयो"],
  bannerUpcomingHint: [
    "Contact each other to arrange the day. Mark it done once it's finished.",
    "दिन मिलाउन एकअर्कालाई सम्पर्क गर्नुहोस्। काम सकिएपछि सम्पन्न चिन्ह लगाउनुहोस्।",
  ],
  bannerMarkDoneTitle: ["Is the work finished?", "काम सकियो?"],
  bannerMarkDoneHint: [
    "Mark it done once it's finished, then rate each other.",
    "काम सकिएपछि सम्पन्न चिन्ह लगाउनुहोस्, अनि एकअर्कालाई रेटिङ दिनुहोस्।",
  ],
  bannerReviewTitle: ["Job completed", "काम सम्पन्न भयो"],
  bannerReviewHint: [
    "How did it go? Rate {name} - it helps others choose.",
    "काम कस्तो भयो? {name}लाई रेटिङ दिनुहोस् - यसले अरूलाई छान्न मद्दत गर्छ।",
  ],
  bannerDoneHint: ["You rated {name} {rating} of 5.", "तपाईंले {name}लाई ५ मा {rating} दिनुभयो।"],
  bannerDeclinedTitle: ["Request declined", "अनुरोध अस्वीकार गरियो"],
  bannerDeclinedByMe: ["You declined this request.", "तपाईंले यो अनुरोध अस्वीकार गर्नुभयो।"],
  bannerDeclinedByThem: ["{name} declined this request.", "{name}ले यो अनुरोध अस्वीकार गर्नुभयो।"],
  bannerCancelledTitle: ["Job cancelled", "काम रद्द भयो"],
  bannerCancelledByMe: ["You cancelled it · {reason}", "तपाईंले रद्द गर्नुभयो · {reason}"],
  bannerCancelledByThem: ["{name} cancelled it · {reason}", "{name}ले रद्द गर्नुभयो · {reason}"],

  // ---- The job sheet: facts, people, actions ---------------------------
  sheetAgreedPrice: ["Agreed price", "तय भएको मूल्य"],
  sheetPrice: ["Price", "मूल्य"],
  sheetOfferedPrice: ["Price on the table", "अहिलेको प्रस्तावित मूल्य"],
  sheetSkill: ["Skill", "सीप"],
  sheetNumbersLater: [
    "Phone numbers are shared once the request is accepted.",
    "अनुरोध स्वीकार भएपछि फोन नम्बर देखिन्छ।",
  ],
  sheetNoPhone: ["No phone number saved", "फोन नम्बर राखिएको छैन"],
  sheetTheyHire: ["Hiring you", "तपाईंलाई काममा लगाउँदै"],
  sheetTheyWork: ["Doing the work", "काम गर्ने व्यक्ति"],
  sheetWithdrawRequest: ["Withdraw request", "अनुरोध फिर्ता लिनुहोस्"],
  actAgreeAt: ["Agree to {amount}", "{amount} मा सहमत"],
  actAcceptAt: ["Accept {amount}", "{amount} स्वीकार"],
  actConfirmBooking: ["Confirm booking", "बुकिङ पक्का गर्नुहोस्"],
  actMarkDoneFull: ["Mark as done", "सम्पन्न भयो"],
  actRateName: ["Rate {name}", "{name}लाई रेटिङ दिनुहोस्"],
  offerAnotherPrice: ["Offer another price", "अर्को मूल्य भन्नुहोस्"],
  priceTrail: ["How the price moved", "मूल्य कसरी सर्‍यो"],

  // Confirmations
  declineTitle: ["Decline this request?", "यो अनुरोध अस्वीकार गर्ने?"],
  declineBody: [
    "{name} will be told you can't take it. This can't be undone.",
    "तपाईं यो काम लिन सक्नुहुन्न भनेर {name}लाई जानकारी दिइनेछ। यो फिर्ता हुँदैन।",
  ],
  markDoneTitle: ["Mark this job as done?", "यो काम सम्पन्न भयो भन्ने?"],
  markDoneBody: [
    "Do this once the work is finished. The job closes, and you can both leave a review.",
    "काम सकिएपछि मात्र गर्नुहोस्। काम बन्द हुन्छ, अनि दुवैले समीक्षा दिन सक्नुहुन्छ।",
  ],

  // Toasts
  toastAccepted: ["Accepted. {name} will confirm the booking.", "स्वीकार गरियो। {name}ले बुकिङ पक्का गर्नुहुनेछ।"],
  toastDeclined: ["Request declined", "अनुरोध अस्वीकार गरियो"],
  toastConfirmed: ["Booked. Contact each other to arrange the day.", "बुक भयो। दिन मिलाउन एकअर्कालाई सम्पर्क गर्नुहोस्।"],
  toastCompleted: ["Marked as done", "सम्पन्न भयो"],
  toastCancelled: ["Job cancelled", "काम रद्द भयो"],
  toastCounterSent: ["New price sent to {name}", "{name}लाई नयाँ मूल्य पठाइयो"],
  toastAgreed: ["You agreed to {amount}. {name} can accept now.", "तपाईं {amount} मा सहमत हुनुभयो। अब {name}ले स्वीकार गर्न सक्नुहुन्छ।"],
} as const;
