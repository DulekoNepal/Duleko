import { Banknote, CheckCircle2, Phone, Repeat, Star, UserCheck, Users, type LucideIcon } from "lucide-react";
import type { StringKey } from "./i18n";
import type { ActivityNumbers } from "./queries";

/** Duleko's activity numbers (6900), in the order of Sunil's list - staff screen and website. */
export const ACTIVITY_ROWS: { key: keyof ActivityNumbers; label: StringKey; icon: LucideIcon; money?: boolean }[] = [
  { key: "calls", label: "statCalls", icon: Phone },
  { key: "accepted", label: "statAccepted", icon: UserCheck },
  { key: "completed", label: "statCompleted", icon: CheckCircle2 },
  { key: "reviews", label: "statReviews", icon: Star },
  { key: "repeat", label: "statRepeat", icon: Repeat },
  { key: "active", label: "statActive", icon: Users },
  { key: "deals_npr", label: "statDeals", icon: Banknote, money: true },
];
