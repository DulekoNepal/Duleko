import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, ChevronDown, MessageSquare, Phone } from "lucide-react";
import { ListRow } from "@/components/duleko/SettingsList";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { setCallPermission } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { CallPermission } from "@/lib/types";

/**
 * The three call choices. "Friends only" is stored as 'nobody': friends
 * can always call whatever is picked (4400), so the two are the same rule.
 */
const OPTIONS: { value: CallPermission; label: StringKey; hint: StringKey }[] = [
  { value: "everyone", label: "callEveryone", hint: "callEveryoneHint" },
  { value: "nobody", label: "callNobody", hint: "callNobodyHint" },
  { value: "accepted_work", label: "callAcceptedWork", hint: "callAcceptedWorkHint" },
];

/** 'friends' (gone since 4400) or anything unknown reads as the default. */
export function callChoice(value: CallPermission | null | undefined): CallPermission {
  return value === "everyone" || value === "nobody" ? value : "accepted_work";
}

/**
 * Who can call me, as three cards to pick from - asked right under the
 * phone number when joining and when editing it. Saved with the form.
 */
export function CallPermissionChoice({
  value,
  onChange,
}: {
  value: CallPermission;
  onChange: (value: CallPermission) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mb-3.5">
      <p className="mb-1.5 text-[13px] font-medium text-slate-700">{t("callSettingTitle")}</p>
      <div role="radiogroup" aria-label={t("callSettingTitle")} className="space-y-1.5">
        {OPTIONS.map(({ value: option, label, hint }) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border-2 px-3 py-2 text-left transition-colors",
                selected ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-surface hover:border-slate-300",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm", selected ? "font-semibold text-brand-800" : "text-slate-800")}>
                  {t(label)}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-500">{t(hint)}</span>
              </span>
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                  selected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300",
                )}
                aria-hidden
              >
                {selected && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">{t("friendsAlwaysHint")}</p>
    </div>
  );
}

/**
 * Who can call me + the chat rule, as rows for a Settings ListGroup. The
 * call choice folds open under its row and saves the moment it's tapped.
 */
export function ContactPrivacyRows() {
  const { t } = useI18n();
  const { profile, refreshProfile } = useSession();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const save = useMutation({
    mutationFn: (value: CallPermission) => setCallPermission(profile!.id, value),
    onSuccess: async () => {
      await refreshProfile();
      toast(t("callSettingSaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  if (!profile) return null;
  const current = callChoice(profile.call_permission);
  const currentLabel = OPTIONS.find((o) => o.value === current)!.label;

  return (
    <>
      <div>
        <ListRow
          icon={Phone}
          title={t("callSettingTitle")}
          hint={t(currentLabel)}
          onClick={() => setOpen((v) => !v)}
          expanded={open}
          trailing={
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200", open && "rotate-180")}
              aria-hidden
            />
          }
        />
        {open && (
          <div role="radiogroup" aria-label={t("callSettingTitle")} className="pb-1.5 pl-9 pr-2">
            {OPTIONS.map(({ value, label, hint }) => {
              const selected = current === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={save.isPending}
                  onClick={() => !selected && save.mutate(value)}
                  className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn("block text-sm", selected ? "font-semibold text-brand-800" : "text-slate-800")}
                    >
                      {t(label)}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-500">{t(hint)}</span>
                  </span>
                  {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <ListRow
        icon={MessageSquare}
        title={t("chatSettingTitle")}
        hint={t("chatEveryoneHint")}
        trailing={<span className="shrink-0 text-sm text-slate-500">{t("chatEveryone")}</span>}
      />
    </>
  );
}
