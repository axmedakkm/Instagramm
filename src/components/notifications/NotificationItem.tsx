"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Heart, MessageCircle, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { QuickFollowButton } from "@/components/shared/QuickFollowButton";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usersApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { Notification } from "@/types";

const NOTIFICATION_COPY: Record<Notification["type"], string> = {
  like_post: "liked your post.",
  like_comment: "liked your comment.",
  comment: "commented on your post.",
  follow: "started following you.",
  follow_request: "requested to follow you.",
  mention: "mentioned you in a comment.",
};

const NOTIFICATION_ICON: Record<Notification["type"], typeof Heart> = {
  like_post: Heart,
  like_comment: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  follow_request: UserPlus,
  mention: MessageCircle,
};

/** Each notification type gets its own coloured badge so the feed reads at a
 * glance — hearts pink, comments blue, follows brand-purple. */
const NOTIFICATION_BADGE: Record<Notification["type"], string> = {
  like_post: "bg-[linear-gradient(135deg,#ee2a7b,#f43f5e)] text-white",
  like_comment: "bg-[linear-gradient(135deg,#ee2a7b,#f43f5e)] text-white",
  comment: "bg-[linear-gradient(135deg,#0095f6,#3b82f6)] text-white",
  mention: "bg-[linear-gradient(135deg,#0095f6,#3b82f6)] text-white",
  follow: "bg-[linear-gradient(135deg,#6228d7,#ee2a7b)] text-white",
  follow_request: "bg-[linear-gradient(135deg,#6228d7,#ee2a7b)] text-white",
};

/**
 * Accept/decline actions for a "follow_request" notification — the
 * *recipient* is being asked to let `notification.actor` follow them, so a
 * plain follow toggle (QuickFollowButton) would be backwards here: it would
 * follow the requester instead of answering their request.
 */
function FollowRequestActions({ requesterId }: { requesterId: string }) {
  const queryClient = useQueryClient();
  const [resolution, setResolution] = useState<"accepted" | "declined" | null>(
    null,
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list });
    queryClient.invalidateQueries({ queryKey: queryKeys.users.followRequests });
  };

  // A 404 here means the request is already gone (accepted/declined/
  // cancelled elsewhere, or the notification is just stale) — there's
  // nothing left to act on, so tell the user and refresh instead of leaving
  // the Accept/Decline buttons stuck re-triggering the same 404.
  const handleGone = () => {
    toast.error("This follow request is no longer available.");
    invalidate();
  };

  const accept = useMutation({
    mutationFn: () => usersApi.acceptFollowRequest(requesterId),
    onSuccess: () => {
      setResolution("accepted");
      invalidate();
    },
    onError: handleGone,
  });

  const reject = useMutation({
    mutationFn: () => usersApi.rejectFollowRequest(requesterId),
    onSuccess: () => {
      setResolution("declined");
      invalidate();
    },
    onError: handleGone,
  });

  if (resolution === "accepted") {
    return <span className="text-sm text-muted-foreground">Accepted</span>;
  }
  if (resolution === "declined") {
    return <span className="text-sm text-muted-foreground">Declined</span>;
  }

  const isPending = accept.isPending || reject.isPending;

  return (
    <div className="flex items-center gap-2">
      <Button
        size="icon"
        className="size-8"
        disabled={isPending}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          accept.mutate();
        }}
        aria-label="Accept follow request"
      >
        <Check className="size-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="size-8"
        disabled={isPending}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          reject.mutate();
        }}
        aria-label="Decline follow request"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

export function NotificationItem({
  notification,
}: {
  notification: Notification;
}) {
  const Icon = NOTIFICATION_ICON[notification.type];
  const router = useRouter();

  const content = (
    <div
      className={cn(
        "relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent",
        !notification.isRead && "bg-primary/5",
      )}
    >
      {!notification.isRead && (
        <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-[linear-gradient(180deg,#f9ce34,#ee2a7b,#6228d7)]" />
      )}
      <div className="relative shrink-0">
        <UserAvatar user={notification.actor} size="md" />
        <span
          className={cn(
            "absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-background shadow-soft",
            NOTIFICATION_BADGE[notification.type],
          )}
        >
          <Icon className="size-3 fill-current" />
        </span>
      </div>

      <p className="min-w-0 flex-1 text-sm">
        <Link
          href={`/${notification.actor.username}`}
          className="mr-1 font-semibold"
          onClick={(event) => event.stopPropagation()}
        >
          {notification.actor.username}
        </Link>
        {NOTIFICATION_COPY[notification.type]}{" "}
        <TimeAgo
          date={notification.createdAt}
          className="text-muted-foreground"
        />
      </p>

      {notification.type === "follow" && (
        <QuickFollowButton userId={notification.actor.id} />
      )}
      {notification.type === "follow_request" && (
        <FollowRequestActions requesterId={notification.actor.id} />
      )}
    </div>
  );

  if (notification.postId) {
    const postId = notification.postId;
    return (
      // Not a <Link>: the row already contains an actor-profile <Link>, and
      // nesting <a> inside <a> is invalid HTML — it parses fine on the
      // server but the browser silently un-nests it on hydration, so React
      // sees a different tree and throws a hydration error.
      <div
        role="link"
        tabIndex={0}
        onClick={() => router.push(`/p/${postId}`)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            router.push(`/p/${postId}`);
          }
        }}
        className="cursor-pointer"
      >
        {content}
      </div>
    );
  }

  return content;
}
