import { useEffect, useState } from "react";
import { Link, useCanGoBack, useNavigate, useParams, useRouter } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Pin, Plus, Trash2 } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { NoticeByline, NoticeCard, NoticeComposer, NoticeText } from "@/components/duleko/NoticeParts";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CardSkeleton, EmptyState, ErrorState, FullPageLoader } from "@/components/ui/states";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { NOTICES_PAGE, deleteNotice, getNotice, listNotices, markNoticeAlertRead } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { cn, formatClockTime, formatDate } from "@/lib/utils";

/**
 * Back that never strands you: someone who opened a notice straight from
 * an email has no page behind it, so they go to the board instead.
 */
function BackButton({ fallback }: { fallback: "/home" | "/notices" }) {
  const { t } = useI18n();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (
    <button
      type="button"
      onClick={() => (canGoBack ? router.history.back() : router.navigate({ to: fallback }))}
      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
      aria-label={t("back")}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

/** The Duleko notice board: everyone reads it, staff post to it. */
export function NoticeBoardScreen() {
  const { t } = useI18n();
  const { profile } = useSession();
  const [composing, setComposing] = useState(false);

  // Paged like Alerts: the board only grows.
  const notices = useInfiniteQuery({
    queryKey: ["notices"],
    queryFn: ({ pageParam }) => listNotices(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length < NOTICES_PAGE ? undefined : all.length),
  });

  const items = notices.data?.pages.flat() ?? [];

  return (
    <>
      <AppHeader
        title={t("noticeBoard")}
        subtitle={t("noticeBoardHint")}
        back={<BackButton fallback="/home" />}
        right={
          profile?.staff_role ? (
            <Button size="sm" onClick={() => setComposing(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t("postNotice")}</span>
              <span className="sm:hidden">{t("postNoticeShort")}</span>
            </Button>
          ) : undefined
        }
      />
      <PageContainer>
        {notices.isLoading ? (
          <CardSkeleton count={3} />
        ) : notices.isError ? (
          <ErrorState
            message={errorMessage(notices.error)}
            onRetry={() => notices.refetch()}
            retryLabel={t("retry")}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Pin className="h-8 w-8" />}
            title={t("noNotices")}
            hint={t("noNoticesHint")}
            action={
              profile?.staff_role ? (
                <Button size="sm" onClick={() => setComposing(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  {t("postNotice")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* One column, newest first, as wide as a notice itself: side by
                side, a text-only notice stretched to match an image one. */}
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-3 md:gap-4">
              {items.map((notice) => (
                <NoticeCard key={notice.id} notice={notice} />
              ))}
            </div>
            {notices.hasNextPage && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  loading={notices.isFetchingNextPage}
                  onClick={() => notices.fetchNextPage()}
                >
                  {t("loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </PageContainer>

      {composing && <NoticeComposer onClose={() => setComposing(false)} />}
    </>
  );
}

/**
 * One notice, whole: the full image and every word. This is where an
 * alert, an email, and a card on the board all lead.
 */
export function NoticeScreen() {
  const { t, lang } = useI18n();
  const { noticeId } = useParams({ from: "/notices/$noticeId" });
  const { profile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const notice = useQuery({ queryKey: ["notices", "one", noticeId], queryFn: () => getNotice(noticeId) });

  // Reading the notice is what its alert asked for, however you got here.
  useEffect(() => {
    if (!profile?.id) return;
    markNoticeAlertRead(profile.id, noticeId)
      .then((changed) => {
        if (!changed) return;
        queryClient.invalidateQueries({ queryKey: ["unread", profile.id] });
        queryClient.invalidateQueries({ queryKey: ["notifications", profile.id] });
      })
      .catch(() => {
        // Only a badge count depends on this.
      });
  }, [profile?.id, noticeId, queryClient]);

  const remove = useMutation({
    mutationFn: () => deleteNotice(notice.data!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread"] });
      toast(t("noticeDeleted"));
      navigate({ to: "/notices", replace: true });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const n = notice.data;

  return (
    <>
      <AppHeader
        title={t("notice")}
        back={<BackButton fallback="/notices" />}
        right={
          n && profile?.staff_role ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-50"
              onClick={() => setConfirmDelete(true)}
              aria-label={t("deleteNotice")}
              title={t("deleteNotice")}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t("deleteNotice")}</span>
            </Button>
          ) : undefined
        }
      />
      <PageContainer>
        {notice.isLoading ? (
          <FullPageLoader />
        ) : notice.isError ? (
          <ErrorState message={errorMessage(notice.error)} onRetry={() => notice.refetch()} retryLabel={t("retry")} />
        ) : !n ? (
          <EmptyState
            icon={<Pin className="h-8 w-8" />}
            title={t("noticeNotFound")}
            action={
              <Link to="/notices" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                {t("allNotices")}
              </Link>
            }
          />
        ) : (
          <article className="animate-in-up mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm">
            <header className="p-4 sm:p-5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                <Pin className="h-3.5 w-3.5" aria-hidden />
                {t("noticeBoard")}
                <span aria-hidden className="text-slate-300">
                  ·
                </span>
                <span className="font-medium normal-case tracking-normal text-slate-500">
                  {formatDate(n.created_at.slice(0, 10), lang)}, {formatClockTime(n.created_at, lang)}
                </span>
              </p>
              <h2 className="mt-1.5 break-words text-xl font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">
                {n.title}
              </h2>
              <div className="mt-2.5">
                <NoticeByline notice={n} avatarSize={28} />
              </div>
            </header>

            {/* The whole image, never cropped - it is the notice. */}
            {n.image_url && (
              <div className="border-y border-slate-100 bg-slate-50">
                <a href={n.image_url} target="_blank" rel="noopener noreferrer" aria-label={t("openFullImage")}>
                  <img src={n.image_url} alt={n.title} className="mx-auto max-h-[80vh] w-full object-contain" />
                </a>
              </div>
            )}

            {(n.body || n.image_url) && (
              <div className={cn("space-y-3 p-4 sm:p-5", !n.image_url && "pt-0 sm:pt-0")}>
                {n.body && <NoticeText text={n.body} className="text-[15px] leading-7 text-slate-700" />}
                {n.image_url && (
                  <a
                    href={n.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    {t("openFullImage")}
                  </a>
                )}
              </div>
            )}
          </article>
        )}
      </PageContainer>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t("deleteNoticeTitle")}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {t("cancel")}
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              {t("deleteNotice")}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">{t("deleteNoticeConfirm")}</p>
      </Dialog>
    </>
  );
}
