import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { MessageCircle, UserCheck, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardBody, SectionTitle } from "@/components/ui/card";
import { CardSkeleton, EmptyState } from "@/components/ui/states";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { listFriends, listIncomingRequests, respondFriendRequest } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";

/**
 * Incoming friend requests + the friends list. Its own component so both the
 * standalone /friends screen and the Friends division inside /chats can
 * share one copy of this logic.
 */
export function FriendsPanel() {
  const { t } = useI18n();
  const { profile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const requests = useQuery({
    queryKey: ["friend-requests", profile?.id],
    queryFn: () => listIncomingRequests(profile!.id),
    enabled: Boolean(profile?.id),
  });

  const friends = useQuery({
    queryKey: ["friends", profile?.id],
    queryFn: () => listFriends(profile!.id),
    enabled: Boolean(profile?.id),
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    queryClient.invalidateQueries({ queryKey: ["friends"] });
    queryClient.invalidateQueries({ queryKey: ["friendship"] });
    queryClient.invalidateQueries({ queryKey: ["unread"] });
  }

  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => respondFriendRequest(id, accept),
    onSuccess: invalidateAll,
    onError: (error) => toast(errorMessage(error), "error"),
  });

  return (
    <>
      <Card className="mb-4">
        <CardBody>
          <SectionTitle>{t("friendRequests")}</SectionTitle>
          {requests.isLoading ? (
            <CardSkeleton count={2} />
          ) : (requests.data?.length ?? 0) === 0 ? (
            <p className="py-2 text-sm text-slate-500">{t("noRequestsYet")}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(requests.data ?? []).map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={r.other.full_name} src={r.other.avatar_url} size={40} />
                  <span className="flex-1 truncate text-sm font-medium text-slate-800">
                    {r.other.full_name}
                  </span>
                  <Button
                    size="sm"
                    loading={respond.isPending}
                    onClick={() => respond.mutate({ id: r.id, accept: true })}
                  >
                    {t("acceptRequest")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={respond.isPending}
                    onClick={() => respond.mutate({ id: r.id, accept: false })}
                  >
                    {t("declineRequest")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <SectionTitle>{t("myFriends")}</SectionTitle>
          {friends.isLoading ? (
            <CardSkeleton count={3} />
          ) : (friends.data?.length ?? 0) === 0 ? (
            <EmptyState icon={<Users className="h-8 w-8" />} title={t("noFriendsYet")} hint={t("noFriendsYetHint")} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {(friends.data ?? []).map((f) => (
                <li key={f.id} className="flex items-center gap-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/worker/$workerId", params: { workerId: f.other.id } })}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <Avatar name={f.other.full_name} src={f.other.avatar_url} size={40} />
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-slate-800">
                      <UserCheck className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                      <span className="truncate">{f.other.full_name}</span>
                    </span>
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate({ to: "/chat/$otherId", params: { otherId: f.other.id } })}
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    {t("chatNow")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
