import Cookies from "js-cookie";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/constants";
import type { User } from "@/types";

/**
 * Tokens live primarily in localStorage (via the persist middleware below),
 * but we mirror them into cookies too so `src/proxy.ts` (the edge/network
 * boundary) can make redirect decisions without a client round-trip.
 */
function syncTokenCookies(accessToken: string | null, refreshToken: string | null) {
  if (typeof document === "undefined") return;
  if (accessToken) {
    Cookies.set(ACCESS_TOKEN_COOKIE, accessToken, { sameSite: "lax", expires: 7 });
  } else {
    Cookies.remove(ACCESS_TOKEN_COOKIE);
  }
  if (refreshToken) {
    Cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, { sameSite: "lax", expires: 30 });
  } else {
    Cookies.remove(REFRESH_TOKEN_COOKIE);
  }
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** Hydrated flag lets the UI wait for persisted state to load before redirecting. */
  hasHydrated: boolean;
  setAuth: (payload: {
    user: User;
    accessToken: string;
    refreshToken: string;
  }) => void;
  setTokens: (payload: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: User) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,
      setAuth: ({ user, accessToken, refreshToken }) => {
        syncTokenCookies(accessToken, refreshToken);
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },
      setTokens: ({ accessToken, refreshToken }) => {
        syncTokenCookies(accessToken, refreshToken);
        set({ accessToken, refreshToken });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        syncTokenCookies(null, null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: "instagramm-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

/**
 * Non-reactive accessors for use outside React components (e.g. axios
 * interceptors), so we don't need to import the whole hook there.
 */
export const authStorage = {
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (accessToken: string, refreshToken: string) =>
    useAuthStore.getState().setTokens({ accessToken, refreshToken }),
  logout: () => useAuthStore.getState().logout(),
};
