"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { callsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";

/**
 * Paginated call history for a chat — `GET /chats/:chatId/calls`.
 * Mirrors the `useInfiniteQuery` pattern used by `FollowListModal`.
 */
export function useCallHistory(chatId: string, enabled = true) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.calls.history(chatId),
    queryFn: ({ pageParam }: { pageParam: number }) =>
      callsApi.history(chatId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    enabled,
  });

  const calls = query.data?.pages.flatMap((page) => page.items) ?? [];

  return { ...query, calls };
}
