import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Post } from "@/types";

/**
 * Client-side "saved posts" collection. The backend has no endpoint to list
 * saved posts, so we keep the full post objects locally (persisted to
 * localStorage) as the source of truth for the Saved page and the bookmark
 * button's filled/unfilled state.
 */
interface SavedPostsState {
  posts: Post[];
  save: (post: Post) => void;
  unsave: (postId: string) => void;
  toggle: (post: Post) => void;
}

export const useSavedPostsStore = create<SavedPostsState>()(
  persist(
    (set, get) => ({
      posts: [],
      save: (post) =>
        set((state) =>
          state.posts.some((p) => p.id === post.id)
            ? state
            : { posts: [post, ...state.posts] },
        ),
      unsave: (postId) =>
        set((state) => ({
          posts: state.posts.filter((p) => p.id !== postId),
        })),
      toggle: (post) => {
        const isSaved = get().posts.some((p) => p.id === post.id);
        if (isSaved) get().unsave(post.id);
        else get().save(post);
      },
    }),
    {
      name: "instagramm-saved-posts",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
