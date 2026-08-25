"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { StoryRing } from "@/components/feed/StoryRing";
import { NoteBubble } from "@/components/shared/NoteBubble";
import { Skeleton } from "@/components/ui/skeleton";
import { storiesApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import { isNoteExpired, useNotesStore } from "@/store/useNotesStore";

export function StoriesBar() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const note = useNotesStore((state) => state.note);
  const activeNote = note && !isNoteExpired(note) ? note : null;

  // `/stories/feed` only returns stories from people you follow, never your
  // own — fetch those separately.
  const { data: myStories } = useQuery({
    queryKey: queryKeys.stories.byUser(currentUser?.id ?? ""),
    queryFn: () => storiesApi.byUser(currentUser!.id),
    enabled: !!currentUser,
    staleTime: 60 * 1000,
  });

  const { data: storyGroups, isLoading } = useQuery({
    queryKey: queryKeys.stories.feed,
    queryFn: storiesApi.feed,
    staleTime: 60 * 1000,
  });

  const hasMyStories = !!myStories && myStories.length > 0;
  const myStoriesHaveUnviewed = !!myStories?.some((story) => !story.isViewedByMe);

  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto border-b border-border px-4 py-4">
      {currentUser && (
        <button
          type="button"
          onClick={() =>
            hasMyStories
              ? router.push(`/stories?u=${currentUser.username}`)
              : router.push("/stories/create")
          }
          className="flex w-16 shrink-0 flex-col items-center gap-1"
        >
          {activeNote && <NoteBubble note={activeNote} />}
          <div className="relative">
            <StoryRing
              user={currentUser}
              hasStory={hasMyStories}
              hasUnviewed={myStoriesHaveUnviewed}
            />
            {!hasMyStories && (
              <span className="absolute bottom-0 right-0 flex size-5 items-center justify-center rounded-full border-2 border-background bg-[linear-gradient(135deg,#f9ce34,#ee2a7b_55%,#6228d7)] text-white shadow-soft">
                <Plus className="size-3" strokeWidth={2.5} />
              </span>
            )}
          </div>
          <span className="w-full truncate text-center text-xs">
            Your story
          </span>
        </button>
      )}

      {isLoading &&
        Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex w-16 shrink-0 flex-col items-center gap-1">
            <Skeleton className="size-14 rounded-full" />
            <Skeleton className="h-2.5 w-10" />
          </div>
        ))}

      {storyGroups
        ?.filter((group) => group.user.id !== currentUser?.id)
        .map((group) => (
          <button
            key={group.user.id}
            type="button"
            onClick={() => router.push(`/stories?u=${group.user.username}`)}
            className="flex w-16 shrink-0 flex-col items-center gap-1"
          >
            <StoryRing
              user={group.user}
              hasStory
              hasUnviewed={group.stories.some((story) => !story.isViewedByMe)}
            />
            <span className="w-full truncate text-center text-xs">
              {group.user.username}
            </span>
          </button>
        ))}
    </div>
  );
}
