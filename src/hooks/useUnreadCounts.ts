"use client";

import { useQuery } from "@tanstack/react-query";
import { hasUnread } from "@/lib/conversation";
import { conversationsApi, notificationsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import { useConversationPrefsStore } from "@/store/useConversationPrefsStore";

/**
 * The two numbers the nav badges need. Both the sidebar and the mobile nav
 * show them, so the queries live here instead of being copied into each.
 *
 * These use the same query keys as the messages and notifications pages, so
 * nothing is fetched twice — while you're on those pages their own faster
 * polling takes over, and the badges follow along from the shared cache.
 */
export function useUnreadCounts() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const readAt = useConversationPrefsStore((state) => state.readAt);

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
  // the per-conversation counts, not a count of conversations. Chats you've
  // already read are skipped on the same rule the inbox dot uses, so the nav
  // icon and the row it points at never disagree.
  const unreadMessages =
    conversations?.items.reduce(
      (total, conversation) =>
        hasUnread(conversation, readAt[conversation.id], currentUserId)
          ? total + conversation.unreadCount
          : total,
      0,
    ) ?? 0;

  const unreadNotifications =
    notifications?.items.filter((notification) => !notification.isRead)
      .length ?? 0;

  return { unreadMessages, unreadNotifications };
}
