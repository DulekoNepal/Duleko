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

const OPTIONS: { value: CallPermission; label: StringKey; hint: StringKey }[] = [
  { value: "everyone", label: "callEveryone", hint: "callEveryoneHint" },
  { value: "accepted_work", label: "callAcceptedWork", hint: "callAcceptedWorkHint" },
  { value: "nobody", label: "callNobody", hint: "callNobodyHint" },
];

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
  const current =
    profile.call_permission === "everyone" || profile.call_permission === "nobody"
      ? profile.call_permission
      : "accepted_work";
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
          <div role="radiogroup" aria-label={t("callSettingTitle")} className="pb-2 pl-10 pr-2">
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
                  className="flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-slate-50 disabled:opacity-60"
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
