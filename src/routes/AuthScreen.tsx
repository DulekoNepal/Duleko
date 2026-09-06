import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { LanguageToggle } from "@/components/duleko/Layout";
import { PolicyDialog } from "@/components/duleko/PolicyDialog";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { supabase, errorMessage } from "@/lib/supabase";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type FormValues = z.infer<typeof schema>;

export function AuthScreen() {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [policyOpen, setPolicyOpen] = useState<"terms" | "privacy" | null>(null);

  async function onGoogle() {
    if (mode === "signup" && !agreed) {
      setError(t("mustAgreeToPolicies"));
      return;
    }
    setGoogleBusy(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (oauthError) throw oauthError;
      // On success the browser navigates away to Google, so nothing else to do here.
    } catch (err) {
      setError(errorMessage(err));
      setGoogleBusy(false);
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    if (mode === "signup" && !agreed) {
      setError(t("mustAgreeToPolicies"));
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
        });
        if (signUpError) throw signUpError;
        // With email confirmation on, there is no session yet.
        if (!data.session) setNotice(t("checkEmail"));
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: "signin" | "signup") {
    if (next === mode) return;
    setMode(next);
    setError(null);
    setNotice(null);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream-50">
      <div className="flex justify-end p-4">
        <LanguageToggle />
      </div>

      <div className="mx-auto w-full max-w-sm flex-1 px-5 pb-10">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-2xl font-bold text-white shadow-sm">
            D
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t("authWelcome")}</h1>
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-slate-500">{t("authBlurb")}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div
            className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-medium"
            role="tablist"
            aria-label="Sign in or create account"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              onClick={() => switchMode("signin")}
              className={cn(
                "rounded-lg py-2 transition-colors",
                mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
              )}
            >
              {t("signIn")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              onClick={() => switchMode("signup")}
              className={cn(
                "rounded-lg py-2 transition-colors",
                mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
              )}
            >
              {t("signUp")}
            </button>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <Field label={t("email")} error={form.formState.errors.email && t("required")}>
              <Input
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder={t("emailPlaceholder")}
                {...form.register("email")}
              />
            </Field>

            <Field
              label={t("password")}
              hint={mode === "signup" ? t("passwordHint") : undefined}
              error={form.formState.errors.password && t("passwordHint")}
            >
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="pr-11"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
            </Field>

            {error && (
              <p className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}
            {notice && (
              <p className="mb-4 flex items-start gap-2 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {notice}
              </p>
            )}

            {mode === "signup" && (
              <label className="mb-4 flex items-start gap-2.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-700"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked) setError(null);
                  }}
                />
                <span>
                  {t("iAgreeToThe")}{" "}
                  <button
                    type="button"
                    onClick={() => setPolicyOpen("terms")}
                    className="font-medium text-brand-700 underline underline-offset-2"
                  >
                    {t("termsOfService")}
                  </button>{" "}
                  {lang === "ne" ? "र" : "and"}{" "}
                  <button
                    type="button"
                    onClick={() => setPolicyOpen("privacy")}
                    className="font-medium text-brand-700 underline underline-offset-2"
                  >
                    {t("privacyPolicy")}
                  </button>
                  .
                </span>
              </label>
            )}

            <Button type="submit" size="lg" className="w-full" loading={busy}>
              {mode === "signin" ? t("signIn") : t("signUp")}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs uppercase text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            {t("orDivider")}
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            loading={googleBusy}
            onClick={onGoogle}
          >
            <GoogleIcon className="h-4 w-4" aria-hidden />
            {t("continueWithGoogle")}
          </Button>
        </div>
      </div>

      <PolicyDialog open={policyOpen === "terms"} onClose={() => setPolicyOpen(null)} kind="terms" />
      <PolicyDialog open={policyOpen === "privacy"} onClose={() => setPolicyOpen(null)} kind="privacy" />
    </div>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.94H1.28v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.28 6.6l4 3.1C6.23 6.86 8.88 4.75 12 4.75z"
      />
    </svg>
  );
}
