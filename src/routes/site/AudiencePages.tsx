import { ArrowRight, CheckCircle2, Mail, Search, UserPlus } from "lucide-react";
import {
  CONTACT_EMAIL,
  FinalCta,
  Flow,
  PageHero,
  Prose,
  SectionHeading,
  SiteButton,
  SiteLayout,
  SiteSection,
  StoryLink,
  StoryNav,
  useSiteActions,
} from "@/components/duleko/Site";

const INDIVIDUAL_STEPS = [
  "Create your profile",
  "Showcase your skills",
  "Set your availability",
  "Be discovered by people nearby",
  "Connect with people who need your services",
  "Build your reputation",
];

export function ForIndividualsPage() {
  const { createProfile } = useSiteActions();
  return (
    <SiteLayout title="For Individuals">
      <PageHero story="individuals" eyebrow="For Individuals" title="Turn Your Skills Into Opportunities">
        <Prose>
          <p>
            Whether you are a student, professional, trained worker, farmer, tradesperson, or someone with
            skills learned through experience, Duleko gives you a place to showcase what you can do.
          </p>
        </Prose>
      </PageHero>

      <SiteSection>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INDIVIDUAL_STEPS.map((step) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
              <span className="text-base font-medium text-slate-800 sm:text-lg">{step}</span>
            </li>
          ))}
        </ul>
        <div className="mt-12 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
          <SiteButton size="lg" onClick={createProfile}>
            <UserPlus className="h-5 w-5" aria-hidden />
            Create Your Duleko Profile
          </SiteButton>
          <StoryLink to="/safety">How we keep it safe</StoryLink>
        </div>
      </SiteSection>
      <StoryNav current="individuals" />
      <FinalCta />
    </SiteLayout>
  );
}

export function ForBusinessesPage() {
  const { explore } = useSiteActions();
  return (
    <SiteLayout title="For Businesses">
      <PageHero story="businesses" eyebrow="For Businesses" title="Find the Skills Your Business Needs">
        <Prose>
          <p>
            Businesses don't always need permanent employees. Sometimes they need someone with a specific
            skill for a specific job.
          </p>
          <p>Duleko helps businesses discover skilled people and connect with them directly.</p>
        </Prose>
        <div className="mt-9">
          <SiteButton size="lg" onClick={() => explore("/search")}>
            <Search className="h-5 w-5" aria-hidden />
            Find Skilled People
          </SiteButton>
        </div>
      </PageHero>
      <StoryNav current="businesses" />
      <FinalCta />
    </SiteLayout>
  );
}

export function PartnersPage() {
  const partnerMail = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Partnering with Duleko")}`;
  return (
    <SiteLayout title="For Municipalities & Training Providers">
      <PageHero
        story="partners"
        eyebrow="For Municipalities & Training Providers"
        title="From Skill Training to Skill Utilization"
      >
        <Prose>
          <p>
            Duleko provides a digital platform where people who receive skill training can showcase what they
            have learned and become discoverable for relevant opportunities.
          </p>
        </Prose>
      </PageHero>

      <SiteSection>
        <Flow steps={["Training", "Skills", "Duleko", "Work", "Income"]} />

        <div className="mt-14 max-w-3xl">
          <SectionHeading>Training should not end when a certificate is issued.</SectionHeading>
          <div className="mt-8 rounded-2xl border border-accent-500/40 bg-accent-50 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
              The next question should be
            </p>
            <p className="mt-2 text-2xl font-bold text-teal-800 sm:text-3xl">Where can this person use the skill?</p>
          </div>
          <a
            href={partnerMail}
            className="mt-10 inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-brand-700 px-7 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
          >
            <Mail className="h-5 w-5" aria-hidden />
            Partner With Duleko
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </SiteSection>
      <StoryNav current="partners" />
      <FinalCta />
    </SiteLayout>
  );
}
