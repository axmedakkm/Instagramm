"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { conversationsApi, usersApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import type { UserSummary } from "@/types";

/**
 * "New message" composer. Lists the people the signed-in user follows as
 * ready-to-message suggestions, and lets them search everyone else. Picking a
 * person opens (or reuses) the 1:1 conversation and navigates into it.
 */
export function NewMessageModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query.trim(), 300);
  const isSearching = debouncedQuery.length > 0;

  // People you follow — the default "recommended" list to message.
  const { data: following, isLoading: followingLoading } = useQuery({
    queryKey: queryKeys.users.following(currentUser?.id ?? ""),
    queryFn: () => usersApi.following(currentUser!.id),
    enabled: open && !!currentUser && !isSearching,
  });

  // Free-text search across everyone, used once the user types.
  const { data: searchResults, isFetching: searchFetching } = useQuery({
    queryKey: queryKeys.users.search(debouncedQuery),
    queryFn: () => usersApi.search(debouncedQuery),
    enabled: open && isSearching,
  });

  const startConversation = useMutation({
    mutationFn: (userId: string) =>
      conversationsApi.getOrCreateWithUser(userId),
    onSuccess: (conversation) => {
      onOpenChange(false);
      setQuery("");
      router.push(`/messages/${conversation.id}`);
    },
    onError: () => toast.error("Couldn't start that conversation."),
  });

  const people: UserSummary[] = isSearching
    ? (searchResults ?? []).filter((user) => user.id !== currentUser?.id)
    : (following?.items ?? []);
  const isLoading = isSearching ? searchFetching : followingLoading;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
        </DialogHeader>

        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people"
              className="rounded-full bg-muted pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {!isSearching && (
            <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase text-muted-foreground">
              Suggested
            </p>
          )}

          {isLoading &&
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="size-11 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}

          {!isLoading && people.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              {isSearching
                ? `No people found for "${debouncedQuery}".`
                : "You're not following anyone yet. Search to start a chat."}
            </p>
          )}

          {!isLoading &&
            people.map((person) => {
              const isPending =
                startConversation.isPending &&
                startConversation.variables === person.id;
              return (
                <button
                  key={person.id}
                  type="button"
                  disabled={startConversation.isPending}
                  onClick={() => startConversation.mutate(person.id)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent disabled:opacity-60"
                >
                  <UserAvatar user={person} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {person.username}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {person.fullName}
                    </p>
                  </div>
                  {isPending && (
                    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                  )}
                </button>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
