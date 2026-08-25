"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, SquarePen, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NewMessageModal } from "@/components/messages/NewMessageModal";
import { NotesRail } from "@/components/messages/NotesRail";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { UnreadDot } from "@/components/shared/UnreadDot";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Input } from "@/components/ui/input";
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
  const [composeOpen, setComposeOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.conversations.list,
    queryFn: () => conversationsApi.list(),
    refetchInterval: 5000,
  });

  const allConversations = data?.items ?? [];

  // Filter locally on username / full name. The whole list is already in
  // memory, so there's no request to debounce here — unlike the Explore
  // search, which hits the server on every change.
  const query = search.trim().toLowerCase();
  const conversations = allConversations.filter((conversation) => {
    const other = otherParticipant(conversation, currentUser?.id);
    return (
      other.username.toLowerCase().includes(query) ||
      other.fullName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex h-full flex-col">
      <div className="glass sticky top-0 z-10 flex items-center justify-between border-b border-border/60 px-4 py-4">
        <h1 className="text-lg font-semibold">{currentUser?.username}</h1>
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          aria-label="New message"
          className="rounded-full p-1.5 transition-all duration-200 ease-smooth hover:bg-accent active:scale-90"
        >
          <SquarePen className="size-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search. Filters the list below as you type. */}
        <div className="px-4 pb-3 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="rounded-lg border-transparent bg-muted pl-9 pr-9 shadow-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        <NotesRail />

        <p className="px-4 pb-1 pt-2 text-sm font-semibold">Messages</p>

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

        {/* Two different "nothing here" cases: an empty inbox, and a search
            that matched nothing. They need different wording. */}
        {!isLoading && allConversations.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No conversations yet.
            </p>
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Send a message
            </button>
          </div>
        )}

        {!isLoading &&
          allConversations.length > 0 &&
          conversations.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No chats match &ldquo;{search.trim()}&rdquo;.
            </p>
          )}

        {conversations.map((conversation) => {
          const other = otherParticipant(conversation, currentUser?.id);
          const isActive =
            activeId === conversation.id ||
            pathname === `/messages/${conversation.id}`;

          return (
            <Link
              key={conversation.id}
              href={`/messages/${conversation.id}`}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3 transition-colors duration-200 ease-smooth hover:bg-accent",
                isActive && "bg-accent",
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-[linear-gradient(180deg,#f9ce34,#ee2a7b,#6228d7)]" />
              )}
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
              {conversation.unreadCount > 0 && <UnreadDot />}
            </Link>
          );
        })}
      </div>

      <NewMessageModal open={composeOpen} onOpenChange={setComposeOpen} />
    </div>
  );
}
