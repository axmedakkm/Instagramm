"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { conversationsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { Socket } from "socket.io-client";

export function MessageInput({
  conversationId,
  socket,
}: {
  conversationId: string;
  socket: Socket | null;
}) {
  const [text, setText] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => conversationsApi.sendMessage(conversationId, text.trim()),
    onSuccess: (message) => {
      setText("");
      queryClient.setQueryData(
        queryKeys.conversations.messages(conversationId),
        (old: { pages: { items: typeof message[] }[] } | undefined) => {
          if (!old) return old;
          const pages = [...old.pages];
          const lastIndex = pages.length - 1;
          pages[lastIndex] = {
            ...pages[lastIndex],
            items: [...pages[lastIndex].items, message],
          };
          return { ...old, pages };
        },
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list });

      // If the realtime channel is up, broadcast immediately so the other
      // participant doesn't have to wait for the next poll.
      socket?.emit("message:send", { conversationId, message });
    },
    onError: () => toast.error("Message failed to send."),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim() || mutation.isPending) return;
    mutation.mutate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t border-border p-3"
    >
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Message..."
        className="rounded-full"
      />
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        disabled={!text.trim() || mutation.isPending}
        aria-label="Send message"
      >
        <Send className="size-5" />
      </Button>
    </form>
  );
}
