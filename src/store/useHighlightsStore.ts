import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * A highlight ("Актуальное") — a named group of your archived stories that
 * stays on your profile after the stories themselves expire.
 *
 * Only story *ids* are stored. The media is resolved from
 * `GET /stories/me/archive` at render time, so deleting a story from the
 * archive removes it from every highlight automatically instead of leaving
 * a broken tile behind.
 */
export interface Highlight {
  id: string;
  title: string;
  /** Newest first, matching the order the archive comes back in. */
  storyIds: string[];
  createdAt: string;
}

/**
 * Highlights live in localStorage because the backend has no highlights
 * endpoint yet — same as notes started out. That means they're visible on
 * your own profile only; making them public needs `GET/POST /users/:id/
 * highlights` on the backend, after which this store swaps for a query.
 */
interface HighlightsState {
  highlights: Highlight[];
  create: (title: string, storyIds: string[]) => void;
  rename: (highlightId: string, title: string) => void;
  addStories: (highlightId: string, storyIds: string[]) => void;
  removeStory: (highlightId: string, storyId: string) => void;
  remove: (highlightId: string) => void;
}

export const useHighlightsStore = create<HighlightsState>()(
  persist(
    (set) => ({
      highlights: [],

      create: (title, storyIds) =>
        set((state) => ({
          highlights: [
            {
              // `crypto.randomUUID` is available in every browser this app
              // supports; the store only ever runs client-side.
              id: crypto.randomUUID(),
              title,
              storyIds,
              createdAt: new Date().toISOString(),
            },
            ...state.highlights,
          ],
        })),

      rename: (highlightId, title) =>
        set((state) => ({
          highlights: state.highlights.map((highlight) =>
            highlight.id === highlightId ? { ...highlight, title } : highlight,
          ),
        })),

      addStories: (highlightId, storyIds) =>
        set((state) => ({
          highlights: state.highlights.map((highlight) =>
            highlight.id === highlightId
              ? {
                  ...highlight,
                  // A story can only be in a highlight once.
                  storyIds: [
                    ...new Set([...highlight.storyIds, ...storyIds]),
                  ],
                }
              : highlight,
          ),
        })),

      removeStory: (highlightId, storyId) =>
        set((state) => ({
          highlights: state.highlights.map((highlight) =>
            highlight.id === highlightId
              ? {
                  ...highlight,
                  storyIds: highlight.storyIds.filter((id) => id !== storyId),
                }
              : highlight,
          ),
        })),

      remove: (highlightId) =>
        set((state) => ({
          highlights: state.highlights.filter(
            (highlight) => highlight.id !== highlightId,
          ),
        })),
    }),
    {
      name: "instagramm-highlights",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
