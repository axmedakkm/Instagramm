"use client";

import { useQuery } from "@tanstack/react-query";
import { conversationsApi, notificationsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";

/**
 * The two numbers the nav badges need. Both the sidebar and the mobile nav
 * show them, so the queries live here instead of being copied into each.
 *
 * These use the same query keys as the messages and notifications pages, so
 * nothing is fetched twice — while you're on those pages their own faster
 * polling takes over, and the badges follow along from the shared cache.
 */
export function useUnreadCounts() {
  const { data: conversations } = useQuery({
    queryKey: queryKeys.conversations.list,
    queryFn: () => conversationsApi.list(),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });

  const { data: notifications } = useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: () => notificationsApi.list(),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });

  // One conversation can hold several unread messages, so this is a sum of
  // the per-conversation counts, not a count of conversations.
  const unreadMessages =
    conversations?.items.reduce(
      (total, conversation) => total + conversation.unreadCount,
      0,
    ) ?? 0;

  const unreadNotifications =
    notifications?.items.filter((notification) => !notification.isRead)
      .length ?? 0;

  return { unreadMessages, unreadNotifications };
}
