"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CommentInput } from "@/components/feed/CommentInput";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { commentsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { Comment } from "@/types";

function CommentLikeButton({
  postId,
  comment,
}: {
  postId: string;
  comment: Comment;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      comment.isLikedByMe
        ? commentsApi.unlike(comment.id)
        : commentsApi.like(comment.id),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.comments.list(postId),
      });
      const previous = queryClient.getQueryData(
        queryKeys.comments.list(postId),
      );
      queryClient.setQueryData(
        queryKeys.comments.list(postId),
        (old: { items: Comment[] } | undefined) =>
          old && {
            ...old,
            items: old.items.map((item) =>
              item.id === comment.id
                ? {
                    ...item,
                    isLikedByMe: !item.isLikedByMe,
                    likesCount: item.isLikedByMe
                      ? item.likesCount - 1
                      : item.likesCount + 1,
                  }
                : item,
            ),
          },
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.comments.list(postId), context.previous);
      }
    },
  });

  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      className="shrink-0 self-start pt-1"
      aria-label={comment.isLikedByMe ? "Unlike comment" : "Like comment"}
    >
      <Heart
        className={cn(
          "size-3.5",
          comment.isLikedByMe && "fill-destructive text-destructive",
        )}
      />
    </button>
  );
}

function CommentItem({
  postId,
  comment,
  depth = 0,
}: {
  postId: string;
  comment: Comment;
  depth?: number;
}) {
  const [isReplying, setIsReplying] = useState(false);

  return (
    <div className={cn("flex gap-3", depth > 0 && "ml-10 mt-3")}>
      <Link href={`/${comment.author.username}`}>
        <UserAvatar user={comment.author} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <Link
            href={`/${comment.author.username}`}
            className="mr-1.5 font-semibold"
          >
            {comment.author.username}
          </Link>
          {comment.text}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <TimeAgo date={comment.createdAt} />
          {comment.likesCount > 0 && (
            <span>
              {comment.likesCount} {comment.likesCount === 1 ? "like" : "likes"}
            </span>
          )}
          <button type="button" onClick={() => setIsReplying((prev) => !prev)}>
            Reply
          </button>
        </div>

        {isReplying && (
          <div className="mt-1 -ml-4">
            <CommentInput
              postId={postId}
              parentId={comment.id}
              autoFocus
              placeholder={`Reply to ${comment.author.username}...`}
              onPosted={() => setIsReplying(false)}
            />
          </div>
        )}

        {comment.replies?.map((reply) => (
          <CommentItem
            key={reply.id}
            postId={postId}
            comment={reply}
            depth={depth + 1}
          />
        ))}
      </div>
      <CommentLikeButton postId={postId} comment={comment} />
    </div>
  );
}

export function CommentList({ postId }: { postId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.comments.list(postId),
    queryFn: () => commentsApi.list(postId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const comments = data?.items ?? [];

  if (comments.length === 0) {
    return (
      <p className="p-4 text-center text-sm text-muted-foreground">
        No comments yet. Start the conversation.
      </p>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {comments.map((comment) => (
        <CommentItem key={comment.id} postId={postId} comment={comment} />
      ))}
    </div>
  );
}
