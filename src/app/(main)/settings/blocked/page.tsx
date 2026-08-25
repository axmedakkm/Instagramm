"use client";

import { Ban, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { useBlockedUsersStore } from "@/store/useBlockedUsersStore";

/**
 * Accounts you've blocked. Client-side only, same as the block action
 * itself — there's no backend endpoint, so this is the only place that list
 * lives, and unblocking here is the only way back.
 */
export default function BlockedAccountsPage() {
  const router = useRouter();
  const users = useBlockedUsersStore((state) => state.users);
  const unblock = useBlockedUsersStore((state) => state.unblock);

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
            They can&apos;t see your posts or message you. Only you can see
            this list.
          </p>
        </div>
      </header>

      {users.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <div className="flex size-20 items-center justify-center rounded-full border-2 border-foreground">
            <Ban className="size-9" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-light">No blocked accounts</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Block someone from their chat&apos;s three-dot menu and
              they&apos;ll show up here.
            </p>
          </div>
        </div>
      )}

      {users.length > 0 && (
        <div className="flex flex-col p-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 rounded-md px-2 py-2"
            >
              <UserAvatar user={user} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user.username}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.fullName}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  unblock(user.id);
                  toast.success(`@${user.username} unblocked`);
                }}
              >
                Unblock
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
