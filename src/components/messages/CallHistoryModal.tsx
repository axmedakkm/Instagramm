"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Phone,
  PhoneMissed,
  Video,
  VideoOff,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallHistory } from "@/hooks/useCallHistory";
import { useAuthStore } from "@/store/useAuthStore";
import type { Call } from "@/types";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function CallRow({ call }: { call: Call }) {
  const currentUser = useAuthStore((state) => state.user);
  const isMissedOrRejected =
    call.status === "missed" || call.status === "rejected";
  const wasOutgoing = call.caller.id === currentUser?.id;

  const Icon = call.type === "video" ? Video : Phone;
  const MissedIcon = call.type === "video" ? VideoOff : PhoneMissed;

  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-accent">
      <UserAvatar user={call.caller} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{call.caller.username}</p>
        <div
          className={`mt-0.5 flex items-center gap-1 text-xs ${
            isMissedOrRejected ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {isMissedOrRejected ? (
            <MissedIcon className="size-3.5" />
          ) : (
            <Icon className="size-3.5" />
          )}
          <span>
            {wasOutgoing ? "Outgoing" : "Incoming"}
            {call.status === "missed" && " · Missed"}
            {call.status === "rejected" && " · Declined"}
            {formatDuration(call.duration) &&
              ` · ${formatDuration(call.duration)}`}
          </span>
        </div>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(call.startedAt), { addSuffix: true })}
      </span>
    </div>
  );
}

export function CallHistoryModal({
  chatId,
  open,
  onOpenChange,
}: {
  chatId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { calls, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCallHistory(chatId, open);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !open) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 p-0">
        <DialogHeader>
          <DialogTitle>Calls</DialogTitle>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto p-2">
          {isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-2 py-2.5">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
              </div>
            ))}

          {!isLoading && calls.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No calls yet.
            </p>
          )}

          {calls.map((call) => (
            <CallRow key={call.id} call={call} />
          ))}

          <div ref={sentinelRef} className="h-1" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
