"use client";

import { Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { ProfileGrid } from "@/components/profile/ProfileGrid";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { Separator } from "@/components/ui/separator";
import { usersApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const currentUserId = useAuthStore((state) => state.user?.id);

  const { data: profile, isLoading } = useQuery({
    queryKey: queryKeys.users.detail(username),
    queryFn: () => usersApi.getByUsername(username),
  });

  if (isLoading) {
    return <div className="px-4 py-8 text-sm text-muted-foreground">Loading profile...</div>;
  }

  if (!profile) {
    return (
      <div className="px-4 py-16 text-center text-sm text-muted-foreground">
        This account doesn&apos;t exist.
      </div>
    );
  }

  const isOwner = currentUserId === profile.id;
  // The backend already refuses to return posts for a private account you
  // don't follow, but gate the UI too so it reads as "private" instead of
  // "no posts yet".
  const isLocked = profile.isPrivate && !isOwner && !profile.isFollowedByMe;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <ProfileHeader profile={profile} />
      <Separator />
      <div className="pt-4">
        {isLocked ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full border-2 border-foreground">
              <Lock className="size-7" />
            </div>
            <p className="text-xl font-light">This Account is Private</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Follow this account to see their photos and videos.
            </p>
          </div>
        ) : (
          <ProfileGrid userId={profile.id} />
        )}
      </div>
    </div>
  );
}
