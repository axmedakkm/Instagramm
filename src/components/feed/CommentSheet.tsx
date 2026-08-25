"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CommentList } from "@/components/feed/CommentList";
import { EmojiPicker } from "@/components/shared/EmojiPicker";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  Dialog,
  DialogSheetContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { patchPostInCaches } from "@/lib/postCache";
import { cn } from "@/lib/utils";
import { commentsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import type { Comment, PaginatedResponse } from "@/types";

/** One-tap reactions above the composer, exactly the shortcut Instagram
 * offers on its own comment sheet. */
const QUICK_EMOJI = ["❤️", "🙌", "🔥", "👏", "😍", "😂", "😮", "😢"];

type ReplyTarget = { parentId: string; username: string };

export function CommentSheet({
  postId,
  commentsCount,
  open,
  onOpenChange,
  autoFocusInput = false,
}: {
  postId: string;
  commentsCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opened from the comment button (rather than "view all"), so the
   * composer should be ready to type into straight away. */
  autoFocusInput?: boolean;
}) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset on close, so a sheet reopened later never resurrects a stale draft
  // or a reply target whose comment may be gone.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setText("");
      setReplyTo(null);
    }
    onOpenChange(next);
  };

  const focusInput = () => {
    // One frame out, so focus lands after the sheet's rise animation starts
    // and the browser doesn't scroll the page under it.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const commentsKey = queryKeys.comments.list(postId);

  const mutation = useMutation({
    mutationFn: (value: string) =>
      commentsApi.create(postId, value, replyTo?.parentId),
    onMutate: async (value: string) => {
      setText("");
      // Replies live in a separate, lazily-loaded query — not worth faking
      // there, so only top-level comments get an optimistic row.
      if (replyTo || !currentUser) return { previous: undefined };

      await queryClient.cancelQueries({ queryKey: commentsKey });
      const previous =
        queryClient.getQueryData<PaginatedResponse<Comment>>(commentsKey);

      const optimistic: Comment = {
        id: `optimistic-${Date.now()}`,
        postId,
        author: currentUser,
        text: value,
        parentCommentId: null,
        likesCount: 0,
        repliesCount: 0,
        isLikedByMe: false,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<PaginatedResponse<Comment>>(
        commentsKey,
        (old) =>
          old && { ...old, items: [optimistic, ...old.items] },
      );
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return { previous };
    },
    onError: (_error, value, context) => {
      if (context?.previous) {
        queryClient.setQueryData(commentsKey, context.previous);
      }
      setText(value);
      toast.error("Couldn't post your comment. Please try again.");
    },
    onSuccess: () => {
      setReplyTo(null);
      patchPostInCaches(queryClient, postId, (post) => ({
        ...post,
        commentsCount: post.commentsCount + 1,
      }));
      if (replyTo) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.comments.replies(replyTo.parentId),
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || mutation.isPending) return;
    mutation.mutate(value);
  };

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    focusInput();
  };

  const handleReply = (target: Comment, parentId: string) => {
    setReplyTo({ parentId, username: target.author.username });
    setText((prev) =>
      prev.startsWith(`@${target.author.username} `)
        ? prev
        : `@${target.author.username} `,
    );
    focusInput();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogSheetContent
        aria-describedby={undefined}
        className="h-[58dvh] max-h-[calc(100dvh-3rem)] min-h-[340px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (autoFocusInput) focusInput();
        }}
      >
        <div className="shrink-0 border-b border-border/70 px-4 pb-3 pt-1 text-center">
          <DialogTitle className="text-sm font-semibold">Comments</DialogTitle>
          {commentsCount > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {commentsCount.toLocaleString()}{" "}
              {commentsCount === 1 ? "comment" : "comments"}
            </p>
          )}
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto overscroll-contain"
        >
          <CommentList
            postId={postId}
            onReply={handleReply}
            className="comment-cascade space-y-5 px-4 pb-4 pt-4"
            emptyState={
              <div className="flex h-full flex-col items-center justify-center gap-1 px-8 py-10 text-center">
                <p className="text-base font-semibold">No comments yet</p>
                <p className="text-sm text-muted-foreground">
                  Start the conversation.
                </p>
              </div>
            }
          />
        </div>

        <div className="shrink-0 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)]">
          {replyTo && (
            <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/60 px-4 py-1.5 text-xs text-muted-foreground">
              <span className="truncate">
                Replying to{" "}
                <span className="font-semibold text-foreground">
                  @{replyTo.username}
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  // Drop the auto-inserted mention but keep anything the
                  // user actually typed after it.
                  const mention = `@${replyTo.username} `;
                  setText((prev) =>
                    prev.startsWith(mention) ? prev.slice(mention.length) : prev,
                  );
                  setReplyTo(null);
                }}
                aria-label="Cancel reply"
                className="grid size-5 shrink-0 place-items-center rounded-full transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto px-3 pt-2">
            {QUICK_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="grid size-9 shrink-0 place-items-center rounded-full text-xl leading-none transition-transform duration-150 ease-spring hover:scale-125 hover:bg-accent active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-2"
          >
            {currentUser && (
              <UserAvatar
                user={currentUser}
                size="sm"
                className="shrink-0 ring-1 ring-border"
              />
            )}
            <div className="flex flex-1 items-center gap-1 rounded-full border border-input bg-muted/50 pl-3.5 pr-1 transition-all duration-200 ease-smooth focus-within:border-ring focus-within:bg-background focus-within:shadow-lifted">
              <input
                ref={inputRef}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={
                  replyTo
                    ? `Reply to @${replyTo.username}...`
                    : "Add a comment..."
                }
                maxLength={2200}
                className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <EmojiPicker onSelect={insertEmoji} align="end" />
            </div>
            <button
              type="submit"
              disabled={!text.trim() || mutation.isPending}
              className={cn(
                "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-all duration-200 ease-smooth",
                text.trim() && !mutation.isPending
                  ? "text-primary hover:bg-primary/10 active:scale-95"
                  : "cursor-not-allowed text-muted-foreground/60",
              )}
            >
              {mutation.isPending && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              Post
            </button>
          </form>
        </div>
      </DialogSheetContent>
    </Dialog>
  );
}
