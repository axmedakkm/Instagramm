"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  ImagePlus,
  Link2,
  Loader2,
  Lock,
  Menu,
  MoreHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { StoryRing } from "@/components/feed/StoryRing";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { FollowListModal } from "@/components/profile/FollowListModal";
import { FollowButton } from "@/components/shared/FollowButton";
import { NoteBubble } from "@/components/shared/NoteBubble";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { conversationsApi, storiesApi, usersApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";
import { isNoteExpired, useNotesStore } from "@/store/useNotesStore";
import type { Conversation, PaginatedResponse, User } from "@/types";

export function ProfileHeader({ profile }: { profile: User }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const isOwner = currentUser?.id === profile.id;
  const openCreatePost = useUIStore((state) => state.openCreatePost);
  const [openList, setOpenList] = useState<"followers" | "following" | null>(
    null,
  );
  const [editOpen, setEditOpen] = useState(false);

  const startConversation = useMutation({
    mutationFn: () => conversationsApi.getOrCreateWithUser(profile.id),
    onSuccess: (conversation) => {
      // Same reasoning as `NewMessageModal`: seed the list query directly so
      // `ChatWindow` (which only reads this cache, no `GET /conversations/:id`)
      // has the conversation the moment it mounts, brand new or not.
      queryClient.setQueryData<PaginatedResponse<Conversation>>(
        queryKeys.conversations.list,
        (old) =>
          old
            ? {
                ...old,
                items: [
                  conversation,
                  ...old.items.filter((item) => item.id !== conversation.id),
                ],
              }
            : old,
      );
      router.push(`/messages/${conversation.id}`);
    },
    onError: () => toast.error("Couldn't start that conversation."),
  });

  // Blocking is one-directional (see usersApi.block) — it hides *you* from
  // *them*, not the other way around, so this profile keeps loading for the
  // blocker with `isBlockedByMe` flipped, same page, no navigation away.
  const toggleBlock = useMutation({
    mutationFn: () =>
      profile.isBlockedByMe
        ? usersApi.unblock(profile.id)
        : usersApi.block(profile.id),
    onSuccess: () => {
      queryClient.setQueryData<User>(
        queryKeys.users.detail(profile.username),
        (old) => (old ? { ...old, isBlockedByMe: !old.isBlockedByMe } : old),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.users.blocked });
      toast.success(
        profile.isBlockedByMe
          ? `Unblocked @${profile.username}.`
          : `Blocked @${profile.username}.`,
      );
    },
    onError: () =>
      toast.error(
        profile.isBlockedByMe
          ? "Couldn't unblock that account."
          : "Couldn't block that account.",
      ),
  });

  // Does this person have a live story? Drives the ring around the avatar.
  // Same query key the stories bar uses, so it's served from cache.
  const { data: stories } = useQuery({
    queryKey: queryKeys.stories.byUser(profile.id),
    queryFn: () => storiesApi.byUser(profile.id),
    staleTime: 60 * 1000,
  });

  const hasStory = !!stories && stories.length > 0;
  const hasUnviewed = !!stories?.some((story) => !story.isViewedByMe);

  // This user's active note (from the API), shown as a bubble above the
  // avatar — for anyone's profile, not just your own, same as the messages
  // rail. Null when they have no live note.
  const activeNote = profile.note;

  return (
    <header className="px-4 pb-6 pt-6 sm:pt-8">
      {/* Top row: avatar on the left, everything else in a column beside it. */}
      <div className="flex gap-4 sm:gap-6">
        {/* The avatar sits in its own column so a note bubble can stack above
            it without disturbing the info column beside it. */}
        <div className="flex w-20 shrink-0 flex-col items-center gap-1 sm:w-28">
          {activeNote && <NoteBubble note={activeNote} />}

          {/* With a story, the avatar becomes a button that opens it. Without
              one there's nothing to open, so it stays a plain image. */}
          {hasStory ? (
            <button
              type="button"
              onClick={() => router.push(`/stories?u=${profile.username}`)}
              aria-label={`View ${profile.username}'s story`}
              className="shrink-0 rounded-full"
            >
              <StoryRing
                user={profile}
                hasStory
                hasUnviewed={hasUnviewed}
                size="xl"
                avatarClassName="size-20 sm:size-28"
              />
            </button>
          ) : (
            <StoryRing
              user={profile}
              size="xl"
              avatarClassName="size-20 sm:size-28"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Username + burger. The burger is pushed to the far right of the
              header, level with the username. */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight">
                {profile.username}
              </h1>
              {profile.fullName && (
                <p className="truncate text-sm text-muted-foreground">
                  {profile.fullName}
                </p>
              )}
            </div>

            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Settings"
                className="-mr-1 shrink-0 rounded-full"
                onClick={() => router.push("/settings")}
              >
                <Menu className="size-6" />
              </Button>
            )}
          </div>

          {/* Stats, inline. `flex-wrap` lets them drop to a second line on a
              narrow phone instead of overflowing. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Stat value={profile.postsCount} label="posts" />
            <Stat
              value={profile.followersCount}
              label="followers"
              onClick={() => setOpenList("followers")}
            />
            <Stat
              value={profile.followingCount}
              label="following"
              onClick={() => setOpenList("following")}
            />
          </div>

          {profile.bio && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Website, and a quiet "Private" marker for locked accounts — the
              marker used to sit next to the username, which is now kept clear. */}
          {(profile.website || profile.isPrivate) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 font-medium text-primary transition-opacity hover:opacity-80"
                >
                  <Link2 className="size-4" />
                  {profile.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              {profile.isPrivate && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Lock className="size-3.5" />
                  Private
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions, full width along the bottom of the header. */}
      <div className="mt-5 flex gap-2">
        {isOwner ? (
          <>
            <Button
              variant="secondary"
              className="h-10 flex-1"
              onClick={() => setEditOpen(true)}
            >
              Edit profile
            </Button>
            {/* Opens the same composer the sidebar's Create button does, so
                you can post without leaving your profile. */}
            <Button
              variant="secondary"
              className="h-10 flex-1"
              onClick={openCreatePost}
            >
              <ImagePlus className="size-4" />
              New post
            </Button>
          </>
        ) : (
          <>
            <FollowButton user={profile} className="h-10 flex-1" />
            <Button
              variant="secondary"
              className="h-10 flex-1"
              onClick={() => startConversation.mutate()}
              disabled={startConversation.isPending}
            >
              {startConversation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Message
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label="More options"
                >
                  <MoreHorizontal className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  disabled={toggleBlock.isPending}
                  onClick={() => toggleBlock.mutate()}
                >
                  <Ban className="size-4" />
                  {profile.isBlockedByMe ? "Unblock" : "Block"} @
                  {profile.username}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
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

/**
 * One inline stat, e.g. "206 followers". With `onClick` it's a button
 * (followers / following open a list); without one it's a plain span (posts
 * isn't clickable). Numbers use tabular figures so they don't twitch as the
 * counts change.
 */
function Stat({
  value,
  label,
  onClick,
}: {
  value: number;
  label: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="font-semibold tabular-nums">{formatCount(value)}</span>{" "}
      <span className="text-muted-foreground">{label}</span>
    </>
  );

  const className = "rounded-md py-0.5 text-sm";

  if (!onClick) {
    return <span className={className}>{inner}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${className} transition-opacity duration-200 ease-smooth hover:opacity-70 active:scale-[0.97]`}
    >
      {inner}
    </button>
  );
}

/** 999 → "999", 8_200 → "8.2K", 12_000 → "12K", 1_500_000 → "1.5M". */
function formatCount(value: number) {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${oneDecimal(value / 1000)}K`;
  return `${oneDecimal(value / 1_000_000)}M`;
}

/** 8.24 → "8.2", but 12.0 → "12" (no pointless trailing zero). */
function oneDecimal(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}
