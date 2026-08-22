"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { CommentInput } from "@/components/feed/CommentInput";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { postsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import type { PaginatedResponse, Post } from "@/types";

/** Applies an optimistic patch to every feed-like paginated post query in
 * the cache so a like/save toggled anywhere is reflected everywhere. */
function patchPostInCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  patch: (post: Post) => Post,
) {
  const queryKeysToPatch = [queryKeys.posts.feed, queryKeys.posts.explore];

  queryKeysToPatch.forEach((key) => {
    queryClient.setQueriesData<{ pages: PaginatedResponse<Post>[] } | PaginatedResponse<Post>>(
      { queryKey: key },
      (old) => {
        if (!old) return old;
        const patchPage = (page: PaginatedResponse<Post>) => ({
          ...page,
          items: page.items.map((item) =>
            item.id === postId ? patch(item) : item,
          ),
        });
        if ("pages" in old) {
          return { ...old, pages: old.pages.map(patchPage) };
        }
        return patchPage(old);
      },
    );
  });

  queryClient.setQueryData<Post>(queryKeys.posts.detail(postId), (old) =>
    old ? patch(old) : old,
  );
}

export function PostCard({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [showCommentBox, setShowCommentBox] = useState(false);

  const isOwner = currentUser?.id === post.author.id;

  const likeMutation = useMutation({
    mutationFn: () =>
      post.isLikedByMe ? postsApi.unlike(post.id) : postsApi.like(post.id),
    onMutate: () => {
      patchPostInCaches(queryClient, post.id, (item) => ({
        ...item,
        isLikedByMe: !item.isLikedByMe,
        likesCount: item.isLikedByMe
          ? item.likesCount - 1
          : item.likesCount + 1,
      }));
    },
    onError: () => {
      patchPostInCaches(queryClient, post.id, (item) => ({
        ...item,
        isLikedByMe: post.isLikedByMe,
        likesCount: post.likesCount,
      }));
      toast.error("Couldn't update like. Please try again.");
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      post.isSavedByMe ? postsApi.unsave(post.id) : postsApi.save(post.id),
    onMutate: () => {
      patchPostInCaches(queryClient, post.id, (item) => ({
        ...item,
        isSavedByMe: !item.isSavedByMe,
      }));
    },
    onSuccess: () => {
      toast.success(post.isSavedByMe ? "Removed from saved" : "Saved");
    },
    onError: () => {
      patchPostInCaches(queryClient, post.id, (item) => ({
        ...item,
        isSavedByMe: post.isSavedByMe,
      }));
      toast.error("Couldn't update saved posts.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => postsApi.delete(post.id),
    onSuccess: () => {
      toast.success("Post deleted");
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.explore });
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.byUser(post.author.id),
      });
    },
    onError: () => toast.error("Couldn't delete post."),
  });

  const handleDoubleClickLike = () => {
    if (!post.isLikedByMe) likeMutation.mutate();
  };

  return (
    <article className="border-b border-border pb-4 sm:rounded-lg sm:border sm:mb-6">
      <header className="flex items-center justify-between px-4 py-3">
        <Link
          href={`/${post.author.username}`}
          className="flex items-center gap-3"
        >
          <UserAvatar user={post.author} size="sm" />
          <div className="leading-tight">
            <span className="text-sm font-semibold">{post.author.username}</span>
            {post.location && (
              <p className="text-xs text-muted-foreground">{post.location}</p>
            )}
          </div>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwner && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
              >
                <Trash2 className="size-4" />
                Delete post
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={`/p/${post.id}`}>Go to post</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div
        className="relative aspect-square w-full bg-muted"
        onDoubleClick={handleDoubleClickLike}
      >
        {post.mediaType === "video" ? (
          <video
            src={post.mediaUrls[0]}
            controls
            loop
            className="size-full object-cover"
          />
        ) : (
          post.mediaUrls.map((url, index) => (
            <Image
              key={url}
              src={url}
              alt={post.caption || `Post by ${post.author.username}`}
              fill
              sizes="(max-width: 640px) 100vw, 470px"
              className={cn(
                "object-cover transition-opacity",
                index === mediaIndex ? "opacity-100" : "opacity-0 pointer-events-none absolute",
              )}
              priority={index === 0}
            />
          ))
        )}

        {post.mediaUrls.length > 1 && (
          <>
            {mediaIndex > 0 && (
              <button
                type="button"
                onClick={() => setMediaIndex((i) => i - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1 shadow"
                aria-label="Previous photo"
              >
                &#8592;
              </button>
            )}
            {mediaIndex < post.mediaUrls.length - 1 && (
              <button
                type="button"
                onClick={() => setMediaIndex((i) => i + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1 shadow"
                aria-label="Next photo"
              >
                &#8594;
              </button>
            )}
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
              {post.mediaUrls.map((url, index) => (
                <span
                  key={url}
                  className={cn(
                    "size-1.5 rounded-full bg-background/70",
                    index === mediaIndex && "bg-primary",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between px-4 pt-2">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => likeMutation.mutate()}
            aria-label={post.isLikedByMe ? "Unlike" : "Like"}
          >
            <Heart
              className={cn(
                "size-6 transition-transform active:scale-90",
                post.isLikedByMe && "fill-destructive text-destructive",
              )}
            />
          </button>
          <button
            type="button"
            onClick={() => setShowCommentBox((prev) => !prev)}
            aria-label="Comment"
          >
            <MessageCircle className="size-6" />
          </button>
          <Link href={`/p/${post.id}`} aria-label="Share">
            <Send className="size-6" />
          </Link>
        </div>
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          aria-label={post.isSavedByMe ? "Unsave" : "Save"}
        >
          <Bookmark
            className={cn(
              "size-6",
              post.isSavedByMe && "fill-foreground text-foreground",
            )}
          />
        </button>
      </div>

      <div className="space-y-1 px-4 pt-2">
        <p className="text-sm font-semibold">
          {post.likesCount.toLocaleString()}{" "}
          {post.likesCount === 1 ? "like" : "likes"}
        </p>

        {post.caption && (
          <p className="text-sm">
            <Link
              href={`/${post.author.username}`}
              className="mr-1.5 font-semibold"
            >
              {post.author.username}
            </Link>
            {post.caption}
          </p>
        )}

        {post.commentsCount > 0 && (
          <Link
            href={`/p/${post.id}`}
            className="block text-sm text-muted-foreground"
          >
            View all {post.commentsCount} comments
          </Link>
        )}

        <p className="text-[11px] uppercase text-muted-foreground">
          <TimeAgo date={post.createdAt} /> ago
        </p>
      </div>

      {showCommentBox && (
        <div className="mt-2">
          <CommentInput
            postId={post.id}
            autoFocus
            onPosted={() => setShowCommentBox(false)}
          />
        </div>
      )}
    </article>
  );
}
