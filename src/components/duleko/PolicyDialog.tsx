import { Dialog } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

/**
 * Placeholder Terms of Service / Privacy Policy text - enough to satisfy
 * "ask new users to agree before signing up". Swap for the real legal copy
 * whenever it's ready; the checkbox + gate in AuthScreen don't need to change.
 */
export function PolicyDialog({
  open,
  onClose,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  kind: "terms" | "privacy";
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} title={kind === "terms" ? t("termsOfService") : t("privacyPolicy")}>
      {kind === "terms" ? (
        <div className="space-y-3 text-sm leading-relaxed text-slate-700">
          <p>
            Duleko connects people who need work done with local skilled workers. By creating an
            account you agree to use it honestly: give accurate profile information, only request
            or accept work you intend to follow through on, and treat other users with respect.
          </p>
          <p>
            Duleko does not employ workers or guarantee the quality of work, and is not a party to
            any agreement made between an employer and a worker. Any payment, price, or work
            arrangement is agreed directly between the two of you.
          </p>
          <p>
            Misuse - spam, fake profiles, harassment, or unsafe behaviour - may lead to your
            account being restricted. You can report a user from their profile at any time.
          </p>
        </div>
      ) : (
        <div className="space-y-3 text-sm leading-relaxed text-slate-700">
          <p>
            We store the profile information you provide (name, location, skills, photos) so
            other users can find and contact you. Your phone number stays private and is only
            shown to someone once you accept their work request or become friends.
          </p>
          <p>
            Live location, if you choose to share it, is used only to help nearby people find
            you and can be cleared at any time from your profile.
          </p>
          <p>
            We don't sell your personal data. Basic account and usage data is kept only as long
            as needed to run the service and is protected the same way as everyone else's, via
            row-level access rules on our database.
          </p>
        </div>
      )}
    </Dialog>
  );
}
