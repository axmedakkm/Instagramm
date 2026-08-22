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

/** Generic like toggle shared by top-level comments and replies — both are
 * `Comment` records and hit the same `/comments/:id/like` endpoint. */
function CommentLikeButton({
  comment,
  queryKey,
}: {
  comment: Comment;
  queryKey: readonly unknown[];
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      comment.isLikedByMe
        ? commentsApi.unlike(comment.id)
        : commentsApi.like(comment.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(
        queryKey,
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
        queryClient.setQueryData(queryKey, context.previous);
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

function RepliesSection({ comment }: { comment: Comment }) {
  const [expanded, setExpanded] = useState(false);
  const repliesKey = queryKeys.comments.replies(comment.id);

  const { data, isLoading } = useQuery({
    queryKey: repliesKey,
    queryFn: () => commentsApi.replies(comment.id),
    enabled: expanded,
  });

  if (comment.repliesCount === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="text-xs font-semibold text-muted-foreground"
      >
        {expanded
          ? "Hide replies"
          : `View ${comment.repliesCount} ${comment.repliesCount === 1 ? "reply" : "replies"}`}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {isLoading &&
            Array.from({ length: Math.min(comment.repliesCount, 2) }).map(
              (_, index) => (
                <div key={index} className="flex gap-3">
                  <Skeleton className="size-7 rounded-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ),
            )}
          {data?.items.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <Link href={`/${reply.author.username}`}>
                <UserAvatar user={reply.author} size="sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <Link
                    href={`/${reply.author.username}`}
                    className="mr-1.5 font-semibold"
                  >
                    {reply.author.username}
                  </Link>
                  {reply.text}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <TimeAgo date={reply.createdAt} />
                  {reply.likesCount > 0 && (
                    <span>
                      {reply.likesCount}{" "}
                      {reply.likesCount === 1 ? "like" : "likes"}
                    </span>
                  )}
                </div>
              </div>
              <CommentLikeButton comment={reply} queryKey={repliesKey} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({ postId, comment }: { postId: string; comment: Comment }) {
  const [isReplying, setIsReplying] = useState(false);

  return (
    <div className="flex gap-3">
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
              parentCommentId={comment.id}
              autoFocus
              placeholder={`Reply to ${comment.author.username}...`}
              onPosted={() => setIsReplying(false)}
            />
          </div>
        )}

        <RepliesSection comment={comment} />
      </div>
      <CommentLikeButton comment={comment} queryKey={queryKeys.comments.list(postId)} />
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
