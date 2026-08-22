"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Heart, MoreHorizontal, Send, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { toast } from "sonner";
import { CommentInput } from "@/components/feed/CommentInput";
import { CommentList } from "@/components/feed/CommentList";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { postsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [mediaIndex, setMediaIndex] = useState(0);

  const { data: post, isLoading } = useQuery({
    queryKey: queryKeys.posts.detail(postId),
    queryFn: () => postsApi.get(postId),
  });

  const likeMutation = useMutation({
    mutationFn: () =>
      post?.isLikedByMe ? postsApi.unlike(postId) : postsApi.like(postId),
    onMutate: () => {
      queryClient.setQueryData(queryKeys.posts.detail(postId), (old: typeof post) =>
        old && {
          ...old,
          isLikedByMe: !old.isLikedByMe,
          likesCount: old.isLikedByMe ? old.likesCount - 1 : old.likesCount + 1,
        },
      );
    },
    onError: () => toast.error("Couldn't update like."),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      post?.isSavedByMe ? postsApi.unsave(postId) : postsApi.save(postId),
    onMutate: () => {
      queryClient.setQueryData(queryKeys.posts.detail(postId), (old: typeof post) =>
        old && { ...old, isSavedByMe: !old.isSavedByMe },
      );
    },
    onError: () => toast.error("Couldn't update saved posts."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => postsApi.delete(postId),
    onSuccess: () => {
      toast.success("Post deleted");
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
      router.back();
    },
    onError: () => toast.error("Couldn't delete post."),
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl gap-0 py-6">
        <Skeleton className="aspect-square w-full max-w-xl" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="px-4 py-16 text-center text-sm text-muted-foreground">
        This post isn&apos;t available.
      </div>
    );
  }

  const isOwner = currentUser?.id === post.author.id;

  return (
    <div className="mx-auto flex h-screen w-full max-w-5xl flex-col lg:flex-row lg:items-stretch">
      <div className="relative aspect-square w-full shrink-0 bg-black lg:aspect-auto lg:flex-1">
        <Image
          src={post.media[mediaIndex]?.url ?? ""}
          alt={post.caption ?? "Post"}
          fill
          className="object-contain"
          priority
        />
        {post.media.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
            {post.media.map((media, index) => (
              <button
                key={media.id}
                type="button"
                onClick={() => setMediaIndex(index)}
                className={cn(
                  "size-1.5 rounded-full bg-white/50",
                  index === mediaIndex && "bg-white",
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex w-full flex-col lg:w-[400px] lg:shrink-0 lg:border-l lg:border-border">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <Link
            href={`/${post.author.username}`}
            className="flex items-center gap-3"
          >
            <UserAvatar user={post.author} size="sm" />
            <span className="text-sm font-semibold">{post.author.username}</span>
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
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="flex-1 overflow-y-auto">
          {post.caption && (
            <div className="flex gap-3 px-4 py-3">
              <UserAvatar user={post.author} size="sm" />
              <p className="text-sm">
                <Link
                  href={`/${post.author.username}`}
                  className="mr-1.5 font-semibold"
                >
                  {post.author.username}
                </Link>
                {post.caption}
              </p>
            </div>
          )}
          <CommentList postId={post.id} />
        </div>

        <div className="border-t border-border px-4 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => likeMutation.mutate()}>
                <Heart
                  className={cn(
                    "size-6",
                    post.isLikedByMe && "fill-destructive text-destructive",
                  )}
                />
              </button>
              <Send className="size-6" />
            </div>
            <button type="button" onClick={() => saveMutation.mutate()}>
              <Bookmark
                className={cn(
                  "size-6",
                  post.isSavedByMe && "fill-foreground text-foreground",
                )}
              />
            </button>
          </div>
          <p className="pt-2 text-sm font-semibold">
            {post.likesCount.toLocaleString()}{" "}
            {post.likesCount === 1 ? "like" : "likes"}
          </p>
          <p className="pb-3 pt-1 text-[11px] uppercase text-muted-foreground">
            <TimeAgo date={post.createdAt} /> ago
          </p>
        </div>

        <CommentInput postId={post.id} />
      </div>
    </div>
  );
}
