"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { usersApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query.trim(), 350);

  const { data: results, isFetching } = useQuery({
    queryKey: queryKeys.users.search(debouncedQuery),
    queryFn: () => usersApi.search(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  const showResults = debouncedQuery.length > 0;

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          className="rounded-full bg-muted pl-9 pr-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute z-30 mt-2 w-full rounded-lg border border-border bg-popover shadow-lg">
          {isFetching && (
            <div className="space-y-3 p-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          )}

          {!isFetching && results?.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              No results found for &quot;{debouncedQuery}&quot;.
            </p>
          )}

          {!isFetching && results && results.length > 0 && (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {results.map((user) => (
                <li key={user.id}>
                  <Link
                    href={`/${user.username}`}
                    onClick={() => setQuery("")}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent"
                  >
                    <UserAvatar user={user} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {user.username}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.fullName}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
