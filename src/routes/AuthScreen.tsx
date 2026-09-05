import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { LanguageToggle } from "@/components/duleko/Layout";
import { useI18n } from "@/lib/i18n";
import { supabase, errorMessage } from "@/lib/supabase";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type FormValues = z.infer<typeof schema>;

export function AuthScreen() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
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

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-50 to-slate-50">
      <div className="flex justify-end p-4">
        <LanguageToggle />
      </div>

      <div className="mx-auto w-full max-w-sm px-5 pb-16 pt-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-2xl font-bold text-white">
            D
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t("authWelcome")}</h1>
          <p className="mt-1 text-sm text-slate-600">{t("authBlurb")}</p>
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
            hint={t("passwordHint")}
            error={form.formState.errors.password && t("passwordHint")}
          >
            <Input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              {...form.register("password")}
            />
          </Field>

          {error && (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {notice && (
            <p className="mb-3 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">{notice}</p>
          )}

          <Button type="submit" size="lg" className="w-full" loading={busy}>
            {mode === "signin" ? t("signIn") : t("signUp")}
          </Button>
        </form>

        <button
          type="button"
          className="mt-5 w-full text-center text-sm font-medium text-brand-700"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
        >
          {mode === "signin" ? t("noAccount") : t("haveAccount")}
        </button>
      </div>
    </div>
  );
}
