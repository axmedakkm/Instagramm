import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Story } from "@/types";

/** A song you can attach to a story. In a production app this would come from
 * a licensed music catalogue; here it's a fixed local list (see
 * `src/lib/storyMusic.ts`) so the feature works entirely on the frontend. */
export interface StoryMusic {
  id: string;
  title: string;
  artist: string;
  /** Audio played while the story is on screen. */
  previewUrl: string;
}

/** A story you've posted, kept locally so it survives past its 24h life. */
export interface ArchivedStory extends Story {
  music?: StoryMusic;
}

/**
 * Client-side "story archive". The backend expires stories after 24h and has
 * no endpoint to list your old ones, so — exactly like `useSavedPostsStore` —
 * we keep your own stories locally (persisted to localStorage) as the source
 * of truth for the Archive page. It also carries the chosen music, which the
 * backend can't store either.
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
