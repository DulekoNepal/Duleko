import { useState } from "react";
import {
  Ambulance,
  Baby,
  ChevronDown,
  Flame,
  HeartHandshake,
  Plane,
  Shield,
  ShieldCheck,
  Siren,
  TrafficCone,
  TriangleAlert,
  UserSearch,
  type LucideIcon,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useI18n, type StringKey } from "@/lib/i18n";

/** Same preview cap the skill categories use before "see all" takes over. */
const HOME_PREVIEW_COUNT = 4;

type EmergencyContact = {
  id: string;
  icon: LucideIcon;
  labelKey: StringKey;
  /** Dialable number exactly as published - shown as-is, used for tel: as well. */
  number: string;
};

/**
 * Nepal's national emergency numbers, in the priority order the official
 * lists use - police, fire, ambulance, traffic/disaster, then the child &
 * women helplines. Static data, no backend needed: these don't change
 * per-user or per-district.
 */
const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { id: "police-100", icon: Shield, labelKey: "emergencyPoliceEmergency", number: "100" },
  { id: "police-apf", icon: ShieldCheck, labelKey: "emergencyArmedPoliceForce", number: "1114" },
  { id: "fire-brigade", icon: Flame, labelKey: "emergencyFireBrigade", number: "101" },
  { id: "ambulance", icon: Ambulance, labelKey: "emergencyAmbulanceService", number: "102" },
  { id: "redcross-ambulance", icon: Ambulance, labelKey: "emergencyRedCrossAmbulance", number: "01-4228094" },
  {
    id: "paropakar-ambulance-1",
    icon: Ambulance,
    labelKey: "emergencyParopakarAmbulance",
    number: "01-4251614",
  },
  {
    id: "paropakar-ambulance-2",
    icon: Ambulance,
    labelKey: "emergencyParopakarAmbulance",
    number: "01-4260859",
  },
  { id: "traffic", icon: TrafficCone, labelKey: "emergencyTrafficEmergency", number: "103" },
  { id: "ndr", icon: TriangleAlert, labelKey: "emergencyNationalDisasterResponse", number: "1149" },
  { id: "heli-rescue", icon: Plane, labelKey: "emergencyHelicopterRescue", number: "+977-9818392976" },
  {
    id: "heli-ambulance-charter",
    icon: Plane,
    labelKey: "emergencyHeliAmbulanceCharter",
    number: "+977-9860939995",
  },
  { id: "child-helpline", icon: Baby, labelKey: "emergencyChildHelpline", number: "104" },
  { id: "womens-helpline", icon: HeartHandshake, labelKey: "emergencyWomensHelpline", number: "1145" },
  { id: "missing-child", icon: UserSearch, labelKey: "emergencyMissingChildSupport", number: "1098" },
];

/** tel: only wants digits and a leading "+" - dashes are for humans to read. */
function telHref(number: string) {
  return `tel:${number.replace(/[^\d+]/g, "")}`;
}

/**
 * Call buttons: the number large (it is what people look for in a hurry),
 * the service's name small above it, each a `tel:` link that dials
 * straight away. Two to a row in narrow places, four where there's room.
 */
function EmergencyContactGrid({ contacts, className }: { contacts: EmergencyContact[]; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {contacts.map((contact) => {
        const Icon = contact.icon;
        return (
          <a
            key={contact.id}
            href={telHref(contact.number)}
            className="group flex min-w-0 items-center gap-2 rounded-xl border border-red-100 bg-surface px-2 py-2 transition-colors duration-200 hover:border-red-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
            aria-label={`${t(contact.labelKey)}: ${contact.number}`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors group-hover:bg-red-100">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-[11px] font-medium leading-tight text-slate-500">
                {t(contact.labelKey)}
              </span>
              <span className="block truncate text-sm font-bold tabular-nums leading-snug text-slate-900">
                {contact.number}
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}

/**
 * Home's safety card: the four national numbers people need most, with
 * the full list one tap away. Tinted red throughout so it reads as
 * safety-critical rather than another thing to browse. `gridClassName`
 * sets the column count where the card is placed.
 */
export function EmergencyContactsSection({ gridClassName }: { gridClassName?: string }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const hasMore = EMERGENCY_CONTACTS.length > HOME_PREVIEW_COUNT;
  const visible = expanded ? EMERGENCY_CONTACTS : EMERGENCY_CONTACTS.slice(0, HOME_PREVIEW_COUNT);

  return (
    <Card tone="danger">
      <CardBody>
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <h2 className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-slate-900">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
              <Siren className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate">{t("emergencyContacts")}</span>
              <span className="block truncate text-[11px] font-normal text-slate-500">{t("emergencyContactsHint")}</span>
            </span>
          </h2>
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-accent-600 transition-colors duration-200 hover:text-accent-700"
            >
              {expanded ? t("showLess") : t("seeAll")}
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded && "rotate-180")}
                strokeWidth={1.75}
                aria-hidden
              />
            </button>
          )}
        </div>
        <EmergencyContactGrid contacts={visible} className={gridClassName} />
      </CardBody>
    </Card>
  );
}
