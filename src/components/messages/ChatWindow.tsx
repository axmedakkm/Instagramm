"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { MessageInput } from "@/components/messages/MessageInput";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";
import { conversationsApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import type { Conversation, Message } from "@/types";

/** Falls back to short-polling whenever the realtime socket is down. */
const POLL_INTERVAL_MS = 3000;

export function ChatWindow({ conversationId }: { conversationId: string }) {
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected } = useSocket();

  const { data: conversation } = useQuery({
    queryKey: queryKeys.conversations.detail(conversationId),
    queryFn: () => conversationsApi.get(conversationId),
  });

  const { data: messagesPage } = useQuery({
    queryKey: queryKeys.conversations.messages(conversationId),
    queryFn: () => conversationsApi.messages(conversationId),
    refetchInterval: isConnected ? false : POLL_INTERVAL_MS,
  });

  const messages = messagesPage?.items ?? [];
  const other = conversation?.participants.find(
    (p) => p.id !== currentUser?.id,
  );

  useEffect(() => {
    conversationsApi.markRead(conversationId).catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("conversation:join", { conversationId });

    const handleIncoming = (message: Message) => {
      if (message.conversationId !== conversationId) return;
      queryClient.setQueryData(
        queryKeys.conversations.messages(conversationId),
        (old: { items: Message[] } | undefined) => {
          if (!old) return old;
          if (old.items.some((item) => item.id === message.id)) return old;
          return { ...old, items: [...old.items, message] };
        },
      );
    };

    socket.on("message:new", handleIncoming);

    return () => {
      socket.emit("conversation:leave", { conversationId });
      socket.off("message:new", handleIncoming);
    };
  }, [socket, conversationId, queryClient]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link href="/messages" className="lg:hidden">
          <ArrowLeft className="size-5" />
        </Link>
        {other && (
          <>
            <UserAvatar user={other} size="sm" />
            <div>
              <p className="text-sm font-semibold">{other.username}</p>
              <p className="text-xs text-muted-foreground">
                {isConnected ? "Active now" : "Connecting..."}
              </p>
            </div>
          </>
        )}
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.map((message) => {
          const isMine = message.sender.id === currentUser?.id;
          return (
            <div
              key={message.id}
              className={cn("flex", isMine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-2xl px-3.5 py-2 text-sm",
                  isMine
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                <p>{message.text}</p>
                <TimeAgo
                  date={message.createdAt}
                  className={cn(
                    "mt-1 block text-[10px] opacity-70",
                  )}
                />
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <MessageInput conversationId={conversationId} socket={socket} />
    </div>
  );
}
