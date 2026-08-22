import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthTokens, User } from "@/types";

export interface SavedAccount extends AuthTokens {
  user: User;
}

interface AccountsState {
  /** Every account that has ever been logged into on this browser, so the
   * account switcher can offer one-tap switching without re-entering a
   * password. Session tokens can still expire server-side — switching to a
   * stale one just bounces through the normal 401-refresh-logout flow. */
  accounts: SavedAccount[];
  remember: (account: SavedAccount) => void;
  forget: (userId: string) => void;
}

export const useAccountsStore = create<AccountsState>()(
  persist(
    (set) => ({
      accounts: [],
      remember: (account) =>
        set((state) => ({
          accounts: [
            account,
            ...state.accounts.filter((a) => a.user.id !== account.user.id),
          ],
        })),
      forget: (userId) =>
        set((state) => ({
          accounts: state.accounts.filter((a) => a.user.id !== userId),
        })),
    }),
    {
      name: "instagramm-accounts",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
