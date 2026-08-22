"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/hooks/useSocket";
import { conversationsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { Message } from "@/types";
import type { Socket } from "socket.io-client";

interface SendAck {
  ok: boolean;
  message?: Message;
}

interface SendPayload {
  text?: string;
  mediaUrl?: string;
  postId?: string;
}

/** Emits over the socket and resolves with the server's ack — matches the
 * shape documented in `insta_Back/src/socket/index.js`. */
function sendViaSocket(
  socket: Socket,
  conversationId: string,
  payload: SendPayload,
) {
  return new Promise<Message>((resolve, reject) => {
    socket.emit("message:send", { conversationId, ...payload }, (ack: SendAck) => {
      if (ack?.ok && ack.message) resolve(ack.message);
      else reject(new Error("Socket send failed"));
    });
  });
}

/**
 * Shared "send a message into a conversation" mutation, used by both the
 * regular chat composer (`MessageInput`) and the story reply bar (quick
 * heart-like, text reply, voice note). Prefers the realtime socket when
 * connected (single round trip); falls back to the REST endpoint
 * otherwise. Never fires both — the server broadcasts on each path, so
 * doing both would create two messages.
 */
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  const mutation = useMutation({
    mutationFn: (payload: SendPayload) =>
      isConnected && socket
        ? sendViaSocket(socket, conversationId, payload)
        : conversationsApi.sendMessage(conversationId, payload),
    onSuccess: (message) => {
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
  });

  return {
    send: mutation.mutateAsync,
    isSending: mutation.isPending,
    socket,
    isConnected,
  };
}
