"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, EyeOff, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { usersApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { UserSummary } from "@/types";

/**
 * Who your own stories are hidden from. One-directional and entirely
 * author-controlled (see `usersApi.hideStoryFrom`) — they're never told,
 * and everything of yours *except* stories stays visible to them.
 */
export default function StoryHiddenPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query.trim(), 300);

  const { data: hidden, isLoading } = useQuery({
    queryKey: queryKeys.users.storyHidden,
    queryFn: usersApi.storyHidden,
  });
  const hiddenIds = new Set((hidden ?? []).map((u) => u.id));

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: queryKeys.users.search(debouncedQuery),
    queryFn: () => usersApi.search(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });
  const candidates = (searchResults ?? []).filter((u) => !hiddenIds.has(u.id));

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.users.storyHidden });

  const hide = useMutation({
    mutationFn: (userId: string) => usersApi.hideStoryFrom(userId),
    onSuccess: (_data, userId) => {
      const person = searchResults?.find((u) => u.id === userId);
      refresh();
      setQuery("");
      if (person) toast.success(`Your stories are hidden from @${person.username}`);
    },
    onError: () => toast.error("Couldn't hide your stories from that account."),
  });

  const unhide = useMutation({
    mutationFn: (userId: string) => usersApi.unhideStoryFrom(userId),
    onSuccess: refresh,
    onError: () => toast.error("Couldn't undo that."),
  });

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="flex items-center gap-2 border-b border-border px-4 py-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Go back"
          className="size-8"
          onClick={() => router.back()}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Hide story from</h1>
          <p className="text-xs text-muted-foreground">
            They won&apos;t know, and everything else of yours still shows.
          </p>
        </div>
      </header>

      <div className="border-b border-border p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people"
            className="rounded-full bg-muted pl-9"
          />
        </div>

        {isSearching && (
          <p className="px-1 pt-2 text-xs text-muted-foreground">Searching…</p>
        )}
        {!isSearching && debouncedQuery && candidates.length === 0 && (
          <p className="px-1 pt-2 text-xs text-muted-foreground">
            No one found for &ldquo;{debouncedQuery}&rdquo;.
          </p>
        )}
        {candidates.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {candidates.map((person) => (
              <li
                key={person.id}
                className="flex items-center gap-3 rounded-md px-1 py-1.5"
              >
                <UserAvatar user={person} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {person.username}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={hide.isPending}
                  onClick={() => hide.mutate(person.id)}
                >
                  Hide
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase text-muted-foreground">
        Hidden from
      </p>

      {isLoading && (
        <div className="flex flex-col gap-1 p-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-2 py-2">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && (hidden?.length ?? 0) === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full border-2 border-foreground">
            <EyeOff className="size-7" />
          </div>
          <p className="text-sm text-muted-foreground">
            Your stories are visible to everyone who can normally see them.
          </p>
        </div>
      )}

      {!isLoading && hidden && hidden.length > 0 && (
        <ul className="flex flex-col p-2">
          {hidden.map((person: UserSummary) => (
            <li
              key={person.id}
              className="flex items-center gap-3 rounded-md px-2 py-2"
            >
              <UserAvatar user={person} size="md" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {person.username}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 shrink-0 text-muted-foreground"
                aria-label={`Stop hiding stories from ${person.username}`}
                disabled={unhide.isPending}
                onClick={() => unhide.mutate(person.id)}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
