"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Heart, Layers, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { postsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";

export function ProfileGrid({
  userId,
  mode = "posts",
}: {
  userId: string;
  mode?: "posts" | "saved";
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: mode === "posts" ? queryKeys.posts.byUser(userId) : queryKeys.posts.saved,
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      mode === "posts"
        ? postsApi.byUser(userId, pageParam)
        : postsApi.saved(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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
        {mode === "posts" ? "No posts yet." : "No saved posts yet."}
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
            className="group relative aspect-square overflow-hidden bg-muted"
          >
            <Image
              src={post.media[0]?.url ?? ""}
              alt={post.caption ?? "Post"}
              fill
              sizes="(max-width: 768px) 33vw, 300px"
              className="object-cover"
            />
            {post.media.length > 1 && (
              <Layers className="absolute right-2 top-2 size-4 text-white drop-shadow" />
            )}
            <div className="absolute inset-0 hidden items-center justify-center gap-6 bg-black/40 text-white group-hover:flex">
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
