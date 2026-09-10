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
import { Card, CardBody, SectionTitle } from "@/components/ui/card";
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
 * Same bare icon-and-label grid the skill categories use (see SkillGrid) -
 * no per-item box, no per-item colour, just icon over label over a small
 * caption. Here the caption is the number instead of a worker count, and
 * each cell is a `tel:` link instead of a route link, so tapping it calls
 * straight away.
 */
function EmergencyContactGrid({ contacts }: { contacts: EmergencyContact[] }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-4 gap-1">
      {contacts.map((contact) => {
        const Icon = contact.icon;
        return (
          <a
            key={contact.id}
            href={telHref(contact.number)}
            className="group flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-center transition-colors duration-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
            aria-label={`${t(contact.labelKey)}: ${contact.number}`}
          >
            <Icon
              className="h-6 w-6 text-red-600 transition-transform duration-200 group-hover:scale-110"
              aria-hidden
            />
            <span className="line-clamp-2 text-[11px] font-medium leading-tight text-slate-700">
              {t(contact.labelKey)}
            </span>
            <span className="text-[10px] font-medium text-slate-400">{contact.number}</span>
          </a>
        );
      })}
    </div>
  );
}

/**
 * The "one more category" for the home page, built exactly like
 * SkillCategorySection - a card, a title with an icon badge, a "see
 * all"/"show less" toggle once there are more than four items, then the
 * same bare icon grid - just tinted red throughout so it still reads as
 * safety-critical rather than another thing to browse.
 */
export function EmergencyContactsSection() {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const hasMore = EMERGENCY_CONTACTS.length > HOME_PREVIEW_COUNT;
  const visible = expanded ? EMERGENCY_CONTACTS : EMERGENCY_CONTACTS.slice(0, HOME_PREVIEW_COUNT);

  return (
    <Card tone="danger">
      <CardBody>
        <SectionTitle
          action={
            hasMore && (
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
            )
          }
        >
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
              <Siren className="h-4 w-4" aria-hidden />
            </span>
            {t("emergencyContacts")}
          </span>
        </SectionTitle>
        <p className="-mt-2 mb-3 text-xs text-slate-500">{t("emergencyContactsHint")}</p>
        <EmergencyContactGrid contacts={visible} />
      </CardBody>
    </Card>
  );
}
