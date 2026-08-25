"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Camera, Heart, Layers, Loader2, MessageCircle, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { postsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";

export function ProfileGrid({ userId }: { userId: string }) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.posts.byUser(userId),
    queryFn: ({ pageParam }: { pageParam: number }) =>
      postsApi.byUser(userId, pageParam),
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-1.5 px-1 sm:gap-2 sm:px-0">
        {Array.from({ length: 9 }).map((_, index) => (
          <Skeleton key={index} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="grid size-16 place-items-center rounded-full border-2 border-foreground">
          <Camera className="size-7" />
        </div>
        <p className="text-xl font-light">No Posts Yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          When they share photos and videos, they&apos;ll appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Rounded tiles with a little air between them, rather than a hard
          3-column ruled grid — the gaps read as breathing room instead of
          lines drawn across the page. */}
      <div className="grid grid-cols-3 gap-1.5 px-1 sm:gap-2 sm:px-0">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/p/${post.id}`}
            className="group relative aspect-square overflow-hidden rounded-xl bg-muted transition-transform duration-300 ease-smooth hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Image
              src={post.mediaUrls[0] ?? ""}
              alt={post.caption || "Post"}
              fill
              sizes="(max-width: 768px) 33vw, 300px"
              className="object-cover transition-transform duration-500 ease-smooth group-hover:scale-[1.06]"
            />

            {/* Top-right badge: a stack icon for carousels, a play icon for
                videos. Only one applies, so a carousel wins if it's both. */}
            {post.mediaUrls.length > 1 ? (
              <Layers className="absolute right-2 top-2 size-4 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]" />
            ) : (
              post.mediaType === "video" && (
                <Play className="absolute right-2 top-2 size-4 fill-white text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]" />
              )
            )}

            {/* Hover overlay: a top-to-bottom dark gradient (softer than a flat
                fill) with the like/comment counts, which fade + rise into view. */}
            <div className="absolute inset-0 flex items-center justify-center gap-6 bg-gradient-to-b from-black/40 to-black/60 text-white opacity-0 transition-opacity duration-300 ease-smooth group-hover:opacity-100 group-focus-visible:opacity-100">
              <span className="flex translate-y-1 items-center gap-1.5 font-semibold tabular-nums transition-transform duration-300 ease-smooth group-hover:translate-y-0">
                <Heart className="size-5 fill-white" />
                {post.likesCount.toLocaleString()}
              </span>
              <span className="flex translate-y-1 items-center gap-1.5 font-semibold tabular-nums transition-transform duration-300 ease-smooth group-hover:translate-y-0">
                <MessageCircle className="size-5 -scale-x-100 fill-white" />
                {post.commentsCount.toLocaleString()}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Infinite-scroll trigger. When the next page is loading we show a
          spinner in its place so the grid doesn't just stall silently. */}
      <div ref={sentinelRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}
    </>
  );
}
