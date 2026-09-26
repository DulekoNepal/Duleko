import { Store } from "lucide-react";
import {
  Eyebrow,
  FinalCta,
  Flow,
  PageHero,
  Prose,
  SectionHeading,
  SiteLayout,
  SiteSection,
  StoryLink,
  StoryNav,
} from "@/components/duleko/Site";

export function MissionPage() {
  return (
    <SiteLayout title="Our Mission">
      <PageHero story="mission" eyebrow="Our Mission" title="A skill should not need a shop to become a business.">
        <Prose>
          <p>
            For many people, the biggest barrier to turning a skill into income is not the lack of ability.
            It is the cost and difficulty of becoming visible to customers.
          </p>
        </Prose>
      </PageHero>

      <SiteSection>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="rounded-2xl border border-slate-200 bg-cream-50 p-8">
            <Store className="mb-4 h-8 w-8 text-slate-400" aria-hidden />
            <p className="text-lg leading-relaxed text-slate-700">
              A physical business may require a shop, rent, equipment, a prime location, and ongoing
              expenses.
            </p>
          </div>
          <div>
            <Prose>
              <p>Duleko is built around a different possibility:</p>
            </Prose>
            <p className="mt-4 text-2xl font-bold leading-snug text-teal-800 sm:text-3xl">
              What if your skill itself could be the beginning of your business?
            </p>
            <Prose className="mt-6">
              <p>
                Duleko provides a virtual space where people can showcase their skills, become discoverable,
                and connect with people who need their services.
              </p>
            </Prose>
          </div>
        </div>
      </SiteSection>

      <SiteSection tone="cream">
        <div className="max-w-3xl">
          <Eyebrow>What We Do</Eyebrow>
          <SectionHeading>Making Skills Economically Discoverable</SectionHeading>
          <Prose className="mt-6">
            <p>
              Skills exist everywhere—among students, professionals, trained workers, farmers, tradespeople,
              business owners, and people who learned through years of experience.
            </p>
            <p>
              Our mission is to make those skills easier to discover and connect them with real
              opportunities.
            </p>
          </Prose>
          <Flow className="mt-8" steps={["Skill", "Visibility", "Opportunity", "Income"]} />
        </div>
      </SiteSection>

      <SiteSection>
        <div className="max-w-3xl">
          <Eyebrow>Beyond the Certificate</Eyebrow>
          <SectionHeading>Training Should Lead Somewhere</SectionHeading>
          <Prose className="mt-6">
            <p>
              Every year, people develop skills through government programs, educational institutions, private
              training, apprenticeships, and personal experience.
            </p>
            <p>But training alone does not guarantee work.</p>
            <p>
              A certificate can show that someone completed training. Duleko aims to help connect that skill
              with the people who may need it.
            </p>
          </Prose>
          <Flow
            className="mt-8"
            steps={["Training", "Profile", "Discovery", "Work", "Reputation", "Opportunity"]}
          />
          <blockquote className="mt-10 border-l-4 border-accent-500 pl-5 text-xl font-semibold leading-snug text-teal-800 sm:text-2xl">
            We don't want skills to end with certificates. We want them to reach the people who need them.
          </blockquote>
          <StoryLink to="/partners" className="mt-8">
            For Municipalities &amp; Training Providers
          </StoryLink>
        </div>
      </SiteSection>

      <SiteSection tone="brand">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Our Vision</Eyebrow>
          <p className="text-balance text-2xl font-semibold leading-snug text-teal-800 sm:text-3xl sm:leading-snug">
            A Nepal where skills don't remain hidden, training doesn't end with certificates, and starting a
            service-based business doesn't always require a physical shop or large investment.
          </p>
        </div>
      </SiteSection>

      <StoryNav current="mission" />
      <FinalCta />
    </SiteLayout>
  );
}
