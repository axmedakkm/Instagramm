"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FollowButton } from "@/components/shared/FollowButton";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { usersApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";

export function SuggestedUsers({ limit = 5 }: { limit?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.users.suggestions,
    queryFn: usersApi.suggestions,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: limit }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const suggestions = (data ?? []).slice(0, limit);

  if (suggestions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No suggestions right now.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {suggestions.map((user) => (
        <li key={user.id} className="flex items-center gap-3">
          <Link href={`/${user.username}`}>
            <UserAvatar user={user} size="sm" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/${user.username}`}
              className="block truncate text-sm font-semibold"
            >
              {user.username}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              {user.fullName}
            </p>
          </div>
          <FollowButton user={user} className="h-7 min-w-0 px-2 text-xs" />
        </li>
      ))}
    </ul>
  );
}
