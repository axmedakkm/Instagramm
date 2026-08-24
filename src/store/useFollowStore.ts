import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Persisted record of users followed via the "quick" follow buttons
 * (notifications, follower/following lists) where the backend's short user
 * shape doesn't carry `isFollowedByMe`. Persisting locally keeps the button
 * showing "Unfollow" across refreshes until the user unfollows themselves.
 *
 * `requestedIds` mirrors the same idea for *pending* follow requests to
 * private accounts: the backend's `/users/:id` never reports "you have a
 * request outstanding" (`isFollowedByMe` stays false), so we remember it here
 * to keep the button on "Requested" instead of snapping back to "Follow".
 */
interface FollowState {
  followedIds: string[];
  requestedIds: string[];
  follow: (userId: string) => void;
  unfollow: (userId: string) => void;
  request: (userId: string) => void;
  unrequest: (userId: string) => void;
}

export const useFollowStore = create<FollowState>()(
  persist(
    (set) => ({
      followedIds: [],
      requestedIds: [],
      follow: (userId) =>
        set((state) => ({
          followedIds: state.followedIds.includes(userId)
            ? state.followedIds
            : [...state.followedIds, userId],
          // Following supersedes a pending request.
          requestedIds: state.requestedIds.filter((id) => id !== userId),
        })),
      unfollow: (userId) =>
        set((state) => ({
          followedIds: state.followedIds.filter((id) => id !== userId),
          requestedIds: state.requestedIds.filter((id) => id !== userId),
        })),
      request: (userId) =>
        set((state) =>
          state.requestedIds.includes(userId)
            ? state
            : { requestedIds: [...state.requestedIds, userId] },
        ),
      unrequest: (userId) =>
        set((state) => ({
          requestedIds: state.requestedIds.filter((id) => id !== userId),
        })),
    }),
    {
      name: "instagramm-follows",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
