"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commentsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";

export function CommentInput({
  postId,
  parentId,
  autoFocus = false,
  placeholder = "Add a comment...",
  onPosted,
}: {
  postId: string;
  parentId?: string;
  autoFocus?: boolean;
  placeholder?: string;
  onPosted?: () => void;
}) {
  const [text, setText] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => commentsApi.create(postId, text.trim(), parentId),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.list(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
      onPosted?.();
    },
    onError: () => {
      toast.error("Couldn't post your comment. Please try again.");
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim() || mutation.isPending) return;
    mutation.mutate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t border-border px-4 py-3"
    >
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="h-9 flex-1 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
      />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={!text.trim() || mutation.isPending}
        className="text-primary disabled:text-muted-foreground"
      >
        Post
      </Button>
    </form>
  );
}
