"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { conversationsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { Message } from "@/types";
import type { Socket } from "socket.io-client";

interface SendAck {
  ok: boolean;
  message?: Message;
}

/** Emits over the socket and resolves with the server's ack — matches the
 * shape documented in `insta_Back/src/socket/index.js`. */
function sendViaSocket(socket: Socket, conversationId: string, text: string) {
  return new Promise<Message>((resolve, reject) => {
    socket.emit(
      "message:send",
      { conversationId, text },
      (ack: SendAck) => {
        if (ack?.ok && ack.message) resolve(ack.message);
        else reject(new Error("Socket send failed"));
      },
    );
  });
}

export function MessageInput({
  conversationId,
  socket,
  isConnected,
}: {
  conversationId: string;
  socket: Socket | null;
  isConnected: boolean;
}) {
  const [text, setText] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    // Prefer the realtime channel when it's up (single round trip, instant
    // delivery to the other participant); fall back to the REST endpoint
    // otherwise. Never do both — the server broadcasts on each path, so
    // firing both would create two messages.
    mutationFn: () =>
      isConnected && socket
        ? sendViaSocket(socket, conversationId, text.trim())
        : conversationsApi.sendMessage(conversationId, text.trim()),
    onSuccess: (message) => {
      setText("");
      queryClient.setQueryData(
        queryKeys.conversations.messages(conversationId),
        (old: { items: Message[] } | undefined) => {
          if (!old) return old;
          if (old.items.some((item) => item.id === message.id)) return old;
          return { ...old, items: [...old.items, message] };
        },
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list });
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
