"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usersApi } from "@/services/api";
import { useFollowStore } from "@/store/useFollowStore";

/**
 * A follow toggle for contexts where the backend's "short" user shape doesn't
 * carry `isFollowedByMe` (notification actors, follower/following lists of
 * someone else's profile). The followed state is persisted client-side so the
 * button stays on "Unfollow" across refreshes until the user unfollows.
 */
export function QuickFollowButton({
  userId,
  className,
}: {
  userId: string;
  className?: string;
}) {
  const followedIds = useFollowStore((state) => state.followedIds);
  const requestedIds = useFollowStore((state) => state.requestedIds);
  const follow = useFollowStore((state) => state.follow);
  const unfollow = useFollowStore((state) => state.unfollow);
  const request = useFollowStore((state) => state.request);
  const unrequest = useFollowStore((state) => state.unrequest);

  const isFollowing = followedIds.includes(userId);
  // A pending request to a private account behaves like "already following"
  // for the toggle — clicking it again withdraws the request, same as
  // `FollowButton` on the profile page.
  const isRequested = !isFollowing && requestedIds.includes(userId);
  const isActioned = isFollowing || isRequested;

  const mutation = useMutation({
    mutationFn: async () => {
      if (isActioned) {
        await usersApi.unfollow(userId);
        return { status: "none" as const };
      }
      const { status } = await usersApi.follow(userId);
      return { status };
    },
    onSuccess: (result) => {
      if (isActioned) {
        unfollow(userId);
        unrequest(userId);
      } else if (result.status === "pending") {
        request(userId);
      } else {
        follow(userId);
      }
    },
    onError: () => {
      // A 404 here usually means the relationship this button *thought*
      // existed (from locally-persisted state) is already gone server-side
      // — clear it locally too instead of leaving the button stuck.
      unfollow(userId);
      unrequest(userId);
      toast.error("Something went wrong. Please try again.");
    },
  });

  const label = isFollowing ? "Unfollow" : isRequested ? "Requested" : "Follow";

  return (
    <Button
      size="sm"
      variant={isActioned ? "outline" : "default"}
      className={className}
      disabled={mutation.isPending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        mutation.mutate();
      }}
    >
      {label}
    </Button>
  );
}
