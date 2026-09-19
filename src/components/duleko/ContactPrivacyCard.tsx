import { useMutation } from "@tanstack/react-query";
import {
  Check,
  Handshake,
  MessageSquare,
  Phone,
  PhoneOff,
  ShieldCheck,
  Users,
  Globe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Collapsible } from "@/components/ui/collapsible";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { setCallPermission } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { CallPermission } from "@/lib/types";

const OPTIONS: {
  value: CallPermission;
  icon: LucideIcon;
  label: StringKey;
  hint: StringKey;
}[] = [
  {
    value: "everyone",
    icon: Globe,
    label: "callEveryone",
    hint: "callEveryoneHint",
  },
  {
    value: "accepted_work",
    icon: Handshake,
    label: "callAcceptedWork",
    hint: "callAcceptedWorkHint",
  },
  {
    value: "friends",
    icon: Users,
    label: "callFriends",
    hint: "callFriendsHint",
  },
  {
    value: "nobody",
    icon: PhoneOff,
    label: "callNobody",
    hint: "callNobodyHint",
  },
];

/** Who can call me + chat rules, saved the moment a choice is tapped. */
export function ContactPrivacyCard() {
  const { t } = useI18n();
  const { profile, refreshProfile } = useSession();
  const { toast } = useToast();

  const save = useMutation({
    mutationFn: (value: CallPermission) =>
      setCallPermission(profile!.id, value),
    onSuccess: async () => {
      await refreshProfile();
      toast(t("callSettingSaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  if (!profile) return null;
  const current = profile.call_permission ?? "accepted_work";
  const currentLabel = OPTIONS.find((o) => o.value === current)!.label;

  return (
    <Collapsible
      title={
        <span className="block">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ShieldCheck className="h-5 w-5 text-brand-700" aria-hidden />
            {t("privacyContactTitle")}
          </span>
          <span className="mt-0.5 block text-xs font-normal text-slate-500">
            {t("callSettingTitle")}: {t(currentLabel)}
          </span>
        </span>
      }
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Phone className="h-3.5 w-3.5" aria-hidden />
        {t("callSettingTitle")}
      </p>
      <div
        role="radiogroup"
        aria-label={t("callSettingTitle")}
        className="space-y-1.5"
      >
        {OPTIONS.map(({ value, icon: Icon, label, hint }) => {
          const selected = current === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={save.isPending}
              onClick={() => !selected && save.mutate(value)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors duration-200 disabled:opacity-60",
                selected
                  ? "border-brand-700 bg-brand-50"
                  : "border-transparent bg-slate-50 hover:bg-slate-100"
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  selected ? "text-brand-700" : "text-slate-500"
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    selected ? "text-brand-800" : "text-slate-800"
                  )}
                >
                  {t(label)}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {t(hint)}
                </span>
              </span>
              {selected && (
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="mb-2 mt-5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <MessageSquare className="h-3.5 w-3.5" aria-hidden />
        {t("chatSettingTitle")}
      </p>
      <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
        <Globe className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800">
            {t("chatEveryone")}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {t("chatEveryoneHint")}
          </p>
        </div>
      </div>
    </Collapsible>
  );
}
