"use client";

import { Heart, MessageCircle, UserPlus } from "lucide-react";
import Link from "next/link";
import { QuickFollowButton } from "@/components/shared/QuickFollowButton";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";
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

export function NotificationItem({
  notification,
}: {
  notification: Notification;
}) {
  const Icon = NOTIFICATION_ICON[notification.type];

  const content = (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent",
        !notification.isRead && "bg-primary/5",
      )}
    >
      <div className="relative shrink-0">
        <UserAvatar user={notification.actor} size="md" />
        <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-background text-destructive">
          <Icon className="size-3.5 fill-current" />
        </span>
      </div>

      <p className="min-w-0 flex-1 text-sm">
        <Link
          href={`/${notification.actor.username}`}
          className="mr-1 font-semibold"
        >
          {notification.actor.username}
        </Link>
        {NOTIFICATION_COPY[notification.type]}{" "}
        <TimeAgo
          date={notification.createdAt}
          className="text-muted-foreground"
        />
      </p>

      {(notification.type === "follow" ||
        notification.type === "follow_request") && (
        <QuickFollowButton userId={notification.actor.id} />
      )}
    </div>
  );

  if (notification.postId) {
    return <Link href={`/p/${notification.postId}`}>{content}</Link>;
  }

  return content;
}
