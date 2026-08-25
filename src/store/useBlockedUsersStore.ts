import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { UserSummary } from "@/types";

/**
 * Blocked accounts, kept locally. The backend has no block endpoint, so this
 * can't stop the other person from messaging you or seeing your content —
 * it only changes what *you* see: a blocked person's chat drops out of your
 * inbox and stays out (unlike "delete chat", it doesn't come back on a new
 * message) until you unblock them from Settings.
 */
interface BlockedUsersState {
  users: UserSummary[];
  block: (user: UserSummary) => void;
  unblock: (userId: string) => void;
}

export const useBlockedUsersStore = create<BlockedUsersState>()(
  persist(
    (set) => ({
      users: [],
      block: (user) =>
        set((state) =>
          state.users.some((u) => u.id === user.id)
            ? state
            : { users: [user, ...state.users] },
        ),
      unblock: (userId) =>
        set((state) => ({
          users: state.users.filter((u) => u.id !== userId),
        })),
    }),
    {
      name: "instagramm-blocked-users",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
