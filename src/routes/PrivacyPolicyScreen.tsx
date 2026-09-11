import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import dulekoMark from "@/assets/duleko-mark.png";

/**
 * A fully static, standalone page - no session, no Supabase call, nothing
 * that can fail or hang. It's linked from the Play Store listing and app
 * settings, so it has to render for anyone (a signed-out visitor, an app
 * store reviewer, someone without an account at all) unconditionally. See
 * the early-return for "/privacy" in AppShell (src/App.tsx) - this page is
 * deliberately kept outside the normal auth-gated shell for that reason.
 */
export function PrivacyPolicyScreen() {
  return (
    <div className="min-h-dvh bg-cream-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Link>
          <img src={dulekoMark} alt="" className="h-7 w-7 rounded-lg object-cover" />
          <span className="font-semibold text-slate-900">Duleko</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8 text-sm leading-relaxed text-slate-700">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mb-8 text-xs text-slate-400">Last updated: September 11, 2026</p>

        <p className="mb-6">
          Duleko ("we", "us", "our") connects people who need work done with skilled workers
          nearby. This page explains what information we collect, why, and the choices you have
          about it.
        </p>

        <Section title="Information we collect">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Account information</strong> - your email address, used to sign in and for
              account-related messages.
            </li>
            <li>
              <strong>Profile information</strong> - your name, photo, bio, skills, and general
              location (district/locality), which is shown to other users as part of the service.
            </li>
            <li>
              <strong>Precise location</strong> - only if you turn this on. It's used to sort
              search results by distance and to show your approximate location on your profile.
              You can turn it off at any time, and it is never collected without your consent.
            </li>
            <li>
              <strong>Messages</strong> - chat messages you send through Duleko, stored so
              conversations persist between sessions.
            </li>
            <li>
              <strong>Usage information</strong> - basic technical data (like device type and app
              version) used to keep the service working reliably.
            </li>
          </ul>
        </Section>

        <Section title="How we use this information">
          <p>We use your information to:</p>
          <ul className="mt-1.5 list-disc space-y-1.5 pl-5">
            <li>Operate the core features of Duleko - profiles, search, work requests, and chat</li>
            <li>Sort search results by distance, when you've shared your location</li>
            <li>Send you notifications about requests, messages, and reviews</li>
            <li>Keep the platform safe (e.g. reviewing reports of misuse)</li>
          </ul>
          <p className="mt-2">We do not sell your personal information, and we do not use it for advertising.</p>
        </Section>

        <Section title="Who your information is shared with">
          <p>
            Your public profile (name, photo, bio, skills, general location, ratings) is visible
            to other Duleko users, since that's the point of the service. Precise location and
            chat messages are only visible to the people you choose to share them with.
          </p>
          <p className="mt-2">
            We use <strong>Supabase</strong> as our backend infrastructure provider (database,
            authentication, and file storage). They process data on our behalf and don't use it
            for their own purposes.
          </p>
        </Section>

        <Section title="Your choices">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>You can edit or remove most profile information at any time from your profile.</li>
            <li>You can turn location sharing on or off at any time.</li>
            <li>
              You can permanently delete your account and associated data from Profile → Delete
              account.
            </li>
          </ul>
        </Section>

        <Section title="Children's privacy">
          <p>Duleko is not directed at children, and we do not knowingly collect information from anyone under 13.</p>
        </Section>

        <Section title="Security">
          <p>
            We take reasonable technical and organizational measures to protect your information,
            but no method of storage or transmission is 100% secure.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If this policy changes, we'll update the date above. Continued use of Duleko after a
            change means you accept the updated policy.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about this policy or your data? Reach us at{" "}
            <a href="mailto:dulekonepal@gmail.com" className="font-medium text-brand-700 underline">
              dulekonepal@gmail.com
            </a>
            .
          </p>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-base font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}
