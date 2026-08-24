"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationsApi, mediaApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { Message } from "@/types";

async function uploadAndSendVoiceNote(conversationId: string, file: File) {
  const { url } = await mediaApi.upload(file);
  return conversationsApi.sendMessage(conversationId, { mediaUrl: url });
}

export function useSendVoiceMessage(conversationId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (file: File) => uploadAndSendVoiceNote(conversationId, file),
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
    sendVoice: mutation.mutateAsync,
    isSending: mutation.isPending,
  };
}
