"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { FollowButton } from "@/components/shared/FollowButton";
import { QuickFollowButton } from "@/components/shared/QuickFollowButton";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { usersApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";

export function FollowListModal({
  userId,
  type,
  open,
  onOpenChange,
  /** True when this is the signed-in viewer's own "following" list — every
   * row is then someone the viewer definitely already follows, so we can
   * show the real optimistic `FollowButton` instead of a blind guess. */
  viewerFollowsAll = false,
}: {
  userId: string;
  type: "followers" | "following";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewerFollowsAll?: boolean;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchPage =
    type === "followers" ? usersApi.followers : usersApi.following;

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey:
        type === "followers"
          ? queryKeys.users.followers(userId)
          : queryKeys.users.following(userId),
      queryFn: ({ pageParam }: { pageParam: number }) =>
        fetchPage(userId, pageParam),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.pagination.page < lastPage.pagination.totalPages
          ? lastPage.pagination.page + 1
          : undefined,
      enabled: open,
    });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !open) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const users = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 p-0">
        <DialogHeader>
          <DialogTitle>
            {type === "followers" ? "Followers" : "Following"}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto p-2">
          {isLoading &&
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}

          {!isLoading && users.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              {type === "followers" ? "No followers yet." : "Not following anyone yet."}
            </p>
          )}

          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
            >
              <Link
                href={`/${user.username}`}
                onClick={() => onOpenChange(false)}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <UserAvatar user={user} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {user.username}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.fullName}
                  </p>
                </div>
              </Link>
              {viewerFollowsAll ? (
                <FollowButton
                  user={{ ...user, isFollowedByMe: true }}
                  className="h-8 shrink-0 min-w-0 px-3 text-xs"
                />
              ) : (
                <QuickFollowButton
                  userId={user.id}
                  className="h-8 shrink-0 min-w-0 px-3 text-xs"
                />
              )}
            </div>
          ))}

          <div ref={sentinelRef} className="h-1" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
