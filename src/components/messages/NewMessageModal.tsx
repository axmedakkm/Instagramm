"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
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
import type { Conversation, PaginatedResponse, UserSummary } from "@/types";

/**
 * "New message" composer. Lists the people the signed-in user follows as
 * ready-to-message suggestions, and lets them search everyone else. Tapping
 * people selects them (checkmark, same as Instagram's own composer) instead
 * of opening a chat right away — "Chat" below then creates (or reuses) a 1:1
 * conversation for one person, or a group for more than one.
 */
export function NewMessageModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<UserSummary[]>([]);
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

  const reset = () => {
    setQuery("");
    setSelected([]);
  };

  const startConversation = useMutation({
    mutationFn: () =>
      selected.length === 1
        ? conversationsApi.getOrCreateWithUser(selected[0].id)
        : conversationsApi.createGroup(selected.map((user) => user.id)),
    onSuccess: (conversation) => {
      // `ChatWindow` has no `GET /conversations/:id` to fall back on — it
      // reads this same list query to find the conversation by id. Seed the
      // new one in directly instead of just invalidating: the list query is
      // about to go inactive (we're navigating away from it), so a bare
      // invalidate wouldn't actually refetch in time and the chat would
      // render with no participants until something else refreshed it.
      queryClient.setQueryData<PaginatedResponse<Conversation>>(
        queryKeys.conversations.list,
        (old) =>
          old
            ? {
                ...old,
                items: [
                  conversation,
                  ...old.items.filter((item) => item.id !== conversation.id),
                ],
              }
            : old,
      );
      onOpenChange(false);
      reset();
      router.push(`/messages/${conversation.id}`);
    },
    onError: () => toast.error("Couldn't start that chat."),
  });

  const toggle = (person: UserSummary) => {
    setSelected((prev) =>
      prev.some((u) => u.id === person.id)
        ? prev.filter((u) => u.id !== person.id)
        : [...prev, person],
    );
  };

  const people: UserSummary[] = isSearching
    ? (searchResults ?? []).filter((user) => user.id !== currentUser?.id)
    : (following?.items ?? []);
  const isLoading = isSearching ? searchFetching : followingLoading;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader>
          <DialogTitle>
            {selected.length > 1 ? "New group" : "New message"}
          </DialogTitle>
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

          {selected.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selected.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => toggle(person)}
                  className="flex items-center gap-1 rounded-full bg-accent py-1 pl-1 pr-2 text-xs font-medium transition-colors hover:bg-accent/70"
                >
                  <UserAvatar user={person} size="xs" />
                  {person.username}
                  <X className="size-3" />
                </button>
              ))}
            </div>
          )}
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
              const isSelected = selected.some((u) => u.id === person.id);
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => toggle(person)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent"
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
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {isSelected && <Check className="size-3.5" />}
                  </span>
                </button>
              );
            })}
        </div>

        <div className="border-t border-border p-3">
          <Button
            className="w-full"
            disabled={selected.length === 0 || startConversation.isPending}
            onClick={() => startConversation.mutate()}
          >
            {startConversation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {selected.length > 1 ? `Create group (${selected.length})` : "Chat"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
