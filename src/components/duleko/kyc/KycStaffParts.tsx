import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, RotateCw } from "lucide-react";
import { KYC_DOC_ICON, KYC_DOC_LABEL } from "@/components/duleko/kyc/KycParts";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CardSkeleton, ErrorState } from "@/components/ui/states";
import { useI18n } from "@/lib/i18n";
import { getApprovedKyc, kycHasBack, kycPhotoUrls } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import type { KycDocument } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";

/**
 * Staff-only pieces for looking at ID photos: the queue (/staff/verify)
 * and, for anyone already verified, the "View ID" window (6600).
 */

export type Photo = { src: string; title: string };

/** Each document's photos, front and back side by side. */
export function KycDocumentList({
  documents,
  urls,
  loading,
  onOpen,
  className,
}: {
  documents: KycDocument[];
  urls: Record<string, string> | undefined;
  loading: boolean;
  onOpen: (photo: Photo) => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("space-y-3", className)}>
      {documents.map((d) => {
        const Icon = KYC_DOC_ICON[d.doc_type];
        const name = t(KYC_DOC_LABEL[d.doc_type]);
        const sides = [
          { path: d.front_path, label: kycHasBack(d.doc_type) ? t("kycFront") : t("kycPhotoPage") },
          ...(d.back_path ? [{ path: d.back_path, label: t("kycBack") }] : []),
        ];
        return (
          <div key={d.doc_type}>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Icon className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              {name}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {sides.map((side) => (
                <DocPhoto
                  key={side.path}
                  url={urls?.[side.path]}
                  label={side.label}
                  loading={loading}
                  onOpen={(src) => onOpen({ src, title: `${name} · ${side.label}` })}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Staff: the ID that got a verified member their badge - who checked it
 * and when, and the photos (still private, through short-lived links).
 */
export function StaffIdDialog({
  profileId,
  name,
  onClose,
}: {
  profileId: string | null;
  name: string;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const [viewing, setViewing] = useState<Photo | null>(null);

  const kyc = useQuery({
    queryKey: ["kyc-approved", profileId],
    queryFn: () => getApprovedKyc(profileId!),
    enabled: Boolean(profileId),
  });
  const paths = useMemo(
    () => (kyc.data?.documents ?? []).flatMap((d) => (d.back_path ? [d.front_path, d.back_path] : [d.front_path])),
    [kyc.data],
  );
  const urls = useQuery({
    queryKey: ["kyc-photo-urls", paths],
    queryFn: () => kycPhotoUrls(paths),
    enabled: Boolean(profileId) && paths.length > 0,
    staleTime: 5 * 60_000,
    refetchInterval: 8 * 60_000,
  });

  return (
    <>
      <Dialog open={Boolean(profileId) && !viewing} onClose={onClose} title={t("kycViewIdTitle", { name })}>
        {kyc.isPending ? (
          <CardSkeleton count={1} />
        ) : kyc.isError ? (
          <ErrorState message={errorMessage(kyc.error)} onRetry={() => kyc.refetch()} retryLabel={t("retry")} />
        ) : !kyc.data ? (
          <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">{t("kycViewIdNone")}</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-500">
              {t("kycCheckedBy", {
                name: kyc.data.reviewer?.full_name ?? "-",
                when: kyc.data.reviewed_at ? relativeTime(kyc.data.reviewed_at, lang) : "",
              })}
            </p>
            <KycDocumentList
              documents={kyc.data.documents}
              urls={urls.data}
              loading={urls.isPending}
              onOpen={setViewing}
            />
          </>
        )}
      </Dialog>
      <PhotoViewer photo={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

/** One side of a document: tap to look closely. */
function DocPhoto({
  url,
  label,
  loading,
  onOpen,
}: {
  url: string | undefined;
  label: string;
  loading: boolean;
  onOpen: (src: string) => void;
}) {
  const { t } = useI18n();
  if (!url) {
    return loading ? (
      <span className="skeleton block aspect-[3/2] w-full rounded-xl" />
    ) : (
      <span className="flex aspect-[3/2] w-full items-center justify-center rounded-xl bg-slate-100 px-2 text-center text-[11px] text-slate-500">
        {t("kycPhotoMissing")}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(url)}
      className="group relative block w-full overflow-hidden rounded-xl ring-1 ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      <img
        src={url}
        alt={label}
        loading="lazy"
        className="aspect-[3/2] w-full bg-slate-100 object-cover transition-transform duration-200 group-hover:scale-[1.03]"
      />
      <span className="absolute left-1.5 top-1.5 rounded-md bg-scrim/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {label}
      </span>
    </button>
  );
}

/** A document photo, large, turnable - phone photos of cards are often sideways. */
export function PhotoViewer({ photo, onClose }: { photo: Photo | null; onClose: () => void }) {
  const { t } = useI18n();
  const [turn, setTurn] = useState(0);
  useEffect(() => setTurn(0), [photo?.src]);
  const sideways = turn % 2 === 1;

  return (
    <Dialog
      open={Boolean(photo)}
      onClose={onClose}
      title={photo?.title ?? ""}
      className="sm:max-w-3xl"
      footer={
        <>
          <Button variant="outline" onClick={() => setTurn((n) => (n + 1) % 4)}>
            <RotateCw className="h-4 w-4" aria-hidden />
            {t("kycRotate")}
          </Button>
          <a
            href={photo?.src}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-surface px-4 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            {t("kycOpenFull")}
          </a>
        </>
      }
    >
      {photo && (
        <div className="flex h-[60vh] items-center justify-center overflow-hidden rounded-xl bg-slate-100">
          <img
            src={photo.src}
            alt={photo.title}
            className="max-h-full max-w-full object-contain"
            // Turned a quarter, the photo's width becomes its height: swap
            // the limits so it still fits the box.
            style={{
              transform: `rotate(${turn * 90}deg)`,
              ...(sideways ? { maxHeight: "min(calc(100vw - 2rem), 46rem)", maxWidth: "60vh" } : {}),
            }}
          />
        </div>
      )}
    </Dialog>
  );
}
