"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usersApi } from "@/services/api";

/**
 * A fire-and-forget follow button for contexts where the backend's "short"
 * user shape doesn't carry `isFollowedByMe` (notification actors, follower/
 * following lists of someone else's profile) — so there's no server truth
 * to toggle optimistically like the full `FollowButton` does. Local state
 * stands in once clicked.
 */
export function QuickFollowButton({
  userId,
  className,
}: {
  userId: string;
  className?: string;
}) {
  const [justFollowed, setJustFollowed] = useState(false);

  const mutation = useMutation({
    mutationFn: () => usersApi.follow(userId),
    onSuccess: () => setJustFollowed(true),
  });

  return (
    <Button
      size="sm"
      variant={justFollowed ? "secondary" : "default"}
      className={className}
      disabled={justFollowed || mutation.isPending}
      onClick={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      {justFollowed ? "Following" : "Follow"}
    </Button>
  );
}
