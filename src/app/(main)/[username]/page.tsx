"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { ProfileGrid } from "@/components/profile/ProfileGrid";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { Separator } from "@/components/ui/separator";
import { usersApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);

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

  return (
    <div className="mx-auto w-full max-w-4xl">
      <ProfileHeader profile={profile} />
      <Separator />
      <div className="pt-4">
        <ProfileGrid userId={profile.id} />
      </div>
    </div>
  );
}
