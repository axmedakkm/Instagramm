"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { conversationsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import type { Conversation } from "@/types";

function otherParticipant(conversation: Conversation, currentUserId?: string) {
  return (
    conversation.participants.find((p) => p.id !== currentUserId) ??
    conversation.participants[0]
  );
}

export function ConversationList({ activeId }: { activeId?: string }) {
  const pathname = usePathname();
  const currentUser = useAuthStore((state) => state.user);

  const { data: conversations, isLoading } = useQuery({
    queryKey: queryKeys.conversations.list,
    queryFn: conversationsApi.list,
    refetchInterval: 5000,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-4">
        <h1 className="text-lg font-semibold">{currentUser?.username}</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading &&
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}

        {!isLoading && conversations?.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No conversations yet.
          </p>
        )}

        {conversations?.map((conversation) => {
          const other = otherParticipant(conversation, currentUser?.id);
          const isActive =
            activeId === conversation.id ||
            pathname === `/messages/${conversation.id}`;

          return (
            <Link
              key={conversation.id}
              href={`/messages/${conversation.id}`}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent",
                isActive && "bg-accent",
              )}
            >
              <UserAvatar user={other} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {other.username}
                </p>
                <p
                  className={cn(
                    "truncate text-xs text-muted-foreground",
                    conversation.unreadCount > 0 &&
                      "font-semibold text-foreground",
                  )}
                >
                  {conversation.lastMessage?.text ?? "Say hello \u{1F44B}"}
                  {conversation.lastMessage && (
                    <>
                      {" · "}
                      <TimeAgo date={conversation.lastMessage.createdAt} />
                    </>
                  )}
                </p>
              </div>
              {conversation.unreadCount > 0 && (
                <span className="size-2 shrink-0 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
