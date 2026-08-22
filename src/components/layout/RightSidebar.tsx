"use client";

import Link from "next/link";
import { SuggestedUsers } from "@/components/shared/SuggestedUsers";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuthStore } from "@/store/useAuthStore";

export function RightSidebar() {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  return (
    <aside className="hidden w-80 shrink-0 flex-col gap-6 px-6 py-8 xl:flex">
      <Link href={`/${user.username}`} className="flex items-center gap-3">
        <UserAvatar user={user} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.username}</p>
          <p className="truncate text-sm text-muted-foreground">
            {user.fullName}
          </p>
        </div>
      </Link>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-muted-foreground">
            Suggested for you
          </p>
        </div>
        <SuggestedUsers limit={5} />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Instagramm Clone
      </p>
    </aside>
  );
}
