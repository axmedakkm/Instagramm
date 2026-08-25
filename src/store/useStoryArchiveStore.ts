import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Story } from "@/types";

/**
 * A story you've posted, kept locally so it survives past its 24h life.
 * It's a plain `Story` — including the `music` the backend now stores on it,
 * so nothing extra has to be stitched in here.
 */
export type ArchivedStory = Story;

/**
 * Client-side "story archive". The backend expires stories after 24h and has
 * no endpoint to list your old ones, so — exactly like `useSavedPostsStore` —
 * we keep your own stories locally (persisted to localStorage) as the source
 * of truth for the Archive page.
 */
interface StoryArchiveState {
  stories: ArchivedStory[];
  add: (story: ArchivedStory) => void;
  remove: (storyId: string) => void;
}

export const useStoryArchiveStore = create<StoryArchiveState>()(
  persist(
    (set) => ({
      stories: [],
      add: (story) =>
        set((state) =>
          state.stories.some((s) => s.id === story.id)
            ? state
            : { stories: [story, ...state.stories] },
        ),
      remove: (storyId) =>
        set((state) => ({
          stories: state.stories.filter((s) => s.id !== storyId),
        })),
    }),
    {
      name: "instagramm-story-archive",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
