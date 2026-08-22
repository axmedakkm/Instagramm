"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usersApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { User } from "@/types";

export function FollowButton({
  user,
  className,
}: {
  user: Pick<User, "id" | "username" | "isFollowedByMe">;
  className?: string;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (user.isFollowedByMe) {
        await usersApi.unfollow(user.id);
      } else {
        await usersApi.follow(user.id);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.users.detail(user.username),
      });
      const previous = queryClient.getQueryData<User>(
        queryKeys.users.detail(user.username),
      );

      queryClient.setQueryData<User>(
        queryKeys.users.detail(user.username),
        (old) =>
          old
            ? {
                ...old,
                isFollowedByMe: !old.isFollowedByMe,
                followersCount: old.isFollowedByMe
                  ? old.followersCount - 1
                  : old.followersCount + 1,
              }
            : old,
      );

      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.users.detail(user.username),
          context.previous,
        );
      }
      toast.error("Something went wrong. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(user.username),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.suggestions });
    },
  });

  return (
    <Button
      size="sm"
      variant={user.isFollowedByMe ? "secondary" : "default"}
      className={cn("min-w-24", className)}
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {user.isFollowedByMe ? "Following" : "Follow"}
    </Button>
  );
}
