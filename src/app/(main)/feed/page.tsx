"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { PostCard } from "@/components/feed/PostCard";
import { StoriesBar } from "@/components/feed/StoriesBar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { postsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";

function FeedSkeleton() {
  return (
    <div className="space-y-6 px-0 sm:px-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="space-y-3 pb-4">
          <div className="flex items-center gap-3 px-4">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="aspect-square w-full" />
        </div>
      ))}
    </div>
  );
}

export default function FeedPage() {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.posts.feed,
    queryFn: ({ pageParam }: { pageParam: number }) => postsApi.feed(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl">
      <main className="mx-auto w-full max-w-[470px] flex-1">
        <StoriesBar />

        {isLoading && <FeedSkeleton />}

        {isError && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Couldn&apos;t load your feed. Pull to refresh or try again later.
          </p>
        )}

        {!isLoading && posts.length === 0 && !isError && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No posts yet. Follow people to see their posts here.
          </p>
        )}

        <div className="stagger pt-4" style={{ ["--stagger" as string]: "90ms" }}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        <div ref={sentinelRef} className="h-1" />

        {isFetchingNextPage && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Loading more posts...
          </p>
        )}
      </main>

      <RightSidebar />
    </div>
  );
}
