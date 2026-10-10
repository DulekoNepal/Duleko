/**
 * Copy for payment details, Duleko's monthly fees, the staff fee page and
 * the calendar choice, in English and Nepali. Merged into the app's string
 * table in i18n.tsx, so it's used the same way: t("payDetailsTitle").
 */
export const paymentStrings = {
  // ---- calendar --------------------------------------------------------
  dateCalendarTitle: ["Dates", "मिति"],
  dateCalendarHint: [
    "Dates show in the Nepali calendar (BS) unless you choose English (AD).",
    "तपाईंले अंग्रेजी (AD) नरोजेसम्म मिति नेपाली पात्रो (वि.सं.) मा देखिन्छ।",
  ],
  dateCalendarBs: ["Nepali (BS)", "नेपाली (वि.सं.)"],
  dateCalendarAd: ["English (AD)", "अंग्रेजी (AD)"],

  // ---- kinds and banks -------------------------------------------------
  payKindBank: ["Bank account", "बैंक खाता"],
  payKindEsewa: ["eSewa", "इसेवा"],
  payKindKhalti: ["Khalti", "खल्ती"],
  payKindCash: ["Cash", "नगद"],
  payOtherBank: ["Another bank", "अर्को बैंक"],
  payOtherBankHint: [
    "Development banks, finance companies and cooperatives",
    "विकास बैंक, फाइनान्स कम्पनी र सहकारी",
  ],

  // ---- the card --------------------------------------------------------
  payAccountName: ["Account name", "खाताको नाम"],
  payAccountNumber: ["Account number", "खाता नम्बर"],
  payWalletId: ["{wallet} ID", "{wallet} आईडी"],
  payBranch: ["Branch", "शाखा"],
  payPrimary: ["Main", "मुख्य"],
  payQrOnly: ["Pay by scanning the QR", "QR स्क्यान गरेर तिर्नुहोस्"],
  payTapQr: ["Tap to enlarge", "ठूलो पार्न थिच्नुहोस्"],
  payQrTitle: ["{name} QR", "{name} QR"],
  payQrHint: [
    "Scan this with your bank or wallet app. Check the name shows {name} before you pay.",
    "आफ्नो बैंक वा वालेट एपले यो स्क्यान गर्नुहोस्। तिर्नुअघि नाम {name} देखिएको जाँच्नुहोस्।",
  ],
  payCopy: ["Copy", "कपी"],
  payCopied: ["Copied", "कपी भयो"],

  // ---- managing your own -----------------------------------------------
  payDetailsTitle: ["Payment details", "भुक्तानी विवरण"],
  payDetailsHint: [
    "Where people can pay you: a bank account, eSewa or Khalti, with its QR. People you work with see these on the job, and so does anyone who can see your phone number.",
    "मानिसहरूले तपाईंलाई कहाँ तिर्न सक्छन्: बैंक खाता, इसेवा वा खल्ती, QR सहित। तपाईंसँग काम गर्नेहरूले कामको विवरणमा देख्छन्, र तपाईंको फोन नम्बर देख्न पाउनेले पनि देख्छन्।",
  ],
  payEmptyTitle: ["No payment details yet", "अहिलेसम्म भुक्तानी विवरण छैन"],
  payEmptyText: [
    "Add a bank account, eSewa or Khalti so people can pay you without cash.",
    "मानिसहरूले नगदबिना तिर्न सकून् भनेर बैंक खाता, इसेवा वा खल्ती थप्नुहोस्।",
  ],
  payAddTitle: ["Add another", "अर्को थप्नुहोस्"],
  payAdd: ["Add payment details", "भुक्तानी विवरण थप्नुहोस्"],
  payLimitReached: ["You can keep up to 5. Remove one to add another.", "बढीमा ५ वटा राख्न सकिन्छ। अर्को थप्न एउटा हटाउनुहोस्।"],
  payEdit: ["Edit", "सम्पादन"],
  payMakePrimary: ["Make main", "मुख्य बनाउनुहोस्"],
  payRemove: ["Remove", "हटाउनुहोस्"],
  payRemoveTitle: ["Remove these payment details?", "यो भुक्तानी विवरण हटाउने?"],
  payRemoveBody: [
    "People will no longer see this account or its QR.",
    "मानिसहरूले अब यो खाता र यसको QR देख्ने छैनन्।",
  ],
  paySaved: ["Payment details saved", "भुक्तानी विवरण सुरक्षित भयो"],
  payRemoved: ["Payment details removed", "भुक्तानी विवरण हटाइयो"],
  payPrimarySet: ["Shown first from now on", "अबदेखि यो पहिले देखिन्छ"],
  paySafety: [
    "Duleko never asks for your PIN, password or OTP. Only share the details here - never a code you get by SMS.",
    "डुलेकोले कहिल्यै तपाईंको PIN, पासवर्ड वा OTP माग्दैन। यहाँका विवरण मात्र दिनुहोस् - SMS मा आउने कोड कहिल्यै होइन।",
  ],

  // ---- the form --------------------------------------------------------
  payFormAddTitle: ["Add payment details", "भुक्तानी विवरण थप्नुहोस्"],
  payFormEditTitle: ["Edit {name}", "{name} सम्पादन"],
  payFormKind: ["Type", "प्रकार"],
  payFormBank: ["Bank", "बैंक"],
  payFormChooseBank: ["Choose your bank", "आफ्नो बैंक छान्नुहोस्"],
  payFormSearchBank: ["Search banks", "बैंक खोज्नुहोस्"],
  payFormNoBank: ["No bank by that name. Pick \"Another bank\" and type it.", "त्यो नामको बैंक छैन। \"अर्को बैंक\" छानेर नाम लेख्नुहोस्।"],
  payFormBankName: ["Bank name", "बैंकको नाम"],
  payFormBankNamePlaceholder: ["e.g. Shine Resunga Development Bank", "जस्तै: साइन रेसुंगा डेभलपमेन्ट बैंक"],
  payFormAccountNameHint: [
    "Exactly as the bank or wallet shows it, so payers can check it's you.",
    "बैंक वा वालेटमा जस्तो छ त्यस्तै, ताकि तिर्नेले तपाईं नै हो भनेर जाँच्न सकून्।",
  ],
  payFormAccountNumberHint: ["Or add the bank's QR below instead.", "वा यसको सट्टा तल बैंकको QR थप्नुहोस्।"],
  payFormWalletHint: [
    "The mobile number your {wallet} account uses. People who can see your payment details will see this number.",
    "तपाईंको {wallet} खाताको मोबाइल नम्बर। तपाईंको भुक्तानी विवरण देख्नेले यो नम्बर देख्छन्।",
  ],
  payFormQr: ["Payment QR", "भुक्तानी QR"],
  payFormQrHintBank: [
    "A photo or screenshot of your account's QR from your bank's app.",
    "आफ्नो बैंकको एपबाट खाताको QR को फोटो वा स्क्रिनसट।",
  ],
  payFormQrHintWallet: [
    "Your {wallet} QR - in the app, open \"My QR\" and take a screenshot.",
    "तपाईंको {wallet} QR - एपमा \"My QR\" खोलेर स्क्रिनसट लिनुहोस्।",
  ],
  payFormUploadQr: ["Upload QR", "QR अपलोड"],
  payFormTakePhoto: ["Take photo", "फोटो खिच्नुहोस्"],
  payFormRemoveQr: ["Remove QR", "QR हटाउनुहोस्"],
  payFormPreview: ["How it will look", "यस्तो देखिन्छ"],
  payFormSave: ["Save", "सुरक्षित गर्नुहोस्"],
  payNeedBank: ["Choose your bank.", "आफ्नो बैंक छान्नुहोस्।"],
  payNeedBankName: ["Type the bank's name.", "बैंकको नाम लेख्नुहोस्।"],
  payNeedName: ["Add the name on the account.", "खातामा भएको नाम लेख्नुहोस्।"],
  payNeedNumberOrQr: ["Add the account number, the QR, or both.", "खाता नम्बर, QR, वा दुवै थप्नुहोस्।"],
  payBadNumber: ["Use letters and digits only (4 to 40).", "अक्षर र अंक मात्र (४ देखि ४० वटा) प्रयोग गर्नुहोस्।"],
  payBadWallet: ["Enter a 10-digit mobile number starting 97 or 98.", "९७ वा ९८ बाट सुरु हुने १० अंकको मोबाइल नम्बर लेख्नुहोस्।"],

  // ---- someone else's --------------------------------------------------
  payTheirDetails: ["Payment details", "भुक्तानी विवरण"],
  payPayName: ["Pay {name}", "{name} लाई तिर्नुहोस्"],
  payPayHint: [
    "Pay with your own bank or wallet app. Duleko doesn't handle the money.",
    "आफ्नै बैंक वा वालेट एपबाट तिर्नुहोस्। डुलेकोले पैसा राख्दैन।",
  ],
  payShowMore: ["Show {count} more ways to pay", "तिर्ने थप {count} तरिका देखाउनुहोस्"],
  payNoneFromThem: [
    "{name} hasn't added payment details. Pay in cash, or ask them in chat.",
    "{name} ले भुक्तानी विवरण थप्नुभएको छैन। नगद तिर्नुहोस्, वा च्याटमा सोध्नुहोस्।",
  ],

  // ---- onboarding ------------------------------------------------------
  onboardPayTitle: ["How you get paid", "तपाईंलाई कसरी तिर्ने"],
  onboardPayIntro: [
    "Optional. Add a bank account, eSewa or Khalti with its QR, so people can pay you after a job. You can do this later from your profile.",
    "वैकल्पिक। बैंक खाता, इसेवा वा खल्ती QR सहित थप्नुहोस्, ताकि काम सकिएपछि मानिसहरूले तपाईंलाई तिर्न सकून्। यो पछि प्रोफाइलबाट पनि गर्न सकिन्छ।",
  ],
  onboardPaySkip: ["Skip for now", "अहिलेलाई छोड्नुहोस्"],
  onboardPayFailed: [
    "Some payment details couldn't be saved. Add them again from your profile.",
    "केही भुक्तानी विवरण सुरक्षित हुन सकेन। प्रोफाइलबाट फेरि थप्नुहोस्।",
  ],

  // ---- profile ---------------------------------------------------------
  profileTabPayments: ["Payments", "भुक्तानी"],
  feesShortcut: ["Duleko fees", "डुलेको शुल्क"],
  feesShortcutHint: ["What you owe Duleko for work done, and how to pay.", "गरेको कामबापत डुलेकोलाई तिर्नुपर्ने र कसरी तिर्ने।"],
  staffFeesShortcut: ["Fees and payments", "शुल्क र भुक्तानी"],
  staffFeesShortcutHint: ["Check payments, Duleko's accounts, who owes.", "भुक्तानी जाँच, डुलेकोका खाता, कसले तिर्न बाँकी।"],

  // ---- fees: the worker's page -----------------------------------------
  feesTitle: ["Duleko fees", "डुलेको शुल्क"],
  feesSubtitle: ["A small share of work done, paid monthly", "गरेको कामको सानो अंश, मासिक तिरिने"],
  feesOverdueTitle: ["{amount} is past due", "{amount} म्याद नाघेर बाँकी छ"],
  feesOverdueText: [
    "You can't accept new work until you pay. Jobs you've already accepted carry on.",
    "नतिरेसम्म नयाँ काम स्वीकार गर्न सक्नुहुन्न। स्वीकार गरिसकेका काम चलिरहन्छन्।",
  ],
  feesDueTitle: ["{amount} due by {date}", "{date} सम्म {amount} तिर्नुपर्ने"],
  feesDueText: [
    "Pay into one of Duleko's accounts below, then tap \"I've paid\".",
    "तलका डुलेकोका कुनै खातामा तिर्नुहोस्, अनि \"मैले तिरें\" थिच्नुहोस्।",
  ],
  feesAwaitingTitle: ["Your payment is being checked", "तपाईंको भुक्तानी जाँच हुँदैछ"],
  feesAwaitingText: [
    "Duleko is checking the {amount} you recorded. You'll get an alert once it's confirmed.",
    "तपाईंले जनाएको {amount} डुलेकोले जाँच्दैछ। पुष्टि भएपछि सूचना आउँछ।",
  ],
  feesClearTitle: ["You're all paid up", "तपाईंको सबै तिरिसकियो"],
  feesClearText: [
    "This month's fees are due by the 15th of next month.",
    "यो महिनाको शुल्क अर्को महिनाको १५ गतेसम्म तिर्नुपर्छ।",
  ],
  feesOwedNow: ["Owed now", "अहिले तिर्नुपर्ने"],
  feesThisMonth: ["This month so far", "यो महिना अहिलेसम्म"],
  feesPaidTotal: ["Paid", "तिरिएको"],
  feesWaiting: ["Being checked", "जाँच हुँदै"],
  feesPayNow: ["Pay now", "अहिले तिर्नुहोस्"],
  feesIPaid: ["I've paid", "मैले तिरें"],
  feesHowTitle: ["How the fee works", "शुल्क कसरी लाग्छ"],
  feesHowIntro: [
    "When a job is completed, the worker pays Duleko a small share of the agreed price:",
    "काम सम्पन्न भएपछि कामदारले सहमत मूल्यको सानो अंश डुलेकोलाई तिर्छन्:",
  ],
  feesBandFirst: ["{percent}% of the first {to}", "पहिलो {to} को {percent}%"],
  feesBandMiddle: ["{percent}% from {from} to {to}", "{from} देखि {to} सम्म {percent}%"],
  feesBandLast: ["{percent}% above {from}", "{from} भन्दा माथि {percent}%"],
  feesExamples: ["For example: {a}, {b}, {c}.", "उदाहरण: {a}, {b}, {c}।"],
  feesExample: ["a {price} job pays {fee}", "{price} को कामको {fee}"],
  feesMonthly: [
    "Fees add up by Nepali month and are due by the {day}th of the next month. Past-due fees pause accepting new work until paid.",
    "शुल्क नेपाली महिनाअनुसार जोडिन्छ र अर्को महिनाको {day} गतेसम्म तिर्नुपर्छ। म्याद नाघेको शुल्क नतिरेसम्म नयाँ काम स्वीकार गर्न रोकिन्छ।",
  ],
  feesStarts: [
    "Fees apply to jobs requested from {date}. Jobs before that are free.",
    "{date} देखि अनुरोध गरिएका कामलाई शुल्क लाग्छ। त्यसअघिका काम निःशुल्क।",
  ],
  feesWelcomeLeft: [
    "Your next {count} of {total} first jobs are free.",
    "तपाईंका पहिला {total} मध्ये अर्को {count} काम निःशुल्क।",
  ],
  feesWelcomeAll: ["Your first {total} jobs are free.", "तपाईंका पहिला {total} काम निःशुल्क।"],
  feesWelcomeUsed: ["Your {total} free jobs are used.", "तपाईंका {total} निःशुल्क काम सकिए।"],
  feesPayTitle: ["Pay Duleko", "डुलेकोलाई तिर्नुहोस्"],
  feesPayHint: [
    "Pay into any of these with your bank or wallet app, then record it so we can match it.",
    "आफ्नो बैंक वा वालेट एपबाट यीमध्ये कुनैमा तिर्नुहोस्, अनि मिलाउन सकियोस् भनेर जनाउनुहोस्।",
  ],
  feesNoAccounts: [
    "Duleko's accounts will show here soon. Until then, pay a Duleko team member and record it as cash.",
    "डुलेकोका खाता चाँडै यहाँ देखिन्छन्। त्यतिन्जेल डुलेको टोलीलाई तिरेर नगदको रूपमा जनाउनुहोस्।",
  ],
  feesMonthsTitle: ["Monthly bills", "मासिक बिल"],
  feesMonthJobs: ["{jobs} jobs · {amount}", "{jobs} काम · {amount}"],
  feesMonthPaidPart: ["{amount} paid", "{amount} तिरियो"],
  feesMonthDueBy: ["due by {date}", "{date} सम्म तिर्नुपर्ने"],
  feesMonthOpen: ["This month", "यो महिना"],
  feesMonthDue: ["Due", "तिर्नुपर्ने"],
  feesMonthOverdue: ["Past due", "म्याद नाघ्यो"],
  feesMonthPaid: ["Paid", "तिरियो"],
  feesNoMonths: ["No fees yet. They start once a job with a fee is completed.", "अहिलेसम्म शुल्क छैन। शुल्क लाग्ने काम सम्पन्न भएपछि सुरु हुन्छ।"],
  feesJobsTitle: ["Jobs", "कामहरू"],
  feesJobLine: ["{price} job · completed {date}", "{price} को काम · {date} मा सम्पन्न"],
  feesFree: ["Free", "निःशुल्क"],
  feesPaymentsTitle: ["Your payments", "तपाईंका भुक्तानी"],
  feesNoPayments: ["No payments recorded yet.", "अहिलेसम्म कुनै भुक्तानी जनाइएको छैन।"],
  feesPaymentReported: ["Being checked", "जाँच हुँदै"],
  feesPaymentConfirmed: ["Confirmed", "पुष्टि भयो"],
  feesPaymentRejected: ["Not found", "भेटिएन"],
  feesPaymentWithdraw: ["Take back", "फिर्ता लिनुहोस्"],
  feesPaymentWithdrawn: ["Payment taken back", "भुक्तानी फिर्ता लिइयो"],
  feesPaymentProof: ["Screenshot", "स्क्रिनसट"],
  feesTxn: ["Ref {id}", "सन्दर्भ {id}"],
  feesLoadFailed: ["Couldn't load your fees.", "तपाईंको शुल्क लोड हुन सकेन।"],

  // ---- fees: on a job --------------------------------------------------
  feeOnJob: ["Duleko fee on this job: {amount}", "यो कामको डुलेको शुल्क: {amount}"],
  feeOnJobWelcome: ["No Duleko fee - one of your first {total} jobs", "डुलेको शुल्क छैन - तपाईंका पहिला {total} काममध्ये एक"],
  feeOnJobFree: ["No Duleko fee on this job", "यो काममा डुलेको शुल्क छैन"],
  feeBlockedTitle: ["Pay your Duleko fees to accept new work", "नयाँ काम स्वीकार गर्न डुलेको शुल्क तिर्नुहोस्"],
  feeBlockedText: ["{amount} is past due.", "{amount} म्याद नाघेर बाँकी छ।"],
  feeOpenFees: ["Open Duleko fees", "डुलेको शुल्क खोल्नुहोस्"],
  feeReminderDue: ["Duleko fees: {amount} due by {date}", "डुलेको शुल्क: {date} सम्म {amount}"],
  feeReminderOverdue: ["Duleko fees: {amount} past due", "डुलेको शुल्क: {amount} म्याद नाघ्यो"],
  feeReminderOverdueHint: ["Pay to accept new work again.", "फेरि नयाँ काम स्वीकार गर्न तिर्नुहोस्।"],

  // ---- recording a payment ---------------------------------------------
  feesRecordTitle: ["Record your payment", "आफ्नो भुक्तानी जनाउनुहोस्"],
  feesAmount: ["Amount paid (Rs)", "तिरेको रकम (रु)"],
  feesAmountHint: ["Up to {amount}", "बढीमा {amount}"],
  feesPaidInto: ["Paid into", "कहाँ तिर्नुभयो"],
  feesCashHint: ["Handed to a Duleko team member", "डुलेको टोलीलाई हातमा दिएको"],
  feesReference: ["Transaction ID", "कारोबार नम्बर"],
  feesReferenceHint: ["From your bank or wallet receipt - it helps us find it.", "बैंक वा वालेटको रसिदबाट - यसले भेट्टाउन मद्दत गर्छ।"],
  feesNote: ["Note", "टिप्पणी"],
  feesScreenshot: ["Screenshot of the payment", "भुक्तानीको स्क्रिनसट"],
  feesAddScreenshot: ["Add screenshot", "स्क्रिनसट थप्नुहोस्"],
  feesChangeScreenshot: ["Change", "बदल्नुहोस्"],
  feesSubmit: ["Send for checking", "जाँचका लागि पठाउनुहोस्"],
  feesBadAmount: ["Enter a whole amount from 1 to {amount}.", "१ देखि {amount} सम्मको पूरा रकम लेख्नुहोस्।"],
  feesSentTitle: ["Payment recorded", "भुक्तानी जनाइयो"],

  // ---- fees: staff -----------------------------------------------------
  staffFeesTitle: ["Fees and payments", "शुल्क र भुक्तानी"],
  staffFeesSubtitle: ["Staff only", "कर्मचारी मात्र"],
  staffFeesCharged: ["All fees", "सबै शुल्क"],
  staffFeesOwed: ["Still owed", "बाँकी"],
  staffFeesOverdue: ["Past due", "म्याद नाघेको"],
  staffToCheck: ["Payments to check", "जाँच्नुपर्ने भुक्तानी"],
  staffToCheckEmpty: ["Nothing to check.", "जाँच्नुपर्ने केही छैन।"],
  staffToCheckHint: [
    "Find each one in Duleko's bank or wallet statement before confirming it.",
    "पुष्टि गर्नुअघि हरेकलाई डुलेकोको बैंक वा वालेट विवरणमा भेट्टाउनुहोस्।",
  ],
  staffConfirm: ["It arrived", "आयो"],
  staffReject: ["Not received", "आएन"],
  staffRejectReason: ["Why? (the worker sees this)", "किन? (कामदारले देख्छन्)"],
  staffRejectSend: ["Send", "पठाउनुहोस्"],
  staffConfirmed: ["Payment confirmed", "भुक्तानी पुष्टि भयो"],
  staffRejected: ["Payment marked not received", "भुक्तानी नआएको जनाइयो"],
  staffAdminsOnly: ["Only admins can confirm payments or change Duleko's accounts.", "भुक्तानी पुष्टि वा डुलेकोका खाता बदल्न एडमिन मात्र सक्छन्।"],
  staffDulekoAccounts: ["Duleko's accounts", "डुलेकोका खाता"],
  staffDulekoAccountsHint: [
    "Where workers pay their fees. Every member sees these on their fees page.",
    "कामदारले शुल्क तिर्ने ठाउँ। सबै सदस्यले आफ्नो शुल्क पेजमा देख्छन्।",
  ],
  staffDulekoEmpty: ["No Duleko accounts yet", "अहिलेसम्म डुलेकोको खाता छैन"],
  staffDulekoEmptyText: [
    "Add Duleko's bank account, eSewa or Khalti with the official QR.",
    "आधिकारिक QR सहित डुलेकोको बैंक खाता, इसेवा वा खल्ती थप्नुहोस्।",
  ],
  staffWorkers: ["Workers with fees", "शुल्क भएका कामदार"],
  staffWorkersEmpty: ["No fees yet.", "अहिलेसम्म शुल्क छैन।"],
  staffWorkerLine: ["Owes {balance} · paid {paid}", "बाँकी {balance} · तिरेको {paid}"],
  staffPaused: ["New work paused", "नयाँ काम रोकिएको"],
  staffPaidTo: ["Paid into {label}", "{label} मा तिरेको"],

  // ---- errors ----------------------------------------------------------
  errPaymentLimit: ["You can keep up to 5 payment details.", "बढीमा ५ वटा भुक्तानी विवरण राख्न सकिन्छ।"],
  errFeesOverdue: [
    "Pay your past-due Duleko fees (or record the payment) to accept new work.",
    "नयाँ काम स्वीकार गर्न म्याद नाघेको डुलेको शुल्क तिर्नुहोस् (वा भुक्तानी जनाउनुहोस्)।",
  ],
  errFeeTooMuch: ["That's more than you owe right now ({amount}).", "यो अहिले तिर्नुपर्नेभन्दा बढी हो ({amount})।"],
  errFeeNothing: ["There's nothing to pay right now.", "अहिले तिर्नुपर्ने केही छैन।"],
  errFeeAccount: ["Choose which Duleko account you paid into.", "डुलेकोको कुन खातामा तिर्नुभयो छान्नुहोस्।"],
  errAdminOnly: ["Only Duleko admins can do this.", "यो डुलेकोका एडमिनले मात्र गर्न सक्छन्।"],

  // ---- Terms and Privacy -----------------------------------------------
  termsPaymentDetails: [
    "You can add where you take payment - a bank account, eSewa or Khalti, with its QR - so the people you work with can pay you directly. Check the name on the account before you pay anyone, and never share a PIN, password or OTP.",
    "तपाईंले भुक्तानी लिने ठाउँ - बैंक खाता, इसेवा वा खल्ती, QR सहित - थप्न सक्नुहुन्छ, ताकि तपाईंसँग काम गर्नेले सिधै तिर्न सकून्। कसैलाई तिर्नुअघि खाताको नाम जाँच्नुहोस्, र PIN, पासवर्ड वा OTP कहिल्यै नदिनुहोस्।",
  ],
  termsDulekoFee: [
    "Duleko's fee: when a job is completed, the worker pays Duleko 5% of the first Rs 5,000 of the agreed price, 4% from Rs 5,000 to Rs 20,000 and 3% above that. Employers pay Duleko nothing. Fees apply only to jobs requested from 1 Mangsir 2083 (17 November 2026), and each worker's first 5 such jobs are free.",
    "डुलेकोको शुल्क: काम सम्पन्न भएपछि कामदारले सहमत मूल्यको पहिलो रु ५,००० को ५%, रु ५,००० देखि रु २०,००० सम्म ४% र त्यसभन्दा माथि ३% डुलेकोलाई तिर्छन्। काम दिनेले डुलेकोलाई केही तिर्दैनन्। शुल्क २०८३ मंसिर १ (१७ नोभेम्बर २०२६) देखि अनुरोध गरिएका काममा मात्र लाग्छ, र हरेक कामदारका त्यस्ता पहिला ५ काम निःशुल्क हुन्छन्।",
  ],
  termsDulekoFeeMonthly: [
    "Fees add up by Nepali month and are due by the 15th of the next month, paid into one of Duleko's official accounts shown in the app. Until past-due fees are paid or a payment is recorded, you can't accept new work requests; jobs already accepted carry on. Duleko will give notice in the app before changing the fee.",
    "शुल्क नेपाली महिनाअनुसार जोडिन्छ र एपमा देखाइएका डुलेकोका आधिकारिक खातामा अर्को महिनाको १५ गतेसम्म तिर्नुपर्छ। म्याद नाघेको शुल्क नतिरेसम्म वा भुक्तानी नजनाएसम्म नयाँ कामको अनुरोध स्वीकार गर्न सकिँदैन; स्वीकार गरिसकेका काम चलिरहन्छन्। शुल्क बदल्नुअघि डुलेकोले एपमा सूचना दिनेछ।",
  ],
  privacyPaymentsTitle: ["5. Payment details and Duleko's fee", "५. भुक्तानी विवरण र डुलेकोको शुल्क"],
  privacyPaymentsWhat: [
    "If you add payment details, we keep the bank (or eSewa / Khalti), the name on the account, its number or wallet ID, the branch and a photo of its QR. We never ask for or store a PIN, password or card number.",
    "तपाईंले भुक्तानी विवरण थप्नुभयो भने हामी बैंक (वा इसेवा / खल्ती), खाताको नाम, नम्बर वा वालेट आईडी, शाखा र QR को फोटो राख्छौं। हामी PIN, पासवर्ड वा कार्ड नम्बर कहिल्यै माग्दैनौं र राख्दैनौं।",
  ],
  privacyPaymentsWho: [
    "They are shown only to people you have an accepted, confirmed or completed job with, and to anyone allowed to see your phone number under \"Who can call me\". They are not shown on public profiles to guests.",
    "यी तपाईंसँग स्वीकार, पक्का वा सम्पन्न भएको काम भएकालाई, र \"मलाई कसले फोन गर्न सक्छ\" अनुसार तपाईंको फोन नम्बर देख्न पाउनेलाई मात्र देखाइन्छ। पाहुनालाई सार्वजनिक प्रोफाइलमा देखाइँदैन।",
  ],
  privacyPaymentsFees: [
    "For Duleko's fee we keep each completed job's agreed price and fee, and the payments you record (amount, account, transaction ID, any screenshot). Duleko's admins see these to confirm payments. Removing an account or deleting your profile removes its details and QR.",
    "डुलेकोको शुल्कका लागि हामी हरेक सम्पन्न कामको सहमत मूल्य र शुल्क, र तपाईंले जनाएका भुक्तानी (रकम, खाता, कारोबार नम्बर, स्क्रिनसट भए) राख्छौं। भुक्तानी पुष्टि गर्न डुलेकोका एडमिनले यी हेर्छन्। खाता हटाउँदा वा प्रोफाइल मेटाउँदा त्यसको विवरण र QR हटिन्छ।",
  ],
} as const;
