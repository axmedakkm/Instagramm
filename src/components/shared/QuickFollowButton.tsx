"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usersApi } from "@/services/api";

/**
 * A follow toggle for contexts where the backend's "short" user shape doesn't
 * carry `isFollowedByMe` (notification actors, follower/following lists of
 * someone else's profile) — so local state stands in for the server truth.
 * Follows on the first click and flips to "Unfollow" so it can be undone.
 */
export function QuickFollowButton({
  userId,
  className,
}: {
  userId: string;
  className?: string;
}) {
  const [isFollowing, setIsFollowing] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) await usersApi.unfollow(userId);
      else await usersApi.follow(userId);
    },
    onSuccess: () => setIsFollowing((prev) => !prev),
  });

  return (
    <Button
      size="sm"
      variant={isFollowing ? "outline" : "default"}
      className={className}
      disabled={mutation.isPending}
      onClick={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      {isFollowing ? "Unfollow" : "Follow"}
    </Button>
  );
}
