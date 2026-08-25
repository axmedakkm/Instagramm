"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usersApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { UserSummary } from "@/types";

/**
 * Accounts you've blocked. Unblocking here is the only way back for a
 * profile you can no longer even navigate to (blocking is one-directional —
 * see `usersApi.block` — but the *blocked* side loses all normal ways to
 * find you, so managing it has to live somewhere reachable regardless).
 */
export default function BlockedAccountsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: blocked, isLoading } = useQuery({
    queryKey: queryKeys.users.blocked,
    queryFn: usersApi.blocked,
  });

  const unblock = useMutation({
    mutationFn: (userId: string) => usersApi.unblock(userId),
    onSuccess: (_data, userId) => {
      queryClient.setQueryData<UserSummary[]>(queryKeys.users.blocked, (old) =>
        old?.filter((user) => user.id !== userId),
      );
    },
    onError: () => toast.error("Couldn't unblock that account."),
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
          <h1 className="text-xl font-semibold">Blocked accounts</h1>
          <p className="text-xs text-muted-foreground">
            Blocked accounts can&apos;t find your profile, posts, or stories.
          </p>
        </div>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-1 p-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-2 py-2">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && blocked?.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-24 text-center">
          <div className="flex size-16 items-center justify-center rounded-full border-2 border-foreground">
            <Ban className="size-7" />
          </div>
          <p className="text-sm text-muted-foreground">
            You haven&apos;t blocked anyone.
          </p>
        </div>
      )}

      {!isLoading && blocked && blocked.length > 0 && (
        <ul className="flex flex-col p-2">
          {blocked.map((user) => (
            <li
              key={user.id}
              className="flex items-center gap-3 rounded-md px-2 py-2"
            >
              <Link
                href={`/${user.username}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <UserAvatar user={user} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {user.username}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.fullName}
                  </p>
                </div>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0"
                disabled={unblock.isPending}
                onClick={() => unblock.mutate(user.id)}
              >
                Unblock
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
