import { create } from "zustand";

interface UIState {
  isCreatePostOpen: boolean;
  openCreatePost: () => void;
  closeCreatePost: () => void;
}

/** Small store for cross-tree UI state that doesn't belong to a single page,
 * e.g. the "create post" dialog that can be triggered from the sidebar,
 * the mobile nav, or the feed's empty state. */
export const useUIStore = create<UIState>((set) => ({
  isCreatePostOpen: false,
  openCreatePost: () => set({ isCreatePostOpen: true }),
  closeCreatePost: () => set({ isCreatePostOpen: false }),
}));
