"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { FollowListModal } from "@/components/profile/FollowListModal";
import { FollowButton } from "@/components/shared/FollowButton";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { conversationsApi } from "@/services/api";
import { useAuthStore } from "@/store/useAuthStore";
import type { User } from "@/types";

export function ProfileHeader({ profile }: { profile: User }) {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const isOwner = currentUser?.id === profile.id;
  const [openList, setOpenList] = useState<"followers" | "following" | null>(
    null,
  );
  const [editOpen, setEditOpen] = useState(false);

  const startConversation = useMutation({
    mutationFn: () => conversationsApi.getOrCreateWithUser(profile.id),
    onSuccess: (conversation) => router.push(`/messages/${conversation.id}`),
    onError: () => toast.error("Couldn't start that conversation."),
  });

  return (
    <header className="flex flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:gap-10">
      <div className="mx-auto shrink-0 rounded-full bg-[conic-gradient(from_180deg_at_50%_50%,#f9ce34_0deg,#ee2a7b_120deg,#6228d7_240deg,#f9ce34_360deg)] p-[3px] shadow-lifted transition-transform duration-300 ease-spring hover:scale-[1.03] sm:mx-0">
        <div className="rounded-full bg-background p-[3px]">
          <UserAvatar user={profile} size="xl" className="size-24 sm:size-36" />
        </div>
      </div>

      <div className="flex-1 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl">{profile.username}</h1>
          {profile.isVerified && <Badge variant="secondary">Verified</Badge>}
          {profile.isPrivate && <Badge variant="outline">Private</Badge>}
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Settings"
              className="size-8"
              onClick={() => router.push("/settings")}
            >
              <Menu className="size-5" />
            </Button>
          )}
        </div>

        <div className="flex gap-8 text-sm">
          <p>
            <span className="font-semibold">{profile.postsCount}</span> posts
          </p>
          <button type="button" onClick={() => setOpenList("followers")}>
            <span className="font-semibold">{profile.followersCount}</span>{" "}
            followers
          </button>
          <button type="button" onClick={() => setOpenList("following")}>
            <span className="font-semibold">{profile.followingCount}</span>{" "}
            following
          </button>
        </div>

        <div className="space-y-0.5 text-sm">
          <p className="font-semibold">{profile.fullName}</p>
          {profile.bio && <p className="whitespace-pre-line">{profile.bio}</p>}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary"
            >
              {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>

        {isOwner && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => setEditOpen(true)}
            >
              Edit profile
            </Button>
          </div>
        )}

        {!isOwner && (
          <div className="flex flex-wrap items-center gap-2">
            <FollowButton user={profile} className="flex-1 sm:flex-none" />
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => startConversation.mutate()}
              disabled={startConversation.isPending}
            >
              {startConversation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Message
            </Button>
          </div>
        )}
      </div>

      {openList && (
        <FollowListModal
          userId={profile.id}
          type={openList}
          open
          onOpenChange={(open) => setOpenList(open ? openList : null)}
          viewerFollowsAll={isOwner && openList === "following"}
        />
      )}

      {isOwner && (
        <EditProfileModal
          user={profile}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </header>
  );
}
