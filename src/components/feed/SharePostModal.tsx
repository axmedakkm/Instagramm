"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { conversationsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";

export function SharePostModal({
  postId,
  open,
  onOpenChange,
}: {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.conversations.list,
    queryFn: () => conversationsApi.list(),
    enabled: open,
  });

  const sendMutation = useMutation({
    mutationFn: (conversationId: string) =>
      conversationsApi.sendMessage(conversationId, { postId }),
    onSuccess: (_message, conversationId) => {
      setSentTo((prev) => new Set(prev).add(conversationId));
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list });
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.messages(conversationId),
      });
    },
    onError: () => toast.error("Couldn't send. Please try again."),
  });

  const conversations = data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 p-0">
        <DialogHeader>
          <DialogTitle>Share post</DialogTitle>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto p-2">
          {isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}

          {!isLoading && conversations.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              Start a conversation from someone&apos;s profile first.
            </p>
          )}

          {conversations.map((conversation) => {
            const other =
              conversation.participants.find(
                (p) => p.id !== currentUser?.id,
              ) ?? conversation.participants[0];
            const isSent = sentTo.has(conversation.id);
            const isSending =
              sendMutation.isPending &&
              sendMutation.variables === conversation.id;

            return (
              <button
                key={conversation.id}
                type="button"
                disabled={isSent || sendMutation.isPending}
                onClick={() => sendMutation.mutate(conversation.id)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-accent disabled:cursor-default"
              >
                <UserAvatar user={other} size="md" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {other.username}
                </span>
                {isSent ? (
                  <Check className="size-5 shrink-0 text-primary" />
                ) : (
                  <Send
                    className={`size-5 shrink-0 text-muted-foreground ${isSending ? "animate-pulse" : ""}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
