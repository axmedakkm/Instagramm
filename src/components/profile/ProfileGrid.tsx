"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Heart, Layers, MessageCircle } from "lucide-react";
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
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, index) => (
          <Skeleton key={index} className="aspect-square rounded-none" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        No posts yet.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/p/${post.id}`}
            className="group relative aspect-square overflow-hidden rounded-sm bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Image
              src={post.mediaUrls[0] ?? ""}
              alt={post.caption || "Post"}
              fill
              sizes="(max-width: 768px) 33vw, 300px"
              className="object-cover transition-transform duration-500 ease-smooth group-hover:scale-[1.06]"
            />
            {post.mediaUrls.length > 1 && (
              <Layers className="absolute right-2 top-2 size-4 text-white drop-shadow" />
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-6 bg-black/50 text-white opacity-0 transition-opacity duration-200 ease-smooth group-hover:opacity-100 group-focus-visible:opacity-100">
              <span className="flex items-center gap-1.5 font-semibold">
                <Heart className="size-5 fill-white" />
                {post.likesCount.toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <MessageCircle className="size-5 fill-white" />
                {post.commentsCount.toLocaleString()}
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div ref={sentinelRef} className="h-1" />
    </>
  );
}
