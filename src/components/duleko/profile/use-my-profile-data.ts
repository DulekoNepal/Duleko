import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { getAvailability, getContact, getUserSkills, listCertificates } from "@/lib/queries";
import { addDays, toDateKey, todayKey } from "@/lib/utils";

/**
 * The rows your own Profile is built from, beyond the profile itself. Every
 * part of the screen calls this; react-query shares one request per key,
 * so the header, Overview and the editors never fetch twice.
 */
export function useMyProfileData() {
  const { profile } = useSession();
  const id = profile?.id;

  const skills = useQuery({
    queryKey: ["user-skills", id],
    queryFn: () => getUserSkills(id!),
    enabled: Boolean(id),
  });
  const contact = useQuery({
    queryKey: ["contact", id],
    queryFn: () => getContact(id!),
    enabled: Boolean(id),
  });
  const certificates = useQuery({
    queryKey: ["certificates", id],
    queryFn: () => listCertificates(id!),
    enabled: Boolean(id),
  });
  // A full year ahead - the "mark busy days" calendar can flip forward
  // through all 12 months, so it needs the availability rows to match.
  const availability = useQuery({
    queryKey: ["availability", id],
    queryFn: () => getAvailability(id!, todayKey(), toDateKey(addDays(new Date(), 365))),
    enabled: Boolean(id),
  });

  // Every day is open by default - only "booked" is ever an explicit row -
  // so busy days are the one count this data can honestly show.
  const busyDays = (availability.data ?? []).filter((d) => d.status === "booked");

  return { skills, contact, certificates, availability, busyDays };
}
