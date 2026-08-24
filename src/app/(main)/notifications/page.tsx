"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { notificationsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: () => notificationsApi.list(),
    refetchInterval: 30 * 1000,
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list }),
  });

  const notifications = data?.items ?? [];
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="flex items-center justify-between border-b border-border px-4 py-4">
        <h1 className="text-xl font-semibold">Notifications</h1>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            Mark all as read
          </Button>
        )}
      </header>

      {isLoading && (
        <div className="space-y-4 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && notifications.length === 0 && (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">
          No notifications yet.
        </p>
      )}

      <div className="stagger divide-y divide-border" style={{ ["--stagger" as string]: "50ms" }}>
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </div>
    </div>
  );
}
