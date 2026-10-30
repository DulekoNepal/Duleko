import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowDown, CheckCircle2, Loader2, Mail, Send, ShieldCheck, TrendingUp } from "lucide-react";
import {
  CONTACT_EMAIL,
  IconBadge,
  Lead,
  PageHero,
  Prose,
  SiteButton,
  SiteLayout,
  SiteSection,
  siteCard,
} from "@/components/duleko/Site";
import { RidgeLines } from "@/components/duleko/site/ui";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useI18n, type StringKey } from "@/lib/i18n";
import { submitInvestorInterest, type InvestorInterestInput } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { cn, formatNumber } from "@/lib/utils";

const NEXT_STEPS: StringKey[] = ["investNext1", "investNext2", "investNext3"];

const EMPTY: InvestorInterestInput = { name: "", email: "", phone: "", address: "", message: "" };

/** Same rules as submit_investor_interest (8500), so most mistakes never reach it. */
function validate(form: InvestorInterestInput): Partial<Record<keyof InvestorInterestInput, StringKey>> {
  const errors: Partial<Record<keyof InvestorInterestInput, StringKey>> = {};
  if (form.name.trim().length < 2) errors.name = "investErrName";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) errors.email = "investErrEmail";
  if (!/^\+?[0-9]{7,15}$/.test(form.phone.replace(/[\s().-]/g, "").replace(/^00/, "+"))) errors.phone = "investErrPhone";
  if (form.address.trim().length < 5) errors.address = "investErrAddress";
  if (form.message.trim().length < 10) errors.message = "investErrMessage";
  return errors;
}

/**
 * Partnerships > Investors: "Would you like to invest in Duleko?" and a
 * short form - name, email, phone, complete address, message. What's sent lands
 * in Duleko's official inbox and on the staff Investors screen (8500).
 */
export function InvestPage() {
  const { t } = useI18n();
  return (
    <SiteLayout title={t("investEyebrow")}>
      <PageHero
        crumb={{ group: t("footerPartnerships"), title: t("investEyebrow") }}
        eyebrow={t("investEyebrow")}
        title={t("investHeroTitle")}
        aside={<NextSteps />}
      >
        <Lead>
          <p>{t("investBody")}</p>
        </Lead>
        <a
          href="#invest-form"
          className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_10px_24px_-12px_rgb(21_128_61/0.7)] transition-colors hover:bg-brand-800 sm:text-base"
        >
          {t("investToForm")}
          <ArrowDown className="h-4 w-4" aria-hidden />
        </a>
      </PageHero>

      <SiteSection id="invest-form" tone="paper">
        <div className="mx-auto max-w-2xl">
          <InvestForm />
          <div className="mt-5 space-y-3">
            <p className="flex gap-3 rounded-2xl bg-surface p-4 text-sm leading-relaxed text-slate-600 ring-1 ring-slate-200/80">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
              <span className="min-w-0 flex-1">{t("investPrivacy")}</span>
            </p>
            <p className="flex flex-wrap items-center gap-x-1.5 px-1 text-sm text-slate-600">
              <Mail className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              {t("investOrEmail")}
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Investing in Duleko")}`}
                className="font-semibold text-brand-700 underline-offset-4 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </SiteSection>
    </SiteLayout>
  );
}

/** Beside the copy on a laptop, under it on a phone: what happens after sending. */
function NextSteps() {
  const { t, lang } = useI18n();
  return (
    <div className="band relative overflow-hidden rounded-3xl bg-teal-800 p-6 text-white shadow-[0_40px_80px_-40px_rgb(12_60_72/0.6)] sm:p-8">
      <RidgeLines className="text-white/[0.07]" seed={8} lines={9} />
      <p className="eyebrow-track relative text-xs font-bold uppercase text-brand-300">{t("investNextTitle")}</p>
      <ol className="relative mt-5 space-y-4">
        {NEXT_STEPS.map((key, i) => (
          <li key={key} className="flex items-center gap-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold tabular-nums text-brand-300 ring-1 ring-white/15">
              {formatNumber(i + 1, lang)}
            </span>
            <span className="text-[17px] font-semibold leading-snug sm:text-lg">{t(key)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function InvestForm() {
  const { t, lang } = useI18n();
  const [form, setForm] = useState<InvestorInterestInput>(EMPTY);
  const [showErrors, setShowErrors] = useState(false);
  // Left empty by people; a bot filling every field fills this one too.
  const [trap, setTrap] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: async () => {
      if (trap) return;
      await submitInvestorInterest(form, lang);
    },
    onSuccess: () => {
      setSentTo(form.email.trim());
      setForm(EMPTY);
      setShowErrors(false);
    },
  });

  const errors = validate(form);
  const fieldError = (key: keyof InvestorInterestInput) => (showErrors && errors[key] ? t(errors[key]) : undefined);
  const set = (key: keyof InvestorInterestInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (sentTo) {
    return (
      <div className={cn(siteCard, "flex flex-col items-center p-6 text-center sm:p-10")} role="status">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
          <CheckCircle2 className="h-7 w-7" aria-hidden />
        </span>
        <h2 className="font-display mt-4 text-2xl font-semibold text-teal-800 sm:text-[1.75rem]">{t("investSentTitle")}</h2>
        <Prose className="mt-2">
          <p>{t("investSentBody", { email: sentTo })}</p>
        </Prose>
        <SiteButton variant="outline" size="sm" className="mt-6" onClick={() => setSentTo(null)}>
          {t("investSendAnother")}
        </SiteButton>
      </div>
    );
  }

  return (
    <form
      noValidate
      className={cn(siteCard, "p-5 sm:p-8")}
      onSubmit={(e) => {
        e.preventDefault();
        setShowErrors(true);
        if (Object.keys(errors).length === 0 && !send.isPending) send.mutate();
      }}
    >
      <div className="mb-6 flex items-start gap-4">
        <IconBadge icon={TrendingUp} tone="brand" />
        <div>
          <h2 className="font-display text-2xl font-semibold text-teal-800 sm:text-[1.75rem]">{t("investFormTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("investFormBody")}</p>
        </div>
      </div>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={t("investName")} error={fieldError("name")}>
          <Input
            value={form.name}
            onChange={set("name")}
            autoComplete="name"
            maxLength={100}
            placeholder={t("investNamePlaceholder")}
            aria-invalid={Boolean(fieldError("name"))}
          />
        </Field>
        <Field label={t("investEmail")} hint={t("investEmailHint")} error={fieldError("email")}>
          <Input
            type="email"
            inputMode="email"
            value={form.email}
            onChange={set("email")}
            autoComplete="email"
            maxLength={200}
            placeholder="name@example.com"
            aria-invalid={Boolean(fieldError("email"))}
          />
        </Field>
      </div>
      <Field label={t("investPhone")} hint={t("investPhoneHint")} error={fieldError("phone")}>
        <Input
          type="tel"
          inputMode="tel"
          value={form.phone}
          onChange={set("phone")}
          autoComplete="tel"
          maxLength={24}
          placeholder="+977 98XXXXXXXX"
          aria-invalid={Boolean(fieldError("phone"))}
        />
      </Field>
      <Field label={t("investAddress")} error={fieldError("address")}>
        <Input
          value={form.address}
          onChange={set("address")}
          autoComplete="street-address"
          maxLength={300}
          placeholder={t("investAddressPlaceholder")}
          aria-invalid={Boolean(fieldError("address"))}
        />
      </Field>
      <Field label={t("investMessage")} error={fieldError("message")}>
        <Textarea
          value={form.message}
          onChange={set("message")}
          rows={5}
          maxLength={2000}
          placeholder={t("investMessagePlaceholder")}
          aria-invalid={Boolean(fieldError("message"))}
        />
      </Field>

      {/* Hidden from people and screen readers. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={trap}
        onChange={(e) => setTrap(e.target.value)}
        className="absolute -left-[9999px] h-px w-px opacity-0"
        aria-hidden
      />

      {send.isError && (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {errorMessage(send.error)}
        </p>
      )}

      <SiteButton type="submit" size="lg" className="mt-1 w-full sm:w-auto" disabled={send.isPending}>
        {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
        {send.isPending ? t("investSending") : t("investSend")}
      </SiteButton>
    </form>
  );
}
