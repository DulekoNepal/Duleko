import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, ExternalLink, History, Hourglass, RotateCw, ShieldCheck, X } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { SectionCard } from "@/components/duleko/ProfileParts";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { KYC_DOC_ICON, KYC_DOC_LABEL, KYC_REASON_SHORT, KYC_REJECTION_CODES } from "@/components/duleko/kyc/KycParts";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { kycHasBack, kycPhotoUrls, listKycQueue, listRecentKycReviews, reviewKyc } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import type { KycQueueItem, KycRejectionCode } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";

type Photo = { src: string; title: string };

/**
 * Staff: ID checks. Each member who sent their ID waits here, oldest
 * first, with their profile photo beside the documents so the face and
 * the name can be compared. Approving gives the verified badge -
 * the only way it can be given (6300_kyc_verification.sql) - and
 * rejecting tells the member why. Every staff tier can check IDs.
 */
export function KycQueueScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewing, setViewing] = useState<Photo | null>(null);
  const [rejecting, setRejecting] = useState<KycQueueItem | null>(null);
  const [code, setCode] = useState<KycRejectionCode>("unclear");
  const [note, setNote] = useState("");

  const isStaff = Boolean(profile?.staff_role);
  const queue = useQuery({ queryKey: ["kyc-queue"], queryFn: listKycQueue, enabled: isStaff });
  const recent = useQuery({ queryKey: ["kyc-recent"], queryFn: () => listRecentKycReviews(), enabled: isStaff });

  // The bucket is private: one batch of short-lived links for every photo
  // in the queue, renewed before they run out.
  const paths = useMemo(
    () =>
      (queue.data ?? []).flatMap((s) =>
        s.documents.flatMap((d) => (d.back_path ? [d.front_path, d.back_path] : [d.front_path])),
      ),
    [queue.data],
  );
  const urls = useQuery({
    queryKey: ["kyc-photo-urls", paths],
    queryFn: () => kycPhotoUrls(paths),
    enabled: isStaff && paths.length > 0,
    staleTime: 5 * 60_000,
    refetchInterval: 8 * 60_000,
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["kyc-queue"] });
    void queryClient.invalidateQueries({ queryKey: ["kyc-recent"] });
    void queryClient.invalidateQueries({ queryKey: ["kyc-queue-count"] });
  }

  const review = useMutation({
    mutationFn: ({ item, approve }: { item: KycQueueItem; approve: boolean }) =>
      reviewKyc(item.id, approve, approve ? undefined : code, approve ? undefined : note),
    onSuccess: (_, { approve }) => {
      setRejecting(null);
      toast(t(approve ? "kycApprovedToast" : "kycRejectedToast"));
      refresh();
    },
    onError: (error) => {
      toast(errorMessage(error), "error");
      // Most likely another staff member got to it first.
      refresh();
    },
  });

  function startReject(item: KycQueueItem) {
    setCode("unclear");
    setNote("");
    setRejecting(item);
  }

  if (!profile) return <SignInRequiredScreen title={t("kycQueueTitle")} />;

  return (
    <>
      <AppHeader title={t("kycQueueTitle")} subtitle={t("kycQueueSubtitle")} />
      <PageContainer>
        {!isStaff ? (
          <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title={t("kycQueueStaffOnly")} />
        ) : (
          <div className="@container">
            <div className="grid grid-cols-1 gap-3 md:gap-4 @3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @3xl:items-start">
              <SectionCard compact icon={Hourglass} title={t("kycQueueWaiting")} badge={queue.data?.length || undefined}>
                <p className="mb-3 text-xs leading-relaxed text-slate-500">{t("kycQueueHowTo")}</p>
                {queue.isPending ? (
                  <CardSkeleton count={2} />
                ) : queue.isError ? (
                  <ErrorState message={errorMessage(queue.error)} onRetry={() => queue.refetch()} retryLabel={t("retry")} />
                ) : queue.data.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">{t("kycQueueEmpty")}</p>
                ) : (
                  <ul className="space-y-3">
                    {queue.data.map((item) => {
                      const busy = review.isPending && review.variables?.item.id === item.id;
                      return (
                        <li key={item.id} className="rounded-xl border border-slate-200 bg-surface p-3">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                item.person.avatar_url && setViewing({ src: item.person.avatar_url, title: t("kycProfilePhoto") })
                              }
                              disabled={!item.person.avatar_url}
                              aria-label={t("kycProfilePhoto")}
                              className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:cursor-default"
                            >
                              <Avatar name={item.person.full_name} src={item.person.avatar_url} size={56} />
                            </button>
                            <div className="min-w-0 flex-1">
                              <Link
                                to="/worker/$workerId"
                                params={{ workerId: item.person.id }}
                                className="block truncate text-[15px] font-semibold text-slate-900 hover:text-brand-700"
                              >
                                {item.person.full_name}
                              </Link>
                              <p className="text-xs text-slate-500">
                                {[item.person.member_no, item.person.district, t("kycQueueSent", { when: relativeTime(item.created_at, lang) })]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                              {!item.person.avatar_url && (
                                <p className="mt-0.5 text-xs font-medium text-amber-700">{t("kycQueueNoPhoto")}</p>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 space-y-3">
                            {item.documents.map((d) => {
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
                                        url={urls.data?.[side.path]}
                                        label={side.label}
                                        loading={urls.isPending}
                                        onOpen={(src) => setViewing({ src, title: `${name} · ${side.label}` })}
                                      />
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-3.5 grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              loading={busy && review.variables?.approve}
                              disabled={busy}
                              onClick={() => review.mutate({ item, approve: true })}
                            >
                              {!(busy && review.variables?.approve) && <Check className="h-3.5 w-3.5" aria-hidden />}
                              {t("kycApprove")}
                            </Button>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => startReject(item)}>
                              <X className="h-3.5 w-3.5" aria-hidden />
                              {t("kycReject")}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SectionCard>

              <SectionCard compact icon={History} title={t("kycRecent")}>
                {recent.isPending ? (
                  <CardSkeleton count={2} />
                ) : !recent.data?.length ? (
                  <p className="text-xs text-slate-500">{t("kycRecentEmpty")}</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {recent.data.map((r) => (
                      <li key={r.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                        <Avatar name={r.person.full_name} src={r.person.avatar_url} size={32} profileId={r.person.id} />
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/worker/$workerId"
                            params={{ workerId: r.person.id }}
                            className="block truncate text-sm font-semibold text-slate-900 hover:text-brand-700"
                          >
                            {r.person.full_name}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {t("kycCheckedBy", {
                              name: r.reviewer?.full_name ?? "-",
                              when: r.reviewed_at ? relativeTime(r.reviewed_at, lang) : "",
                            })}
                          </p>
                          {r.status === "rejected" && r.rejection_code && (
                            <p className="mt-0.5 break-words text-xs text-slate-600">
                              {t(KYC_REASON_SHORT[r.rejection_code])}
                              {r.rejection_note ? ` - ${r.rejection_note}` : ""}
                            </p>
                          )}
                        </div>
                        <Badge tone={r.status === "approved" ? "success" : "danger"}>
                          {t(r.status === "approved" ? "kycStatusApproved" : "kycStatusRejected")}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          </div>
        )}
      </PageContainer>

      <PhotoViewer photo={viewing} onClose={() => setViewing(null)} />

      <Dialog
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title={t("kycRejectTitle")}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="danger"
              loading={review.isPending}
              disabled={code === "other" && !note.trim()}
              onClick={() => rejecting && review.mutate({ item: rejecting, approve: false })}
            >
              {t("kycRejectSend")}
            </Button>
          </>
        }
      >
        {rejecting && <p className="mb-3 text-sm font-medium text-slate-700">{rejecting.person.full_name}</p>}
        <div role="radiogroup" aria-label={t("kycRejectTitle")} className="mb-3.5 flex flex-wrap gap-2">
          {KYC_REJECTION_CODES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={code === c}
              onClick={() => setCode(c)}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                code === c
                  ? "border-brand-600 bg-brand-50 text-brand-800"
                  : "border-slate-300 bg-surface text-slate-700 hover:bg-slate-50",
              )}
            >
              {t(KYC_REASON_SHORT[c])}
            </button>
          ))}
        </div>
        <Field
          label={code === "other" ? t("kycRejectNoteNeeded") : t("kycRejectNote")}
          hint={t("kycRejectNoteHint")}
          className="mb-0"
        >
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={300} />
        </Field>
      </Dialog>
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
function PhotoViewer({ photo, onClose }: { photo: Photo | null; onClose: () => void }) {
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
