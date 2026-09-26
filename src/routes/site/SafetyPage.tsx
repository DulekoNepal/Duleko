import { ClipboardList, Lock, ShieldAlert, Smartphone, Star } from "lucide-react";
import {
  FinalCta,
  IconCard,
  PageHero,
  Prose,
  SiteLayout,
  SiteSection,
  StoryLink,
  StoryNav,
} from "@/components/duleko/Site";

const FEATURES = [
  { icon: Smartphone, title: "Phone Verification", body: "Help establish authentic user accounts." },
  { icon: ClipboardList, title: "Work Requests", body: "Create context before people connect for work." },
  { icon: Star, title: "Reviews & Reputation", body: "Build trust through completed work and feedback." },
  { icon: ShieldAlert, title: "Report & Block", body: "Give users tools to respond to inappropriate behavior." },
  {
    icon: Lock,
    title: "Privacy Controls",
    body: "Protect personal information and control how people connect with you.",
  },
];

export function SafetyPage() {
  return (
    <SiteLayout title="Trust & Safety">
      <PageHero story="safety" eyebrow="Trust & Safety" title="Built for Connection. Designed With Safety in Mind.">
        <Prose>
          <p>
            Duleko is designed with tools and policies that help make interactions safer, more transparent,
            and more accountable.
          </p>
        </Prose>
      </PageHero>

      <SiteSection>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon, title, body }) => (
            <IconCard key={title} icon={icon} title={title}>
              {body}
            </IconCard>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
          <StoryLink to="/privacy">Privacy Policy</StoryLink>
          <StoryLink to="/terms">Terms of Service</StoryLink>
        </div>
      </SiteSection>

      <StoryNav current="safety" />
      <FinalCta />
    </SiteLayout>
  );
}
