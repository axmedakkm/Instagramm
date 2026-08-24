"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { Message } from "@/types";

/**
 * Uploads a recorded voice note via the dedicated
 * `POST /conversations/:conversationId/voice` endpoint (audio only, 50MB max).
 * REST-only — there's no socket fast path for binary uploads, unlike
 * `useSendMessage`.
 */
export function useSendVoiceMessage(conversationId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ file, duration }: { file: File; duration: number }) =>
      conversationsApi.sendVoiceMessage(conversationId, file, duration),
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
