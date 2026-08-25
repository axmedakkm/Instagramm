"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Image as ImageIcon, Phone, Send, Video } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useCall } from "@/components/providers/CallProvider";
import { MessageInput } from "@/components/messages/MessageInput";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useSocket } from "@/hooks/useSocket";
import { getMessageMediaKind } from "@/lib/media";
import { cn } from "@/lib/utils";
import { conversationsApi, messagesApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import type { Message } from "@/types";

/** Falls back to short-polling whenever the realtime socket is down. */
const POLL_INTERVAL_MS = 3000;

export function ChatWindow({ conversationId }: { conversationId: string }) {
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const markedReadRef = useRef<Set<string>>(new Set());
  const { socket, isConnected } = useSocket();
  const { startCall } = useCall();
  /** Full-size view for a tapped chat photo — a modal instead of navigating
   * away, so the conversation stays put behind it. */
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxReply, setLightboxReply] = useState("");
  const { send: sendReply, isSending: isSendingReply } =
    useSendMessage(conversationId);

  // There's no `GET /conversations/:id` — the conversations list query
  // already carries every participant's info, so we read it from there
  // (and share its cache with `ConversationList`, which fetches the same
  // key on desktop).
  const { data: conversationsPage } = useQuery({
    queryKey: queryKeys.conversations.list,
    queryFn: () => conversationsApi.list(),
  });
  const conversation = conversationsPage?.items.find(
    (item) => item.id === conversationId,
  );

  const { data: messagesPage } = useQuery({
    queryKey: queryKeys.conversations.messages(conversationId),
    queryFn: () => conversationsApi.messages(conversationId),
    refetchInterval: isConnected ? false : POLL_INTERVAL_MS,
  });

  const messages = useMemo(() => messagesPage?.items ?? [], [messagesPage]);
  const other = conversation?.participants.find(
    (p) => p.id !== currentUser?.id,
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // No bulk "mark conversation read" endpoint — send a per-message read
  // receipt for every incoming message we haven't already marked.
  useEffect(() => {
    if (!currentUser) return;
    messages
      .filter(
        (message) =>
          message.sender.id !== currentUser.id &&
          !message.isRead &&
          !markedReadRef.current.has(message.id),
      )
      .forEach((message) => {
        markedReadRef.current.add(message.id);
        messagesApi.markRead(message.id).catch(() => {
          markedReadRef.current.delete(message.id);
        });
      });
  }, [messages, currentUser]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("conversation:join", conversationId);

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
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list });
    };

    socket.on("message:new", handleIncoming);

    return () => {
      socket.emit("conversation:leave", conversationId);
      socket.off("message:new", handleIncoming);
    };
  }, [socket, conversationId, queryClient]);

  const handleLightboxReply = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = lightboxReply.trim();
    if (!trimmed || isSendingReply) return;
    try {
      await sendReply({ text: trimmed });
      setLightboxReply("");
    } catch {
      toast.error("Message failed to send.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="glass sticky top-0 z-10 flex items-center gap-3 border-b border-border/60 px-4 py-3">
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

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                aria-label="Start a voice call"
                onClick={() => startCall(conversationId, "audio", other)}
                className="rounded-full p-2 transition-colors hover:bg-accent disabled:opacity-50"
                disabled={!isConnected}
              >
                <Phone className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Start a video call"
                onClick={() => startCall(conversationId, "video", other)}
                className="rounded-full p-2 transition-colors hover:bg-accent disabled:opacity-50"
                disabled={!isConnected}
              >
                <Video className="size-5" />
              </button>
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
              className={cn(
                "enter-up flex",
                isMine ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-2xl px-3.5 py-2 text-sm shadow-soft",
                  isMine
                    ? "rounded-br-md bg-[linear-gradient(135deg,#0095f6,#6228d7)] text-white"
                    : "rounded-bl-md bg-muted text-foreground",
                )}
              >
                {message.sharedPostId && (
                  <Link
                    href={`/p/${message.sharedPostId}`}
                    className={cn(
                      "mb-1 flex items-center gap-1.5 text-xs underline underline-offset-2",
                      isMine ? "text-primary-foreground/90" : "text-foreground",
                    )}
                  >
                    <ImageIcon className="size-3.5" />
                    Shared a post
                  </Link>
                )}
                {message.mediaUrl &&
                  (getMessageMediaKind(message.mediaUrl) === "image" ? (
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(message.mediaUrl)}
                      aria-label="View photo"
                      className="relative block h-52 w-52 max-w-full overflow-hidden rounded-lg"
                    >
                      <Image
                        src={message.mediaUrl}
                        alt="Photo"
                        fill
                        sizes="208px"
                        className="object-cover"
                      />
                    </button>
                  ) : (
                    <audio
                      src={message.mediaUrl}
                      controls
                      className="h-9 max-w-full"
                    />
                  ))}
                {message.text && <p>{message.text}</p>}
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

      <MessageInput conversationId={conversationId} />

      <Dialog
        open={!!lightboxUrl}
        onOpenChange={(open) => {
          if (open) return;
          setLightboxUrl(null);
          setLightboxReply("");
        }}
      >
        <DialogContent
          className="max-w-3xl border-0 bg-transparent p-0 shadow-none sm:rounded-none"
          showCloseButton
        >
          <DialogTitle className="sr-only">Photo</DialogTitle>
          {lightboxUrl && (
            <>
              <div className="relative h-[80vh] w-full">
                <Image
                  src={lightboxUrl}
                  alt="Photo"
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
              {/* Reply without leaving the photo — same send path as the
               * regular composer, just scoped to this modal. */}
              <form
                onSubmit={handleLightboxReply}
                className="flex items-center gap-2 bg-background px-3 py-2"
              >
                <Input
                  value={lightboxReply}
                  onChange={(event) => setLightboxReply(event.target.value)}
                  placeholder="Reply..."
                  className="flex-1 rounded-full"
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  disabled={isSendingReply || !lightboxReply.trim()}
                  aria-label="Send reply"
                >
                  <Send className="size-5" />
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
