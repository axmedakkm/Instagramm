"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usersApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import { useFollowStore } from "@/store/useFollowStore";
import type { User } from "@/types";

export function FollowButton({
  user,
  className,
}: {
  user: Pick<User, "id" | "username" | "isFollowedByMe">;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const followedIds = useFollowStore((state) => state.followedIds);
  const requestedIds = useFollowStore((state) => state.requestedIds);
  const markFollowed = useFollowStore((state) => state.follow);
  const markUnfollowed = useFollowStore((state) => state.unfollow);
  const markRequested = useFollowStore((state) => state.request);
  const unmarkRequested = useFollowStore((state) => state.unrequest);

  const isFollowing = user.isFollowedByMe || followedIds.includes(user.id);
  const isRequested = !isFollowing && requestedIds.includes(user.id);

  /** Optimistically nudge the profile header's follower count. */
  const adjustFollowerCount = (delta: number, following: boolean) => {
    queryClient.setQueryData<User>(
      queryKeys.users.detail(user.username),
      (old) =>
        old
          ? {
              ...old,
              isFollowedByMe: following,
              followersCount: Math.max(0, old.followersCount + delta),
            }
          : old,
    );
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (isFollowing || isRequested) {
        await usersApi.unfollow(user.id);
        return { action: "removed" as const };
      }
      const { status } = await usersApi.follow(user.id);
      return {
        action: status === "pending" ? ("requested" as const) : ("followed" as const),
      };
    },
    onSuccess: (result) => {
      if (result.action === "removed") {
        const wasFollowing = isFollowing;
        markUnfollowed(user.id);
        unmarkRequested(user.id);
        if (wasFollowing) adjustFollowerCount(-1, false);
      } else if (result.action === "followed") {
        markFollowed(user.id);
        adjustFollowerCount(1, true);
      } else {
        // Pending request to a private account — no new follower yet.
        markRequested(user.id);
      }
    },
    onError: () => toast.error("Something went wrong. Please try again."),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(user.username),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.suggestions });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.followers(user.id),
      });
      if (currentUserId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.following(currentUserId),
        });
      }
    },
  });

  const label = isFollowing ? "Following" : isRequested ? "Requested" : "Follow";

  return (
    <Button
      size="sm"
      variant={isFollowing || isRequested ? "secondary" : "default"}
      className={cn("min-w-24", className)}
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {label}
    </Button>
  );
}
