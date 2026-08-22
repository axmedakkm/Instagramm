"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { TimeAgo } from "@/components/shared/TimeAgo";
import { cn } from "@/lib/utils";
import { storiesApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import type { StoryGroup } from "@/types";

const STORY_DURATION_MS = 5000;

export function StoryViewer({ initialUsername }: { initialUsername: string }) {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);

  const { data: storyGroups } = useQuery({
    queryKey: queryKeys.stories.feed,
    queryFn: storiesApi.feed,
  });

  // `/stories/feed` never includes the current user's own stories, so we
  // fetch those separately and splice them in when relevant.
  const { data: myStories } = useQuery({
    queryKey: queryKeys.stories.byUser(currentUser?.id ?? ""),
    queryFn: () => storiesApi.byUser(currentUser!.id),
    enabled: !!currentUser,
  });

  const groups: StoryGroup[] = [
    ...(currentUser && myStories && myStories.length > 0
      ? [{ user: currentUser, stories: myStories }]
      : []),
    ...(storyGroups ?? []),
  ];

  // `groupIndex`/`storyIndex` only track *explicit navigation*. Until the
  // viewer has been advanced manually, the active group is derived straight
  // from `initialUsername` during render instead of being synced via an
  // effect, so there's no extra render pass once story data loads.
  const [manualGroupIndex, setManualGroupIndex] = useState<number | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const derivedGroupIndex = groups.findIndex(
    (group) => group.user.username === initialUsername,
  );
  const groupIndex =
    manualGroupIndex ?? (derivedGroupIndex >= 0 ? derivedGroupIndex : 0);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  const close = () => router.push("/feed");

  const goToNextStory = useCallback(() => {
    if (!currentGroup) return;
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((i) => i + 1);
      setProgress(0);
      return;
    }
    if (groupIndex < groups.length - 1) {
      setManualGroupIndex(groupIndex + 1);
      setStoryIndex(0);
      setProgress(0);
      return;
    }
    router.push("/feed");
  }, [currentGroup, storyIndex, groupIndex, groups.length, router]);

  const goToPreviousStory = () => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      setProgress(0);
      return;
    }
    if (groupIndex > 0) {
      const previousGroup = groups[groupIndex - 1];
      setManualGroupIndex(groupIndex - 1);
      setStoryIndex((previousGroup?.stories.length ?? 1) - 1);
      setProgress(0);
    }
  };

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentStory || currentStory.isViewedByMe) return;
    storiesApi
      .markViewed(currentStory.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.stories.feed });
        if (currentUser) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.stories.byUser(currentUser.id),
          });
        }
      })
      .catch(() => {});
  }, [currentStory, queryClient, currentUser]);

  useEffect(() => {
    if (!currentStory) return;
    const intervalMs = 50;
    const step = (intervalMs / STORY_DURATION_MS) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          goToNextStory();
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [currentStory, goToNextStory]);

  if (!currentGroup || !currentStory) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <button type="button" onClick={close} className="absolute right-4 top-4">
          <X className="size-6" />
        </button>
        <p className="text-sm text-white/70">No active stories.</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-black">
      <div className="relative aspect-[9/16] h-full max-h-screen w-full max-w-md bg-neutral-900">
        <div className="absolute inset-x-2 top-2 z-20 flex gap-1">
          {currentGroup.stories.map((story, index) => (
            <div
              key={story.id}
              className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <div
                className="h-full bg-white"
                style={{
                  width:
                    index < storyIndex
                      ? "100%"
                      : index === storyIndex
                        ? `${progress}%`
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-3 top-6 z-20 flex items-center gap-2">
          <UserAvatar user={currentGroup.user} size="sm" />
          <span className="text-sm font-semibold text-white">
            {currentGroup.user.username}
          </span>
          <TimeAgo
            date={currentStory.createdAt}
            className="text-xs text-white/70"
          />
          <button
            type="button"
            onClick={close}
            className="ml-auto rounded-full p-1 text-white"
          >
            <X className="size-6" />
          </button>
        </div>

        <Image
          src={currentStory.mediaUrl}
          alt={`${currentGroup.user.username}'s story`}
          fill
          className="object-contain"
          priority
        />

        <button
          type="button"
          aria-label="Previous story"
          onClick={goToPreviousStory}
          className={cn("absolute inset-y-0 left-0 z-10 w-1/3")}
        />
        <button
          type="button"
          aria-label="Next story"
          onClick={goToNextStory}
          className={cn("absolute inset-y-0 right-0 z-10 w-1/3")}
        />
      </div>
    </div>
  );
}
