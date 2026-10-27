import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Languages, Mail, MapPin, ShieldCheck, Smartphone } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input, Label } from "@/components/ui/field";
import { OtpInput } from "@/components/ui/otp-input";
import { HeaderToggles } from "@/components/duleko/Layout";
import { MobileNumberInput, PinField } from "@/components/duleko/PhonePinFields";
import { mailto } from "@/components/duleko/site/actions";
import { AccountAuthError, phonePinLength, pinSignIn, pinSignUp, sendEmailCode, verifyEmailCode } from "@/lib/account-auth";
import { onBackFromGoogle, signInWithGoogle } from "@/lib/google-sign-in";
import { OLD_PIN_LENGTH, PIN_LENGTH, authPhone, isNepaliMobile, isWeakPin, pinToPassword } from "@/lib/phone-auth";
import { forgetSavedLogin, readSavedLogin, type SavedLogin } from "@/lib/saved-login";
import { firstName } from "@/lib/work";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { supabase, errorMessage } from "@/lib/supabase";
import dulekoMark from "@/assets/duleko-mark.webp";

const RESEND_COOLDOWN_SECONDS = 45;
/** Duleko's own email code (migration 8100), not Supabase's 6-digit one. */
const CODE_LENGTH = 4;
const MIN_PASSWORD = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * One step at a time. A new email account goes email -> code -> password;
 * a forgotten password goes forgotEmail -> code -> password. The code
 * signs them in, and the session hook holds this screen on "password"
 * until one is saved (holdForPassword). A forgotten PIN has no code yet
 * (no SMS), so "forgotPin" says who resets it.
 */
type View = "auth" | "code" | "forgotEmail" | "password" | "forgotPin";

/**
 * Email is the default way in. Mobile number + PIN and Google stay for
 * everyone who prefers them; whichever was used last is remembered.
 */
type Method = "phone" | "email";
const METHOD_KEY = "duleko.authMethod";

function readMethod(): Method {
  try {
    return window.localStorage.getItem(METHOD_KEY) === "phone" ? "phone" : "email";
  } catch {
    return "email";
  }
}

export function AuthScreen({
  onBack,
  initialMode = "signin",
}: {
  onBack?: () => void;
  initialMode?: "signin" | "signup";
}) {
  const { t, lang } = useI18n();
  const { user, isPasswordRecovery, holdForPassword, clearPasswordRecovery } = useSession();
  const [view, setView] = useState<View>(isPasswordRecovery ? "password" : "auth");
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  // The account last signed out here, if they asked to be remembered.
  const [saved, setSaved] = useState<SavedLogin | null>(readSavedLogin);
  const [method, setMethod] = useState<Method>(() =>
    saved?.method === "phone" ? "phone" : saved?.method === "email" ? "email" : readMethod(),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [email, setEmail] = useState(saved?.method === "email" ? (saved.email ?? "") : "");
  const [password, setPassword] = useState("");
  // The code step serves both new accounts and forgotten passwords.
  const [purpose, setPurpose] = useState<"signup" | "reset">("signup");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function resetTransient() {
    setError(null);
    setNotice(null);
  }

  function showError(err: unknown) {
    setNotice(null);
    setError(err instanceof AccountAuthError ? err.message : errorMessage(err));
  }

  function goToAuth() {
    setView("auth");
    setCode("");
    setNewPassword("");
    resetTransient();
  }

  // In the Android app Google opens in a browser tab over the app. Back on
  // this screen, the button works again; coming back signed in is
  // AppShell's to finish (see listenForGoogleReturn).
  useEffect(() => onBackFromGoogle(() => setGoogleBusy(false)), []);

  async function onGoogle() {
    if (mode === "signup" && !agreed) {
      setError(t("mustAgreeToPolicies"));
      return;
    }
    setGoogleBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(errorMessage(err));
      setGoogleBusy(false);
    }
  }

  function forgetMe() {
    forgetSavedLogin();
    setSaved(null);
    setEmail("");
  }

  /** Sends a code and moves to the code step. */
  async function requestCode(address: string, why: "signup" | "reset") {
    setBusy(true);
    resetTransient();
    try {
      await sendEmailCode(address, why, lang);
      setEmail(address.trim());
      setPurpose(why);
      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setView("code");
    } catch (err) {
      showError(err);
      // Already has an account: the sign-in form, with the email kept.
      if (err instanceof AccountAuthError && err.code === "email_taken") setMode("signin");
    } finally {
      setBusy(false);
    }
  }

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError(t("authEmailInvalid"));
      return;
    }
    if (mode === "signup") {
      if (!agreed) {
        setError(t("mustAgreeToPolicies"));
        return;
      }
      await requestCode(email, "signup");
      return;
    }
    if (!password) {
      setError(t("incorrectCredentials"));
      return;
    }
    setBusy(true);
    resetTransient();
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw signInError;
      // A session now exists - AppShell notices and moves on by itself.
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyCode(value = code) {
    if (value.length !== CODE_LENGTH || busy) return;
    setBusy(true);
    resetTransient();
    // Before the session appears, so AppShell keeps this screen for the password.
    holdForPassword();
    try {
      await verifyEmailCode(email, value);
      setNewPassword("");
      setView("password");
    } catch (err) {
      clearPasswordRecovery();
      setCode("");
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function onResendCode() {
    if (cooldown > 0) return;
    await requestCode(email, purpose);
    setNotice(t("codeResent"));
  }

  async function onSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < MIN_PASSWORD) {
      setError(t("passwordHint"));
      return;
    }
    setBusy(true);
    resetTransient();
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      // Lets AppShell move on - to onboarding for a new account.
      clearPasswordRecovery();
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: "signin" | "signup") {
    if (next === mode) return;
    setMode(next);
    setPassword("");
    resetTransient();
  }

  function switchMethod(next: Method) {
    setMethod(next);
    resetTransient();
    try {
      window.localStorage.setItem(METHOD_KEY, next);
    } catch {
      // No storage - it just won't be remembered.
    }
  }

  const passwordFor = email || user?.email || "";
  const creatingWithEmail = purpose === "signup" && !isPasswordRecoveryLink(isPasswordRecovery, user?.email, email);
  const heading =
    view === "code"
      ? { title: t("authCodeTitle"), blurb: t("authCodeBlurb", { email }) }
      : view === "forgotEmail"
        ? { title: t("resetPasswordTitle"), blurb: t("resetPasswordBlurb") }
        : view === "password"
          ? creatingWithEmail
            ? { title: t("authPasswordTitle"), blurb: t("authPasswordBlurb") }
            : { title: t("resetPasswordTitle"), blurb: t("authNewPasswordBlurb", { email: passwordFor }) }
          : view === "forgotPin"
            ? { title: t("authForgotPinTitle"), blurb: null }
            : mode === "signup"
              ? { title: t("authSignUpTitle"), blurb: t("authSignUpBlurb") }
              : { title: t("authSignInTitle"), blurb: t("authSignInBlurb") };

  // A new email account is three short steps; say where they are.
  const step =
    view === "auth" && mode === "signup" && method === "email"
      ? 1
      : view === "code" && purpose === "signup"
        ? 2
        : view === "password" && creatingWithEmail
          ? 3
          : null;

  // Both ways of creating an account ask for the same agreement: one line.
  const agreement =
    mode === "signup" ? (
      <div className="mb-5">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-snug text-slate-600">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-700"
            checked={agreed}
            onChange={(e) => {
              setAgreed(e.target.checked);
              if (e.target.checked) setError(null);
            }}
          />
          <span>{t("authAgreeShort")}</span>
        </label>
        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 pl-[26px] text-xs">
          {POLICY_PAGES.map(({ path, label }) => (
            <PolicyLink key={path} path={path}>
              {t(label)}
            </PolicyLink>
          ))}
        </p>
      </div>
    ) : null;

  const quietLink = "mt-4 block w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800";

  return (
    <div className="flex min-h-dvh flex-col bg-cream-50">
      <div className="flex items-center justify-between px-4 pb-2 pt-[calc(1rem+var(--sat))]">
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
        <HeaderToggles />
      </div>

      <main className="flex flex-1 justify-center px-4 pb-10 sm:items-center sm:px-6">
        <div className="grid w-full max-w-[400px] items-center gap-12 lg:max-w-5xl lg:grid-cols-[1fr_420px]">
          <BrandPanel />

          <section aria-labelledby="auth-title" className="w-full">
            <div className="mb-6 text-center lg:text-left">
              <img
                src={dulekoMark}
                alt=""
                className="mx-auto mb-4 h-12 w-12 rounded-2xl object-cover shadow-sm lg:hidden"
              />
              <h1 id="auth-title" className="text-2xl font-bold tracking-tight text-slate-900">
                {heading.title}
              </h1>
              {heading.blurb && (
                <p className="mx-auto mt-1.5 max-w-xs break-words text-sm text-slate-500 lg:mx-0 lg:max-w-none">
                  {heading.blurb}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm sm:p-6">
              {step && <StepBar step={step} />}

              {error && (
                <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
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

              {view === "code" && (
                <>
                  <OtpInput
                    value={code}
                    onChange={(next) => {
                      setCode(next);
                      // The fourth digit sends it - no extra tap.
                      if (next.length === CODE_LENGTH) void onVerifyCode(next);
                    }}
                    length={CODE_LENGTH}
                    disabled={busy}
                    autoFocus
                    label={t("authStepCode")}
                    className="mb-5 gap-3 [&>input]:h-14 [&>input]:w-14 [&>input]:text-2xl"
                  />
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    loading={busy}
                    disabled={code.length !== CODE_LENGTH}
                    onClick={() => onVerifyCode()}
                  >
                    {t("verify")}
                  </Button>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <span className="text-xs text-slate-500">{t("authCodeSpam")}</span>
                    {cooldown > 0 ? (
                      <span className="shrink-0 tabular-nums text-slate-400">
                        {t("resendCodeIn", { seconds: cooldown })}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={onResendCode}
                        className="shrink-0 font-medium text-brand-700 hover:text-brand-800"
                      >
                        {t("resendCode")}
                      </button>
                    )}
                  </div>
                  <button type="button" onClick={goToAuth} className={quietLink}>
                    {t("useAnotherEmail")}
                  </button>
                </>
              )}

              {view === "forgotEmail" && (
                <ForgotEmailStep
                  initialEmail={email}
                  busy={busy}
                  onSubmit={(address) => requestCode(address, "reset")}
                  onCancel={goToAuth}
                />
              )}

              {view === "password" && (
                <form onSubmit={onSavePassword} noValidate>
                  <Field label={t("password")} hint={t("passwordHint")}>
                    <PasswordInput
                      value={newPassword}
                      onChange={setNewPassword}
                      show={showPassword}
                      onToggle={() => setShowPassword((v) => !v)}
                      autoComplete="new-password"
                      autoFocus
                    />
                  </Field>
                  <Button type="submit" size="lg" className="mt-1 w-full" loading={busy}>
                    {t("authPasswordSave")}
                  </Button>
                </form>
              )}

              {view === "forgotPin" && (
                <>
                  <p className="mb-5 text-sm leading-relaxed text-slate-600">{t("authForgotPinBody")}</p>
                  <a
                    href={mailto(t("authForgotPinSubject"))}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                  >
                    <Mail className="h-4 w-4" aria-hidden />
                    {t("authForgotPinEmail")}
                  </a>
                  <button type="button" onClick={goToAuth} className={quietLink}>
                    {t("backToSignIn")}
                  </button>
                </>
              )}

              {view === "auth" && (
                <>
                  <MethodSwitch value={method} onChange={switchMethod} />

                  {mode === "signin" && saved && <SavedLoginCard saved={saved} onForget={forgetMe} />}

                  {method === "phone" ? (
                    <PhonePinForm
                      key={saved?.phone ?? "none"}
                      initialPhone={saved?.phone ?? ""}
                      mode={mode}
                      agreed={agreed}
                      agreement={agreement}
                      onError={(message) => {
                        setNotice(null);
                        setError(message);
                      }}
                      onForgotPin={() => {
                        setView("forgotPin");
                        resetTransient();
                      }}
                    />
                  ) : (
                    <form onSubmit={onEmailSubmit} noValidate>
                      <Field label={t("email")} hint={mode === "signup" ? t("authEmailCodeHint") : undefined}>
                        <Input
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          placeholder={t("emailPlaceholder")}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </Field>

                      {mode === "signin" && (
                        <div className="mb-5">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <Label htmlFor="auth-password" className="mb-0">
                              {t("password")}
                            </Label>
                            <button
                              type="button"
                              onClick={() => {
                                setView("forgotEmail");
                                resetTransient();
                              }}
                              className="text-xs font-medium text-brand-700 hover:text-brand-800"
                            >
                              {t("forgotPassword")}
                            </button>
                          </div>
                          <PasswordInput
                            id="auth-password"
                            value={password}
                            onChange={setPassword}
                            show={showPassword}
                            onToggle={() => setShowPassword((v) => !v)}
                            autoComplete="current-password"
                            autoFocus={Boolean(saved?.email)}
                          />
                        </div>
                      )}

                      {agreement}

                      <Button type="submit" size="lg" className="w-full" loading={busy}>
                        {mode === "signin" ? t("signIn") : t("authContinue")}
                      </Button>
                    </form>
                  )}

                  <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
                    <span className="h-px flex-1 bg-slate-200" />
                    {t("orDivider")}
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>

                  <Button type="button" variant="outline" size="lg" className="w-full" loading={googleBusy} onClick={onGoogle}>
                    <GoogleIcon className="h-4 w-4" aria-hidden />
                    {t("continueWithGoogle")}
                  </Button>
                </>
              )}
            </div>

            {view === "auth" && (
              <p className="mt-5 text-center text-sm text-slate-600">
                {mode === "signin" ? t("authNewHere") : t("authHaveAccount")}{" "}
                <button
                  type="button"
                  onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                  className="font-semibold text-brand-700 hover:text-brand-800"
                >
                  {mode === "signin" ? t("authCreateOne") : t("signIn")}
                </button>
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

/** The website's own policy pages, which the sign-up agreement points at. */
const POLICY_PAGES = [
  { path: "/terms", label: "termsOfService" },
  { path: "/privacy", label: "privacyPolicy" },
  { path: "/registration-policy", label: "authRegistrationRules" },
] as const;

const PUBLIC_SITE = ((import.meta.env.VITE_SITE_URL as string | undefined) || "https://www.duleko.com").replace(/\/+$/, "");

/**
 * Opens a real policy page without losing the half-filled form: a new tab
 * on the web, the in-app browser in the Android app (whose own pages live
 * on a local address that means nothing outside the app).
 */
function PolicyLink({ path, children }: { path: string; children: React.ReactNode }) {
  const native = Capacitor.isNativePlatform();
  return (
    <a
      href={native ? `${PUBLIC_SITE}${path}` : path}
      target="_blank"
      rel="noopener"
      onClick={(e) => {
        if (!native) return;
        e.preventDefault();
        void Browser.open({ url: `${PUBLIC_SITE}${path}` });
      }}
      className="font-medium text-brand-700 underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
}

/** Wide screens only: what Duleko is, beside the form. Phones go straight to the form. */
function BrandPanel() {
  const { t } = useI18n();
  const points = [
    { icon: MapPin, text: t("authBrandPoint1") },
    { icon: ShieldCheck, text: t("authBrandPoint2") },
    { icon: Languages, text: t("authBrandPoint3") },
  ];
  return (
    <aside className="hidden lg:block">
      <div className="mb-8 flex items-center gap-3">
        <img src={dulekoMark} alt="" className="h-11 w-11 rounded-xl object-cover shadow-sm" />
        <span className="text-xl font-bold tracking-tight text-slate-900">Duleko</span>
      </div>
      <p className="max-w-md text-4xl font-bold leading-tight tracking-tight text-slate-900">{t("authBrandTitle")}</p>
      <p className="mt-4 max-w-md text-base text-slate-600">{t("authBlurb")}</p>
      <ul className="mt-8 space-y-4">
        {points.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            {text}
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** Email or mobile number: both always in view, the chosen one filled. */
function MethodSwitch({ value, onChange }: { value: Method; onChange: (next: Method) => void }) {
  const { t } = useI18n();
  const options = [
    { value: "email" as const, label: t("authUseEmailShort"), icon: Mail },
    { value: "phone" as const, label: t("authUsePhoneShort"), icon: Smartphone },
  ];
  return (
    <div role="radiogroup" aria-label={t("authMethodLabel")} className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
      {options.map(({ value: v, label, icon: Icon }) => {
        const selected = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => !selected && onChange(v)}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40",
              selected
                ? "bg-surface font-semibold text-slate-900 shadow-sm"
                : "font-medium text-slate-500 hover:text-slate-800",
            )}
          >
            <Icon className={cn("h-4 w-4", selected ? "text-brand-700" : "text-slate-400")} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** "Step 2 of 3" over three short bars: Email, Code, Password. */
function StepBar({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useI18n();
  const names = [t("authStepEmail"), t("authStepCode"), t("authStepPassword")];
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-baseline justify-between text-xs">
        <span className="font-semibold text-brand-700">{t("authStepOf", { n: step })}</span>
        <span className="text-slate-500">{names[step - 1]}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn("h-1.5 rounded-full transition-colors", n <= step ? "bg-brand-600" : "bg-slate-200")}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * True when the password step came from Supabase's own reset link (no
 * code typed here), so it reads "Reset your password", not "Create".
 */
function isPasswordRecoveryLink(holding: boolean, sessionEmail: string | undefined, typedEmail: string): boolean {
  return holding && Boolean(sessionEmail) && !typedEmail;
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  autoFocus,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
  autoFocus?: boolean;
  id?: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        className="pr-11"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
      >
        {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}

/** "Welcome back, Sanjay" - who signed out here last, with a way to forget them. */
function SavedLoginCard({ saved, onForget }: { saved: SavedLogin; onForget: () => void }) {
  const { t } = useI18n();
  const detail =
    saved.method === "phone" && saved.phone
      ? `+977 ${saved.phone}`
      : saved.method === "google"
        ? t("savedLoginGoogle")
        : saved.email;
  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2.5">
      <Avatar name={saved.name} src={saved.avatarUrl} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{t("savedLoginWelcome", { name: firstName(saved.name) })}</p>
        {detail && <p className="truncate text-xs tabular-nums text-slate-500">{detail}</p>}
      </div>
      <button
        type="button"
        onClick={onForget}
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100/70 hover:text-brand-800"
      >
        {t("savedLoginNotYou")}
      </button>
    </div>
  );
}

/**
 * Mobile number + a 4-digit PIN, for both signing in and creating an
 * account (migration 8100). One row of PIN boxes, shown while it's being
 * made so nobody has to type it twice. A number that still has an older
 * 6-digit PIN gets six boxes when signing in.
 */
function PhonePinForm({
  initialPhone,
  mode,
  agreed,
  agreement,
  onError,
  onForgotPin,
}: {
  /** The remembered number, so signing back in is just the PIN. */
  initialPhone: string;
  mode: "signin" | "signup";
  agreed: boolean;
  agreement: React.ReactNode;
  onError: (message: string | null) => void;
  onForgotPin: () => void;
}) {
  const { t } = useI18n();
  const [phone, setPhone] = useState(initialPhone);
  const [pin, setPin] = useState("");
  const [pinLength, setPinLength] = useState(PIN_LENGTH);
  const [pinMasked, setPinMasked] = useState(mode === "signin");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; pin?: string }>({});

  // Switching between Sign in and Create account keeps the number, not the
  // complaints about it. A new PIN shows its digits; a sign-in hides them.
  useEffect(() => {
    setErrors({});
    setPinMasked(mode === "signin");
  }, [mode]);

  // Six boxes for a number whose account still has an older 6-digit PIN.
  const complete = isNepaliMobile(phone);
  useEffect(() => {
    if (mode !== "signin" || !complete) {
      setPinLength(PIN_LENGTH);
      return;
    }
    let live = true;
    phonePinLength(phone)
      .then((length) => live && setPinLength(length === OLD_PIN_LENGTH ? OLD_PIN_LENGTH : PIN_LENGTH))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [mode, complete, phone]);

  useEffect(() => setPin((p) => p.slice(0, pinLength)), [pinLength]);

  /** Supabase's wording for an older 6-digit PIN sign-in, in the person's own terms. */
  function oldPinError(err: unknown): string {
    const e = err as { code?: string; message?: string };
    if (e?.code === "invalid_credentials" || /invalid login credentials/i.test(e?.message ?? "")) {
      return t("authWrongPhoneOrPin");
    }
    return errorMessage(err);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!complete) next.phone = t("authPhoneInvalid");
    if (pin.length !== pinLength) next.pin = t("authPinIncomplete");
    else if (mode === "signup" && isWeakPin(pin)) next.pin = t("authPinWeak");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    if (mode === "signup" && !agreed) {
      onError(t("mustAgreeToPolicies"));
      return;
    }

    setBusy(true);
    onError(null);
    try {
      if (mode === "signup") {
        await pinSignUp(phone, pin);
      } else if (pinLength === OLD_PIN_LENGTH) {
        const { error } = await supabase.auth.signInWithPassword({
          phone: authPhone(phone),
          password: pinToPassword(pin),
        });
        if (error) throw error;
      } else {
        await pinSignIn(phone, pin);
      }
      // A session now exists - AppShell notices and moves on by itself.
    } catch (err) {
      setPin("");
      onError(err instanceof AccountAuthError ? err.message : oldPinError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Field
        label={t("authPhoneLabel")}
        hint={mode === "signup" ? t("authPhoneSignUpHint") : undefined}
        error={errors.phone}
      >
        <MobileNumberInput value={phone} onChange={setPhone} disabled={busy} />
      </Field>

      <PinField
        label={
          mode === "signup"
            ? t("authPinCreate")
            : pinLength === OLD_PIN_LENGTH
              ? t("authPinOld")
              : t("authPinLabel")
        }
        length={pinLength}
        hint={mode === "signup" ? t("authPinCreateHint") : undefined}
        error={errors.pin}
        value={pin}
        onChange={setPin}
        masked={pinMasked}
        onToggleMasked={() => setPinMasked((v) => !v)}
        disabled={busy}
        autoFocus={mode === "signin" && Boolean(initialPhone)}
        action={
          mode === "signin" && (
            <button
              type="button"
              onClick={onForgotPin}
              className="mt-2 block text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              {t("authForgotPin")}
            </button>
          )
        }
      />

      {agreement}

      <Button type="submit" size="lg" className="w-full" loading={busy}>
        {mode === "signin" ? t("signIn") : t("signUp")}
      </Button>
    </form>
  );
}

/** Its own tiny form so a stray keystroke here can't touch the sign-in form's state. */
function ForgotEmailStep({
  initialEmail,
  busy,
  onSubmit,
  onCancel,
}: {
  initialEmail: string;
  busy: boolean;
  onSubmit: (email: string) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState(initialEmail);

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
