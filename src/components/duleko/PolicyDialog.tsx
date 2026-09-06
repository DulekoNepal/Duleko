import { Dialog } from "@/components/ui/dialog";
import { Collapsible } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

const heading = "mb-1.5 mt-4 text-sm font-semibold text-slate-900 first:mt-0";
const body = "text-sm leading-relaxed text-slate-700";
const list = "list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700";

/**
 * The real Terms of Use and Privacy Policy, in English and Nepali.
 * Registration itself stays a single checkbox - these only open when
 * someone taps "Terms of Use" or "Privacy Policy" to actually read them.
 * The Terms dialog opens on a short, plain-language summary (what most
 * people read) with the full formal document available behind its own
 * expand toggle, so nothing long is forced on anyone who just wants the
 * gist.
 */
export function PolicyDialog({
  open,
  onClose,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  kind: "terms" | "privacy";
}) {
  const { t, lang } = useI18n();

  return (
    <Dialog open={open} onClose={onClose} title={kind === "terms" ? t("termsOfService") : t("privacyPolicy")}>
      {kind === "terms" ? <TermsContent lang={lang} /> : <PrivacyContent lang={lang} />}
    </Dialog>
  );
}

function TermsContent({ lang }: { lang: "en" | "ne" }) {
  const { t } = useI18n();
  return (
    <div>
      <p className={body}>
        {lang === "ne"
          ? "दुलेको एउटा प्लेटफर्म हो जसले मानिसहरूलाई सीप र स्थानीय काम अवसरहरूको वरिपरि फेला पार्न, प्रस्ताव गर्न, र जोडिन मद्दत गर्छ। खाता खोलेर, तपाईं तलका कुराहरूमा सहमत हुनुहुन्छ।"
          : "Duleko is a platform that helps people discover, offer, and connect around skills and local work opportunities in Nepal. By creating an account, you agree to the following."}
      </p>

      <Collapsible title={t("policyQuickSummary")} defaultOpen>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          <li>{t("policySummary1")}</li>
          <li>{t("policySummary2")}</li>
          <li>{t("policySummary3")}</li>
          <li>{t("policySummary4")}</li>
          <li>{t("policySummary5")}</li>
          <li>{t("policySummary6")}</li>
          <li>{t("policySummary7")}</li>
          <li>{t("policySummary8")}</li>
          <li>{t("policySummary9")}</li>
        </ol>
      </Collapsible>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <Collapsible title={t("policyFullTerms")}>
          {lang === "ne" ? <TermsFullNe /> : <TermsFullEn />}
        </Collapsible>
      </div>
    </div>
  );
}

function TermsFullEn() {
  return (
    <>
      <p className="mb-3 text-xs text-slate-400">Effective September 2026. Applicable jurisdiction: Nepal.</p>

      <h3 className={heading}>1. About Duleko</h3>
      <p className={body}>
        Duleko itself is not the employer of users listed on the platform and, unless specifically
        stated otherwise, is not a party to agreements made between users regarding work, wages,
        transportation, delivery, or other services.
      </p>

      <h3 className={heading}>2. Creating an Account</h3>
      <p className={body}>
        To create a Duleko account, users must provide accurate information and verify their mobile
        number through OTP. Users must not:
      </p>
      <ul className={list}>
        <li>impersonate another person;</li>
        <li>create accounts for fraudulent purposes;</li>
        <li>provide intentionally false information;</li>
        <li>upload fake certificates or qualifications; or</li>
        <li>misuse another person's phone number, photograph, identity, or personal information.</li>
      </ul>
      <p className={body}>Users are responsible for activity conducted through their accounts.</p>

      <h3 className={heading}>3. Skills and Qualifications</h3>
      <p className={body}>
        Users may list skills they are capable of performing. Simply listing a skill on Duleko does
        not mean Duleko has verified that skill. Where Duleko, a municipality, training institution,
        or another authorized organization has verified a certificate or qualification, the profile
        may display a separate verification indicator. Users must not falsely claim professional
        qualifications or certifications.
      </p>

      <h3 className={heading}>4. Work Arrangements</h3>
      <p className={body}>
        Users may contact one another and arrange work through Duleko. Unless Duleko explicitly
        states otherwise, the worker and hirer are responsible for agreeing on the work, location,
        time, price or wage, payment method, and other conditions.
      </p>
      <p className={body}>
        Duleko does not guarantee that a user will receive work, that a worker will perform work
        satisfactorily, or that another user will make payment. Users should use reasonable judgment
        before meeting or entering into a work arrangement.
      </p>

      <h3 className={heading}>5. Rates and Payments</h3>
      <p className={body}>
        Rates displayed on profiles are the user's stated or expected rates and may not represent a
        final agreed price. Unless Duleko later introduces an integrated payment service, payments
        are made directly between users, and Duleko does not hold, transfer, or guarantee those
        payments.
      </p>

      <h3 className={heading}>6. Reviews</h3>
      <p className={body}>
        Users may be permitted to review people with whom they have completed work. Reviews must
        reflect genuine experiences. Fake, abusive, discriminatory, threatening, or intentionally
        misleading reviews may be removed. Duleko may distinguish a user's reputation as a worker
        from their reputation as a hirer.
      </p>

      <h3 className={heading}>7. Safety and Prohibited Conduct</h3>
      <p className={body}>
        Duleko must not be used for fraud, harassment, threats, exploitation, discrimination,
        illegal activity, misleading representation, or activities that may endanger other users.
        Users should report suspicious or unsafe activity. Duleko may investigate reports and
        restrict, suspend, or terminate accounts where reasonably necessary to protect users or the
        platform.
      </p>
    </>
  );
}

function TermsFullNe() {
  return (
    <>
      <p className="mb-3 text-xs text-slate-400">प्रभावकारी मिति: सेप्टेम्बर २०२६। लागू हुने क्षेत्राधिकार: नेपाल।</p>

      <h3 className={heading}>१. दुलेकोको बारेमा</h3>
      <p className={body}>
        दुलेको आफैं प्लेटफर्ममा सूचीबद्ध प्रयोगकर्ताहरूको रोजगारदाता होइन, र स्पष्ट रूपमा अन्यथा नभनिएसम्म, प्रयोगकर्ताहरू
        बीच काम, ज्याला, यातायात, डेलिभरी, वा अन्य सेवाहरूको बारेमा भएका सम्झौताहरूको पक्ष होइन।
      </p>

      <h3 className={heading}>२. खाता खोल्दा</h3>
      <p className={body}>
        दुलेको खाता खोल्न, प्रयोगकर्ताले सही जानकारी दिनुपर्छ र OTP मार्फत आफ्नो मोबाइल नम्बर प्रमाणित गर्नुपर्छ।
        प्रयोगकर्ताले निम्न गर्नु हुँदैन:
      </p>
      <ul className={list}>
        <li>अर्को व्यक्तिको नक्कल गर्ने;</li>
        <li>ठगीको उद्देश्यले खाता खोल्ने;</li>
        <li>जानाजानी झूटो जानकारी दिने;</li>
        <li>नक्कली प्रमाणपत्र वा योग्यता अपलोड गर्ने; वा</li>
        <li>अर्को व्यक्तिको फोन नम्बर, फोटो, परिचय, वा व्यक्तिगत जानकारीको दुरुपयोग गर्ने।</li>
      </ul>
      <p className={body}>आफ्नो खाताबाट भएका गतिविधिको जिम्मेवारी प्रयोगकर्ता स्वयंको हुनेछ।</p>

      <h3 className={heading}>३. सीप र योग्यता</h3>
      <p className={body}>
        प्रयोगकर्ताले आफूले गर्न सक्ने सीपहरू सूचीबद्ध गर्न सक्छन्। दुलेकोमा कुनै सीप सूचीबद्ध गर्नु मात्रले दुलेकोले त्यो
        सीप प्रमाणित गरेको जनाउँदैन। दुलेको, नगरपालिका, तालिम संस्था, वा अन्य अधिकृत संस्थाले कुनै प्रमाणपत्र वा योग्यता
        प्रमाणित गरेको भए, प्रोफाइलमा छुट्टै प्रमाणीकरण चिन्ह देखिन सक्छ। प्रयोगकर्ताले पेशागत योग्यता वा प्रमाणपत्रको
        झूटो दाबी गर्नु हुँदैन।
      </p>

      <h3 className={heading}>४. काम मिलान</h3>
      <p className={body}>
        प्रयोगकर्ताले दुलेको मार्फत एकआपसमा सम्पर्क गरी काम मिलाउन सक्छन्। दुलेकोले स्पष्ट रूपमा अन्यथा नभनेसम्म,
        कामदार र काम दिनेले काम, स्थान, समय, मूल्य वा ज्याला, भुक्तानी विधि, र अन्य सर्तहरूमा सहमत हुने जिम्मेवारी
        लिन्छन्।
      </p>
      <p className={body}>
        दुलेकोले कुनै प्रयोगकर्तालाई काम पाउने, कामदारले सन्तोषजनक रूपमा काम गर्ने, वा अर्को प्रयोगकर्ताले भुक्तानी
        गर्ने ग्यारेन्टी दिँदैन। कसैलाई भेट्नु वा काम मिलान गर्नुअघि प्रयोगकर्ताले उचित सतर्कता अपनाउनुपर्छ।
      </p>

      <h3 className={heading}>५. दर र भुक्तानी</h3>
      <p className={body}>
        प्रोफाइलमा देखिने दरहरू प्रयोगकर्ताले उल्लेख गरेको वा अपेक्षा गरेको दर हो र यो अन्तिम सहमत मूल्य नहुन सक्छ।
        दुलेकोले पछि एकीकृत भुक्तानी सेवा नल्याएसम्म, भुक्तानी सिधै प्रयोगकर्ताहरू बीच हुन्छ, र दुलेकोले त्यस्ता
        भुक्तानी राख्दैन, स्थानान्तरण गर्दैन, वा ग्यारेन्टी दिँदैन।
      </p>

      <h3 className={heading}>६. समीक्षा</h3>
      <p className={body}>
        प्रयोगकर्ताले आफूले काम सम्पन्न गरेका व्यक्तिहरूको समीक्षा गर्न पाउन सक्छन्। समीक्षाले वास्तविक अनुभव
        झल्काउनुपर्छ। नक्कली, आपत्तिजनक, भेदभावपूर्ण, धम्कीपूर्ण, वा जानाजानी भ्रामक समीक्षा हटाइन सक्छ। दुलेकोले
        प्रयोगकर्ताको कामदारको रूपमा र काम दिनेको रूपमा रहेको प्रतिष्ठालाई फरक-फरक राख्न सक्छ।
      </p>

      <h3 className={heading}>७. सुरक्षा र निषेधित व्यवहार</h3>
      <p className={body}>
        दुलेको ठगी, दुर्व्यवहार, धम्की, शोषण, भेदभाव, गैरकानूनी गतिविधि, भ्रामक प्रस्तुति, वा अन्य प्रयोगकर्तालाई
        खतरामा पार्न सक्ने गतिविधिको लागि प्रयोग गर्नु हुँदैन। शंकास्पद वा असुरक्षित गतिविधिको जानकारी दिनुपर्छ।
        प्रयोगकर्ता वा प्लेटफर्मको सुरक्षाको लागि उचित रूपमा आवश्यक परेमा दुलेकोले उजुरीको छानबिन गरी खाता प्रतिबन्ध,
        निलम्बन, वा बन्द गर्न सक्छ।
      </p>
    </>
  );
}

function PrivacyContent({ lang }: { lang: "en" | "ne" }) {
  return lang === "ne" ? <PrivacyFullNe /> : <PrivacyFullEn />;
}

function PrivacyFullEn() {
  return (
    <div>
      <p className="mb-3 text-xs text-slate-400">Effective September 2026.</p>

      <h3 className={`${heading} mt-0`}>1. Information We Collect</h3>
      <p className={body}>Depending on the features a user chooses to use, Duleko may collect:</p>
      <ul className={list}>
        <li>Account information: name, mobile number, and authentication information.</li>
        <li>Profile information: photograph, skills, description, rates, general address or location, and availability.</li>
        <li>Work information: work requests, accepted or completed work, cancellations, and reviews.</li>
        <li>Verification information: certificates or other documents voluntarily submitted for verification.</li>
        <li>Location information: approximate or precise device location, when a feature requiring it is given permission.</li>
        <li>Technical information: information reasonably necessary for security, authentication, troubleshooting, and operation of Duleko.</li>
      </ul>
      <p className={body}>
        Nepal's Privacy Act expressly regulates personal information and privacy, so Duleko treats the
        collection, storage, and disclosure of this data as a core compliance matter, not merely an app
        setting.
      </p>

      <h3 className={heading}>2. Why We Use This Information</h3>
      <p className={body}>Duleko may use information to:</p>
      <ul className={list}>
        <li>create and maintain accounts;</li>
        <li>show users relevant workers and skills;</li>
        <li>enable users to connect;</li>
        <li>provide location-based discovery;</li>
        <li>verify users or qualifications;</li>
        <li>process work requests;</li>
        <li>display ratings and reviews;</li>
        <li>prevent fraud and misuse;</li>
        <li>improve Duleko; and</li>
        <li>comply with applicable Nepalese law.</li>
      </ul>
      <p className={body}>We do not collect personal information simply because it might become useful later.</p>

      <h3 className={heading}>3. Public Profile Information</h3>
      <p className={body}>
        Some information is intended to be visible to other Duleko users or visitors, such as name,
        profile photo, skills, expected rates, general location, availability, ratings, and verification
        status. Users are clearly informed which information becomes public before publishing their
        profile.
      </p>

      <h3 className={heading}>4. Phone Numbers</h3>
      <p className={body}>
        A user's mobile number is collected for account verification and communication. Duleko does not
        make phone numbers openly available to anonymous visitors. Where Duleko enables users to call or
        contact each other, access follows Duleko's account and privacy controls.
      </p>

      <h3 className={heading}>5. Location and Live Location</h3>
      <p className={body}>
        A user's exact or live location never becomes publicly visible merely because they created an
        account. Location access is permission-based, and where possible, public discovery displays an
        approximate area or distance rather than exact coordinates. Where Duleko offers live-location
        sharing, the user knowingly activates it and can stop sharing it at any time.
      </p>

      <h3 className={heading}>6. Certificates and Verification</h3>
      <p className={body}>
        Certificates submitted for verification do not automatically become publicly downloadable
        documents. Duleko may instead display an indicator such as:
      </p>
      <div className="my-2 flex flex-wrap gap-2">
        <Badge tone="success">Training Verified</Badge>
        <Badge tone="neutral">Verified by Municipality or Training Institution</Badge>
      </div>
      <p className={body}>Duleko collects and retains only the verification information reasonably necessary for this purpose.</p>

      <h3 className={heading}>7. Sharing Information</h3>
      <p className={body}>
        Duleko does not sell users' personal information. Information may be shared only where
        reasonably necessary to operate Duleko, where the user has authorized the sharing, with service
        providers needed to operate the platform subject to appropriate safeguards, or where disclosure
        is required by applicable law. A municipality partnering with Duleko does not automatically
        receive individual users' private information simply because it promotes or verifies people on
        the platform.
      </p>
      <p className={body}>For reporting purposes, Duleko prefers to share aggregated information such as:</p>
      <ul className={list}>
        <li>247 trained people registered</li>
        <li>163 received work opportunities</li>
        <li>92 completed work</li>
      </ul>
      <p className={body}>rather than disclosing individual people's private activity.</p>

      <h3 className={heading}>8. Data Security</h3>
      <p className={body}>
        Duleko takes reasonable technical and organizational measures to protect personal information
        from unauthorized access, disclosure, alteration, loss, or misuse. No online system can
        guarantee absolute security.
      </p>

      <h3 className={heading}>9. User Choices</h3>
      <p className={body}>Users have reasonable ways to:</p>
      <ul className={list}>
        <li>edit their information;</li>
        <li>control relevant visibility and location permissions;</li>
        <li>stop live-location sharing;</li>
        <li>log out; and</li>
        <li>request account deletion.</li>
      </ul>

      <h3 className={heading}>10. Changes to This Policy</h3>
      <p className={body}>
        Duleko may update this Privacy Policy as the platform develops or legal requirements change.
        Where a material change significantly affects how users' personal information is handled, users
        are appropriately informed.
      </p>
    </div>
  );
}

function PrivacyFullNe() {
  return (
    <div>
      <p className="mb-3 text-xs text-slate-400">प्रभावकारी मिति: सेप्टेम्बर २०२६।</p>

      <h3 className={`${heading} mt-0`}>१. हामीले सङ्कलन गर्ने जानकारी</h3>
      <p className={body}>प्रयोगकर्ताले प्रयोग गर्ने सुविधाहरूको आधारमा, दुलेकोले निम्न सङ्कलन गर्न सक्छ:</p>
      <ul className={list}>
        <li>खाता जानकारी: नाम, मोबाइल नम्बर, र प्रमाणीकरण जानकारी।</li>
        <li>प्रोफाइल जानकारी: फोटो, सीप, विवरण, दर, सामान्य ठेगाना वा स्थान, र उपलब्धता।</li>
        <li>काम सम्बन्धी जानकारी: कामको अनुरोध, स्वीकृत वा सम्पन्न काम, रद्द, र समीक्षा।</li>
        <li>प्रमाणीकरण जानकारी: प्रमाणीकरणको लागि स्वेच्छाले पेश गरिएका प्रमाणपत्र वा अन्य कागजात।</li>
        <li>स्थान जानकारी: अनुमति दिइएमा मात्र, अनुमानित वा सटीक डिभाइस स्थान।</li>
        <li>प्राविधिक जानकारी: सुरक्षा, प्रमाणीकरण, समस्या समाधान, र दुलेकोको सञ्चालनको लागि उचित रूपमा आवश्यक जानकारी।</li>
      </ul>
      <p className={body}>
        नेपालको गोपनीयता ऐनले व्यक्तिगत जानकारी र गोपनीयतालाई स्पष्ट रूपमा नियमन गर्छ, त्यसैले दुलेकोले यस्तो डेटाको
        सङ्कलन, भण्डारण, र खुलासालाई एउटा एप सेटिङ मात्र नभई मुख्य अनुपालन विषयको रूपमा लिन्छ।
      </p>

      <h3 className={heading}>२. हामी किन यो जानकारी प्रयोग गर्छौं</h3>
      <p className={body}>दुलेकोले जानकारी निम्न उद्देश्यका लागि प्रयोग गर्न सक्छ:</p>
      <ul className={list}>
        <li>खाता खोल्न र कायम राख्न;</li>
        <li>प्रयोगकर्तालाई सान्दर्भिक कामदार र सीप देखाउन;</li>
        <li>प्रयोगकर्तालाई जोडिन सक्षम बनाउन;</li>
        <li>स्थानमा आधारित खोज उपलब्ध गराउन;</li>
        <li>प्रयोगकर्ता वा योग्यता प्रमाणित गर्न;</li>
        <li>कामको अनुरोध प्रशोधन गर्न;</li>
        <li>रेटिङ र समीक्षा देखाउन;</li>
        <li>ठगी र दुरुपयोग रोक्न;</li>
        <li>दुलेकोलाई सुधार गर्न; र</li>
        <li>लागू हुने नेपाली कानून पालना गर्न।</li>
      </ul>
      <p className={body}>पछि उपयोगी हुन सक्छ भन्ने कारणले मात्र हामी व्यक्तिगत जानकारी सङ्कलन गर्दैनौं।</p>

      <h3 className={heading}>३. सार्वजनिक प्रोफाइल जानकारी</h3>
      <p className={body}>
        केही जानकारी अन्य दुलेको प्रयोगकर्ता वा भ्रमणकर्तालाई देखिने गरी राखिन्छ, जस्तै नाम, प्रोफाइल फोटो, सीप,
        अपेक्षित दर, सामान्य स्थान, उपलब्धता, रेटिङ, र प्रमाणीकरण स्थिति। प्रोफाइल प्रकाशित गर्नुअघि कुन जानकारी
        सार्वजनिक हुने हो भनेर प्रयोगकर्तालाई स्पष्ट रूपमा जानकारी दिइन्छ।
      </p>

      <h3 className={heading}>४. फोन नम्बर</h3>
      <p className={body}>
        प्रयोगकर्ताको मोबाइल नम्बर खाता प्रमाणीकरण र सञ्चारको लागि सङ्कलन गरिन्छ। दुलेकोले फोन नम्बर अज्ञात
        भ्रमणकर्तालाई खुला रूपमा उपलब्ध गराउँदैन। दुलेकोले प्रयोगकर्तालाई एकआपसमा फोन गर्न वा सम्पर्क गर्न दिने
        ठाउँमा, पहुँच दुलेकोको खाता र गोपनीयता नियन्त्रण अनुसार हुन्छ।
      </p>

      <h3 className={heading}>५. स्थान र लाइभ स्थान</h3>
      <p className={body}>
        प्रयोगकर्ताले खाता खोलेको कारणले मात्र उसको सटीक वा लाइभ स्थान कहिल्यै सार्वजनिक रूपमा देखिँदैन। स्थान पहुँच
        अनुमतिमा आधारित हुन्छ, र सम्भव भएसम्म, सार्वजनिक खोजमा सटीक निर्देशांकको सट्टा अनुमानित क्षेत्र वा दूरी
        देखाइन्छ। दुलेकोले लाइभ-स्थान साझेदारी उपलब्ध गराएमा, प्रयोगकर्ताले जानीजानी त्यो सक्रिय गर्छ र जुनसुकै बेला
        रोक्न सक्छ।
      </p>

      <h3 className={heading}>६. प्रमाणपत्र र प्रमाणीकरण</h3>
      <p className={body}>
        प्रमाणीकरणको लागि पेश गरिएका प्रमाणपत्र स्वतः सार्वजनिक रूपमा डाउनलोड गर्न मिल्ने कागजात बन्दैनन्। यसको सट्टा
        दुलेकोले निम्न जस्तो चिन्ह देखाउन सक्छ:
      </p>
      <div className="my-2 flex flex-wrap gap-2">
        <Badge tone="success">तालिम प्रमाणित</Badge>
        <Badge tone="neutral">नगरपालिका वा तालिम संस्थाद्वारा प्रमाणित</Badge>
      </div>
      <p className={body}>दुलेकोले यस उद्देश्यका लागि उचित रूपमा आवश्यक प्रमाणीकरण जानकारी मात्र सङ्कलन र सुरक्षित राख्छ।</p>

      <h3 className={heading}>७. जानकारी साझेदारी</h3>
      <p className={body}>
        दुलेकोले प्रयोगकर्ताको व्यक्तिगत जानकारी बेच्दैन। जानकारी दुलेको सञ्चालनको लागि उचित रूपमा आवश्यक भएमा,
        प्रयोगकर्ताले साझेदारीको अनुमति दिएमा, उपयुक्त सुरक्षा उपायसहित प्लेटफर्म सञ्चालनको लागि आवश्यक सेवा
        प्रदायकसँग, वा लागू कानूनले खुलासा आवश्यक गरेमा मात्र साझा गरिन्छ। दुलेकोसँग साझेदारी गर्ने नगरपालिकाले
        प्लेटफर्ममा मानिसहरूलाई बढावा वा प्रमाणित गरेको कारणले मात्र व्यक्तिगत प्रयोगकर्ताको निजी जानकारी स्वतः
        पाउँदैन।
      </p>
      <p className={body}>प्रतिवेदनको उद्देश्यका लागि, दुलेकोले निम्न जस्तो सारांशित जानकारी साझा गर्न रुचाउँछ:</p>
      <ul className={list}>
        <li>२४७ जना तालिम प्राप्त व्यक्ति दर्ता भए</li>
        <li>१६३ जनाले काम अवसर पाए</li>
        <li>९२ जनाले काम सम्पन्न गरे</li>
      </ul>
      <p className={body}>व्यक्तिगत मानिसहरूको निजी गतिविधि खुलासा गर्नुको सट्टा।</p>

      <h3 className={heading}>८. डेटा सुरक्षा</h3>
      <p className={body}>
        दुलेकोले व्यक्तिगत जानकारीलाई अनधिकृत पहुँच, खुलासा, परिवर्तन, हानि, वा दुरुपयोगबाट जोगाउन उचित प्राविधिक र
        संगठनात्मक उपायहरू अपनाउँछ। कुनै पनि अनलाइन प्रणालीले पूर्ण सुरक्षाको ग्यारेन्टी दिन सक्दैन।
      </p>

      <h3 className={heading}>९. प्रयोगकर्ताका विकल्पहरू</h3>
      <p className={body}>प्रयोगकर्तासँग निम्न गर्ने उचित तरिका हुन्छ:</p>
      <ul className={list}>
        <li>आफ्नो जानकारी सम्पादन गर्ने;</li>
        <li>देखिने कुरा र स्थान अनुमति नियन्त्रण गर्ने;</li>
        <li>लाइभ-स्थान साझेदारी रोक्ने;</li>
        <li>लगआउट गर्ने; र</li>
        <li>खाता मेटाउन अनुरोध गर्ने।</li>
      </ul>

      <h3 className={heading}>१०. यस नीतिमा परिवर्तन</h3>
      <p className={body}>
        प्लेटफर्मको विकास वा कानूनी आवश्यकता परिवर्तन भएअनुसार दुलेकोले यो गोपनीयता नीति अद्यावधिक गर्न सक्छ।
        प्रयोगकर्ताको व्यक्तिगत जानकारी व्यवस्थापन गर्ने तरिकामा महत्त्वपूर्ण असर पार्ने परिवर्तन भएमा, प्रयोगकर्तालाई
        उपयुक्त रूपमा जानकारी दिइन्छ।
      </p>
    </div>
  );
}
