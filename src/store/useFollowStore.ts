import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Persisted record of users followed via the "quick" follow buttons
 * (notifications, follower/following lists) where the backend's short user
 * shape doesn't carry `isFollowedByMe`. Persisting locally keeps the button
 * showing "Unfollow" across refreshes until the user unfollows themselves.
 */
interface FollowState {
  followedIds: string[];
  follow: (userId: string) => void;
  unfollow: (userId: string) => void;
}

export const useFollowStore = create<FollowState>()(
  persist(
    (set) => ({
      followedIds: [],
      follow: (userId) =>
        set((state) =>
          state.followedIds.includes(userId)
            ? state
            : { followedIds: [...state.followedIds, userId] },
        ),
      unfollow: (userId) =>
        set((state) => ({
          followedIds: state.followedIds.filter((id) => id !== userId),
        })),
    }),
    {
      name: "instagramm-follows",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
