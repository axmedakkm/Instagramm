"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { ProfileGrid } from "@/components/profile/ProfileGrid";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usersApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const currentUser = useAuthStore((state) => state.user);

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

  const isOwner = currentUser?.id === profile.id;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <ProfileHeader profile={profile} />

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          {isOwner && <TabsTrigger value="saved">Saved</TabsTrigger>}
        </TabsList>
        <TabsContent value="posts">
          <ProfileGrid userId={profile.id} mode="posts" />
        </TabsContent>
        {isOwner && (
          <TabsContent value="saved">
            <ProfileGrid userId={profile.id} mode="saved" />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
