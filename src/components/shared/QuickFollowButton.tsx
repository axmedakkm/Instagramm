"use client";

import { useMutation } from "@tanstack/react-query";
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
  const isFollowing = useFollowStore((state) =>
    state.followedIds.includes(userId),
  );
  const follow = useFollowStore((state) => state.follow);
  const unfollow = useFollowStore((state) => state.unfollow);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) await usersApi.unfollow(userId);
      else await usersApi.follow(userId);
    },
    onSuccess: () => {
      if (isFollowing) unfollow(userId);
      else follow(userId);
    },
  });

  return (
    <Button
      size="sm"
      variant={isFollowing ? "outline" : "default"}
      className={className}
      disabled={mutation.isPending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        mutation.mutate();
      }}
    >
      {isFollowing ? "Unfollow" : "Follow"}
    </Button>
  );
}
