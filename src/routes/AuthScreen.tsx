import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { OtpInput } from "@/components/ui/otp-input";
import { LanguageToggle } from "@/components/duleko/Layout";
import { PolicyDialog } from "@/components/duleko/PolicyDialog";
import { siteOrigin } from "@/lib/share";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { supabase, errorMessage } from "@/lib/supabase";
import dulekoMark from "@/assets/duleko-mark.png";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type FormValues = z.infer<typeof schema>;

const RESEND_COOLDOWN_SECONDS = 45;
const OTP_LENGTH = 6;

/**
 * Everything past the initial email+password form: confirming a brand new
 * account by code, and resetting a forgotten password by code. Both reuse
 * the same three beats - request a code, enter it, then finish the action
 * it unlocked - which is why they share one screen instead of two.
 */
type View = "auth" | "verify" | "forgotEmail" | "forgotCode" | "forgotPassword";

export function AuthScreen({ onBack }: { onBack?: () => void }) {
  const { t, lang } = useI18n();
  const [view, setView] = useState<View>("auth");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [policyOpen, setPolicyOpen] = useState<"terms" | "privacy" | null>(null);

  // Shared between the verify-email and forgot-password flows - both are
  // "a code went to this address, now type it back" at heart.
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function resetTransient() {
    setError(null);
    setNotice(null);
  }

  function goToAuth() {
    setView("auth");
    setOtp("");
    setPendingEmail("");
    setNewPassword("");
    setNewPasswordConfirm("");
    resetTransient();
  }

  async function onGoogle() {
    if (mode === "signup" && !agreed) {
      setError(t("mustAgreeToPolicies"));
      return;
    }
    setGoogleBusy(true);
    setError(null);
    try {
      // The real domain, not whatever host happens to be serving this
      // page - visiting the Vercel default URL directly (or a preview
      // deploy) must still bounce back to the live site, not to itself.
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: siteOrigin(),
          // Without this, Google silently reuses whatever account is
          // already signed into the browser and bounces straight back -
          // no picker, no chance to pick a different account. Forcing it
          // means every click here really does ask, every time.
          queryParams: { prompt: "select_account" },
        },
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
    if (mode === "signup") {
      if (!agreed) {
        setError(t("mustAgreeToPolicies"));
        return;
      }
      if (values.password !== confirmPassword) {
        setError(t("passwordsDontMatch"));
        return;
      }
    }
    setBusy(true);
    resetTransient();
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
        });
        if (signUpError) throw signUpError;
        // With email confirmation on, there is no session yet - move to
        // the code-entry step instead of just telling them to go check.
        if (!data.session) {
          setPendingEmail(values.email);
          setOtp("");
          setCooldown(RESEND_COOLDOWN_SECONDS);
          setView("verify");
        }
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

  async function onVerifySignup() {
    if (otp.length !== OTP_LENGTH) return;
    setBusy(true);
    resetTransient();
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: otp,
        type: "signup",
      });
      if (verifyError) throw verifyError;
      // A session now exists - AppShell notices and moves on by itself.
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onResendSignupCode() {
    if (cooldown > 0) return;
    setBusy(true);
    resetTransient();
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
      });
      if (resendError) throw resendError;
      setNotice(t("codeResent"));
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onRequestReset(email: string) {
    setBusy(true);
    resetTransient();
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      if (resetError) throw resetError;
      setPendingEmail(email);
      setOtp("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setView("forgotCode");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onResendResetCode() {
    if (cooldown > 0) return;
    setBusy(true);
    resetTransient();
    try {
      const { error: resendError } = await supabase.auth.resetPasswordForEmail(pendingEmail);
      if (resendError) throw resendError;
      setNotice(t("codeResent"));
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyResetCode() {
    if (otp.length !== OTP_LENGTH) return;
    setBusy(true);
    resetTransient();
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: otp,
        type: "recovery",
      });
      if (verifyError) throw verifyError;
      setView("forgotPassword");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSetNewPassword() {
    if (newPassword.length < 6) {
      setError(t("passwordHint"));
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError(t("passwordsDontMatch"));
      return;
    }
    setBusy(true);
    resetTransient();
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      // The recovery code already left them signed in - AppShell takes
      // it from here now that the password is actually changed.
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: "signin" | "signup") {
    if (next === mode) return;
    setMode(next);
    setConfirmPassword("");
    resetTransient();
  }

  const heading =
    view === "verify"
      ? { title: t("verifyEmailTitle"), blurb: t("verifyEmailBlurb", { email: pendingEmail }) }
      : view === "forgotEmail"
        ? { title: t("resetPasswordTitle"), blurb: t("resetPasswordBlurb") }
        : view === "forgotCode"
          ? { title: t("resetPasswordTitle"), blurb: t("verifyResetCodeBlurb", { email: pendingEmail }) }
          : view === "forgotPassword"
            ? { title: t("resetPasswordTitle"), blurb: null }
            : { title: t("authWelcome"), blurb: t("authBlurb") };

  return (
    <div className="flex min-h-dvh flex-col bg-cream-50">
      <div className="flex items-center justify-between p-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t("back")}
          </button>
        ) : (
          <span />
        )}
        <LanguageToggle />
      </div>

      <div className="mx-auto w-full max-w-sm flex-1 px-5 pb-10">
        <div className="mb-7 text-center">
          <img
            src={dulekoMark}
            alt=""
            className="mx-auto mb-4 h-14 w-14 rounded-2xl object-cover shadow-sm"
          />
          <h1 className="text-2xl font-bold text-slate-900">{heading.title}</h1>
          {heading.blurb && (
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-slate-500">{heading.blurb}</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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

          {view === "verify" && (
            <>
              <div className="mb-5 flex justify-center">
                <OtpInput value={otp} onChange={setOtp} disabled={busy} autoFocus />
              </div>
              <Button
                type="button"
                size="lg"
                className="w-full"
                loading={busy}
                disabled={otp.length !== OTP_LENGTH}
                onClick={onVerifySignup}
              >
                {t("verify")}
              </Button>
              <div className="mt-4 text-center text-sm">
                {cooldown > 0 ? (
                  <span className="text-slate-400">{t("resendCodeIn", { seconds: cooldown })}</span>
                ) : (
                  <button
                    type="button"
                    onClick={onResendSignupCode}
                    className="font-medium text-brand-700 hover:text-brand-800"
                  >
                    {t("resendCode")}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={goToAuth}
                className="mt-3 block w-full text-center text-sm text-slate-500 hover:text-slate-700"
              >
                {t("useAnotherEmail")}
              </button>
            </>
          )}

          {view === "forgotEmail" && (
            <ForgotEmailStep busy={busy} onSubmit={onRequestReset} onCancel={goToAuth} />
          )}

          {view === "forgotCode" && (
            <>
              <div className="mb-5 flex justify-center">
                <OtpInput value={otp} onChange={setOtp} disabled={busy} autoFocus />
              </div>
              <Button
                type="button"
                size="lg"
                className="w-full"
                loading={busy}
                disabled={otp.length !== OTP_LENGTH}
                onClick={onVerifyResetCode}
              >
                {t("verify")}
              </Button>
              <div className="mt-4 text-center text-sm">
                {cooldown > 0 ? (
                  <span className="text-slate-400">{t("resendCodeIn", { seconds: cooldown })}</span>
                ) : (
                  <button
                    type="button"
                    onClick={onResendResetCode}
                    className="font-medium text-brand-700 hover:text-brand-800"
                  >
                    {t("resendCode")}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={goToAuth}
                className="mt-3 block w-full text-center text-sm text-slate-500 hover:text-slate-700"
              >
                {t("useAnotherEmail")}
              </button>
            </>
          )}

          {view === "forgotPassword" && (
            <>
              <Field label={t("newPassword")} hint={t("passwordHint")}>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="pr-11"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
              <Field label={t("confirmPassword")}>
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                />
              </Field>
              <Button
                type="button"
                size="lg"
                className="w-full"
                loading={busy}
                onClick={onSetNewPassword}
              >
                {t("setNewPassword")}
              </Button>
            </>
          )}

          {view === "auth" && (
            <>
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
                    "rounded-lg py-2 transition-colors duration-200",
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
                    "rounded-lg py-2 transition-colors duration-200",
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

                {mode === "signup" && (
                  <Field label={t("confirmPassword")}>
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </Field>
                )}

                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setView("forgotEmail");
                      resetTransient();
                    }}
                    className="mb-4 -mt-2 block text-sm font-medium text-brand-700 hover:text-brand-800"
                  >
                    {t("forgotPassword")}
                  </button>
                )}

                {mode === "signup" && (
                  <p className="mb-3 text-xs leading-relaxed text-slate-500">{t("byCreatingAccountNotice")}</p>
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
                      {t("agreeToPoliciesSuffix")}.
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
            </>
          )}

        </div>
      </div>

      <PolicyDialog open={policyOpen === "terms"} onClose={() => setPolicyOpen(null)} kind="terms" />
      <PolicyDialog open={policyOpen === "privacy"} onClose={() => setPolicyOpen(null)} kind="privacy" />
    </div>
  );
}

/** Its own tiny form so a stray keystroke here can't touch the sign-in form's state. */
function ForgotEmailStep({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  onSubmit: (email: string) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (email.trim()) onSubmit(email.trim());
      }}
    >
      <Field label={t("email")}>
        <Input
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email.trim()}>
        {t("sendResetCode")}
      </Button>
      <button
        type="button"
        onClick={onCancel}
        className="mt-3 block w-full text-center text-sm text-slate-500 hover:text-slate-700"
      >
        {t("backToSignIn")}
      </button>
    </form>
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
